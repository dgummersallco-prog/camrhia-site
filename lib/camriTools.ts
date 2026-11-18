/* eslint-disable @typescript-eslint/no-explicit-any */
// Read-only lookups Camri can run for one photographer. Every query is scoped to owner_id.

export const CAMRI_TOOLS = [
  { name: 'get_overview', description: 'Big-picture numbers for the studio: sessions, packages per session type, unsigned contracts, money owed, leads, galleries. Start here for broad questions.', input_schema: { type: 'object', properties: {} } },
  { name: 'list_sessions', description: 'List sessions (shoots/clients). Filter by when, session type, or a name search.', input_schema: { type: 'object', properties: { when: { type: 'string', enum: ['upcoming', 'past', 'all'] }, session_type: { type: 'string' }, search: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'get_session', description: 'Everything about one session: dates, package, price, balance, payments, contract status, contact info, gallery. Pass the session id or part of the name.', input_schema: { type: 'object', properties: { id_or_name: { type: 'string' } }, required: ['id_or_name'] } },
  { name: 'list_packages', description: 'All of the photographer\'s packages with exact prices, what is included, delivery days and whether they show publicly. Includes counts and price ranges per session type.', input_schema: { type: 'object', properties: { session_type: { type: 'string' } } } },
  { name: 'pricing_insights', description: 'Facts for pricing advice: per session type, how many sessions were booked, average booked price, which packages are booked most, and the package price range.', input_schema: { type: 'object', properties: {} } },
  { name: 'list_questionnaires', description: 'How many questions are in each session type\'s questionnaire. Pass session_type to also get every question (section and wording) so you can reword them.', input_schema: { type: 'object', properties: { session_type: { type: 'string' } } } },
  { name: 'list_contracts', description: 'Contracts per session with status (draft, sent, signed), sent and signed dates, and whether the photographer countersigned.', input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['draft', 'sent', 'signed', 'all'] } } } },
  { name: 'get_contract', description: 'The full text of one session\'s contract so you can answer questions about its terms.', input_schema: { type: 'object', properties: { id_or_name: { type: 'string' } }, required: ['id_or_name'] } },
  { name: 'list_specials', description: 'Special offers (ad pages) with link, published or not, and how many leads each has brought in (total and new).', input_schema: { type: 'object', properties: {} } },
  { name: 'list_leads', description: 'People who signed up on specials: name, email, phone, which special, when, and whether handled.', input_schema: { type: 'object', properties: { special: { type: 'string' }, only_new: { type: 'boolean' } } } },
  { name: 'list_galleries', description: 'Galleries with published or draft status, photo count, linked session, and whether the client was sent it, opened it, or downloaded everything.', input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['draft', 'published', 'all'] } } } },
  { name: 'get_schedule', description: 'Calendar for a date range: sessions, calendar events, blocked days and mini-session slots. Dates are YYYY-MM-DD.', input_schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } } },
  { name: 'list_payments', description: 'Scheduled payments, with who owes what and when it is due.', input_schema: { type: 'object', properties: { unpaid_only: { type: 'boolean' } } } },
  { name: 'list_threads', description: 'Message threads with clients: who wrote last, whether the client is waiting for a reply, and the latest message.', input_schema: { type: 'object', properties: { only_waiting: { type: 'boolean' } } } },
  { name: 'get_thread', description: 'The recent messages in one thread. Use the thread key from list_threads.', input_schema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] } },
  { name: 'propose_message', description: 'Draft a message to a client for the photographer to approve. Nothing is sent until they tap Send. Use the thread key from list_threads. Write it in the photographer\'s warm voice, ready to send.', input_schema: { type: 'object', properties: { key: { type: 'string' }, text: { type: 'string' } }, required: ['key', 'text'] } },
] as const

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}
const cut = (v: unknown, n: number) => (typeof v === 'string' && v.length > n ? v.slice(0, n) + '...' : v)
const today = () => new Date().toISOString().slice(0, 10)

export type CamriAction = { type: 'send_message'; key: string; name: string; text: string }

