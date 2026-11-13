import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const money = (n: unknown) => `$${Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!email || !beta.includes(email)) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : ''
    if (!message) return Response.json({ error: 'Type a question first.' }, { status: 400 })
    const path = typeof body.path === 'string' ? body.path.slice(0, 80) : ''

    const uid = auth.user.id
    const db = adminDb() as any
    const [w, p, c, prof] = await Promise.all([
      db.from('weddings').select('id, names, wedding_date, session_type, gallery_due_date, balance, paid_in_full').eq('owner_id', uid).limit(300),
      db.from('payment_schedule').select('amount, wedding_id, status, due_date, paid_at').eq('owner_id', uid).limit(500),
      db.from('contracts').select('wedding_id, sent_at').eq('owner_id', uid).eq('status', 'sent').limit(200),
      db.from('profiles').select('studio_name, display_name').eq('id', uid).maybeSingle(),
    ])
    const sessions: any[] = w.data ?? []
    const nameOf = new Map<string, string>(sessions.map((s) => [s.id, s.names ?? 'Unnamed']))
    const today = new Date().toISOString().slice(0, 10)

    const upcoming = sessions.filter((s) => s.wedding_date && s.wedding_date >= today).sort((a, b) => (a.wedding_date < b.wedding_date ? -1 : 1)).slice(0, 25)
    const recent = sessions.filter((s) => s.wedding_date && s.wedding_date < today).sort((a, b) => (a.wedding_date < b.wedding_date ? 1 : -1)).slice(0, 10)
    const owing = sessions.filter((s) => !s.paid_in_full && Number(s.balance ?? 0) > 0).slice(0, 25)
    const unpaid = (p.data ?? []).filter((r: any) => !r.paid_at).sort((a: any, b: any) => ((a.due_date ?? '9') < (b.due_date ?? '9') ? -1 : 1)).slice(0, 40)
    const unsigned = c.data ?? []

    const line = (s: any) => `- ${s.names ?? 'Unnamed'} | ${s.session_type ?? 'session'} | ${s.wedding_date ?? 'no date'}${s.gallery_due_date ? ` | gallery due ${s.gallery_due_date}` : ''}`
    const data = [
      `Today is ${today}. Studio: ${prof.data?.studio_name ?? prof.data?.display_name ?? 'unknown'}. The photographer is on the page: ${path || 'dashboard'}.`,
      `UPCOMING SESSIONS (${upcoming.length}):\n${upcoming.map(line).join('\n') || 'none'}`,
      `RECENT PAST SESSIONS:\n${recent.map(line).join('\n') || 'none'}`,
      `SESSIONS WITH A BALANCE STILL OWED:\n${owing.map((s) => `- ${s.names ?? 'Unnamed'}: balance ${money(s.balance)}`).join('\n') || 'none'}`,
      `UNPAID SCHEDULED PAYMENTS:\n${unpaid.map((r: any) => `- ${nameOf.get(r.wedding_id) ?? 'Unknown session'}: ${money(r.amount)} due ${r.due_date ?? 'no date'} (${r.status ?? 'pending'})`).join('\n') || 'none'}`,
      `CONTRACTS SENT, WAITING FOR A SIGNATURE:\n${unsigned.map((r: any) => `- ${nameOf.get(r.wedding_id) ?? 'Unknown session'}, sent ${String(r.sent_at ?? '').slice(0, 10)}`).join('\n') || 'none'}`,
    ].join('\n\n')

    const system = `You are Camri, the friendly business helper inside Camrhia, an app and website that photographers use to run their studio: sessions, clients, contracts, payments, galleries and their website. Talk in warm, plain words, 2 to 5 short sentences, no jargon. Answer ONLY from the DATA below for anything about this photographer's business. If the data does not contain the answer, say you cannot see that yet and say where in Camrhia they might look (Sessions, Money, Contracts, Calendar, Clients). Never invent names, dates or amounts. Dollar amounts in the data are already in dollars. For general photography questions (editing, pricing, galleries, websites) give practical, honest advice. You can tell them which page to open, but you cannot change anything yet. If asked to do something, say so kindly and tell them where to do it.\n\nDATA:\n${data}`

    const messages: any[] = []
    for (const h of Array.isArray(body.history) ? body.history.slice(-6) : []) {
      if (!h || typeof h.text !== 'string') continue
      const role = h.role === 'camri' ? 'assistant' : 'user'
      if (!messages.length && role !== 'user') continue
      if (messages.length && messages[messages.length - 1].role === role) continue
      messages.push({ role, content: h.text.slice(0, 800) })
    }
    if (messages.length && messages[messages.length - 1].role === 'user') messages.pop()
    messages.push({ role: 'user', content: message })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 500, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    await db.from('ai_usage').insert({
      owner_id: uid, gallery_id: null, job: 'camri_dashboard', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })

    const reply = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim()
    if (!reply) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    return Response.json({ reply })
  } catch {
    return Response.json({ error: 'Camri is unavailable right now.' }, { status: 500 })
  }
}
