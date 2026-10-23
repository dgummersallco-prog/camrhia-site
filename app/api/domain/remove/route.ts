import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { removeAlias, configured } from '@/lib/netlifyDomains'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const db = adminDb()
    const { data } = await db.from('profiles').select('custom_domain').eq('id', auth.user.id).single()
    const domain = (data as any)?.custom_domain as string | null
    if (domain && configured()) await removeAlias(domain)
    await db.from('profiles').update({ custom_domain: null, custom_domain_status: null }).eq('id', auth.user.id)
    return Response.json({ ok: true })
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : 'Could not remove that domain.' }, { status: 500 })
  }
}
