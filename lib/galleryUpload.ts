import { supabase } from '@/lib/supabase'
import { makeVersions, isHeic, isRaw } from '@/lib/galleryImages'
import { storageLimitBytes, formatBytes } from '@/lib/storageLimit'

const BUCKET = 'galleries'
const CONCURRENCY = 5
export const MAX_BYTES = 250 * 1024 * 1024
export const isAccepted = (f: File) => isHeic(f) || isRaw(f) || /^image\/(jpeg|png|webp)$/.test(f.type)

export type UploadSummary = { added: number; failed: File[]; message: string | null }

export async function uploadPhotos(args: {
  userId: string
  galleryId: string
  files: File[]
  existing: { filename: string | null; size_bytes: number | null; sort_order: number }[]
  onProgress: (done: number, total: number) => void
}): Promise<UploadSummary> {
  const sb = supabase
  if (!sb) return { added: 0, failed: [], message: 'Not connected.' }
  const client = sb
  const { userId, galleryId, existing, onProgress } = args

  const have = new Set(existing.map((p) => `${p.filename}|${p.size_bytes}`))
  const real = args.files.filter((f) => !f.name.startsWith('.'))
  const unsupported = real.filter((f) => !isAccepted(f)).length
  const accepted = real.filter(isAccepted)
  const dupes = accepted.filter((f) => have.has(`${f.name}|${f.size}`)).length
  const tooBig = accepted.filter((f) => f.size > MAX_BYTES).length
  const files = accepted
    .filter((f) => !have.has(`${f.name}|${f.size}`) && f.size <= MAX_BYTES)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const notes: string[] = []
  if (dupes) notes.push(`${dupes} already here, skipped`)
  if (tooBig) notes.push(`${tooBig} over 250 MB, skipped`)
  if (unsupported) notes.push(`${unsupported} unsupported, skipped`)
  if (files.length === 0) return { added: 0, failed: [], message: notes.join(' · ') || 'No photos to add.' }

  const incoming = files.reduce((n, f) => n + f.size, 0)
  const [usageRes, profRes] = await Promise.all([
    client.rpc('storage_usage'),
    client.from('profiles').select('plan_tier, storage_addon_packs').eq('id', userId).single(),
  ])
  const used = ((usageRes.data ?? []) as { bytes: number }[]).reduce((n, r) => n + Number(r.bytes), 0)
  const limit = storageLimitBytes(profRes.data?.plan_tier as string | null, (profRes.data?.storage_addon_packs as number | null) ?? 0)
  if (used + incoming > limit) {
    return {
      added: 0,
      failed: [],
      message: `Not enough storage. You are using ${formatBytes(used)} of ${formatBytes(limit)}. Delete old galleries or add storage on the Storage page.`,
    }
  }

  const base = existing.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1
  const failed: File[] = []
  let done = 0
  let next = 0

  async function uploadOne(file: File, order: number) {
    const photoId = crypto.randomUUID()
    const heic = isHeic(file)
    const raw = isRaw(file)
    const ext = raw
      ? (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'raw'
      : heic ? 'heic' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const origType = raw ? 'application/octet-stream' : heic ? 'image/heic' : file.type
    const dir = `${userId}/${galleryId}/${photoId}`
    const origPath = `${dir}/orig.${ext}`
    const webPath = `${dir}/web.jpg`
    const thumbPath = `${dir}/thumb.jpg`
    const fullPath = `${dir}/full.jpg`
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const bucket = client.storage.from(BUCKET)
        const [v, o] = await Promise.all([
          makeVersions(file),
          bucket.upload(origPath, file, { contentType: origType, upsert: true }),
        ])
        if (o.error) throw o.error
        const [t, w, f] = await Promise.all([
          bucket.upload(thumbPath, v.thumb.blob, { contentType: 'image/jpeg', upsert: true }),
          bucket.upload(webPath, v.web.blob, { contentType: 'image/jpeg', upsert: true }),
          v.full ? bucket.upload(fullPath, v.full, { contentType: 'image/jpeg', upsert: true }) : Promise.resolve(null),
        ])
        if (t.error) throw t.error
        if (w.error) throw w.error
        if (f && f.error) throw f.error
        const { error } = await client.from('gallery_photos').insert({
          id: photoId, gallery_id: galleryId, owner_id: userId, filename: file.name,
          orig_path: origPath, web_path: webPath, thumb_path: thumbPath, full_path: v.full ? fullPath : null,
          width: v.width, height: v.height, size_bytes: file.size,
          extra_bytes: v.web.blob.size + v.thumb.blob.size + (v.full ? v.full.size : 0), sort_order: order,
        })
        if (error) throw error
        return
      } catch {
        /* retry */
      }
    }
    failed.push(file)
  }

  async function worker() {
    while (true) {
      const i = next++
      if (i >= files.length) return
      await uploadOne(files[i], base + i)
      done++
      onProgress(done, files.length)
    }
  }
  onProgress(0, files.length)
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
  return { added: files.length - failed.length, failed, message: notes.join(' · ') || null }
}
