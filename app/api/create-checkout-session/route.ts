import Stripe from 'stripe'

export async function POST(request: Request) {
  try {
    const { email, userId, interval, plan } = await request.json()

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    if (!email || !userId) {
      return Response.json({ error: 'email and userId are required' }, { status: 400 })
    }

    const isStudio = plan === 'studio'

    const priceId =
      interval === 'annual'
        ? (isStudio ? process.env.STRIPE_PRICE_ID_STUDIO_ANNUAL! : process.env.STRIPE_PRICE_ID_ANNUAL!)
        : (isStudio ? process.env.STRIPE_PRICE_ID_STUDIO! : process.env.STRIPE_PRICE_ID!)

    const origin = new URL(request.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: userId,
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
    })

    return Response.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    return Response.json({ error: message }, { status: 500 })
  }
}
