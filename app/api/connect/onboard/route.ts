import { stripeClient, adminDb, userFromRequest, cardPaymentsEnabled } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    if (!(await cardPaymentsEnabled())) return Response.json({ error: 'Card payments are not turned on yet.' }, { status: 403 })
    const db = adminDb()
    const stripe = stripeClient()

    const { data: prof } = await db.from('profiles').select('stripe_connect_id').eq('id', auth.user.id).single()
    let acct = (prof as any)?.stripe_connect_id as string | null

    if (!acct) {
      const a = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: auth.user.email ?? undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { camrhia_user_id: auth.user.id },
      })
      acct = a.id
      await db.from('profiles').update({ stripe_connect_id: acct }).eq('id', auth.user.id)
    }

    const origin = new URL(request.url).origin
    const link = await stripe.accountLinks.create({
      account: acct,
      type: 'account_onboarding',
      refresh_url: origin + '/payments?connect=refresh',
      return_url: origin + '/payments?connect=return',
    })
    return Response.json({ url: link.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not start payment setup'
    return Response.json({ error: message }, { status: 500 })
  }
}
