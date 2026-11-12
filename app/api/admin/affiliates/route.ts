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
  approved: boolean | null
  created_at: string
}

export async function POST(request: Request) {
  const caller = await verifyAdmin(request)
  if (!caller) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, affiliateId, isMaster, approved, applicationId } = await request.json()
  const supabase = adminClient()

  if (action === 'list') {
    const { data, error } = await supabase
      .from('affiliates')
      .select('id, name, email, referral_code, is_master, commission_rate, override_rate, parent_affiliate_id, approved, created_at')
      .order('created_at', { ascending: false })
    if (error) return Response.json({ error: error.message }, { status: 500 })

    const affs = (data ?? []) as Aff[]
    const { data: refData } = await supabase.from('referrals').select('affiliate_id, status')
    const refs = (refData ?? []) as { affiliate_id: string; status: string }[]
    const nameById = new Map(affs.map((a) => [a.id, a.name ?? a.email ?? 'Unknown']))

    const { data: ul } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const meta = new Map((ul?.users ?? []).map((u) => [u.id, (u.user_metadata ?? {}) as Record<string, unknown>]))
    const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

    const rows = affs.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      referral_code: a.referral_code,
      is_master: !!a.is_master,
      approved: !!a.approved,
      commission_rate: a.commission_rate,
      override_rate: a.override_rate,
      recruited_by: a.parent_affiliate_id ? nameById.get(a.parent_affiliate_id) ?? 'Unknown' : null,
      active_referrals: refs.filter((r) => r.affiliate_id === a.id && r.status === 'active').length,
      total_referrals: refs.filter((r) => r.affiliate_id === a.id).length,
      created_at: a.created_at,
      phone: str(meta.get(a.id)?.phone),
      handle: str(meta.get(a.id)?.social_handle),
      followers: str(meta.get(a.id)?.followers),
      best_reach: str(meta.get(a.id)?.best_reach),
    }))
    const { data: appData } = await supabase
      .from('affiliate_applications')
      .select('id, name, email, phone, handle, followers, best_reach, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return Response.json({ rows, applications: appData ?? [] })
  }

  if (action === 'masters') {
    const { data: affData, error: affErr } = await supabase
      .from('affiliates')
      .select('id, name, email, referral_code, is_master, commission_rate, override_rate, parent_affiliate_id, approved, created_at')
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
      : { is_master: false, commission_rate: 0.3, override_rate: 0 }
    const { error } = await supabase.from('affiliates').update(patch).eq('id', affiliateId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (action === 'approve_application') {
    if (typeof applicationId !== 'string') return Response.json({ error: 'applicationId is required' }, { status: 400 })
    const { data: appRow } = await supabase.from('affiliate_applications').select('*').eq('id', applicationId).maybeSingle()
    if (!appRow) return Response.json({ error: 'Application not found' }, { status: 404 })
    const a = appRow as { name: string; email: string; phone: string | null; handle: string | null; followers: string | null; best_reach: string | null; recruit_code: string | null; referral_code: string | null }
    const { data: inv, error: invErr } = await supabase.auth.admin.inviteUserByEmail(a.email, {
      redirectTo: 'https://camrhia.com/affiliate/set-password',
      data: {
        account_kind: 'affiliate',
        name: a.name,
        referral_code: a.referral_code,
        phone: a.phone ?? '',
        social_handle: a.handle ?? '',
        followers: a.followers ?? '',
        best_reach: a.best_reach ?? '',
        ...(a.recruit_code ? { recruit_code: a.recruit_code } : {}),
      },
    })
    let uid = inv?.user?.id
    if (invErr) {
      if (!/already|registered|exists/i.test(invErr.message)) return Response.json({ error: invErr.message }, { status: 400 })
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const found = list?.users?.find((u) => (u.email ?? '').toLowerCase() === a.email.toLowerCase())
      if (!found) return Response.json({ error: 'That email already has a Camrhia account, but it could not be found.' }, { status: 400 })
      const { error: cErr } = await supabase.rpc('create_affiliate_for', { p_uid: found.id, p_name: a.name })
      if (cErr) return Response.json({ error: cErr.message }, { status: 500 })
      uid = found.id
    }
    if (uid) await supabase.from('affiliates').update({ approved: true }).eq('id', uid)
    await supabase.from('affiliate_applications').update({ status: 'approved' }).eq('id', applicationId)
    return Response.json({ ok: true })
  }

  if (action === 'decline_application') {
    if (typeof applicationId !== 'string') return Response.json({ error: 'applicationId is required' }, { status: 400 })
    const { error } = await supabase.from('affiliate_applications').delete().eq('id', applicationId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (action === 'remove_affiliate') {
    if (typeof affiliateId !== 'string') return Response.json({ error: 'affiliateId is required' }, { status: 400 })
    const { error } = await supabase.from('affiliates').delete().eq('id', affiliateId)
    if (error) return Response.json({ error: error.code === '23503' ? 'This affiliate has referrals or commission records, so they cannot be deleted outright.' : error.message }, { status: 500 })
    return Response.json({ ok: true })
  }

  if (action === 'set_approved') {
    if (typeof affiliateId !== 'string' || typeof approved !== 'boolean') {
      return Response.json({ error: 'affiliateId and approved are required' }, { status: 400 })
    }
    const { error } = await supabase.from('affiliates').update({ approved }).eq('id', affiliateId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    let emailed = false
    if (approved) {
      const { data: row } = await supabase.from('affiliates').select('email').eq('id', affiliateId).maybeSingle()
      const to = (row as { email: string | null } | null)?.email
      if (to) {
        const { error: mailErr } = await supabase.auth.resetPasswordForEmail(to, { redirectTo: 'https://camrhia.com/affiliate/set-password' })
        emailed = !mailErr
      }
    }
    return Response.json({ ok: true, emailed })
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 })
}
