import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Webhook for the Camrhia payments platform account (client-to-photographer card payments).
export async function POST(request: Request) {
  const rawBody = Buffer.from(await request.arrayBuffer())
  const sig = request.headers.get('stripe-signature')
  if (!sig) return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })

  const stripe = new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY!)
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_CONNECT_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Signature verification failed'
    return Response.json({ error: msg }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const lineId = session.metadata?.payment_schedule_id
      if (lineId && session.payment_status === 'paid') {
        const piId = typeof session.payment_intent === 'string' ? session.payment_intent : null
        const { data: paidLine } = await supabase
          .from('payment_schedule')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            method: 'Card',
            stripe_session_id: session.id,
            stripe_payment_intent: piId,
          })
          .eq('id', lineId)
          .neq('status', 'paid')
          .select('owner_id, wedding_id, label, amount')
          .maybeSingle()

        if (paidLine) {
          const amt = '$' + Number(paidLine.amount).toFixed(2)

          // Photographer: payment received
          await supabase.from('notifications').insert({
            user_id: paidLine.owner_id,
            type: 'payment',
            title: 'Payment received',
            body: amt + ' (' + paidLine.label + ') was paid by card.',
            wedding_id: paidLine.wedding_id,
          })

          // Receipt link (best effort)
          let receiptUrl: string | null = null
          try {
            if (piId) {
              const pi = await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] })
              const ch = pi.latest_charge as Stripe.Charge | null
              receiptUrl = ch?.receipt_url ?? null
              if (receiptUrl) await supabase.from('payment_schedule').update({ receipt_url: receiptUrl }).eq('id', lineId)
            }
          } catch (e) {
            console.error('[stripe-connect webhook] receipt lookup failed:', e)
          }

          const { data: wed } = await supabase
            .from('weddings')
            .select('names, couple_user_id')
            .eq('id', paidLine.wedding_id)
            .maybeSingle()

          // Client: payment confirmed
          if (wed?.couple_user_id) {
            await supabase.from('notifications').insert({
              user_id: wed.couple_user_id,
              type: 'payment',
              title: 'Payment confirmed',
              body: 'Your ' + amt + ' payment (' + paidLine.label + ') went through. Thank you! You can find your receipt in the session.',
              wedding_id: paidLine.wedding_id,
            })
          }

          // Photographer: paid in full
          const { count } = await supabase
            .from('payment_schedule')
            .select('id', { count: 'exact', head: true })
            .eq('wedding_id', paidLine.wedding_id)
            .gt('amount', 0)
            .or('status.is.null,status.neq.paid')
          if (count === 0) {
            await supabase.from('notifications').insert({
              user_id: paidLine.owner_id,
              type: 'payment',
              title: 'Paid in full',
              body: (wed?.names ? wed.names + ' has' : 'This session has') + ' paid everything on the payment schedule.',
              wedding_id: paidLine.wedding_id,
            })
          }
        }
      }
    }

    if (event.type === 'charge.dispute.created') {
      const dispute = event.data.object as Stripe.Dispute
      const piId = typeof dispute.payment_intent === 'string' ? dispute.payment_intent : dispute.payment_intent?.id ?? null
      if (piId) {
        const { data: line } = await supabase
          .from('payment_schedule')
          .select('owner_id, wedding_id, label, amount')
          .eq('stripe_payment_intent', piId)
          .maybeSingle()
        if (line) {
          await supabase.from('notifications').insert({
            user_id: line.owner_id,
            type: 'payment',
            title: 'Payment disputed',
            body: 'The cardholder\'s bank opened a dispute on $' + Number(line.amount).toFixed(2) + ' (' + line.label + '). We\'ll follow up by email.',
            wedding_id: line.wedding_id,
          })
        }
      }
    }
  } catch (err) {
    console.error('[stripe-connect webhook] handler error:', err)
    return Response.json({ error: 'Handler error' }, { status: 500 })
  }
  return Response.json({ received: true })
}
