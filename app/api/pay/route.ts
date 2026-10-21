import { stripeClient, adminDb, userFromRequest, userDb, cardPaymentsEnabled } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    if (!(await cardPaymentsEnabled())) return Response.json({ error: 'Card payments are not turned on yet.' }, { status: 403 })
    const { lineId } = await request.json()
    if (!lineId) return Response.json({ error: 'Missing payment.' }, { status: 400 })

    // Row-level security: only people who can see this payment line can load it.
    const { data: line } = await userDb(auth.token)
      .from('payment_schedule')
      .select('id, wedding_id, owner_id, label, amount, status')
      .eq('id', lineId)
      .maybeSingle()
    if (!line) return Response.json({ error: 'Payment not found.' }, { status: 404 })
    if (line.status === 'paid') return Response.json({ error: 'This payment is already paid.' }, { status: 400 })
    if (auth.user.id === line.owner_id) return Response.json({ error: 'Clients pay their own invoices.' }, { status: 403 })

    const db = adminDb()
    const { data: owner } = await db
      .from('profiles')
      .select('stripe_connect_id, studio_name, display_name')
      .eq('id', line.owner_id)
      .single()
    const acct = (owner as any)?.stripe_connect_id as string | null
    if (!acct) return Response.json({ error: 'Your photographer has not turned on card payments yet.' }, { status: 400 })

    const stripe = stripeClient()
    const account = await stripe.accounts.retrieve(acct)
    if (!account.charges_enabled) {
      return Response.json({ error: 'Your photographer has not finished setting up card payments yet.' }, { status: 400 })
    }

    const cents = Math.round(Number(line.amount) * 100)
    if (!(cents >= 50)) return Response.json({ error: 'That amount is too small to charge by card.' }, { status: 400 })
    // Camrhia keeps only enough to cover Stripe's processing fee (2.9% + 30 cents).
    const fee = Math.min(cents - 1, Math.round(cents * 0.029) + 30)
    const studio = (owner as any)?.studio_name || (owner as any)?.display_name || 'Photography'
    const origin = new URL(request.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        { quantity: 1, price_data: { currency: 'usd', unit_amount: cents, product_data: { name: line.label + ' - ' + studio } } },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: acct },
        metadata: { payment_schedule_id: line.id },
      },
      metadata: { payment_schedule_id: line.id },
      customer_email: auth.user.email ?? undefined,
      success_url: origin + '/pay/thanks',
      cancel_url: origin + '/my',
    })
    return Response.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not start the payment'
    return Response.json({ error: message }, { status: 500 })
  }
}
