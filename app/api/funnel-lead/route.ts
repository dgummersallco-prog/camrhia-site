import { createClient } from '@supabase/supabase-js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  // Hidden field only bots fill in
  if (body.website) return Response.json({ ok: true })

  const funnel_id = String(body.funnel_id ?? '')
  const name = String(body.name ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().slice(0, 200)
  const phone = String(body.phone ?? '').trim().slice(0, 40) || null
  const note = String(body.note ?? '').trim().slice(0, 1000) || null

  if (!funnel_id || !name || !EMAIL.test(email)) {
    return Response.json({ error: 'Please add your name and a valid email.' }, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { error } = await sb.rpc('submit_special_signup', { p_funnel_id: funnel_id, p_name: name, p_email: email, p_phone: phone, p_note: note })
  if (error) return Response.json({ error: 'Could not send. Please try again.' }, { status: 500 })
  return Response.json({ ok: true })
}
