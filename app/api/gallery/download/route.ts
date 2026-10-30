import { NextResponse } from 'next/server'
import { admin, isLive, verifyAccess } from '@/lib/galleryServer'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const url = new URL(req.url)
  const galleryId = verifyAccess(url.searchParams.get('access'))
  const photoId = url.searchParams.get('photo') ?? ''
  if (!galleryId || !photoId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: g } = await sb
    .from('galleries')
    .select('allow_downloads, status, expires_at')
    .eq('id', galleryId)
    .maybeSingle()
  if (!g || isLive(g) !== 'ok') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!g.allow_downloads) return NextResponse.json({ error: 'Downloads are turned off' }, { status: 403 })

  const { data: photo } = await sb
    .from('gallery_photos')
    .select('orig_path, full_path, filename')
    .eq('id', photoId)
    .eq('gallery_id', galleryId)
    .maybeSingle()
  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const jpgName = photo.full_path && photo.filename ? photo.filename.replace(/\.[^.]+$/, '') + '.jpg' : photo.filename
  const { data, error } = await sb.storage
    .from('galleries')
    .createSignedUrl(photo.full_path ?? photo.orig_path, 120, { download: jpgName ?? true })
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'Could not prepare download' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl, 302)
}
