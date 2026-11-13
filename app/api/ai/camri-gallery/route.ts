import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const list = (v: unknown) => (Array.isArray(v) ? v.slice(0, 30).map((x: any) => ({ k: String(x?.k ?? ''), name: String(x?.name ?? ''), blurb: String(x?.blurb ?? '') })).filter((x) => x.k) : [])

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : ''
    if (!message) return Response.json({ error: 'Tell me what to change.' }, { status: 400 })
    const covers = list(body.covers), looks = list(body.looks), palettes = list(body.palettes)
    const cur = body.current ?? {}
    const hist: { from: string; text: string }[] = Array.isArray(body.history) ? body.history.slice(-6) : []

    const system = `You are Camri, a warm camera robot who helps photographers style their client galleries. You know that the opening photo is the client's first impression, that a clean photo-first gallery beats a busy one, and that the look should match the session: soft and airy for newborns and maternity, timeless for weddings, bold and clean for headshots and branding. You cannot see the photos themselves, so you never claim to know what is in the cover photo.

Reply with ONLY a JSON object, no other text:
{"reply": string, "changes": {"cover": string|null, "look": string|null, "colors": string|null, "focal": {"x": number, "y": number}|null}}

Rules:
- reply: 1-3 short, friendly sentences. Say what you changed and why it suits a gallery. No emoji spam.
- Change only what was asked. Everything else null.
- cover must be one of these keys: ${covers.map((c) => `${c.k} (${c.name})`).join(', ') || 'none'}.
- look (the mood) must be one of: ${looks.map((c) => `${c.k} (${c.name}: ${c.blurb})`).join(', ') || 'none'}.
- colors must be one of: ${palettes.map((c) => `${c.k} (${c.name})`).join(', ') || 'none'}.
- focal is where the cover crops around, x and y from 0 to 100 (0,0 is top left, 50,50 is the center). To nudge it, adjust the current value by about 10 to 20.
- If they ask a question or want advice, answer in reply and leave all changes null.

Current gallery: opening photo layout ${cur.cover ?? 'default'}, mood ${cur.look ?? 'classic'}, colors ${cur.colors ?? 'default'}, focal point ${cur.focal ? cur.focal.x + ',' + cur.focal.y : '50,50'}.`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'cami' ? 'assistant' : 'user') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 400) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 500, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_gallery', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    let parsed: any
    try { parsed = JSON.parse(m[0]) } catch { return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 }) }

    const c = parsed.changes ?? {}
    const fx = Number(c.focal?.x), fy = Number(c.focal?.y)
    const changes = {
      cover: covers.some((x) => x.k === c.cover) ? c.cover : null,
      look: looks.some((x) => x.k === c.look) ? c.look : null,
      colors: palettes.some((x) => x.k === c.colors) ? c.colors : null,
      focal: Number.isFinite(fx) && Number.isFinite(fy) ? { x: Math.max(0, Math.min(100, Math.round(fx))), y: Math.max(0, Math.min(100, Math.round(fy))) } : null,
    }
    return Response.json({ reply: clean(parsed.reply, 500) ?? 'Done!', changes })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
