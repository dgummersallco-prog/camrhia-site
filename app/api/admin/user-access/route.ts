import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Verify the caller holds a valid Supabase session AND is listed in the
// `admins` table. Photographers, clients and affiliates share this project's
// auth, so a valid session alone is NOT enough.
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

export async function POST(request: Request) {
  const caller = await verifyAdmin(request)
  if (!caller) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, email, userId } = await request.json()
  const supabase = adminClient()

  // ── Lookup user by email ──────────────────────────────────────────────────
  if (action === 'lookup') {
    if (!email) {
      return Response.json({ error: 'email is required' }, { status: 400 })
    }

    // listUsers without filtering — fine for early-stage user counts.
    // For large userbases, replace with a Postgres RPC that queries auth.users directly.
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    })
    if (listError) {
      return Response.json({ error: listError.message }, { status: 500 })
    }

    const target = users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!target) {
      return Response.json({ error: 'No account found with that email.' }, { status: 404 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', target.id)
      .single()

    return Response.json({
      userId: target.id,
      email: target.email,
      subscriptionStatus: profile?.subscription_status ?? null,
    })
  }

  // ── Grant or revoke comped access ─────────────────────────────────────────
  if (action === 'recent') {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (listError) return Response.json({ error: listError.message }, { status: 500 })
    const sorted = [...users].sort((a, b) => ((a.created_at ?? '') < (b.created_at ?? '') ? 1 : -1))
    const ids = sorted.slice(0, 150).map((u) => u.id)
    const { data: profs } = await supabase.from('profiles').select('id, account_type, display_name, subscription_status, trial_ends_at, stripe_subscription_id, billing_interval').in('id', ids)
    const pm = new Map<string, any>(((profs ?? []) as any[]).map((p) => [p.id, p]))
    const { data: churns } = await supabase.from('churn_log').select('user_id, reason, canceled_at').in('user_id', ids)
    const cm = new Map<string, any>(((churns ?? []) as any[]).map((c) => [c.user_id, c]))
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const list = sorted.slice(0, 150)
      .filter((u) => pm.get(u.id)?.account_type === 'photographer')
      .slice(0, 40)
      .map((u) => {
        const p = pm.get(u.id)
        const st = p?.subscription_status ?? null
        const trialEnd = p?.trial_ends_at ? new Date(p.trial_ends_at) : null
        const churn = cm.get(u.id)
        let state = 'trial_ended', detail = ''
        if (st === 'active') { state = 'paying'; detail = (p?.billing_interval === 'annual' ? 'Annual plan' : 'Monthly plan') }
        else if (st === 'comped') { state = 'comped'; detail = 'Free access granted' }
        else if (trialEnd && trialEnd > new Date()) { state = 'trial'; detail = 'Free trial, ' + Math.max(1, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) + ' day(s) left, ends ' + fmt(trialEnd.toISOString()) }
        else if (churn) { state = 'canceled'; detail = 'Canceled ' + fmt(churn.canceled_at) + (churn.reason ? ': ' + churn.reason : '') }
        else if (p?.stripe_subscription_id) { state = 'payment_issue'; detail = 'Had a subscription, now past due or ended' }
        else { state = 'trial_ended'; detail = trialEnd ? 'Trial ended ' + fmt(trialEnd.toISOString()) + ', never subscribed' : 'No trial or plan on file' }
        const seen = u.last_sign_in_at ? 'last seen ' + fmt(u.last_sign_in_at) : 'never signed in'
        return { email: u.email ?? '', name: p?.display_name ?? '', createdAt: u.created_at ?? '', status: st, trialEndsAt: p?.trial_ends_at ?? null, state, detail: detail + ' · ' + seen }
      })
    const day = Date.now() - 86400000
    const week = Date.now() - 7 * 86400000
    const all = sorted.filter((u) => pm.get(u.id)?.account_type === 'photographer')
    const today = all.filter((u) => new Date(u.created_at ?? 0).getTime() > day).length
    const last7 = all.filter((u) => new Date(u.created_at ?? 0).getTime() > week).length
    return Response.json({ today, last7, total: all.length, list })
  }

  if (action === 'grant' || action === 'revoke') {
    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    const newStatus = action === 'grant' ? 'comped' : 'inactive'

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ subscription_status: newStatus })
      .eq('id', userId)

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 })
    }

    return Response.json({ success: true, newStatus })
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 })
}
