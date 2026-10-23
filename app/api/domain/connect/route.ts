import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { addAlias, removeAlias, configured, normalizeDomain, describe } from '@/lib/netlifyDomains'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    if (!configured()) return Response.json({ error: 'Custom domains are not switched on yet.' }, { status: 503 })
    const body = await request.json().catch(() => ({}))
    const domain = normalizeDomain(String((body as any).domain ?? ''))
    if (!domain) return Response.json({ error: 'Enter a domain like book.yourstudio.com' }, { status: 400 })
    const db = adminDb()
    const { data: taken } = await db.from('profiles').select('id').eq('custom_domain', domain).neq('id', auth.user.id).maybeSingle()
    if (taken) return Response.json({ error: 'That domain is already connected to another account.' }, { status: 409 })
    const { data: me } = await db.from('profiles').select('custom_domain').eq('id', auth.user.id).single()
    const old = (me as any)?.custom_domain as string | null
    if (old && old !== domain) await removeAlias(old)
    await addAlias(domain)
    const { error } = await db.from('profiles').update({ custom_domain: domain, custom_domain_status: 'pending' }).eq('id', auth.user.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ domain, status: 'pending', ...(await describe(domain)) })
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not connect that domain.' }, { status: 500 })
  }
}