export async function runCamriTool(name: string, input: any, db: any, uid: string, out: { action?: CamriAction }): Promise<unknown> {
  input = input ?? {}
  const sessionsQ = () => db.from('weddings').select('*').eq('owner_id', uid).limit(500)

  async function findSession(q: string) {
    const { data } = await sessionsQ()
    const all: any[] = data ?? []
    const byId = all.find((s) => s.id === q)
    if (byId) return byId
    const low = String(q).toLowerCase()
    return all.find((s) => (s.names ?? '').toLowerCase().includes(low)) ?? null
  }

  switch (name) {
    case 'get_overview': {
      const [w, pk, ct, fp, g, pay, qq] = await Promise.all([
        sessionsQ(),
        db.from('packages').select('id, session_type, price, is_mini').eq('owner_id', uid),
        db.from('contracts').select('wedding_id, status').eq('owner_id', uid),
        db.from('funnel_pages').select('id, name, style').eq('owner_id', uid),
        db.from('galleries').select('id, status').eq('owner_id', uid),
        db.from('payment_schedule').select('amount, paid_at').eq('owner_id', uid),
        db.from('questionnaire_questions').select('session_type').eq('owner_id', uid),
      ])
      const ss: any[] = w.data ?? []
      const t = today()
      const byType: Record<string, number> = {}
      ss.forEach((s) => { const k = s.session_type ?? 'other'; byType[k] = (byType[k] ?? 0) + 1 })
      const pkgType: Record<string, number> = {}
      ;(pk.data ?? []).forEach((p: any) => { const k = p.session_type ?? 'other'; pkgType[k] = (pkgType[k] ?? 0) + 1 })
      const ids = (fp.data ?? []).map((x: any) => x.id)
      let leads: any[] = []
      if (ids.length) leads = (await db.from('funnel_leads').select('id, handled_at').in('funnel_id', ids)).data ?? []
      const qTypes: Record<string, number> = {}
      ;(qq.data ?? []).forEach((q: any) => { const k = q.session_type ?? 'other'; qTypes[k] = (qTypes[k] ?? 0) + 1 })
      const cs: any[] = ct.data ?? []
      return {
        today: t,
        sessions_total: ss.length,
        sessions_upcoming: ss.filter((s) => s.wedding_date && s.wedding_date >= t).length,
        sessions_by_type: byType,
        packages_total: (pk.data ?? []).length,
        packages_by_session_type: pkgType,
        questions_by_session_type: qTypes,
        contracts: { sent_waiting: cs.filter((c) => c.status === 'sent').length, signed: cs.filter((c) => c.status === 'signed').length, draft: cs.filter((c) => !c.status || c.status === 'draft').length },
        money_owed_on_balances: ss.filter((s) => !s.paid_in_full).reduce((a, s) => a + Number(s.balance ?? 0), 0),
        unpaid_scheduled_payments: (pay.data ?? []).filter((p: any) => !p.paid_at).length,
        specials: (fp.data ?? []).filter((x: any) => x.style === 'special').length,
        leads_total: leads.length,
        leads_new: leads.filter((l) => !l.handled_at).length,
        galleries: { published: (g.data ?? []).filter((x: any) => x.status === 'published').length, draft: (g.data ?? []).filter((x: any) => x.status !== 'published').length },
      }
    }

    case 'list_sessions': {
      const { data } = await sessionsQ()
      let ss: any[] = data ?? []
      const t = today()
      const when = input.when ?? 'all'
      if (when === 'upcoming') ss = ss.filter((s) => s.wedding_date && s.wedding_date >= t).sort((a, b) => (a.wedding_date < b.wedding_date ? -1 : 1))
      else if (when === 'past') ss = ss.filter((s) => s.wedding_date && s.wedding_date < t).sort((a, b) => (a.wedding_date < b.wedding_date ? 1 : -1))
      if (input.session_type) ss = ss.filter((s) => s.session_type === input.session_type)
      if (input.search) ss = ss.filter((s) => (s.names ?? '').toLowerCase().includes(String(input.search).toLowerCase()))
      const lim = Math.min(Number(input.limit) || 40, 80)
      return { count: ss.length, sessions: ss.slice(0, lim).map((s) => ({ id: s.id, name: s.names, type: s.session_type, date: s.wedding_date, status: s.status, package: s.package_name, total_price: s.total_price, balance: s.balance, paid_in_full: s.paid_in_full, gallery_due: s.gallery_due_date, city: s.city, venue: s.venue })) }
    }

    case 'get_session': {
      const s = await findSession(input.id_or_name)
      if (!s) return { error: 'No session found with that name.' }
      const [pay, ct, cons, gal] = await Promise.all([
        db.from('payment_schedule').select('amount, status, due_date, paid_at').eq('wedding_id', s.id),
        db.from('contracts').select('status, sent_at, signed_at, photographer_signed_at').eq('wedding_id', s.id).maybeSingle(),
        db.from('wedding_contacts').select('name, role, phone').eq('wedding_id', s.id),
        db.from('galleries').select('id, title, status').eq('session_id', s.id),
      ])
      const { id, owner_id, couple_user_id, ...rest } = s
      void owner_id; void couple_user_id
      return { id, ...rest, payments: pay.data ?? [], contract: ct.data ?? null, contacts: cons.data ?? [], galleries: gal.data ?? [] }
    }

    case 'list_packages': {
      const { data } = await db.from('packages').select('id, name, detail, price, covers, session_type, show_public, category, delivery_days, is_mini').eq('owner_id', uid).order('sort_order', { ascending: true })
      let ps: any[] = data ?? []
      if (input.session_type) ps = ps.filter((p) => p.session_type === input.session_type)
      const groups: Record<string, { count: number; prices: number[] }> = {}
      ps.forEach((p) => { const k = p.session_type ?? 'other'; (groups[k] ??= { count: 0, prices: [] }); groups[k].count++; if (num(p.price) > 0) groups[k].prices.push(num(p.price)) })
      const summary: Record<string, unknown> = {}
      Object.entries(groups).forEach(([k, g]) => { summary[k] = { count: g.count, lowest: g.prices.length ? Math.min(...g.prices) : null, highest: g.prices.length ? Math.max(...g.prices) : null } })
      return { total: ps.length, by_session_type: summary, packages: ps.map((p) => ({ name: p.name, session_type: p.session_type, price: p.price, included: cut([p.detail, p.covers].filter(Boolean).join(' | '), 600), delivery_days: p.delivery_days, shows_on_website: p.show_public, mini: p.is_mini })) }
    }

    case 'pricing_insights': {
      const [w, pk] = await Promise.all([sessionsQ(), db.from('packages').select('name, price, session_type').eq('owner_id', uid)])
      const ss: any[] = w.data ?? []
      const booked = ss.filter((s) => s.status !== 'not_booked')
      const by: Record<string, any> = {}
      booked.forEach((s) => {
        const k = s.session_type ?? 'other'
        const b = (by[k] ??= { booked_sessions: 0, revenue_sum: 0, priced_sessions: 0, packages_booked: {} as Record<string, number> })
        b.booked_sessions++
        if (num(s.total_price) > 0) { b.revenue_sum += num(s.total_price); b.priced_sessions++ }
        if (s.package_name) b.packages_booked[s.package_name] = (b.packages_booked[s.package_name] ?? 0) + 1
      })
      const out2: Record<string, unknown> = {}
      Object.entries(by).forEach(([k, b]: [string, any]) => { out2[k] = { booked_sessions: b.booked_sessions, average_booked_price: b.priced_sessions ? Math.round(b.revenue_sum / b.priced_sessions) : null, packages_booked: b.packages_booked } })
      const ranges: Record<string, number[]> = {}
      ;(pk.data ?? []).forEach((p: any) => { if (num(p.price) > 0) (ranges[p.session_type ?? 'other'] ??= []).push(num(p.price)) })
      const rng: Record<string, unknown> = {}
      Object.entries(ranges).forEach(([k, a]) => { rng[k] = { lowest: Math.min(...a), highest: Math.max(...a), packages: a.length } })
      const dated = booked.filter((s) => s.wedding_date).length
      return { note: 'Small samples are not proof. Say so when the numbers are thin. No market data is included.', booked_sessions_total: booked.length, not_booked_sessions: ss.length - booked.length, sessions_with_dates: dated, by_session_type: out2, package_price_range: rng }
    }

    case 'list_questionnaires': {
      const { data } = await db.from('questionnaire_questions').select('*').eq('owner_id', uid).limit(1500)
      const qs: any[] = data ?? []
      const counts: Record<string, number> = {}
      qs.forEach((q) => { const k = q.session_type ?? 'other'; counts[k] = (counts[k] ?? 0) + 1 })
      if (!input.session_type) return { questions_per_session_type: counts }
      const mine = qs.filter((q) => q.session_type === input.session_type)
      return { session_type: input.session_type, count: mine.length, questions: mine.map((q) => ({ section: q.section, question: q.prompt })) }
    }

    case 'list_contracts': {
      const [c, w] = await Promise.all([db.from('contracts').select('wedding_id, status, sent_at, signed_at, photographer_signed_at, reminder_sent_at').eq('owner_id', uid), sessionsQ()])
      const nameOf = new Map<string, any>(((w.data ?? []) as any[]).map((s) => [s.id, s]))
      let rows: any[] = c.data ?? []
      const want = input.status && input.status !== 'all' ? input.status : null
      if (want) rows = rows.filter((r) => (r.status ?? 'draft') === want)
      return { count: rows.length, contracts: rows.slice(0, 80).map((r) => ({ session: nameOf.get(r.wedding_id)?.names ?? 'Unknown', session_date: nameOf.get(r.wedding_id)?.wedding_date ?? null, status: r.status ?? 'draft', sent_at: r.sent_at, signed_at: r.signed_at, you_countersigned: !!r.photographer_signed_at, last_reminder: r.reminder_sent_at })) }
    }

    case 'get_contract': {
      const s = await findSession(input.id_or_name)
      if (!s) return { error: 'No session found with that name.' }
      const { data } = await db.from('contracts').select('status, body, sent_at, signed_at, signer_name').eq('wedding_id', s.id).maybeSingle()
      if (!data) return { error: 'That session has no contract yet.' }
      return { session: s.names, status: data.status, sent_at: data.sent_at, signed_at: data.signed_at, signed_by: data.signer_name, text: cut(data.body, 9000) }
    }

    case 'list_specials': {
      const { data } = await db.from('funnel_pages').select('id, name, slug, published, created_at').eq('owner_id', uid).eq('style', 'special')
      const ps: any[] = data ?? []
      const leads: any[] = ps.length ? ((await db.from('funnel_leads').select('funnel_id, handled_at, created_at').in('funnel_id', ps.map((p) => p.id))).data ?? []) : []
      return { specials: ps.map((p) => { const l = leads.filter((x) => x.funnel_id === p.id); return { name: p.name, link: 'camrhia.com/go/' + p.slug, published: !!p.published, leads_total: l.length, leads_new: l.filter((x) => !x.handled_at).length, last_signup: l.map((x) => x.created_at).sort().pop() ?? null } }) }
    }

    case 'list_leads': {
      const { data } = await db.from('funnel_pages').select('id, name').eq('owner_id', uid).eq('style', 'special')
      const ps: any[] = data ?? []
      if (!ps.length) return { leads: [] }
      let sel = ps
      if (input.special) sel = ps.filter((p) => (p.name ?? '').toLowerCase().includes(String(input.special).toLowerCase()))
      const nm = new Map<string, string>(ps.map((p) => [p.id, p.name]))
      let q = db.from('funnel_leads').select('funnel_id, name, email, phone, note, created_at, handled_at').in('funnel_id', sel.map((p) => p.id)).order('created_at', { ascending: false }).limit(60)
      if (input.only_new) q = q.is('handled_at', null)
      const l: any[] = (await q).data ?? []
      return { count: l.length, leads: l.map((x) => ({ name: x.name, email: x.email, phone: x.phone, special: nm.get(x.funnel_id), signed_up: x.created_at, handled: !!x.handled_at, note: x.note })) }
    }

    case 'list_galleries': {
      const [g, w] = await Promise.all([db.from('galleries').select('id, title, status, session_id, created_at, expires_at, gallery_photos(count)').eq('owner_id', uid).order('created_at', { ascending: false }).limit(100), sessionsQ()])
      const sm = new Map<string, any>(((w.data ?? []) as any[]).map((s) => [s.id, s]))
      let gs: any[] = g.data ?? []
      if (input.status && input.status !== 'all') gs = gs.filter((x) => (x.status === 'published' ? 'published' : 'draft') === input.status)
      return { count: gs.length, galleries: gs.map((x) => { const s = sm.get(x.session_id); return { title: x.title, status: x.status === 'published' ? 'published' : 'draft', photos: x.gallery_photos?.[0]?.count ?? 0, session: s?.names ?? null, sent_to_client: s?.gallery_sent_at ?? null, client_opened: s?.gallery_opened_at ?? null, client_downloaded_all: s?.gallery_downloaded_all_at ?? null, expires: x.expires_at } }) }
    }

    case 'get_schedule': {
      const from = input.from || today()
      const to = input.to || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      const [w, ev, bl, ms] = await Promise.all([
        sessionsQ(),
        db.from('events').select('title, event_date, event_time, location, type, notes').eq('owner_id', uid).gte('event_date', from).lte('event_date', to),
        db.from('availability_blocks').select('block_date').eq('owner_id', uid).gte('block_date', from).lte('block_date', to),
        db.from('mini_slots').select('starts_at, status, client_name').eq('owner_id', uid).gte('starts_at', from).lte('starts_at', to + 'T23:59:59'),
      ])
      const ss = ((w.data ?? []) as any[]).filter((s) => s.wedding_date && s.wedding_date >= from && s.wedding_date <= to).sort((a, b) => (a.wedding_date < b.wedding_date ? -1 : 1))
      return { from, to, sessions: ss.map((s) => ({ name: s.names, type: s.session_type, date: s.wedding_date, venue: s.venue, city: s.city, status: s.status })), events: ev.data ?? [], blocked_days: ((bl.data ?? []) as any[]).map((b) => b.block_date), mini_session_slots: ms.data ?? [] }
    }

    case 'list_payments': {
      const [p, w] = await Promise.all([db.from('payment_schedule').select('amount, wedding_id, status, due_date, paid_at').eq('owner_id', uid).limit(500), sessionsQ()])
      const nm = new Map<string, string>(((w.data ?? []) as any[]).map((s) => [s.id, s.names ?? 'Unnamed']))
      let rows: any[] = p.data ?? []
      if (input.unpaid_only) rows = rows.filter((r) => !r.paid_at)
      rows.sort((a, b) => ((a.due_date ?? '9') < (b.due_date ?? '9') ? -1 : 1))
      return { count: rows.length, total: rows.reduce((a, r) => a + Number(r.amount ?? 0), 0), payments: rows.slice(0, 60).map((r) => ({ session: nm.get(r.wedding_id), amount: r.amount, due: r.due_date, paid_at: r.paid_at, status: r.status })) }
    }

    case 'list_threads':
    case 'get_thread':
    case 'propose_message':
      return threadTools(name, input, db, uid, out)
  }
  return { error: 'Unknown lookup.' }
}

