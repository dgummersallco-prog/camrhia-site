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
        const { data: paidLine } = await supabase
          .from('payment_schedule')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            method: 'Card',
            stripe_session_id: session.id,
            stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
          })
          .eq('id', lineId)
          .neq('status', 'paid')
          .select('owner_id, wedding_id, label, amount')
          .maybeSingle()
        if (paidLine) {
          await supabase.from('notifications').insert({
            user_id: paidLine.owner_id,
            type: 'payment',
            title: 'Payment received',
            body: '$' + Number(paidLine.amount).toFixed(2) + ' (' + paidLine.label + ') was paid by card.',
            wedding_id: paidLine.wedding_id,
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
