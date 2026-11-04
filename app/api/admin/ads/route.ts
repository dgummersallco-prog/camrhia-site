import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Caller must hold a valid session AND be listed in the `admins` table.
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

const int = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))

export async function POST(request: Request) {
  const caller = await verifyAdmin(request)
  if (!caller) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const sb = adminClient()

  if (body.action === 'list') {
    const { data, error } = await sb.from('ad_campaigns').select('*').order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ads: data ?? [] })
  }

  if (body.action === 'save') {
    const a = body.ad ?? {}
    const row = {
      name: String(a.name ?? '').slice(0, 120) || 'New ad',
      started_on: a.started_on || null,
      cost_total: Math.max(0, Number(a.cost_total) || 0),
      visits: int(a.visits),
      downloads: int(a.downloads),
      trials: int(a.trials),
      paying: int(a.paying),
      retained: a.retained === null || a.retained === undefined || a.retained === '' ? null : int(a.retained),
      notes: a.notes ? String(a.notes).slice(0, 2000) : null,
    }
    const q = a.id
      ? sb.from('ad_campaigns').update(row).eq('id', a.id).select().single()
      : sb.from('ad_campaigns').insert(row).select().single()
    const { data, error } = await q
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ad: data })
  }

  if (body.action === 'delete') {
    if (!body.id) return Response.json({ error: 'id is required' }, { status: 400 })
    const { error } = await sb.from('ad_campaigns').delete().eq('id', body.id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
