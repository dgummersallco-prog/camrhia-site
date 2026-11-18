import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PRODUCTS, type ProductKey } from '../../../../lib/products'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!token) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: auth } = await supabase.auth.getUser(token)
  const user = auth?.user
  if (!user) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const key = body.product as ProductKey
  const product = PRODUCTS[key]
  if (!product) return Response.json({ error: 'Unknown product' }, { status: 400 })
  const price = body.interval === 'year' ? product.yearly : product.monthly

  // Reuse their Stripe customer if they already have one
  const [{ data: prof }, { data: ents }] = await Promise.all([
    supabase.from('profiles').select('stripe_customer_id, trial_ends_at').eq('id', user.id).maybeSingle(),
    supabase.from('entitlements').select('product, stripe_customer_id').eq('user_id', user.id),
  ])
  const customerId =
    prof?.stripe_customer_id ||
    (ents ?? []).find((e) => e.stripe_customer_id)?.stripe_customer_id ||
    null

  // No second free trial. If their 14 days are still running, start billing when they end.
  const trialEndMs = prof?.trial_ends_at ? new Date(prof.trial_ends_at as string).getTime() : 0
  const trialEnd = trialEndMs > Date.now() + 49 * 3600 * 1000 ? Math.floor(trialEndMs / 1000) : 0

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const origin = request.headers.get('origin') || 'https://camrhia.com'

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    ...(customerId ? { customer: customerId } : { customer_email: user.email ?? undefined }),
    subscription_data: trialEnd > 0 ? { trial_end: trialEnd } : undefined,
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard?upgraded=${key}`,
    cancel_url: `${origin}/upgrade/${key}`,
  })

  return Response.json({ url: session.url })
}
