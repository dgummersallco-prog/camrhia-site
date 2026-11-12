import { stripeClient, adminDb, userFromRequest, userDb, cardPaymentsEnabled } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    if (!(await cardPaymentsEnabled())) return Response.json({ error: 'Card payments are not turned on yet.' }, { status: 403 })
    const body = await request.json()
    const ids: string[] = Array.isArray(body.lineIds)
      ? body.lineIds.filter((x: unknown) => typeof x === 'string')
      : body.lineId ? [String(body.lineId)] : []
    if (ids.length === 0 || ids.length > 8) return Response.json({ error: 'Missing payment.' }, { status: 400 })

    // Row-level security: only people who can see these payment lines can load them.
    const { data: found } = await userDb(auth.token)
      .from('payment_schedule')
      .select('id, wedding_id, owner_id, label, amount, status')
      .in('id', ids)
    const lines: any[] = found ?? []
    if (lines.length !== ids.length) return Response.json({ error: 'Payment not found.' }, { status: 404 })
    if (lines.some((l) => l.status === 'paid')) return Response.json({ error: 'This payment is already paid.' }, { status: 400 })
    if (lines.some((l) => l.owner_id !== lines[0].owner_id || l.wedding_id !== lines[0].wedding_id)) {
      return Response.json({ error: 'These payments do not belong together.' }, { status: 400 })
    }
    if (auth.user.id === lines[0].owner_id) return Response.json({ error: 'Clients pay their own invoices.' }, { status: 403 })

    const db = adminDb()
    const { data: owner } = await db
      .from('profiles')
      .select('stripe_connect_id, studio_name, display_name')
      .eq('id', lines[0].owner_id)
      .single()
    const acct = (owner as any)?.stripe_connect_id as string | null
    if (!acct) return Response.json({ error: 'Your photographer has not turned on card payments yet.' }, { status: 400 })

    const stripe = stripeClient()
    const account = await stripe.accounts.retrieve(acct)
    if (!account.charges_enabled) {
      return Response.json({ error: 'Your photographer has not finished setting up card payments yet.' }, { status: 400 })
    }

    const studio = (owner as any)?.studio_name || (owner as any)?.display_name || 'Photography'
    const items = lines
      .map((l) => ({ l, cents: Math.round(Number(l.amount) * 100) }))
      .filter((x) => x.cents > 0)
    const totalCents = items.reduce((s, x) => s + x.cents, 0)
    if (!(totalCents >= 50)) return Response.json({ error: 'That amount is too small to charge by card.' }, { status: 400 })
    // Camrhia keeps only enough to cover Stripe's processing fee (2.9% + 30 cents), charged once.
    const fee = Math.min(totalCents - 1, Math.round(totalCents * 0.029) + 30)
    const origin = 'https://camrhia.com'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((x) => ({
        quantity: 1,
        price_data: { currency: 'usd', unit_amount: x.cents, product_data: { name: x.l.label + ' - ' + studio } },
      })),
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: acct },
        metadata: { payment_schedule_ids: ids.join(',') },
      },
      metadata: { payment_schedule_ids: ids.join(',') },
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
