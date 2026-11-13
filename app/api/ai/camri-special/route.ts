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
{"reply": string, "changes": {"preset": string|null, "cta_label": string|null, "text": object|null, "theme": object|null}}

Rules:
- reply: 1-3 short, friendly sentences. Say what you changed. No emoji spam.
- Change only what was asked. Everything else null.
- preset must be one of: ${presets.join(' | ') || 'none'}. A preset replaces the whole look and words, so if you set preset, set everything else to null.
- text keys allowed: ${TEXT_KEYS.join(', ')}. details_body is a list, one item per line, no bullets. Write real copy in the photographer's voice, never lorem ipsum. Never invent prices, dates, locations or spot counts. Those come from the photographer's real mini sessions; if asked, say to set them up in Sessions.
- cta_label: the button text, under 5 words.
- theme keys allowed: ${COLOR_KEYS.join(', ')} (hex like #1F3A2E), decor (one of: ${decors.join(', ') || 'none'}), ${FONT_KEYS.join(', ')} (one of: ${fonts.join(', ') || 'none'}), shape (square | rounded | pill), titleAlign (left | center). Keep text readable against its background.
- If they ask a question or want advice, answer in reply and leave all changes null.

Current special: button "${cur.cta_label ?? ''}", headline "${cur.text?.hero_headline ?? ''}", subhead "${cur.text?.hero_sub ?? ''}", details "${String(cur.text?.details_body ?? '').replace(/\n/g, ' / ')}", colors ${JSON.stringify(cur.colors ?? {})}, decor ${cur.decor ?? 'none'}, shape ${cur.shape ?? ''}.`

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
    const changes = { preset, cta_label: preset ? null : clean(c.cta_label, 40), text, theme }
    return Response.json({ reply: clean(parsed.reply, 500) ?? 'Done!', changes })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
