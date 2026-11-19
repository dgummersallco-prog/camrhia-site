import { NextResponse } from 'next/server'
import { admin, signMap } from '@/lib/galleryServer'

export const dynamic = 'force-dynamic'

// For a signed-in client: cover photo URL + photo count for their own galleries.
// Only galleries that belong to sessions linked to this user (and already sent) are returned.
export async function POST(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: u } = await sb.auth.getUser(jwt)
  const uid = u.user?.id
  if (!uid) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const visitorId = body.visitorId ? String(body.visitorId).slice(0, 64) : ''
  const tokens: string[] = (Array.isArray(body.tokens) ? body.tokens : []).map((t: unknown) => String(t)).slice(0, 100)
  if (tokens.length === 0) return NextResponse.json({ galleries: {} })

  const { data: weds } = await sb
    .from('weddings')
    .select('id, gallery_sent_at')
    .eq('couple_user_id', uid)
    .not('gallery_sent_at', 'is', null)
  const wedIds = (weds ?? []).map((w: { id: string }) => w.id)
  const sentMap = new Map<string, string | null>((weds ?? []).map((w: { id: string; gallery_sent_at: string | null }) => [w.id, w.gallery_sent_at] as [string, string | null]))
  if (wedIds.length === 0) return NextResponse.json({ galleries: {} })

  const { data: gs } = await sb
    .from('galleries')
    .select('id, token, cover_photo_id, session_id')
    .in('token', tokens)
    .in('session_id', wedIds)
    .neq('status', 'draft')

  const rows: { token: string; count: number; path: string | null; bytes: number; favs: number; sent: string | null }[] = []
  await Promise.all(
    (gs ?? []).map(async (g: { id: string; token: string; cover_photo_id: string | null; session_id: string }) => {
      const { count } = await sb.from('gallery_photos').select('id', { count: 'exact', head: true }).eq('gallery_id', g.id)
      let photo: { web_path: string | null; thumb_path: string | null } | null = null
      if (g.cover_photo_id) {
        const { data } = await sb.from('gallery_photos').select('web_path, thumb_path').eq('id', g.cover_photo_id).maybeSingle()
        photo = data as typeof photo
      }
      if (!photo) {
        const { data } = await sb
          .from('gallery_photos')
          .select('web_path, thumb_path')
          .eq('gallery_id', g.id)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()
        photo = data as typeof photo
      }
      const pp = photo as { web_path: string | null; thumb_path: string | null } | null
      let bytes = 0
      for (let from = 0; ; from += 1000) {
        const { data: sz } = await sb.from('gallery_photos').select('size_bytes').eq('gallery_id', g.id).range(from, from + 999)
        const b = (sz ?? []) as { size_bytes: number | null }[]
        bytes += b.reduce((a, x) => a + (Number(x.size_bytes) || 0), 0)
        if (b.length < 1000) break
      }
      let favs = 0
      if (visitorId) {
        const { count: fc } = await sb.from('gallery_favorites').select('photo_id', { count: 'exact', head: true }).eq('gallery_id', g.id).eq('visitor_id', visitorId)
        favs = fc ?? 0
      }
      rows.push({ token: g.token, count: count ?? 0, path: pp?.web_path || pp?.thumb_path || null, bytes, favs, sent: sentMap.get(g.session_id) ?? null })
    }),
  )

  const urls = await signMap(sb, rows.map((r) => r.path).filter((x): x is string => !!x), 6 * 3600)
  const galleries: Record<string, { cover: string | null; count: number; bytes: number; favs: number; sent: string | null }> = {}
  rows.forEach((r) => { galleries[r.token] = { cover: r.path ? urls[r.path] ?? null : null, count: r.count, bytes: r.bytes, favs: r.favs, sent: r.sent } })
  return NextResponse.json({ galleries })
}
