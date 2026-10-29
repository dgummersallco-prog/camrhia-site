import type { SupabaseClient } from '@supabase/supabase-js'

export type CThread = {
  key: string
  kind: 'inq' | 'wed'
  id: string
  name: string
  snippet: string
  lastAt: string
  unread: boolean
  href: string
}

const SPECIAL: Record<string, string> = {
  packages: 'Shared pricing packages',
  package_selected: 'Selected a package',
  package_change: 'Updated the package',
  questionnaire: 'Sent a questionnaire',
}

function snip(body: string, type: string | null): string {
  if (type && type !== 'text') return SPECIAL[type] ?? 'Update'
  const t = (body ?? '').trim()
  return t.length > 80 ? t.slice(0, 80) + '…' : t
}

// Same rule as the app: unread when the other side's newest message is newer
// than this user's thread_reads row (or the thread was never opened).
function isUnread(otherAt: string | undefined, readAt: string | undefined): boolean {
  if (!otherAt) return false
  if (!readAt) return true
  return otherAt > readAt
}

export async function loadClientThreads(sb: SupabaseClient, me: string): Promise<CThread[]> {
  const [inqR, hidR, readR, portalR] = await Promise.all([
    sb.from('inquiries').select('id, photographer_id, status, session_type, created_at, converted_wedding_id').eq('couple_id', me),
    sb.from('hidden_threads').select('*').eq('user_id', me),
    sb.from('thread_reads').select('inquiry_id, wedding_id, read_at').eq('user_id', me),
    sb.rpc('client_portal_sessions'),
  ])
  const hiddenInq = new Set<string>(); const hiddenWed = new Set<string>()
  ;((hidR.data ?? []) as any[]).forEach((h) => { if (h.inquiry_id) hiddenInq.add(h.inquiry_id); if (h.wedding_id) hiddenWed.add(h.wedding_id) })
  const readAt = new Map<string, string>()
  ;((readR.data ?? []) as any[]).forEach((r) => {
    if (r.inquiry_id) readAt.set('inq:' + r.inquiry_id, r.read_at)
    if (r.wedding_id) readAt.set('wed:' + r.wedding_id, r.read_at)
  })
  const inqs = ((inqR.data ?? []) as any[]).filter((i) => !hiddenInq.has(i.id))
  const converted = new Set<string>(inqs.filter((i) => i.converted_wedding_id).map((i) => i.converted_wedding_id))
  const sessions = ((portalR.data ?? []) as any[]).filter((r) => !hiddenWed.has(r.wedding_id) && !converted.has(r.wedding_id))

  const studios: Record<string, string> = {}
  await Promise.all(
    Array.from(new Set(inqs.map((i) => i.photographer_id as string))).map(async (pid) => {
      const { data } = await sb.rpc('get_photographer_public_info', { p_id: pid })
      const d = (Array.isArray(data) ? data[0] : data) as { studio_name?: string; display_name?: string } | null
      studios[pid] = d?.studio_name || d?.display_name || 'Photographer'
    }),
  )

  const [imR, wmList] = await Promise.all([
    inqs.length
      ? sb.from('inquiry_messages').select('inquiry_id, body, sender_id, created_at, message_type').in('inquiry_id', inqs.map((i) => i.id)).is('deleted_at', null).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    Promise.all(sessions.map(async (r) => {
      const { data: pair } = await sb.rpc('pair_inquiry_for_wedding', { p_wedding: r.wedding_id })
      if (pair) return { id: r.wedding_id as string, msgs: [] as any[] }
      const { data } = await sb.rpc('client_get_thread', { p_wedding_id: r.wedding_id })
      return { id: r.wedding_id as string, msgs: ((data ?? []) as any[]) }
    })),
  ])

  const lastI = new Map<string, any>(); const otherI = new Map<string, string>()
  ;((imR.data ?? []) as any[]).forEach((m) => {
    if (!lastI.has(m.inquiry_id)) lastI.set(m.inquiry_id, m)
    if (m.sender_id !== me && !otherI.has(m.inquiry_id)) otherI.set(m.inquiry_id, m.created_at)
  })

  const out: CThread[] = []
  inqs.forEach((i) => {
    const l = lastI.get(i.id)
    const studio = studios[i.photographer_id] ?? 'Photographer'
    out.push({
      key: 'inq:' + i.id, kind: 'inq', id: i.id, name: studio,
      snippet: l ? snip(l.body, l.message_type) : 'No messages yet',
      lastAt: l?.created_at ?? i.created_at,
      unread: isUnread(otherI.get(i.id), readAt.get('inq:' + i.id)),
      href: `/my/inquiry/${i.id}?s=${encodeURIComponent(studio)}`,
    })
  })
  wmList.forEach(({ id, msgs }) => {
    if (msgs.length === 0) return
    const r = sessions.find((x) => x.wedding_id === id)
    const studio = r?.studio_name || r?.display_name || 'Your photographer'
    const sorted = [...msgs].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    const last = sorted[0]
    const otherAt = sorted.find((m) => m.sender !== 'couple')?.created_at
    out.push({
      key: 'wed:' + id, kind: 'wed', id, name: studio,
      snippet: snip(last.body, null), lastAt: last.created_at,
      unread: isUnread(otherAt, readAt.get('wed:' + id)),
      href: `/my/messages/${id}?s=${encodeURIComponent(studio)}`,
    })
  })
  out.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1))
  return out
}
