import { NextResponse } from 'next/server'
import { admin, verifyAccess } from '@/lib/galleryServer'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const galleryId = verifyAccess(body.access)
  const photoId = String(body.photoId ?? '')
  const visitorId = String(body.visitorId ?? '').slice(0, 64)
  if (!galleryId || !photoId || visitorId.length < 8) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: photo } = await sb
    .from('gallery_photos')
    .select('id')
    .eq('id', photoId)
    .eq('gallery_id', galleryId)
    .maybeSingle()
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (body.on) {
    const { error } = await sb
      .from('gallery_favorites')
      .upsert({ gallery_id: galleryId, photo_id: photoId, visitor_id: visitorId }, { onConflict: 'photo_id,visitor_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await sb
      .from('gallery_favorites')
      .delete()
      .eq('gallery_id', galleryId)
      .eq('photo_id', photoId)
      .eq('visitor_id', visitorId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