async function loadThreadList(db: any, uid: string) {
  const [inqR, wedR] = await Promise.all([
    db.from('inquiries').select('id, couple_names, converted_wedding_id, created_at').eq('photographer_id', uid),
    db.from('weddings').select('id, names').eq('owner_id', uid).limit(500),
  ])
  const inqs: any[] = inqR.data ?? []
  const weds: any[] = wedR.data ?? []
  const converted = new Set<string>(inqs.filter((i) => i.converted_wedding_id).map((i) => i.converted_wedding_id))
  const wedsOnly = weds.filter((w) => !converted.has(w.id))
  const wedName = new Map<string, string>(weds.map((w) => [w.id, w.names]))
  const [im, wm] = await Promise.all([
    inqs.length ? db.from('inquiry_messages').select('inquiry_id, body, sender_id, created_at, message_type').in('inquiry_id', inqs.map((i) => i.id)).is('deleted_at', null).order('created_at', { ascending: false }).limit(600) : { data: [] },
    wedsOnly.length ? db.from('messages').select('wedding_id, body, sender, created_at').in('wedding_id', wedsOnly.map((w) => w.id)).order('created_at', { ascending: false }).limit(600) : { data: [] },
  ])
  const last = new Map<string, any>()
  ;((im.data ?? []) as any[]).forEach((m) => { if (!last.has('inq:' + m.inquiry_id)) last.set('inq:' + m.inquiry_id, { text: m.message_type && m.message_type !== 'text' ? '(' + m.message_type + ')' : m.body, mine: m.sender_id === uid, at: m.created_at }) })
  ;((wm.data ?? []) as any[]).forEach((m) => { if (!last.has('wed:' + m.wedding_id)) last.set('wed:' + m.wedding_id, { text: m.body, mine: m.sender === 'photographer', at: m.created_at }) })
  const rows: { key: string; name: string; last: any }[] = []
  inqs.forEach((i) => { const l = last.get('inq:' + i.id); rows.push({ key: 'inq:' + i.id, name: (i.converted_wedding_id && wedName.get(i.converted_wedding_id)) || i.couple_names || 'Client', last: l ?? null }) })
  wedsOnly.forEach((w) => { const l = last.get('wed:' + w.id); if (l) rows.push({ key: 'wed:' + w.id, name: w.names || 'Session', last: l }) })
  rows.sort((a, b) => ((a.last?.at ?? '') < (b.last?.at ?? '') ? 1 : -1))
  return rows
}

