import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'

export type Admin = SupabaseClient

export function admin(): Admin | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
}

export function signAccess(galleryId: string, hours = 12): string {
  const exp = Date.now() + hours * 3600 * 1000
  const body = `${galleryId}.${exp}`
  const sig = createHmac('sha256', secret()).update(body).digest('hex')
  return `${body}.${sig}`
}

// Returns the gallery id the token was issued for, or null if invalid/expired.
export function verifyAccess(token: string | null | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [gid, exp, sig] = parts
  const expected = createHmac('sha256', secret()).update(`${gid}.${exp}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  if (Number(exp) < Date.now()) return null
  return gid
}

export async function signMap(sb: Admin, paths: string[], seconds: number): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  const chunks: string[][] = []
  for (let i = 0; i < paths.length; i += 200) chunks.push(paths.slice(i, i + 200))
  await Promise.all(
    chunks.map(async (c) => {
      const { data } = await sb.storage.from('galleries').createSignedUrls(c, seconds)
      data?.forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl })
    }),
  )
  return map
}

export function isLive(g: { status: string; expires_at: string | null }): 'ok' | 'missing' | 'expired' {
  if (g.status !== 'published') return 'missing'
  if (g.expires_at && new Date(g.expires_at).getTime() < Date.now()) return 'expired'
  return 'ok'
}
