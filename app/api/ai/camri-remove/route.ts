import { hasCamriAccess } from '@/lib/aiAccess'
import { adminDb, userFromRequest } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SIZES = new Set(['1024x1024', '1536x1024', '1024x1536'])

// Takes a photo and a mask (transparent where the thing to remove is), asks OpenAI to fill that area in,
// and saves the filled picture to the photographer's storage. The browser blends only the masked area into the original.
export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Object removal is not open to your account yet.' }, { status: 403 })
    const key = process.env.OPENAI_API_KEY
    if (!key) return Response.json({ error: 'Object removal is not set up yet.' }, { status: 503 })

    const fd = await request.formData().catch(() => null)
    const image = fd?.get('image')
    const mask = fd?.get('mask')
    const size = String(fd?.get('size') ?? '1024x1024')
    if (!(image instanceof File) || !(mask instanceof File) || !SIZES.has(size)) return Response.json({ error: 'Missing photo.' }, { status: 400 })

    const db = adminDb() as any
    const cap = Number(process.env.CAMRI_MONTHLY_CAP_USD ?? 5)
    const now = new Date()
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    const { data: used, error: usedErr } = await db.from('ai_usage').select('cost_usd').eq('owner_id', auth.user.id).like('job', 'camri%').gte('created_at', monthStart)
    const spent = usedErr ? 0 : (used ?? []).reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0)
    if (cap > 0 && spent >= cap) return Response.json({ error: 'Monthly limit reached.' }, { status: 429 })

    const out = new FormData()
    out.append('model', process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare')
    out.append('image', image, 'photo.jpg')
    out.append('mask', mask, 'mask.png')
    out.append('prompt', 'Remove whatever is in the transparent masked area and fill it in so it looks like it was never there. Continue the surrounding background, lighting, texture, color and film grain naturally. Do not change anything outside the masked area. Do not add any new objects, people or text.')
    out.append('size', size)
    out.append('quality', process.env.OPENAI_IMAGE_QUALITY || 'medium')
    out.append('n', '1')

    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 55000)
    const res = await fetch('https://api.openai.com/v1/images/edits', { signal: ctl.signal, method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: out })
    clearTimeout(timer)
    if (!res.ok) {
      const errText = (await res.text().catch(() => '')).slice(0, 800)
      console.error('camri-remove openai', res.status, errText)
      let detail = errText
      try { detail = JSON.parse(errText)?.error?.message ?? errText } catch { /* plain text */ }
      return Response.json({ error: 'The removal did not work out.', detail: 'OpenAI said (' + res.status + '): ' + String(detail).slice(0, 300) }, { status: 502 })
    }
    const j: any = await res.json()
    const b64 = j?.data?.[0]?.b64_json
    if (!b64) return Response.json({ error: 'The removal did not work out.' }, { status: 502 })

    const path = auth.user.id + '/ai_remove_' + Date.now() + '.png'
    const up = await db.storage.from('portfolio').upload(path, Buffer.from(b64, 'base64'), { contentType: 'image/png', upsert: true })
    if (up.error) {
      console.error('camri-remove upload', up.error)
      return Response.json({ error: 'Could not save the result.' }, { status: 500 })
    }
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_remove', model: 'openai-image-edit',
      photos: 1, input_tokens: 0, output_tokens: 0, cost_usd: Number(process.env.CAMRI_REMOVE_COST_USD ?? 0.08),
    })
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    return Response.json({ url: base + '/storage/v1/object/public/portfolio/' + path })
  } catch (e) {
    console.error('camri-remove failed', e)
    if ((e as any)?.name === 'AbortError') return Response.json({ error: 'That took too long.', detail: 'OpenAI took longer than 55 seconds.' }, { status: 504 })
    return Response.json({ error: 'Camri hit a snag. Try again.', detail: String((e as any)?.message ?? e).slice(0, 200) }, { status: 500 })
  }
}
