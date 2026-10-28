import { stripeClient, adminDb, cardPaymentsEnabled } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let db: ReturnType<typeof adminDb> | null = null
  let heldSlot: string | null = null
  try {
    if (!(await cardPaymentsEnabled())) return Response.json({ error: 'Card payments are not turned on yet.' }, { status: 403 })
    const body = await request.json()
    const slotId = String(body.slotId ?? '')
    const miniId = String(body.miniId ?? '')
    const uuid = /^[0-9a-f-]{36}$/i
    if (!uuid.test(slotId) || !uuid.test(miniId)) return Response.json({ error: 'Missing booking details.' }, { status: 400 })

    db = adminDb()
    const { data: held, error: holdErr } = await db.rpc('hold_mini_slot', {
      p_slot_id: slotId, p_name: body.name, p_email: body.email, p_phone: body.phone ?? null,
    })
    if (holdErr || !held) return Response.json({ error: holdErr?.message ?? 'That time was just taken. Please pick another.' }, { status: 400 })
    heldSlot = slotId

    const { data: owner } = await db
      .from('profiles')
      .select('stripe_connect_id, studio_name, display_name')
      .eq('id', held.owner_id)
      .single()
    const acct = (owner as any)?.stripe_connect_id as string | null
    if (!acct) throw new Error('This photographer has not turned on card payments yet.')

    const stripe = stripeClient()
    const account = await stripe.accounts.retrieve(acct)
    if (!account.charges_enabled) throw new Error('This photographer has not finished setting up card payments yet.')

    const cents = Math.round(Number(held.price) * 100)
    if (!(cents >= 50)) throw new Error('That amount is too small to charge by card.')
    // Camrhia keeps only enough to cover Stripe's processing fee (2.9% + 30 cents).
    const fee = Math.min(cents - 1, Math.round(cents * 0.029) + 30)
    const studio = (owner as any)?.studio_name || (owner as any)?.display_name || 'Photography'
    const origin = 'https://camrhia.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        { quantity: 1, price_data: { currency: 'usd', unit_amount: cents, product_data: { name: held.title + ' - ' + studio } } },
      ],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: acct },
        metadata: { mini_slot_id: slotId },
      },
      metadata: { mini_slot_id: slotId },
      customer_email: String(body.email).trim(),
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: origin + '/mini/thanks',
      cancel_url: origin + '/mini/' + miniId,
    })
    heldSlot = null
    return Response.json({ url: session.url })
  } catch (err: unknown) {
    if (db && heldSlot) {
      await db.from('mini_slots').update({ status: 'open', hold_expires_at: null }).eq('id', heldSlot).eq('status', 'held')
    }
    const message = err instanceof Error ? err.message : 'Could not start the payment'
    return Response.json({ error: message }, { status: 500 })
  }
}
