import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Not signed in' }, { status: 401 })
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: auth } = await supabase.auth.getUser(token)
  const user = auth?.user
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const [{ data: prof }, { data: ents }] = await Promise.all([
    supabase.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle(),
    supabase.from('entitlements').select('stripe_customer_id').eq('user_id', user.id),
  ])
  const customerId = prof?.stripe_customer_id || (ents ?? []).find((e) => e.stripe_customer_id)?.stripe_customer_id || null
  if (!customerId) return Response.json({ error: 'none' }, { status: 404 })

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = request.headers.get('origin') || 'https://camrhia.com'
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/settings` })
    return Response.json({ url: session.url })
  } catch (e: any) {
    return Response.json({ error: e?.message || 'Could not open billing.' }, { status: 500 })
  }
}
