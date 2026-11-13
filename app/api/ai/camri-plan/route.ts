import Anthropic from '@anthropic-ai/sdk'
import { hasCamriAccess } from '@/lib/aiAccess'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TWISTS = [
  'a dreamy glowing mood',
  'a cozy candlelit mood',
  'a crisp, bright and airy feel',
  'a vintage storybook feel',
  'a bold, bright and playful take',
  'a luxe, rich and elegant feel',
  'something unexpected and a little magical',
  'a soft, romantic glow',
]

// Camri thinks out loud and writes the picture prompts for this exact theme.
export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ text: '' })
    const body: any = await request.json().catch(() => ({}))
    const message = String(body?.message ?? '').trim().slice(0, 400)
    if (!message) return Response.json({ text: '' })
    const twist = TWISTS[Math.floor(Math.random() * TWISTS.length)]
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const system = 'You are Camri, a friendly white pearl camera-robot helping a photographer design their website. They just asked for a big design. Reply with JSON only, no markdown: {"text": string, "images": [{"name": "frame", "edge": "top", "prompt": string}, {"name": "strip", "edge": "top" or "bottom", "prompt": string}]}. "text": think out loud in 2 or 3 short, warm, excited sentences about what you are about to build, naming specific details in plain words such as colors, scenery and big visuals; take this fresh angle this time: ' + twist + '; no lists, no emoji, no markdown, no question; start with something like I\'m picturing or Okay, here\'s what I\'m thinking. "images": two photoreal scenery pictures made just for THIS theme, never people or text. The frame prompt must start with: a photoreal [theme] border frame for a website hero banner: then describe the specific scenery and objects down the left and right sides, and end with: the whole center 55 percent of the image left completely empty and fully transparent. The strip prompt describes a long straight horizontal strip of theme scenery, photoreal, edge to edge, to run along the top or bottom edge (choose edge: waves or ground go on the bottom, garlands or hanging things go on the top). Keep each picture prompt under 80 words.'
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 1800, system, messages: [{ role: 'user', content: message }] })
    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    let text = ''
    let images: { name: string; edge: string; prompt: string }[] = []
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      const parsed: any = m ? JSON.parse(m[0]) : null
      text = String(parsed?.text ?? '').trim().slice(0, 600)
      images = (Array.isArray(parsed?.images) ? parsed.images : []).slice(0, 2).map((i: any) => ({
        name: i?.name === 'strip' ? 'strip' : 'frame',
        edge: i?.edge === 'bottom' ? 'bottom' : 'top',
        prompt: String(i?.prompt ?? '').trim().slice(0, 600),
      })).filter((i: any) => i.prompt)
    } catch {
      const tm = raw.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      text = tm ? tm[1].replace(/\\"/g, '"').slice(0, 600) : ''
    }
    if (!images.length) {
      const theme = message.slice(0, 120)
      images = [
        { name: 'frame', edge: 'top', prompt: 'a photoreal ' + theme + ' border frame for a website hero banner: rich, detailed scenery and objects down the left and right sides that fit this theme, soft cinematic lighting, no people, no text, the whole center 55 percent of the image left completely empty and fully transparent' },
        { name: 'strip', edge: 'bottom', prompt: 'a long straight horizontal strip of photoreal scenery for this theme: ' + theme + ', edge to edge, soft cinematic lighting, no people, no text' },
      ]
    }
    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    await (adminDb() as any).from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_plan', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })
    return Response.json({ text, twist, images })
  } catch (e) {
    console.error('camri-plan failed', e)
    return Response.json({ text: '' })
  }
}
