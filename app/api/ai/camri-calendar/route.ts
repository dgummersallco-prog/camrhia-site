import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const HEX = /^#[0-9A-Fa-f]{6}$/
const ISO = /^\d{4}-\d{2}-\d{2}$/
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const validDate = (s: unknown): s is string => typeof s === 'string' && ISO.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s
const pretty = (s: string) => new Date(s + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!email || !beta.includes(email)) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : ''
    if (!message) return Response.json({ error: 'Ask me something about your calendar.' }, { status: 400 })
    const today = validDate(body.today) ? body.today : new Date().toISOString().slice(0, 10)
    const booked: Record<string, string> = {}
    for (const b of (Array.isArray(body.booked) ? body.booked : []).slice(0, 800)) if (validDate(b?.date)) booked[b.date] = String(b.names ?? 'a session').slice(0, 80)
    const blocks: Record<string, string> = {}
    for (const b of (Array.isArray(body.blocks) ? body.blocks : []).slice(0, 1500)) if (validDate(b?.date)) blocks[b.date] = b.type === 'hold' ? 'hold' : 'blocked'
    const recurring: number[] = (Array.isArray(body.recurring) ? body.recurring : []).filter((n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6)
    const colors = { booked: HEX.test(body.colors?.booked) ? body.colors.booked : '#A9545F', hold: HEX.test(body.colors?.hold) ? body.colors.hold : '#D4A56A', blocked: HEX.test(body.colors?.blocked) ? body.colors.blocked : '#9CA3AF' }
    const feedReady = !!body.feedReady
    const hist: { from: string; text: string }[] = Array.isArray(body.history) ? body.history.slice(-6) : []

    const todayName = DAYS[new Date(today + 'T00:00:00Z').getUTCDay()]
    const system = `You are Camri, a warm camera robot who helps photographers manage their calendar. Today is ${todayName}, ${today}. Weekday numbers: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.

Reply with ONLY a JSON object, no other text:
{"reply": string, "ops": [ ... ]}

Each op is one of:
{"op":"check","dates":["YYYY-MM-DD"]}                       look up whether dates are open, booked, blocked or on hold
{"op":"set","dates":["YYYY-MM-DD"],"state":"blocked"|"hold"|"open"}   propose blocking, holding, or opening dates
{"op":"recurring","days":[numbers 0-6]}                      the FULL set of weekdays that should be blocked every week going forward
{"op":"colors","booked":hex|null,"hold":hex|null,"blocked":hex|null}   propose new calendar colors

Rules:
- NEVER say yourself whether a date is open, booked, blocked or on hold. Use a check op, and the app attaches the real answer. In reply just say something short like "Let me check that for you."
- For a date with no year, use the next time that date occurs on or after today. Never more than 60 dates per op.
- "Block all Mondays" means a recurring op with the current recurring days plus 1. Current recurring weekdays: ${recurring.length ? recurring.join(', ') : 'none'}. To stop blocking a weekday, leave it out.
- Booked dates cannot be blocked or opened; the app skips them.
- Changes are only proposals. The photographer confirms before anything happens, so say what you are about to do, not that you did it.
- Current calendar colors: booked ${colors.booked}, hold ${colors.hold}, blocked ${colors.blocked}. Pick hex colors that match what they ask for ("sage green", "deeper rose").
- Calendar app link: ${feedReady ? 'a private calendar feed link has been created, but Camrhia cannot see which calendar app they subscribed with (Apple, Google or Outlook)' : 'no calendar feed link has been created yet; they can tap "Sync to my calendar app" on this page to make one'}. If asked what calendar they are linked to, answer from this honestly.
- reply is 1-3 short friendly sentences. No emoji spam.
- If it is just a question or advice, ops can be empty.`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'cami' ? 'assistant' : 'user') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 400) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 700, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_calendar', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    let parsed: any
    try { parsed = JSON.parse(m[0]) } catch { return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 }) }

    const facts: string[] = []
    const actions: { type: string; summary: string; dates?: string[]; state?: string; days?: number[]; colors?: Record<string, string> }[] = []
    const statusOf = (d: string) => (booked[d] ? `Booked (${booked[d]})` : blocks[d] === 'hold' ? 'On hold' : blocks[d] === 'blocked' ? 'Blocked' : 'Open')

    for (const o of (Array.isArray(parsed.ops) ? parsed.ops : []).slice(0, 6)) {
      if (o?.op === 'check') {
        const ds = (Array.isArray(o.dates) ? o.dates : []).filter(validDate).slice(0, 14)
        for (const d of ds) facts.push(`${pretty(d)}: ${statusOf(d)}.`)
      } else if (o?.op === 'set' && ['blocked', 'hold', 'open'].includes(o.state)) {
        const all = (Array.isArray(o.dates) ? o.dates : []).filter(validDate).slice(0, 60)
        const ok = all.filter((d: string) => !booked[d])
        const skipped = all.filter((d: string) => booked[d])
        if (skipped.length) facts.push(`Skipped ${skipped.map(pretty).join(', ')}: already booked.`)
        if (ok.length) {
          const verb = o.state === 'blocked' ? 'Block' : o.state === 'hold' ? 'Put on hold' : 'Open'
          actions.push({ type: 'set', state: o.state, dates: ok, summary: `${verb} ${ok.length <= 4 ? ok.map(pretty).join(', ') : ok.length + ' days (' + pretty(ok[0]) + ' to ' + pretty(ok[ok.length - 1]) + ')'}` })
        }
      } else if (o?.op === 'recurring' && Array.isArray(o.days)) {
        const days = Array.from(new Set((o.days as unknown[]).filter((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 6) as number[])).sort()
        actions.push({ type: 'recurring', days, summary: days.length ? `Block every ${days.map((n) => DAYS[n]).join(' and ')} going forward` : 'Stop blocking any weekdays going forward' })
      } else if (o?.op === 'colors') {
        const c: Record<string, string> = {}
        for (const k of ['booked', 'hold', 'blocked']) if (typeof o[k] === 'string' && HEX.test(o[k])) c[k] = o[k]
        if (Object.keys(c).length) actions.push({ type: 'colors', colors: c, summary: 'Change colors: ' + Object.entries(c).map(([k, v]) => `${k} to ${v}`).join(', ') })
      }
    }
    return Response.json({ reply: clean(parsed.reply, 500) ?? 'Done!', facts, actions })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
