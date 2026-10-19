import { NextResponse } from 'next/server'
import { admin, verifyAccess } from '@/lib/galleryServer'

export const dynamic = 'force-dynamic'

// Called by the gallery page after a client finishes "Download all".
export async function POST(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  const body = await req.json().catch(() => ({}))
  const galleryId = verifyAccess(body.access)
  if (!galleryId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: g } = await sb.from('galleries').select('owner_id, session_id, title').eq('id', galleryId).maybeSingle()
  if (!g || !g.session_id) return NextResponse.json({ ok: true })

  // Ignore the photographer downloading their own gallery.
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (jwt) {
    const { data: u } = await sb.auth.getUser(jwt)
    if (u.user?.id && u.user.id === g.owner_id) return NextResponse.json({ ok: true })
  }

  const { data: w } = await sb.from('weddings').select('id, names, gallery_downloaded_all_at').eq('id', g.session_id).maybeSingle()
  if (w && !w.gallery_downloaded_all_at) {
    await sb.from('weddings').update({ gallery_downloaded_all_at: new Date().toISOString() }).eq('id', w.id)
    await sb.from('notifications').insert({
      user_id: g.owner_id,
      wedding_id: w.id,
      type: 'session_update',
      title: 'Gallery downloaded',
      body: `${w.names || 'Your client'} downloaded all photos from "${g.title || 'their gallery'}". Their copy is safe on their device, so you can free up storage if you like.`,
    })
  }
  return NextResponse.json({ ok: true })
}
