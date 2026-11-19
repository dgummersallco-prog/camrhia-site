import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, MONTHLY_PHOTOS, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const LABELS = ['Getting ready','Ceremony','Portraits','Couple','Family and group','Details','Cocktail hour','Reception','First dance','Dancing','Cake and toasts','Sendoff','Candid','Venue and scenery','Other']

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const images: string[] = (Array.isArray(body.images) ? body.images : [])
      .filter((x: unknown): x is string => typeof x === 'string' && x.length < 500_000)
      .map((x: string) => x.replace(/^data:image\/\w+;base64,/, ''))
    if (images.length === 0 || images.length > 12) return Response.json({ error: 'Send between 1 and 12 photos.' }, { status: 400 })
    const galleryId = typeof body.galleryId === 'string' ? body.galleryId : null

    const db = adminDb() as any
    const [usedRes, profRes] = await Promise.all([
      db.rpc('ai_photos_this_month', { uid: auth.user.id }),
      db.from('profiles').select('ai_pack_photos').eq('id', auth.user.id).single(),
    ])
    const used = Number(usedRes.data ?? 0)
    const pack = Number(profRes.data?.ai_pack_photos ?? 0)
    const fromPack = Math.max(0, images.length - Math.max(0, MONTHLY_PHOTOS - used))
    if (fromPack > pack) return Response.json({ error: "You have used this month's AI photos. Add a pack to keep going." }, { status: 402 })

    const content: any[] = []
    images.forEach((data, i) => {
      content.push({ type: 'text', text: `Photo ${i + 1}:` })
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })
    })
    content.push({ type: 'text', text: `These ${images.length} photos are from one professional photo shoot. Label what is happening in each photo using ONLY these labels: ${LABELS.join(', ')}. Reply with ONLY a JSON object: {"labels": [${images.length} strings, one per photo in order]}` })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 80 + images.length * 14, messages: [{ role: 'user', content }] })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: galleryId, job: 'scenes', model: MODEL_ID.haiku,
      photos: images.length, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })
    if (fromPack > 0) await db.from('profiles').update({ ai_pack_photos: pack - fromPack }).eq('id', auth.user.id)

    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = text.match(/\{[\s\S]*\}/)
    let raw: unknown[] = []
    try { raw = m ? (JSON.parse(m[0]).labels ?? []) : [] } catch { raw = [] }
    const labels = images.map((_, i) => (typeof raw[i] === 'string' && LABELS.includes(raw[i] as string) ? (raw[i] as string) : 'Other'))
    return Response.json({ labels })
  } catch {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
