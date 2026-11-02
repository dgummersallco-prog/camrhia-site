import { NextResponse } from 'next/server'
import { admin } from '@/lib/galleryServer'

// Shows a client-gallery photo on a photographer's public website, but only when
// that gallery has been connected to a website gallery. Rejected photos never show.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const sb = admin()
  if (!sb) return new NextResponse('Not available', { status: 503 })

  const { data: p } = await sb.from('gallery_photos').select('gallery_id, web_path, thumb_path, cull_label').eq('id', id).maybeSingle()
  if (!p || p.cull_label === 'reject') return new NextResponse('Not found', { status: 404 })

  const { data: link } = await sb.from('website_galleries').select('id').eq('source_gallery_id', p.gallery_id).limit(1)
  if (!link || link.length === 0) return new NextResponse('Not found', { status: 404 })

  const path = p.web_path || p.thumb_path
  if (!path) return new NextResponse('Not found', { status: 404 })

  const { data: signed } = await sb.storage.from('galleries').createSignedUrl(path, 6 * 3600)
  if (!signed?.signedUrl) return new NextResponse('Not found', { status: 404 })

  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { 'Cache-Control': 'public, max-age=1800' } })
}
