import { stripeClient, adminDb, userFromRequest, cardPaymentsEnabled } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const db = adminDb()
    const enabled = await cardPaymentsEnabled()
    const { data: prof } = await db.from('profiles').select('stripe_connect_id').eq('id', auth.user.id).single()
    const acct = (prof as any)?.stripe_connect_id as string | null
    if (!acct) return Response.json({ connected: false, ready: false, enabled })

    const stripe = stripeClient()
    const a = await stripe.accounts.retrieve(acct)
    const ready = !!(a.charges_enabled && a.details_submitted)
    await db.from('profiles').update({ stripe_connect_ready: ready }).eq('id', auth.user.id)

    let dashboardUrl: string | null = null
    if (ready) {
      try {
        const l = await stripe.accounts.createLoginLink(acct)
        dashboardUrl = l.url
      } catch {
        dashboardUrl = null
      }
    }
    const ext: any = (a as any).external_accounts?.data?.[0]
    const bank = ext ? { name: (ext.bank_name ?? ext.brand ?? null) as string | null, last4: (ext.last4 ?? null) as string | null } : null
    return Response.json({ connected: true, ready, enabled, payoutsEnabled: !!a.payouts_enabled, dashboardUrl, bank })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not check payment setup'
    return Response.json({ error: message }, { status: 500 })
  }
}