async function threadTools(name: string, input: any, db: any, uid: string, out: { action?: CamriAction }) {
  const rows = await loadThreadList(db, uid)
  if (name === 'list_threads') {
    let r = rows
    if (input.only_waiting) r = r.filter((x) => x.last && !x.last.mine)
    return { count: r.length, threads: r.slice(0, 40).map((x) => ({ key: x.key, client: x.name, waiting_for_your_reply: !!x.last && !x.last.mine, last_message: cut(x.last?.text ?? '', 200), last_at: x.last?.at ?? null })) }
  }
  const key = String(input.key ?? '')
  const row = rows.find((x) => x.key === key)
  if (!row) return { error: 'No thread with that key. Call list_threads first.' }
  if (name === 'get_thread') {
    const [kind, id] = key.split(':')
    const msgs: any[] = kind === 'inq'
      ? ((await db.from('inquiry_messages').select('body, sender_id, created_at, message_type').eq('inquiry_id', id).is('deleted_at', null).order('created_at', { ascending: false }).limit(20)).data ?? []).map((m: any) => ({ from: m.sender_id === uid ? 'you' : 'client', text: m.message_type && m.message_type !== 'text' ? '(' + m.message_type + ')' : cut(m.body, 600), at: m.created_at }))
      : ((await db.from('messages').select('body, sender, created_at').eq('wedding_id', id).order('created_at', { ascending: false }).limit(20)).data ?? []).map((m: any) => ({ from: m.sender === 'photographer' ? 'you' : 'client', text: cut(m.body, 600), at: m.created_at }))
    return { client: row.name, messages: msgs.reverse() }
  }
  const text = String(input.text ?? '').trim().slice(0, 1500)
  if (!text) return { error: 'No text to send.' }
  out.action = { type: 'send_message', key, name: row.name, text }
  return { ok: true, note: 'The draft is now showing to the photographer with a Send button. Tell them to review it. Do not say it was sent.' }
}
