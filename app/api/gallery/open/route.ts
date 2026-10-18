import { NextResponse } from 'next/server'
import { admin, isLive, signAccess, signMap, verifyAccess } from '@/lib/galleryServer'

export const dynamic = 'force-dynamic'

// Only use the studio accent if it is a hex color dark enough for white text.
function usableAccent(c: string | null | undefined): string | null {
  if (!c || !/^#[0-9a-fA-F]{6}$/.test(c)) return null
  const n = parseInt(c.slice(1), 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.72 ? null : c
}

export async function POST(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const token = String(body.token ?? '')
  const pin = body.pin ? String(body.pin) : ''
  const visitorId = body.visitorId ? String(body.visitorId).slice(0, 64) : ''
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  const { data: g } = await sb
    .from('galleries')
    .select('id, owner_id, title, pin_hash, allow_downloads, expires_at, status, cover_photo_id')
    .eq('token', token)
    .maybeSingle()
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const live = isLive(g)
  if (live === 'missing') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (live === 'expired') return NextResponse.json({ error: 'Expired' }, { status: 410 })

  const { data: prof } = await sb
    .from('profiles')
    .select('studio_name, display_name, accent_color')
    .eq('id', g.owner_id)
    .maybeSingle()
  const brand = {
    name: (prof?.studio_name as string | null) || (prof?.display_name as string | null) || null,
    accent: usableAccent(prof?.accent_color as string | null),
  }

  if (g.pin_hash) {
    const hasAccess = verifyAccess(body.access) === g.id
    if (!hasAccess) {
      if (!pin) return NextResponse.json({ needsPin: true, title: g.title, brand }, { status: 401 })
      const ip =
        req.headers.get('x-nf-client-connection-ip') ||
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        ''
      const { data, error } = await sb.rpc('check_gallery_pin_limited', { p_token: token, p_pin: pin, p_ip: ip })
      const res = data as { ok?: boolean; locked?: boolean; retry_after?: number; remaining?: number } | null
      if (error || !res) {
        return NextResponse.json({ needsPin: true, title: g.title, brand, error: 'Something went wrong. Please try again.' }, { status: 500 })
      }
      if (res.locked) {
        const mins = Math.max(1, Math.ceil((res.retry_after ?? 600) / 60))
        return NextResponse.json(
          { needsPin: true, title: g.title, brand, locked: true, error: `Too many tries. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again.` },
          { status: 403 },
        )
      }
      if (!res.ok) {
        const left = res.remaining ?? 0
        return NextResponse.json(
          { needsPin: true, title: g.title, brand, error: left > 0 && left <= 2 ? `Wrong PIN. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Wrong PIN' },
          { status: 403 },
        )
      }
    }
  }

  const photos: { id: string; filename: string | null; width: number | null; height: number | null; web_path: string | null; thumb_path: string | null }[] = []
  for (let from = 0; ; from += 1000) {
    const { data } = await sb
      .from('gallery_photos')
      .select('id, filename, width, height, web_path, thumb_path')
      .eq('gallery_id', g.id)
      .order('sort_order', { ascending: true })
      .range(from, from + 999)
    const batch = data ?? []
    photos.push(...batch)
    if (batch.length < 1000) break
  }

  const SIX_HOURS = 6 * 3600
  const urls = await signMap(
    sb,
    photos.flatMap((p) => [p.thumb_path, p.web_path]).filter((x): x is string => !!x),
    SIX_HOURS,
  )

  let favorites: string[] = []
  if (visitorId) {
    const { data } = await sb.from('gallery_favorites').select('photo_id').eq('gallery_id', g.id).eq('visitor_id', visitorId)
    favorites = (data ?? []).map((r: { photo_id: string }) => r.photo_id)
  }

  return NextResponse.json({
    title: g.title,
    brand,
    allowDownloads: g.allow_downloads,
    coverId: g.cover_photo_id,
    access: signAccess(g.id),
    favorites,
    photos: photos.map((p) => ({
      id: p.id,
      filename: p.filename,
      width: p.width,
      height: p.height,
      thumb: p.thumb_path ? urls[p.thumb_path] ?? null : null,
      web: p.web_path ? urls[p.web_path] ?? null : null,
    })),
  })
}
