import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Verify the caller holds a valid Supabase session.
// Admin accounts are manually created, so any authenticated user reaching
// this route is an admin. Add an `admins` table check here for stricter
// verification if multiple non-admin accounts ever exist in this project.
async function verifyAdmin(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const { data: { user }, error } = await adminClient().auth.getUser(token)
  if (error || !user) return null
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
