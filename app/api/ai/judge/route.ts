import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { JOB_TIER, MODEL_ID, MAX_IMAGES, MONTHLY_PHOTOS, costUsd, promptFor, type AiJob } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    // Beta gate: only the emails listed in AI_BETA_EMAILS can spend AI money.
    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!email || !beta.includes(email)) return Response.json({ error: 'AI culling is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'AI is not set up yet.' }, { status: 503 })

    const body = await request.json()
    if (typeof body.job !== 'string' || !(body.job in JOB_TIER)) return Response.json({ error: 'Unknown job.' }, { status: 400 })
    const job = body.job as AiJob
    const tier = JOB_TIER[job]
    const images: string[] = (Array.isArray(body.images) ? body.images : [])
      .filter((x: unknown): x is string => typeof x === 'string' && x.length < 500_000)
      .map((x: string) => x.replace(/^data:image\/\w+;base64,/, ''))
    if (images.length === 0 || images.length > MAX_IMAGES) return Response.json({ error: 'Send between 1 and 12 photos.' }, { status: 400 })
    const galleryId = typeof body.galleryId === 'string' ? body.galleryId : null

    // Monthly allowance, then any purchased pack photos.
    const db = adminDb() as any
    const [usedRes, profRes] = await Promise.all([
      db.rpc('ai_photos_this_month', { uid: auth.user.id }),
      db.from('profiles').select('ai_pack_photos').eq('id', auth.user.id).single(),
    ])
    const used = Number(usedRes.data ?? 0)
    const pack = Number(profRes.data?.ai_pack_photos ?? 0)
    const fromPack = Math.max(0, images.length - Math.max(0, MONTHLY_PHOTOS - used))
    if (fromPack > pack) return Response.json({ error: "You have used this month's AI photos. Add a pack to keep going." }, { status: 402 })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const content: any[] = []
    images.forEach((data, i) => {
      content.push({ type: 'text', text: `Photo ${i + 1}:` })
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })
    })
    content.push({ type: 'text', text: promptFor(job, images.length) })
    const res = await client.messages.create({
      model: MODEL_ID[tier],
      max_tokens: 120 + images.length * 70,
      messages: [{ role: 'user', content }],
    })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const cost = costUsd(tier, inTok, outTok)
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: galleryId, job, model: MODEL_ID[tier],
      photos: images.length, input_tokens: inTok, output_tokens: outTok, cost_usd: cost,
    })
    if (fromPack > 0) await db.from('profiles').update({ ai_pack_photos: pack - fromPack }).eq('id', auth.user.id)

    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = text.match(/\{[\s\S]*\}/)
    let result: unknown = null
    try { result = m ? JSON.parse(m[0]) : null } catch { result = null }
    if (!result) return Response.json({ error: 'The AI answer could not be read. Try again.' }, { status: 502 })
    return Response.json({ result, usage: { inputTokens: inTok, outputTokens: outTok, costUsd: cost } })
  } catch {
    return Response.json({ error: 'AI is unavailable right now.' }, { status: 500 })
  }
}
