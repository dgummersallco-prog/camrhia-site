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

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null

        if (!userId) {
          console.error('[stripe webhook] checkout.session.completed: missing client_reference_id')
          break
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: 'active',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
          })
          .eq('id', userId)

        if (error) {
          console.error('[stripe webhook] profiles update error (checkout.session.completed):', error.message)
        }
        break
      }

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
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Fetch profile first so we have user_id and email for the churn log
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('stripe_subscription_id', subscription.id)
          .single()

        // Insert churn log row before marking inactive — failure is non-blocking
        if (profile) {
          const { error: churnError } = await supabase
            .from('churn_log')
            .insert({
              user_id:     profile.id,
              email:       profile.email ?? null,
              reason:      subscription.cancellation_details?.reason ?? null,
              feedback:    subscription.cancellation_details?.feedback ?? null,
            })
          if (churnError) {
            console.error('[stripe webhook] churn_log insert error:', churnError.message)
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
