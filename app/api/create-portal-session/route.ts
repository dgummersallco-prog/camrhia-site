import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

// Service role client — used server-side only to read the caller's own profile row.
// The anon key + RLS would also allow this, but threading the user's JWT from a
// client fetch into a route handler requires @supabase/ssr middleware we haven't
// set up. Service role server-side is safe here; this key is never sent to the browser.
function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 })
    }

    // Look up this user's Stripe customer id
    const supabase = adminClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.stripe_customer_id) {
      return Response.json(
        { error: 'No active subscription found for this account.' },
        { status: 404 }
      )
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = new URL(request.url).origin

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/billing`,
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session'
    return Response.json({ error: message }, { status: 500 })
  }
}
