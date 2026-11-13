import Anthropic from '@anthropic-ai/sdk'
import { hasCamriAccess } from '@/lib/aiAccess'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TWISTS = [
  'a dreamy glowing night-sky mood',
  'a cozy fireplace and candlelight mood',
  'a crisp frosted morning with gold details',
  'a vintage storybook feel',
  'a bold, bright and playful take',
  'a luxe champagne-and-velvet feel',
  'something unexpected and a little magical',
  'a soft, romantic glow with lots of sparkle',
]

// A quick "thinking out loud" message so the person hears Camri's plan while the big build runs.
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
    const system = "You are Camri, a friendly white pearl camera-robot helping a photographer design their website. They just asked for a big design. Think out loud in 2 or 3 short, warm, excited sentences about what you are about to build: name specific details in plain words, such as the colors, lights, decorations and big visuals like trees or giant snowflakes. Take this fresh angle this time: " + twist + ". No lists, no emoji, no markdown, and do not ask a question. Start with something like I'm picturing or Okay, here's what I'm thinking."
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 260, system, messages: [{ role: 'user', content: message }] })
    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('').trim().slice(0, 600)
    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    await (adminDb() as any).from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_plan', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })
    return Response.json({ text, twist })
  } catch (e) {
    console.error('camri-plan failed', e)
    return Response.json({ text: '' })
  }
}
