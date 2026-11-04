import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function verifyAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await adminClient().auth.getUser(token)
  if (error || !user) return null
  const { data: adminRow } = await adminClient()
    .from('admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminRow) return null
  return user
}

const cleanSlug = (v: unknown) =>
  String(v ?? '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export async function POST(request: Request) {
  const caller = await verifyAdmin(request)
  if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const sb = adminClient()

  if (body.action === 'list') {
    const { data, error } = await sb
      .from('funnel_pages')
      .select('*')
      .is('owner_id', null)
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ pages: data ?? [] })
  }

  if (body.action === 'save') {
    const p = body.page ?? {}
    const slug = cleanSlug(p.slug)
    if (!slug) return Response.json({ error: 'The page needs an address (slug).' }, { status: 400 })
    const row = {
      slug,
      name: String(p.name ?? '').slice(0, 120) || 'New page',
      style: String(p.style ?? 'miller').slice(0, 40),
      content: p.content && typeof p.content === 'object' ? p.content : {},
      cta_label: String(p.cta_label ?? '').slice(0, 60) || 'Get the app',
      cta_url: p.cta_url ? String(p.cta_url).slice(0, 1000) : null,
      published: !!p.published,
      updated_at: new Date().toISOString(),
    }
    const q = p.id
      ? sb.from('funnel_pages').update(row).eq('id', p.id).select().single()
      : sb.from('funnel_pages').insert({ ...row, owner_id: null }).select().single()
    const { data, error } = await q
    if (error) {
      const msg = error.message.includes('duplicate') ? 'That address is already used by another page.' : error.message
      return Response.json({ error: msg }, { status: 500 })
    }
    return Response.json({ page: data })
  }

  if (body.action === 'delete') {
    if (!body.id) return Response.json({ error: 'id is required' }, { status: 400 })
    const { error } = await sb.from('funnel_pages').delete().eq('id', body.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
