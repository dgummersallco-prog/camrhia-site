import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const stripeClient = () => new Stripe(process.env.STRIPE_CONNECT_SECRET_KEY!)

export const adminDb = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Reads the signed-in user from the Authorization: Bearer <access token> header.
export async function userFromRequest(request: Request) {
  const token = (request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await adminDb().auth.getUser(token)
  if (error || !data.user) return null
  return { user: data.user, token }
}

// A client that acts as the signed-in user, so row-level security applies.
export const userDb = (token: string) =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: 'Bearer ' + token } },
  })
