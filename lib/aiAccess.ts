import { adminDb } from '@/lib/stripeServer'

// Camri access: anyone on the AI_BETA_EMAILS list, plus every comped account.
export async function hasCamriAccess(userId: string, email: string): Promise<boolean> {
  const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (email && beta.includes(email)) return true
  try {
    const { data } = await (adminDb() as any).from('profiles').select('subscription_status').eq('id', userId).maybeSingle()
    return data?.subscription_status === 'comped'
  } catch {
    return false
  }
}
