import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, MONTHLY_PHOTOS, costUsd } from '@/lib/aiRouter'

export const dynamic = 'force-dynamic'

const GENERIC = ['Portraits', 'Groups', 'Candid', 'Details', 'Scenery', 'Other']
const SETS: [RegExp, string[]][] = [
  [/wedding|elop/i, ['Getting ready', 'Ceremony', 'Portraits', 'Couple', 'Family and group', 'Details', 'Cocktail hour', 'Reception', 'First dance', 'Dancing', 'Cake and toasts', 'Sendoff', 'Candid', 'Venue and scenery', 'Other']],
  [/newborn|baby|infant/i, ['Swaddled', 'Parents', 'Siblings', 'Close-ups', 'Details', 'Family', 'Other']],
  [/family/i, ['Whole family', 'Parents', 'Kids', 'Siblings', 'Candid', 'Details', 'Scenery', 'Other']],
  [/maternity|pregnan/i, ['Solo portraits', 'Couple', 'Family', 'Details', 'Scenery', 'Other']],
  [/engage|couple|proposal/i, ['Portraits', 'Walking', 'Close-ups', 'Laughing', 'Details', 'Scenery', 'Other']],
  [/senior|graduat/i, ['Portraits', 'Outfit changes', 'Friends', 'Details', 'Scenery', 'Candid', 'Other']],
  [/headshot|brand/i, ['Headshots', 'Full body', 'Workspace', 'Details', 'Candid', 'Other']],
  [/sport|team/i, ['Team', 'Action', 'Portraits', 'Details', 'Other']],
]
const labelsFor = (t: string) => { for (const [re, l] of SETS) if (re.test(t)) return l; return GENERIC }

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
    const sessionType = typeof body.sessionType === 'string' ? body.sessionType.slice(0, 60) : ''
    const labels = labelsFor(sessionType)

    const db = adminDb() as any
    const [usedRes, profRes] = await Promise.all([
      db.rpc('ai_photos_this_month', { uid: auth.user.id }),
      db.from('profiles').select('ai_pack_photos').eq('id', auth.user.id).single(),
    ])
    const used = Number(usedRes.data ?? 0)
    const pack = Number(profRes.data?.ai_pack_photos ?? 0)
    const fromPack = Math.max(0, images.length - Math.max(0, MONTHLY_PHOTOS - used))
    if (fromPack > pack) return Response.json({ error: "You have used this month's AI photos. Add a pack to keep going." }, { status: 402 })

    const n = images.length
    const content: any[] = []
    images.forEach((data, i) => {
      content.push({ type: 'text', text: `Photo ${i + 1}:` })
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } })
    })
    content.push({ type: 'text', text: `These ${n} photos are from one professional ${sessionType || 'photo'} shoot. For each photo give: "scene" (use ONLY one of: ${labels.join(', ')}), "tags" (3 to 5 short lowercase words for what is visible, like kiss, cake, dog, bouquet, laughing), "score" (1 to 10, how strong a keeper it is for the client's gallery: expression, moment, composition), and "closed" (true only if the main person clearly has their eyes closed, otherwise false). Reply with ONLY a JSON object: {"photos": [${n} objects like {"scene": "...", "tags": ["..."], "score": 7, "closed": false}, one per photo in order]}` })

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 140 + n * 60, messages: [{ role: 'user', content }] })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: galleryId, job: 'scenes', model: MODEL_ID.haiku,
      photos: n, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })
    if (fromPack > 0) await db.from('profiles').update({ ai_pack_photos: pack - fromPack }).eq('id', auth.user.id)

    const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = text.match(/\{[\s\S]*\}/)
    let raw: any[] = []
    try { raw = m ? (JSON.parse(m[0]).photos ?? []) : [] } catch { raw = [] }
    const photos = images.map((_, i) => {
      const r = raw[i] ?? {}
      const scene = typeof r.scene === 'string' && labels.includes(r.scene) ? r.scene : labels[labels.length - 1]
      const tags = Array.isArray(r.tags) ? r.tags.filter((t: unknown): t is string => typeof t === 'string').map((t: string) => t.toLowerCase().trim().slice(0, 24)).filter(Boolean).slice(0, 5) : []
      const score = Math.min(10, Math.max(1, Math.round(Number(r.score) || 5)))
      return { scene, tags, score, closed: r.closed === true }
    })
    return Response.json({ photos, order: labels })
  } catch {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
