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

type Aff = {
  id: string
  name: string | null
  email: string | null
  referral_code: string | null
  is_master: boolean | null
  commission_rate: number | null
  override_rate: number | null
  parent_affiliate_id: string | null
  created_at: string
}

export async function POST(request: Request) {
  const caller = await verifyAdmin(request)
  if (!caller) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, affiliateId, isMaster } = await request.json()
  const supabase = adminClient()

  if (action === 'list') {
    const { data, error } = await supabase
      .from('affiliates')
      .select('id, name, email, referral_code, is_master, commission_rate, override_rate, parent_affiliate_id, created_at')
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const affs = (data ?? []) as Aff[]
    const { data: refData } = await supabase.from('referrals').select('affiliate_id, status')
    const refs = (refData ?? []) as { affiliate_id: string; status: string }[]
    const nameById = new Map(affs.map((a) => [a.id, a.name ?? a.email ?? 'Unknown']))

    const rows = affs.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      referral_code: a.referral_code,
      is_master: !!a.is_master,
      commission_rate: a.commission_rate,
      override_rate: a.override_rate,
      recruited_by: a.parent_affiliate_id ? nameById.get(a.parent_affiliate_id) ?? 'Unknown' : null,
      active_referrals: refs.filter((r) => r.affiliate_id === a.id && r.status === 'active').length,
      total_referrals: refs.filter((r) => r.affiliate_id === a.id).length,
      created_at: a.created_at,
    }))
    return Response.json({ rows })
  }

  if (action === 'masters') {
    const { data: affData, error: affErr } = await supabase
      .from('affiliates')
      .select('id, name, email, referral_code, is_master, commission_rate, override_rate, parent_affiliate_id, created_at')
    if (affErr) return Response.json({ error: affErr.message }, { status: 500 })
    const affs = (affData ?? []) as Aff[]

    const { data: refData } = await supabase.from('referrals').select('affiliate_id, status')
    const refs = (refData ?? []) as { affiliate_id: string; status: string }[]

    const { data: ledData } = await supabase
      .from('commission_ledger')
      .select('affiliate_id, amount, kind, paid_out, source_affiliate_id')
    const led = (ledData ?? []) as {
      affiliate_id: string
      amount: number | string
      kind: string | null
      paid_out: boolean | null
      source_affiliate_id: string | null
    }[]

    const active = (id: string) => refs.filter((r) => r.affiliate_id === id && r.status === 'active').length
    const sum = (rows: typeof led) => rows.reduce((s, l) => s + Number(l.amount ?? 0), 0)

    const masters = affs
      .filter((a) => a.is_master)
      .map((m) => {
        const mine = led.filter((l) => l.affiliate_id === m.id)
        const recruits = affs
          .filter((a) => a.parent_affiliate_id === m.id)
          .map((r) => ({
            id: r.id,
            name: r.name,
            email: r.email,
            active_referrals: active(r.id),
            override_earned: sum(mine.filter((l) => l.kind === 'override' && l.source_affiliate_id === r.id)),
          }))
        return {
          id: m.id,
          name: m.name,
          email: m.email,
          referral_code: m.referral_code,
          own_active: active(m.id),
          recruits,
          direct_earned: sum(mine.filter((l) => l.kind !== 'override')),
          override_earned: sum(mine.filter((l) => l.kind === 'override')),
          unpaid: sum(mine.filter((l) => !l.paid_out)),
        }
      })
    return Response.json({ masters })
  }

  if (action === 'set_master') {
    if (typeof affiliateId !== 'string' || typeof isMaster !== 'boolean') {
      return Response.json({ error: 'affiliateId and isMaster are required' }, { status: 400 })
    }
    const patch = isMaster
      ? { is_master: true, commission_rate: 0.5, override_rate: 0.5 }
      : { is_master: false, commission_rate: null, override_rate: 0 }
    const { error } = await supabase.from('affiliates').update(patch).eq('id', affiliateId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
