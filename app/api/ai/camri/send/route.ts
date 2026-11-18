import { adminDb, userFromRequest } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const uid = auth.user.id
    const body = await request.json()
    const key = typeof body.key === 'string' ? body.key : ''
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 1500) : ''
    const [kind, id] = key.split(':')
    if (!text || !id || (kind !== 'inq' && kind !== 'wed')) return Response.json({ error: 'Nothing to send.' }, { status: 400 })
    const db = adminDb() as any
    if (kind === 'inq') {
      const { data } = await db.from('inquiries').select('id').eq('id', id).eq('photographer_id', uid).maybeSingle()
      if (!data) return Response.json({ error: 'That thread is not yours.' }, { status: 403 })
      const { error } = await db.from('inquiry_messages').insert({ inquiry_id: id, sender_id: uid, body: text })
      if (error) return Response.json({ error: 'Could not send.' }, { status: 500 })
    } else {
      const { data } = await db.from('weddings').select('id').eq('id', id).eq('owner_id', uid).maybeSingle()
      if (!data) return Response.json({ error: 'That thread is not yours.' }, { status: 403 })
      const { error } = await db.from('messages').insert({ wedding_id: id, sender: 'photographer', body: text })
      if (error) return Response.json({ error: 'Could not send.' }, { status: 500 })
    }
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Could not send.' }, { status: 500 })
  }
}
