import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const first = String(body.first || '').trim()
  const last = String(body.last || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')

  if (!first || !email.includes('@')) {
    return Response.json({ error: 'Add your name and a valid email.' }, { status: 400 })
  }
  if (password.length < 8) {
    return Response.json({ error: 'Use a password with at least 8 characters.' }, { status: 400 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const displayName = `${first} ${last}`.trim()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { account_type: 'photographer', display_name: displayName, first_name: first, last_name: last },
  })
  if (error || !data.user) {
    const exists = /already|registered|exists/i.test(error?.message || '')
    return Response.json({ error: exists ? 'exists' : error?.message || 'Could not create account.' }, { status: exists ? 409 : 400 })
  }

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const { error: profErr } = await admin.from('profiles').upsert(
    {
      id: data.user.id,
      account_type: 'photographer',
      display_name: displayName || null,
      first_name: first || null,
      last_name: last || null,
      payout_email: email,
      payout_business_name: displayName ? `${displayName} Photography` : null,
      trial_ends_at: trialEndsAt.toISOString(),
    },
    { onConflict: 'id' }
  )
  if (profErr) console.error('[billing signup] profile upsert error:', profErr.message)

  return Response.json({ ok: true })
}
