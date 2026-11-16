import { NextResponse } from 'next/server'
import { admin, verifyAccess } from '@/lib/galleryServer'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const sb = admin()
  if (!sb) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const body = await req.json().catch(() => ({}))
  const galleryId = verifyAccess(body.access)
  if (!galleryId) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const rating = Number(body.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Pick a star rating' }, { status: 400 })
  }
  const text = String(body.body ?? '').trim().slice(0, 2000)
  const name = String(body.name ?? '').trim().slice(0, 80)
  const visitorId = body.visitorId ? String(body.visitorId).slice(0, 64) : null

  const { data: g } = await sb.from('galleries').select('id, owner_id, title, session_id').eq('id', galleryId).maybeSingle()
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // One review per visitor per gallery: editing replaces it and goes back to pending.
  let existingId: string | null = null
  if (visitorId) {
    const { data: ex } = await sb.from('gallery_reviews').select('id').eq('gallery_id', g.id).eq('visitor_id', visitorId).maybeSingle()
    existingId = ex?.id ?? null
  }

  if (existingId) {
    await sb.from('gallery_reviews').update({ rating, body: text || null, reviewer_name: name || null, approved: false }).eq('id', existingId)
  } else {
    await sb.from('gallery_reviews').insert({
      gallery_id: g.id,
      photographer_id: g.owner_id,
      visitor_id: visitorId,
      rating,
      body: text || null,
      reviewer_name: name || null,
    })
    try {
      await sb.from('notifications').insert({
        user_id: g.owner_id,
        wedding_id: g.session_id ?? null,
        type: 'session_update',
        title: 'New review',
        body: `${name || 'A client'} left you ${rating} star${rating === 1 ? '' : 's'}.`,
      })
    } catch { /* never block the review */ }
  }
  return NextResponse.json({ ok: true })
}
