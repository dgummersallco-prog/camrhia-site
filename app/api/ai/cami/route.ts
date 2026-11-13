import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!email || !beta.includes(email)) return Response.json({ error: 'Camri chat is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : ''
    if (!message) return Response.json({ error: 'Type a question first.' }, { status: 400 })

    const dials: { key: string; label: string; ui: number }[] = (Array.isArray(body.dials) ? body.dials : [])
      .filter((d: any) => d && typeof d.key === 'string' && typeof d.label === 'string' && typeof d.ui === 'number')
      .slice(0, 30)
    const keys = dials.map((d) => d.key)

    const messages: any[] = []
    for (const h of Array.isArray(body.history) ? body.history.slice(-6) : []) {
      if (!h || typeof h.text !== 'string') continue
      const role = h.role === 'cami' ? 'assistant' : 'user'
      if (!messages.length && role !== 'user') continue
      if (messages.length && messages[messages.length - 1].role === role) continue
      messages.push({ role, content: h.text.slice(0, 800) })
    }
    if (messages.length && messages[messages.length - 1].role === 'user') messages.pop()

    const state = `Current look: ${String(body.look ?? 'none').slice(0, 40)} at ${Math.round(Number(body.strength ?? 1) * 100)}% strength.\nCurrent sliders: ${dials.map((d) => `${d.key} (${d.label}) = ${d.ui}`).join(', ')}.\nPhotographer's brief: ${JSON.stringify(body.brief ?? {}).slice(0, 600)}\n\nPhotographer says: ${message}`
    const content: any[] = []
    if (typeof body.image === 'string' && body.image.length < 400_000) {
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: body.image.replace(/^data:image\/\w+;base64,/, '') } })
    }
    content.push({ type: 'text', text: state })
    messages.push({ role: 'user', content })

    const system = `You are Camri, the friendly guide inside Camrhia's photo editing room. Many photographers talking to you are new to editing. Use plain, warm words, 2 to 4 short sentences, and explain any editing term you use. You can move these sliders: ${keys.join(', ')}. Each runs from -100 to 100 and 0 is neutral; small moves of 10 to 30 are usually enough. The photo shown (if any) is the current preview. Reply with ONLY JSON like {"reply":"your answer","set":{"temp":20,"shadows":15}}. "set" holds only the sliders you want to change, each as the new slider position. If they are only asking a question, use {} for "set".`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 400, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const cost = costUsd('haiku', inTok, outTok)
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'cami_chat', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: cost,
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    let parsed: any = null
    try { parsed = m ? JSON.parse(m[0]) : null } catch { parsed = null }
    const reply = typeof parsed?.reply === 'string' ? parsed.reply : raw.trim().slice(0, 600)
    if (!reply) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    const set: Record<string, number> = {}
    if (parsed?.set && typeof parsed.set === 'object') {
      for (const [k, v] of Object.entries(parsed.set)) {
        if (keys.includes(k) && typeof v === 'number' && isFinite(v)) set[k] = Math.max(-100, Math.min(100, Math.round(v)))
      }
    }
    return Response.json({ reply, set })
  } catch {
    return Response.json({ error: 'Camri is unavailable right now.' }, { status: 500 })
  }
}
