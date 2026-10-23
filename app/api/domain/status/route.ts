import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { configured, describe, dnsOk, dnsTarget, httpsLive, provisionSsl } from '@/lib/netlifyDomains'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const db = adminDb()
    const { data } = await db.from('profiles').select('custom_domain, custom_domain_status').eq('id', auth.user.id).single()
    const domain = (data as any)?.custom_domain as string | null
    let status = (data as any)?.custom_domain_status as string | null
    if (!domain) return Response.json({ domain: null, configured: configured() })
    const info = await describe(domain)
    if (status !== 'active') {
      let next = 'pending'
      if (await dnsOk(domain, await dnsTarget())) {
        await provisionSsl()
        next = (await httpsLive(domain)) ? 'active' : 'ssl'
      }
      if (next !== status) await db.from('profiles').update({ custom_domain_status: next }).eq('id', auth.user.id)
      status = next
    }
    return Response.json({ domain, status, configured: true, ...info })
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not check that domain.' }, { status: 500 })
  }
}
