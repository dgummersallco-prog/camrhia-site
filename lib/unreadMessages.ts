import type { SupabaseClient } from '@supabase/supabase-js'

// Same rule as the app: a thread is unread when the client's newest message is
// newer than this user's thread_reads row (or the thread was never opened).
export async function fetchUnreadCount(sb: SupabaseClient, me: string): Promise<number> {
  const [inqR, wedR, hidR, readR, blkR] = await Promise.all([
    sb.from('inquiries').select('id, couple_id, converted_wedding_id').eq('photographer_id', me),
    sb.from('weddings').select('id').eq('owner_id', me),
    sb.from('hidden_threads').select('inquiry_id, wedding_id').eq('user_id', me),
    sb.from('thread_reads').select('inquiry_id, wedding_id, read_at').eq('user_id', me),
    sb.from('blocked_users').select('blocker_id, blocked_id').or(`blocker_id.eq.${me},blocked_id.eq.${me}`),
  ])
  const blocked = new Set<string>()
  ;((blkR.data ?? []) as any[]).forEach((b) => blocked.add(b.blocker_id === me ? b.blocked_id : b.blocker_id))
  const hiddenInq = new Set<string>(); const hiddenWed = new Set<string>()
  ;((hidR.data ?? []) as any[]).forEach((h) => { if (h.inquiry_id) hiddenInq.add(h.inquiry_id); if (h.wedding_id) hiddenWed.add(h.wedding_id) })
  const readAt = new Map<string, string>()
  ;((readR.data ?? []) as any[]).forEach((r) => {
    if (r.inquiry_id) readAt.set('inq:' + r.inquiry_id, r.read_at)
    if (r.wedding_id) readAt.set('wed:' + r.wedding_id, r.read_at)
  })
  const inqs = ((inqR.data ?? []) as any[]).filter((i) => !hiddenInq.has(i.id) && !(i.couple_id && blocked.has(i.couple_id)))
  const converted = new Set<string>(inqs.filter((i) => i.converted_wedding_id).map((i) => i.converted_wedding_id))
  const weds = ((wedR.data ?? []) as any[]).filter((w) => !hiddenWed.has(w.id) && !converted.has(w.id))

  const [imR, wmR] = await Promise.all([
    inqs.length
      ? sb.from('inquiry_messages').select('inquiry_id, created_at').in('inquiry_id', inqs.map((i) => i.id)).is('deleted_at', null).neq('sender_id', me)
      : Promise.resolve({ data: [] as any[] }),
    weds.length
      ? sb.from('messages').select('wedding_id, created_at').in('wedding_id', weds.map((w) => w.id)).eq('sender', 'couple')
      : Promise.resolve({ data: [] as any[] }),
  ])
  const newest = new Map<string, string>()
  ;((imR.data ?? []) as any[]).forEach((m) => { const k = 'inq:' + m.inquiry_id; if (!newest.has(k) || m.created_at > newest.get(k)!) newest.set(k, m.created_at) })
  ;((wmR.data ?? []) as any[]).forEach((m) => { const k = 'wed:' + m.wedding_id; if (!newest.has(k) || m.created_at > newest.get(k)!) newest.set(k, m.created_at) })
  let n = 0
  newest.forEach((at, k) => { const r = readAt.get(k); if (!r || at > r) n++ })
  return n
}
