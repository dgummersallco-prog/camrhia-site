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
    const system = `You are Camri, a friendly white pearl camera-robot and refined art director for wedding and portrait photographers, helping a photographer design their website. They just asked for a big design. Reply with JSON only, no markdown: {"text": string, "images": [{"name": "corner", "prompt": string}, {"name": "divider", "prompt": string}, {"name": "sprig", "prompt": string}, {"name": "texture", "prompt": string}]}. "text": think out loud in 2 or 3 short, warm, excited sentences about the look you are about to build, naming specific details in plain words such as colors, small decorative touches and mood; take this fresh angle this time: ${twist}; no lists, no emoji, no markdown, no question; start with something like I am picturing or Okay, here is what I am thinking. "images": exactly four small decorative pieces for THIS theme, all in one cohesive refined style and the same 3 or 4 color palette, fine-art photoreal quality, never people or text, each on a fully transparent background except the texture. corner: a small organic accent for the corner of a website hero (a sprig, ribbon or botanical cluster) centered on an empty transparent square. divider: a delicate horizontal ornamental garland or flourish that runs the full width of the image from the left edge to the right edge, vertically centered in a thin band about 15 percent of the image height, with everything above and below that band empty and transparent. sprig: a small single ornament or sprig to tuck onto the corner of a card, centered on an empty transparent square. texture: a very soft, light, low-contrast seamless paper, linen or watercolor wash in the theme palette that text can sit on, edge to edge. Keep each prompt under 60 words. Art direction: elegant, editorial, tasteful and timeless, never cheesy, cluttered or cartoonish.`
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 1800, system, messages: [{ role: 'user', content: message }] })
    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    let text = ''
    let images: { name: string; edge: string; prompt: string }[] = []
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      const parsed: any = m ? JSON.parse(m[0]) : null
      text = String(parsed?.text ?? '').trim().slice(0, 600)
      images = (Array.isArray(parsed?.images) ? parsed.images : []).slice(0, 4).map((i: any) => ({
        name: ['corner', 'divider', 'sprig', 'texture'].includes(i?.name) ? i.name : 'corner',
        edge: i?.edge === 'bottom' ? 'bottom' : 'top',
        prompt: String(i?.prompt ?? '').trim().slice(0, 600),
      })).filter((i: any) => i.prompt)
    } catch {
      const tm = raw.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      text = tm ? tm[1].replace(/\\"/g, '"').slice(0, 600) : ''
    }
    if (!images.length) {
      const th = message.slice(0, 120)
      images = [
        { name: 'corner', edge: 'top', prompt: 'a small refined decorative sprig or ribbon accent for a website corner, theme: ' + th + ', fine-art photoreal, soft natural light, restrained palette, empty transparent background, no people, no text' },
        { name: 'divider', edge: 'top', prompt: 'a slim delicate horizontal ornamental line or garland, very wide and thin, centered, theme: ' + th + ', fine-art photoreal, restrained palette, lots of empty transparent space above and below, no people, no text' },
        { name: 'sprig', edge: 'top', prompt: 'a small single ornament or sprig to tuck onto a card corner, theme: ' + th + ', fine-art photoreal, restrained palette, empty transparent background, no people, no text' },
        { name: 'texture', edge: 'top', prompt: 'a very soft, light, low-contrast seamless paper or watercolor wash texture in the palette of this theme: ' + th + ', edge to edge, no objects, no people, no text' },
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
