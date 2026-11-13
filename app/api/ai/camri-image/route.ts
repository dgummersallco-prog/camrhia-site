import { hasCamriAccess } from '@/lib/aiAccess'
import { adminDb, userFromRequest } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SIZES: Record<string, string> = { tall: '1024x1536', wide: '1536x1024', square: '1024x1024' }

// Makes one transparent photoreal picture for Camri's designs and saves it to the photographer's storage.
export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    const key = process.env.OPENAI_API_KEY
    if (!key) return Response.json({ error: 'Images are not set up yet.' }, { status: 503 })

    const body: any = await request.json().catch(() => ({}))
    const prompt = String(body?.prompt ?? '').trim().slice(0, 600)
    const name = String(body?.name ?? 'art').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'art'
    if (!prompt) return Response.json({ error: 'Tell me what to draw.' }, { status: 400 })
    const size = SIZES[String(body?.shape)] ?? SIZES.square

    const db = adminDb() as any
    const cap = Number(process.env.CAMRI_MONTHLY_CAP_USD ?? 5)
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { data: used, error: usedErr } = await db.from('ai_usage').select('cost_usd').eq('owner_id', auth.user.id).like('job', 'camri%').gte('created_at', monthStart)
    const spent = usedErr ? 0 : (used ?? []).reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0)
    if (cap > 0 && spent >= cap) return Response.json({ error: 'Monthly limit reached.' }, { status: 429 })

    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 52000)
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      signal: ctl.signal,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare',
        prompt: 'Photorealistic, highly detailed: ' + prompt + '. Scenery and objects only: no people, no faces, no text, no watermark. Cinematic, professional photography quality.',
        size,
        quality: process.env.OPENAI_IMAGE_QUALITY || 'medium',
        background: name === 'scene' ? 'opaque' : 'transparent',
        output_format: 'png',
        n: 1,
      }),
    })
    clearTimeout(timer)
    if (!res.ok) {
      const errText = (await res.text().catch(() => '')).slice(0, 800)
      console.error('camri-image openai', res.status, errText)
      let detail = errText
      try { detail = JSON.parse(errText)?.error?.message ?? errText } catch { /* plain text */ }
      return Response.json({ error: 'The picture did not work out.', detail: 'OpenAI said (' + res.status + '): ' + String(detail).slice(0, 300) }, { status: 502 })
    }
    const j: any = await res.json()
    const b64 = j?.data?.[0]?.b64_json
    if (!b64) return Response.json({ error: 'The picture did not work out.' }, { status: 502 })

    const path = auth.user.id + '/ai_' + Date.now() + '_' + name + '.png'
    const up = await db.storage.from('portfolio').upload(path, Buffer.from(b64, 'base64'), { contentType: 'image/png', upsert: true })
    if (up.error) {
      console.error('camri-image upload', up.error)
      return Response.json({ error: 'Could not save the picture.' }, { status: 500 })
    }
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_image', model: 'openai-image',
      photos: 0, input_tokens: 0, output_tokens: 0, cost_usd: Number(process.env.CAMRI_IMAGE_COST_USD ?? 0.08),
    })
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    return Response.json({ url: base + '/storage/v1/object/public/portfolio/' + path })
  } catch (e) {
    console.error('camri-image failed', e)
    if ((e as any)?.name === 'AbortError') return Response.json({ error: 'The picture took too long.', detail: 'OpenAI took longer than 50 seconds to make it.' }, { status: 504 })
    return Response.json({ error: 'Camri hit a snag. Try again.', detail: String((e as any)?.message ?? e).slice(0, 200) }, { status: 500 })
  }
}
