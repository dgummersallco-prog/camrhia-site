import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Force dynamic — this route reads request body and must never be prerendered
export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  // --- 1. Read raw body (required for Stripe signature verification) ---
  const rawBody = Buffer.from(await request.arrayBuffer())

  const sig = request.headers.get('stripe-signature')
  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  // --- 2. Verify webhook signature ---
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('[stripe webhook] signature error:', msg)
    return Response.json({ error: msg }, { status: 400 })
  }

  const supabase = adminClient()

  // --- 3. Handle events ---
  try {
    switch (event.type) {

      // ── Subscription started ────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null

        if (!userId) {
          console.error('[stripe webhook] checkout.session.completed: missing client_reference_id')
          break
        }

        // Determine billing interval from the subscription's price
        let billingInterval: 'monthly' | 'annual' = 'monthly'
        let planTier: 'solo' | 'studio' = 'solo'
        if (subscriptionId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId)
            const priceId = subscription.items.data[0]?.price?.id
            const stripeInterval = subscription.items.data[0]?.price?.recurring?.interval
            billingInterval = stripeInterval === 'year' ? 'annual' : 'monthly'
            if (priceId === process.env.STRIPE_PRICE_ID_STUDIO || priceId === process.env.STRIPE_PRICE_ID_STUDIO_ANNUAL) {
              planTier = 'studio'
            }
          } catch (err: unknown) {
            console.error('[stripe webhook] subscription retrieve error:', err instanceof Error ? err.message : err)
          }
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            billing_interval: billingInterval,
            plan_tier: planTier,
          })
          .eq('id', userId)

        if (profileError) {
          console.error('[stripe webhook] profiles update error (checkout.session.completed):', profileError.message)
        }

        // Activate the referral if this photographer was referred by an affiliate,
        // locking in the commission rate for this referral's position in the affiliate's
        // history. Rate is non-retroactive — it never changes after this point.
        const { data: pendingReferral } = await supabase
          .from('referrals')
          .select('id, affiliate_id')
          .eq('referred_user_id', userId)
          .eq('status', 'trial')
          .single()

        if (pendingReferral) {
          // Count how many of this affiliate's referrals are already settled (active or churned).
          // This referral's position = priorCount + 1, which determines the locked rate.
          const { count: priorCount } = await supabase
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('affiliate_id', pendingReferral.affiliate_id)
            .in('status', ['active', 'churned'])

          const position = (priorCount ?? 0) + 1
          const commissionRate =
            position <= 10 ? 0.20 :
            position <= 25 ? 0.30 :
            0.40  // positions 26-50 and beyond all cap at 40%

          const { error: referralActivateError } = await supabase
            .from('referrals')
            .update({ status: 'active', commission_rate: commissionRate })
            .eq('id', pendingReferral.id)

          if (referralActivateError) {
            console.error('[stripe webhook] referral activate error:', referralActivateError.message)
          }
        }
        break
      }

      // ── Every successful payment (first + all renewals) ─────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null

        if (!customerId) break

        // Find the photographer by their Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        // Look for an active referral — if none, this photographer wasn't referred
        const { data: referral } = await supabase
          .from('referrals')
          .select('id, affiliate_id, commission_rate')
          .eq('referred_user_id', profile.id)
          .eq('status', 'active')
          .single()

        if (!referral) break

        // Use the rate locked at activation. Falls back to 0.20 for rows that existed
        // before commission_rate was added (non-retroactive migration).
        const rate = referral.commission_rate ?? 0.20
        const commission = Math.round((invoice.amount_paid / 100) * rate * 100) / 100

        // Period: YYYY-MM from the invoice billing period start (Unix timestamp)
        const periodDate = new Date((invoice.period_start ?? 0) * 1000)
        const period = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`

        const { error: ledgerError } = await supabase
          .from('commission_ledger')
          .insert({
            affiliate_id: referral.affiliate_id,
            referral_id:  referral.id,
            amount:       commission,
            period,
            paid:         false,
          })

        if (ledgerError) {
          console.error('[stripe webhook] commission_ledger insert error:', ledgerError.message)
        }
        break
      }

      // ── Payment went past-due or canceled ──────────────────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription

        if (subscription.status === 'past_due' || subscription.status === 'canceled') {
          const { error } = await supabase
            .from('profiles')
            .update({ subscription_status: 'inactive' })
            .eq('stripe_subscription_id', subscription.id)

          if (error) {
            console.error('[stripe webhook] profiles update error (subscription.updated):', error.message)
          }
        }

        // Detect plan switches (upgrade/downgrade via Customer Portal) by checking
        // the current price on the subscription and syncing plan_tier accordingly.
        const currentPriceId = subscription.items.data[0]?.price?.id
        const newInterval = subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'annual' : 'monthly'
        let newPlanTier: 'solo' | 'studio' | null = null
        if (currentPriceId === process.env.STRIPE_PRICE_ID_STUDIO || currentPriceId === process.env.STRIPE_PRICE_ID_STUDIO_ANNUAL) {
          newPlanTier = 'studio'
        } else if (currentPriceId === process.env.STRIPE_PRICE_ID || currentPriceId === process.env.STRIPE_PRICE_ID_ANNUAL) {
          newPlanTier = 'solo'
        }

        if (newPlanTier) {
          const { error: planError } = await supabase
            .from('profiles')
            .update({ plan_tier: newPlanTier, billing_interval: newInterval })
            .eq('stripe_subscription_id', subscription.id)

          if (planError) {
            console.error('[stripe webhook] plan_tier sync error (subscription.updated):', planError.message)
          }
        }
        break
      }

      // ── Subscription fully canceled ─────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Fetch profile first — needed for churn log and referral churn
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        // Churn log — failure is non-blocking
        if (profile) {
          const { error: churnError } = await supabase
            .from('churn_log')
            .insert({
              user_id:  profile.id,
              email:    profile.email ?? null,
              reason:   subscription.cancellation_details?.reason ?? null,
              feedback: subscription.cancellation_details?.feedback ?? null,
            })
          if (churnError) {
            console.error('[stripe webhook] churn_log insert error:', churnError.message)
          }

          // Mark the referral churned so future invoice.paid events stop generating commissions
          const { error: referralChurnError } = await supabase
            .from('referrals')
            .update({ status: 'churned' })
            .eq('referred_user_id', profile.id)
            .eq('status', 'active')
          if (referralChurnError) {
            console.error('[stripe webhook] referral churn update error:', referralChurnError.message)
          }
        }

        const { error } = await supabase
          .from('profiles')
          .update({ subscription_status: 'inactive' })
          .eq('stripe_subscription_id', subscription.id)

        if (error) {
          console.error('[stripe webhook] profiles update error (subscription.deleted):', error.message)
        }
        break
      }

      default:
        // Unhandled event type — ignore, return 200 so Stripe doesn't retry
        break
    }
  } catch (err: unknown) {
    console.error('[stripe webhook] handler error:', err)
    // Return 200 anyway — returning 5xx causes Stripe to retry, which we don't want
    // for errors that aren't transient (e.g. malformed data)
  }

  return Response.json({ received: true })
}
