import { NextResponse } from 'next/server'
import { admin, signMap } from '@/lib/galleryServer'

export const dynamic = 'force-dynamic'

// Photographer-only: list signed original-file URLs for one of their own galleries.
export async function GET(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: u } = await sb.auth.getUser(token)
  if (!u?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const galleryId = new URL(req.url).searchParams.get('id')
  if (!galleryId) return NextResponse.json({ error: 'Missing gallery' }, { status: 400 })

  const { data: g } = await sb.from('galleries').select('title, owner_id').eq('id', galleryId).maybeSingle()
  if (!g || g.owner_id !== u.user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const photos: { id: string; filename: string | null; orig_path: string }[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from('gallery_photos')
      .select('id, filename, orig_path')
      .eq('gallery_id', galleryId)
      .order('sort_order', { ascending: true })
      .range(from, from + 999)
    const batch = data ?? []
    photos.push(...batch)
    if (batch.length < 1000) break
  }

  const urls = await signMap(sb, photos.map((p) => p.orig_path).filter((x): x is string => !!x), 6 * 3600)

  const seen = new Map<string, number>()
  const files = photos
    .filter((p) => p.orig_path && urls[p.orig_path])
    .map((p, i) => {
      const base = (p.filename && p.filename.trim()) || `photo-${i + 1}.jpg`
      const n = seen.get(base.toLowerCase()) ?? 0
      seen.set(base.toLowerCase(), n + 1)
      let name = base
      if (n > 0) {
        const dot = base.lastIndexOf('.')
        name = dot > 0 ? `${base.slice(0, dot)} (${n + 1})${base.slice(dot)}` : `${base} (${n + 1})`
      }
      return { name, url: urls[p.orig_path] }
    })

  return NextResponse.json({ title: g.title, files })
}
