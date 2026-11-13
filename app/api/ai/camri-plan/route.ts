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
    const system = `You are Camri, a friendly white pearl camera-robot helping a photographer design their website. They just asked for a big design. Reply with JSON only, no markdown: {"text": string, "images": [{"name": "scene", "edge": "top", "prompt": string}]}. "text": think out loud in 2 or 3 short, warm, excited sentences about what you are about to build, naming specific details in plain words such as colors, scenery and big visuals; take this fresh angle this time: ${twist}; no lists, no emoji, no markdown, no question; start with something like I am picturing or Okay, here is what I am thinking. "images": exactly one photoreal full-page background scene made just for THIS theme, never people or text. It is 1536x1024 landscape and will be pinned behind the whole website as a fixed backdrop, with text, menus and the photographers own photos laid over it, so describe a rich, immersive, cinematic scene with depth (sky, horizon, foreground details, soft glowing light) whose middle area is calm, softly lit and slightly darker and less busy so white and gold text stays readable, with the richest details toward the left and right edges. Keep the prompt under 100 words.`
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 1800, system, messages: [{ role: 'user', content: message }] })
    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    let text = ''
    let images: { name: string; edge: string; prompt: string }[] = []
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      const parsed: any = m ? JSON.parse(m[0]) : null
      text = String(parsed?.text ?? '').trim().slice(0, 600)
      images = (Array.isArray(parsed?.images) ? parsed.images : []).slice(0, 1).map((i: any) => ({
        name: 'scene',
        edge: i?.edge === 'bottom' ? 'bottom' : 'top',
        prompt: String(i?.prompt ?? '').trim().slice(0, 600),
      })).filter((i: any) => i.prompt)
    } catch {
      const tm = raw.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      text = tm ? tm[1].replace(/\\"/g, '"').slice(0, 600) : ''
    }
    if (!images.length) {
      images = [{ name: 'scene', edge: 'top', prompt: 'a rich, immersive, cinematic photoreal scene for this theme: ' + message.slice(0, 120) + ', soft glowing light, depth, the middle calm and slightly darker and less busy so text stays readable, the richest details toward the left and right edges, no people, no text' }]
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
