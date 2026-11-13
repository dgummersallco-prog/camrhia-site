import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const STYLE_KEYS = ['airy', 'classic', 'romantic', 'bold', 'moody', 'clean', 'mosaic', 'earthy']
const PAIRS = ['serif', 'modern', 'romantic']
const SHAPES = ['square', 'rounded', 'pill']
const HEX = /^#[0-9A-Fa-f]{6}$/

const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

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
    if (!message) return Response.json({ error: 'Tell me what to change.' }, { status: 400 })
    const site = body.site ?? {}
    const hist: { from: string; text: string }[] = Array.isArray(body.history) ? body.history.slice(-10) : []

    const system = `You are Camri, a cute, warm camera robot who designs photographers' websites. You know what works for photographers: big photos, lots of white space, one accent color, readable type, a clear Book button, and a look that matches the kind of client they want.

Reply with ONLY a JSON object, no other text:
{"reply": string, "changes": {"style": string|null, "palette": {"accent": string, "bg": string, "text": string}|null, "font_pair": string|null, "buttons": string|null, "headline": string|null, "subhead": string|null}}

Rules:
- reply: 1-3 short, friendly sentences. Say what you changed and why it suits a photographer. No emoji spam.
- Change only what the photographer asked for. Everything else must be null.
- style must be one of: ${STYLE_KEYS.join(', ')}. (airy=light white, classic=timeless serif, romantic=soft dreamy, bold=magazine, moody=dark cinematic, clean=split, mosaic=photo wall, earthy=warm cream and clay.) Picking a style resets colors and fonts to that style, so only use it when they ask for a whole new look.
- palette: hex colors like #C98A8D. accent is for buttons and links, bg is the page, text is body text. Keep text readable against bg (strong contrast).
- font_pair must be one of: ${PAIRS.join(', ')}. (serif=Classic, modern=Modern, romantic=Romantic.)
- buttons must be one of: ${SHAPES.join(', ')}.
- headline: under 8 words. subhead: under 18 words. Write real copy in the photographer's voice, never lorem ipsum.
- If they ask a question or want advice, answer in reply and leave all changes null.

Current site: template ${site.template ?? 'unknown'}, accent ${site.accent ?? 'unknown'}, page color ${site.bg ?? 'unknown'}, text color ${site.text ?? 'unknown'}, fonts ${site.font_pair ?? 'unknown'}, buttons ${site.buttons ?? 'unknown'}, headline "${site.headline ?? ''}", subhead "${site.subhead ?? ''}".`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'me' ? 'user' : 'assistant') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 500) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 500, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_site', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    let parsed: any
    try { parsed = JSON.parse(m[0]) } catch { return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 }) }

    const c = parsed.changes ?? {}
    const p = c.palette
    const changes = {
      style: STYLE_KEYS.includes(c.style) ? c.style : null,
      palette: p && HEX.test(p.accent) && HEX.test(p.bg) && HEX.test(p.text) ? { accent: p.accent, bg: p.bg, text: p.text } : null,
      font_pair: PAIRS.includes(c.font_pair) ? c.font_pair : null,
      buttons: SHAPES.includes(c.buttons) ? c.buttons : null,
      headline: clean(c.headline, 80),
      subhead: clean(c.subhead, 160),
    }
    const reply = clean(parsed.reply, 500) ?? 'Done!'
    return Response.json({ reply, changes })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
