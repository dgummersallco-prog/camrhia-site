import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : ''
    if (!message) return Response.json({ error: 'Tell me what to change.' }, { status: 400 })
    const label = clean(body.label, 60) ?? 'session'
    const qs: { id: string; section: string; prompt: string; hint: string | null }[] = (Array.isArray(body.questions) ? body.questions : []).slice(0, 60).map((q: any) => ({
      id: String(q.id ?? '').slice(0, 60), section: String(q.section ?? '').slice(0, 60), prompt: String(q.prompt ?? '').slice(0, 400), hint: q.hint ? String(q.hint).slice(0, 200) : null,
    }))
    const ids = new Set(qs.map((q) => q.id))
    const hist: { from: string; text: string }[] = Array.isArray(body.history) ? body.history.slice(-8) : []

    const system = `You are Camri, a warm camera robot and an expert on client intake questionnaires for professional photographers. You know what photographers need to learn before a ${label} shoot: logistics, people, shot priorities, comfort and sensitivities, and deliverables. Good questions are one idea each, warm and plain, easy to answer on a phone, and never ask for information the contract or booking already holds. Hints are short examples that help the client answer.

Reply with ONLY a JSON object, no other text:
{"reply": string, "ops": [ ... ]}

Each op is one of:
{"op":"add","section":string,"prompt":string,"hint":string|null}
{"op":"edit","id":string,"prompt":string|null,"hint":string|null,"section":string|null}
{"op":"remove","id":string}
{"op":"move","id":string,"after_id":string|null}   (after_id null = first)

Rules:
- reply: 1-3 short friendly sentences saying what you did or your advice. No emoji spam.
- Only change what was asked. For advice or questions, answer in reply and use an empty ops list.
- Use only ids from the list below. Never invent ids.
- When rewording, keep the meaning, keep it one question, and keep it warm and short.
- When adding, use an existing section name when it fits.
- At most 25 ops.

The ${label} questionnaire right now (${qs.length} questions):
${qs.map((q) => `[${q.id}] (${q.section}) ${q.prompt}${q.hint ? ' | hint: ' + q.hint : ''}`).join('\n') || 'none yet'}`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'cami' ? 'assistant' : 'user') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 500) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 2500, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_questions', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    let parsed: any
    try { parsed = JSON.parse(m[0]) } catch { return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 }) }

    const ops: any[] = []
    for (const o of (Array.isArray(parsed.ops) ? parsed.ops : []).slice(0, 25)) {
      if (o?.op === 'add') {
        const prompt = clean(o.prompt, 400)
        if (prompt) ops.push({ op: 'add', section: clean(o.section, 60) ?? 'General', prompt, hint: clean(o.hint, 200) })
      } else if (o?.op === 'edit' && ids.has(o.id)) {
        ops.push({ op: 'edit', id: o.id, prompt: clean(o.prompt, 400), hint: clean(o.hint, 200), section: clean(o.section, 60) })
      } else if (o?.op === 'remove' && ids.has(o.id)) {
        ops.push({ op: 'remove', id: o.id })
      } else if (o?.op === 'move' && ids.has(o.id) && (o.after_id === null || ids.has(o.after_id))) {
        ops.push({ op: 'move', id: o.id, after_id: o.after_id ?? null })
      }
    }
    return Response.json({ reply: clean(parsed.reply, 500) ?? 'Done!', ops })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
