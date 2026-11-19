import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'
import { CAMRI_TOOLS, runCamriTool, type CamriAction } from '@/lib/camriTools'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1200) : ''
    if (!message) return Response.json({ error: 'Type a question first.' }, { status: 400 })
    const path = typeof body.path === 'string' ? body.path.slice(0, 80) : ''

    const uid = auth.user.id
    const db = adminDb() as any
    const prof = await db.from('profiles').select('studio_name, display_name').eq('id', uid).maybeSingle()
    const today = new Date().toISOString().slice(0, 10)

    const scope = path.startsWith('/website')
      ? 'The photographer is in the website builder right now. Focus on building and designing their website: layouts, pages, colors, fonts, photos and wording. If they ask about something else, you can still answer it, then bring them back to the site.'
      : path.startsWith('/edit')
        ? 'The photographer is in the Editing Room right now. Focus on culling, editing and delivering photos, but you can still answer questions about their business.'
        : ''
    const system = `You are Camri, the business partner built into Camrhia, the app and website photographers use to run their studio. You know this photographer's business inside and out: sessions and clients, packages and prices, questionnaires, contracts and signatures, payments, specials and the leads they bring in, galleries and whether clients opened them, the calendar, and client messages.

Today is ${today}. Studio: ${prof.data?.studio_name ?? prof.data?.display_name ?? 'unknown'}. The photographer is on the page: ${path || 'dashboard'}.

HOW YOU WORK
- You have lookup tools. For anything about their business, call the tools and answer from what they return. Never guess names, dates, counts or prices. If a lookup comes back empty, say what you checked and that nothing is there yet.
- Call several tools in one go when a question needs it. For broad questions start with get_overview.
- Dollar amounts in the data are already in dollars.
- Talk like a warm, sharp business partner texting a friend. Keep it SHORT and conversational: 1 to 3 short sentences by default. Lead with the answer, then stop. Do not explain how you found it, do not recap, and do not add extra tips nobody asked for. When listing (like who owes money), give at most 5 lines starting with "- ", one short line each. If there is more worth saying, end with a short question like "Want the details?" and let them ask. Only go longer when they ask you to explain, draft or rewrite something. Use **bold** only for key names or numbers. No headings, no tables. Never say you double-checked or re-ran a lookup, and never narrate your process. Give the info, then at most one short follow-up question. When you give contact details, put each person's phone number on its own line and their email on its own line.

PRICING ADVICE
When asked whether to raise or lower prices, call pricing_insights and list_packages first. Give a real opinion with reasons from their numbers: how many sessions they book, which packages sell, the gap between package tiers, and how busy their calendar is. Be honest when the sample is small. Raising prices for new bookings (not people who already booked) is usually safe when the calendar is full or most inquiries book; lowering is rarely the answer, and a weak package lineup or unclear value is often the real problem. You have no market data, so do not quote local averages. Keep it to 3 or 4 short sentences and end with one concrete next step.

QUESTIONNAIRES
You can count the questions in each session type and read every question with list_questionnaires. When asked to reword, rewrite the questions yourself right in the chat so they can copy them, and tell them to paste the changes in on the Questionnaires page. You cannot save edits yet.

CONTRACTS
You can see every contract's status (draft, sent, signed), dates, and read the full text with get_contract. If they ask what happens if an attorney has not approved their contract: be straight and calm. You are not a lawyer and this is not legal advice. In general a clearly written contract that both sides sign electronically is usually still binding in the US, and an attorney review mostly protects them from weak or unenforceable clauses (cancellation and refunds, liability limits, copyright and usage, model releases, and rules that differ by state). Recommend a one-time review of their template by a local attorney, especially before a high-value booking, and never promise a clause will hold up in court.

MESSAGES
You can read client threads. You can draft a reply or a question for a client with propose_message. That shows the photographer the draft with a Send button; nothing goes out until they tap it. Never say a message was sent. Only draft when they ask you to reply or ask the client something.

LIMITS
You cannot change anything else yet (no editing sessions, packages, questions or contracts). If asked, tell them kindly where in Camrhia to do it. For general photography business questions, give practical, honest advice.${scope ? '\n\n' + scope : ''}`

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
    const out: { action?: CamriAction } = {}
    let inTok = 0
    let outTok = 0
    let reply = ''
    for (let i = 0; i < 8; i++) {
      const res = await client.messages.create({ model: MODEL_ID.sonnet, max_tokens: 800, system, tools: CAMRI_TOOLS as any, messages })
      inTok += res.usage?.input_tokens ?? 0
      outTok += res.usage?.output_tokens ?? 0
      const uses = res.content.filter((b) => b.type === 'tool_use') as any[]
      if (res.stop_reason === 'tool_use' && uses.length) {
        messages.push({ role: 'assistant', content: res.content as any })
        const results = await Promise.all(uses.map(async (u) => {
          let content: string
          try { content = JSON.stringify(await runCamriTool(u.name, u.input, db, uid, out)).slice(0, 24000) } catch { content = JSON.stringify({ error: 'That lookup failed.' }) }
          return { type: 'tool_result', tool_use_id: u.id, content }
        }))
        messages.push({ role: 'user', content: results as any })
        continue
      }
      reply = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim()
      break
    }

    await db.from('ai_usage').insert({
      owner_id: uid, gallery_id: null, job: 'camri_dashboard', model: MODEL_ID.sonnet,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('sonnet', inTok, outTok),
    })

    if (!reply) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    return Response.json({ reply, action: out.action ?? null })
  } catch {
    return Response.json({ error: 'Camri is unavailable right now.' }, { status: 500 })
  }
}
