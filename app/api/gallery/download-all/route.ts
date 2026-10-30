import { NextResponse } from 'next/server'
import { admin, isLive, signMap, verifyAccess } from '@/lib/galleryServer'
import { isVisible } from '@/lib/galleryAudience'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const url = new URL(req.url)
  const galleryId = verifyAccess(url.searchParams.get('access'))
  if (!galleryId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: g } = await sb
    .from('galleries')
    .select('title, allow_downloads, status, expires_at, audience')
    .eq('id', galleryId)
    .maybeSingle()
  if (!g || isLive(g) !== 'ok') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!g.allow_downloads) return NextResponse.json({ error: 'Downloads are turned off' }, { status: 403 })

  const photos: { id: string; filename: string | null; orig_path: string; full_path: string | null; size_bytes: number | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from('gallery_photos')
      .select('id, filename, orig_path, full_path, size_bytes, cull_label')
      .eq('gallery_id', galleryId)
      .order('sort_order', { ascending: true })
      .range(from, from + 999)
    const batch = data ?? []
    photos.push(...batch.filter((p: { cull_label: string | null }) => isVisible(p.cull_label, g.audience)))
    if (batch.length < 1000) break
  }

  const SIX_HOURS = 6 * 3600
  const urls = await signMap(sb, photos.map((p) => p.full_path ?? p.orig_path).filter((x): x is string => !!x), SIX_HOURS)

  const seen = new Map<string, number>()
  const files = photos
    .filter((p) => { const k = p.full_path ?? p.orig_path; return k && urls[k] })
    .map((p, i) => {
      const raw = (p.filename && p.filename.trim()) || `photo-${i + 1}.jpg`
      const base = p.full_path ? raw.replace(/\.[^.]+$/, '') + '.jpg' : raw
      const n = seen.get(base.toLowerCase()) ?? 0
      seen.set(base.toLowerCase(), n + 1)
      let name = base
      if (n > 0) {
        const dot = base.lastIndexOf('.')
        name = dot > 0 ? `${base.slice(0, dot)} (${n + 1})${base.slice(dot)}` : `${base} (${n + 1})`
      }
      return { id: p.id, name, size: p.full_path ? null : p.size_bytes, url: urls[p.full_path ?? p.orig_path] }
    })

  return NextResponse.json({ title: g.title, files })
}
