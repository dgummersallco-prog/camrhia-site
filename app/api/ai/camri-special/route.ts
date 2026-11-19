import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const HEX = /^#[0-9A-Fa-f]{6}$/
const TEXT_KEYS = ['hero_headline', 'hero_sub', 'brand_name', 'details_title', 'details_body', 'terms', 'thanks_message', 'form_title']
const COLOR_KEYS = ['bgColor', 'accent', 'titleColor', 'subColor', 'textColor', 'btnText', 'cardBg', 'cardText', 'nameColor']
const FONT_KEYS = ['headFont', 'subFont', 'bodyFont']
const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const num = (v: unknown, lo: number, hi: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null
}
const strList = (v: unknown, max = 60) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, max) as string[] : [])

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 700) : ''
    if (!message) return Response.json({ error: 'Tell me what to change.' }, { status: 400 })
    const presets = strList(body.presets), decors = strList(body.decors), fonts = strList(body.fonts)
    const cur = body.current ?? {}
    const hist: { from: string; text: string }[] = Array.isArray(body.history) ? body.history.slice(-8) : []

    const system = `You are Camri, a warm camera robot who helps photographers design a "special" page: a simple one-page offer, like holiday minis or a Mother's Day session, that clients sign up on. You know what sells: one clear offer, a warm headline under 8 words, a one-line subhead, a short scannable list of what is included, urgency that is honest (limited spots), and a single clear button.

Reply with ONLY a JSON object, no other text:
{"reply": string, "changes": {"preset": string|null, "cta_label": string|null, "text": object|null, "theme": object|null, "offer": object|null}}

Rules:
- reply: 1-3 short, friendly sentences. Say what you changed. No emoji spam.
- Change only what was asked. Everything else null.
- preset must be one of: ${presets.join(' | ') || 'none'}. A preset replaces the whole look and words, so if you set preset, set text, theme and cta_label to null (offer may still be set).
- text keys allowed: ${TEXT_KEYS.join(', ')}. details_body is a list, one item per line, no bullets. Write real copy in the photographer's voice, never lorem ipsum. Never put a price, session length, date, place or spot count in the text keys; those go only in offer.
- cta_label: the button text, under 5 words.
- theme keys allowed: ${COLOR_KEYS.join(', ')} (hex like #1F3A2E), decor (one of: ${decors.join(', ') || 'none'}), ${FONT_KEYS.join(', ')} (one of: ${fonts.join(', ') || 'none'}), shape (square | rounded | pill), titleAlign (left | center). Keep text readable against its background.
- offer: the real details of this mini or special. Set ONLY what the photographer told you in this conversation. Never guess or invent. Keys: price (dollars per session, a number), minutes (length of each session, a number), photos (edited photos included, a number), when (the day or dates as text, like "Saturday, December 5"), place (where, as text), spots (how many sessions are open, a number). Anything they did not just say is left out.
- Be a conversation, not a form. After you change the design, or when they describe a mini session, work out the offer by asking ONE short question at a time, in this order, skipping anything already in "Offer so far": price per session, how many minutes each session is, how many edited photos are included, the day and place, how many spots. End your reply with the next question. When they answer, put it in offer and ask the next one. If they give several details at once, set them all. When nothing is missing, say the special is ready to check in the preview.
- If they ask a question or want advice, answer in reply and leave all changes null.

Current special: button "${cur.cta_label ?? ''}", headline "${cur.text?.hero_headline ?? ''}", subhead "${cur.text?.hero_sub ?? ''}", details "${String(cur.text?.details_body ?? '').replace(/\n/g, ' / ')}", colors ${JSON.stringify(cur.colors ?? {})}, decor ${cur.decor ?? 'none'}, shape ${cur.shape ?? ''}. Offer so far: ${JSON.stringify(cur.offer ?? {})}.`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'cami' ? 'assistant' : 'user') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 500) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 900, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_special', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    let parsed: any
    try { parsed = JSON.parse(m[0]) } catch { return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 }) }

    const c = parsed.changes ?? {}
    const preset = typeof c.preset === 'string' && presets.includes(c.preset) ? c.preset : null
    const text: Record<string, string> = {}
    const theme: Record<string, string> = {}
    if (!preset) {
      for (const k of TEXT_KEYS) { const v = clean(c.text?.[k], 900); if (v) text[k] = v }
      for (const k of COLOR_KEYS) { const v = c.theme?.[k]; if (typeof v === 'string' && HEX.test(v)) theme[k] = v }
      for (const k of FONT_KEYS) { const v = c.theme?.[k]; if (typeof v === 'string' && fonts.includes(v)) theme[k] = v }
      if (typeof c.theme?.decor === 'string' && decors.includes(c.theme.decor)) theme.decor = c.theme.decor
      if (['square', 'rounded', 'pill'].includes(c.theme?.shape)) theme.shape = c.theme.shape
      if (['left', 'center'].includes(c.theme?.titleAlign)) theme.titleAlign = c.theme.titleAlign
    }
    const offer: Record<string, number | string> = {}
    const o = c.offer ?? {}
    const price = num(o.price, 0.5, 100000); if (price !== null) offer.price = price
    const minutes = num(o.minutes, 5, 480); if (minutes !== null) offer.minutes = Math.round(minutes)
    const photos = num(o.photos, 0, 1000); if (photos !== null) offer.photos = Math.round(photos)
    const spots = num(o.spots, 1, 500); if (spots !== null) offer.spots = Math.round(spots)
    const when = clean(o.when, 80); if (when) offer.when = when
    const place = clean(o.place, 120); if (place) offer.place = place
    const changes = { preset, cta_label: preset ? null : clean(c.cta_label, 40), text, theme, offer }
    return Response.json({ reply: clean(parsed.reply, 500) ?? 'Done!', changes })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
