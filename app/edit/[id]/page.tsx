'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { cullPhotos, type CullLabel } from '@/lib/cull'
import { enhancePhoto, renderPreview, LOOKS } from '@/lib/enhance'
import { sendGalleryToClient } from '@/lib/sendGallery'
import { uploadPhotos } from '@/lib/galleryUpload'

type Photo = {
  id: string
  filename: string | null
  orig_path: string
  web_path: string | null
  thumb_path: string | null
  full_path: string | null
  size_bytes: number | null
  sort_order: number
  cull_label: CullLabel | null
  cull_score: number | null
  cull_group: string | null
  cull_reason: string | null
  enhanced: boolean | null
  pre_web_path: string | null
  pre_thumb_path: string | null
  pre_full_path: string | null
}
type G = { id: string; title: string; status: string; session_id: string | null; token: string; pin_hash: string | null; expires_at: string | null; audience: string }
type Sess = { id: string; names: string | null; couple_user_id: string | null; gallery_sent_at: string | null; gallery_url: string | null }

const BUCKET = 'galleries'
const COLS =
  'id, filename, orig_path, web_path, thumb_path, full_path, size_bytes, sort_order, cull_label, cull_score, cull_group, cull_reason, enhanced, pre_web_path, pre_thumb_path, pre_full_path'
const ACCEPT =
  'image/jpeg,image/png,image/webp,.heic,.heif,.cr2,.cr3,.crw,.nef,.nrw,.arw,.srf,.sr2,.dng,.orf,.rw2,.raf,.pef,.3fr,.erf,.kdc,.mrw,.raw,.rwl,.iiq'
const STEPS = ['Photos', 'Cull', 'Duplicates', 'Style', 'Develop', 'Send']

const panel = 'rounded-2xl border border-white/10 bg-[#151518] p-6'
const btnPrimary = 'rounded-xl bg-twilight px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
const btnQuiet = 'rounded-xl border border-white/15 px-5 py-3 text-sm text-white/80 transition hover:border-white/40 disabled:opacity-40'
const btnDanger = 'rounded-xl bg-red-600 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'

export default function EditWalkthrough() {
  const params = useParams<{ id: string }>()
  const galleryId = params.id
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const failedRef = useRef<File[]>([])

  const [userId, setUserId] = useState<string | null>(null)
  const [gallery, setGallery] = useState<G | null>(null)
  const [sess, setSess] = useState<Sess | null>(null)
  const [audience, setAudience] = useState<'picks' | 'picks_maybe' | 'all'>('all')
  const [pin, setPin] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState<string | null>(null)
  const [sentDone, setSentDone] = useState<'sent' | 'published' | null>(null)

  async function sendNow() {
    const sb = supabase
    if (!sb || !gallery) return
    setSendErr(null)
    const code = pin.trim()
    if (gallery.pin_hash && !code) { setSendErr('Enter the PIN your client should use.'); return }
    if (code && code.length < 4) { setSendErr('Use a PIN of at least 4 characters.'); return }
    setSending(true)
    const { data: upd, error: ue } = await sb.from('galleries').update({ audience, status: 'published' }).eq('id', gallery.id).select('expires_at').maybeSingle()
    if (ue) { setSending(false); setSendErr(ue.message); return }
    const expiresAt = (upd as { expires_at: string | null } | null)?.expires_at ?? gallery.expires_at
    if (code) {
      const { error: pe } = await sb.rpc('set_gallery_pin', { p_gallery_id: gallery.id, p_pin: code })
      if (pe) { setSending(false); setSendErr(pe.message); return }
    }
    if (sess) {
      const err = await sendGalleryToClient(sb, {
        weddingId: sess.id,
        coupleUserId: sess.couple_user_id,
        token: gallery.token,
        expiresAt,
        pin: code,
        alreadySent: !!sess.gallery_sent_at && !!sess.gallery_url && sess.gallery_url.includes(gallery.token),
      })
      if (err) { setSending(false); setSendErr(err); return }
    }
    setSending(false)
    setGallery({ ...gallery, status: 'published', audience, expires_at: expiresAt })
    setSentDone(sess ? 'sent' : 'published')
  }
  const [photos, setPhotos] = useState<Photo[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)
  const [step, setStep] = useState(0)
  const [reached, setReached] = useState(0)
  const [msg, setMsg] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const [up, setUp] = useState({ busy: false, done: 0, total: 0, note: null as string | null })
  const [cullTarget, setCullTarget] = useState('')
  const [cullEyes, setCullEyes] = useState(true)
  const [cull, setCull] = useState<{ busy: boolean; done: number; total: number; phase: 'sharp' | 'eyes' }>({ busy: false, done: 0, total: 0, phase: 'sharp' })
  const [rescued, setRescued] = useState<Set<string>>(new Set())
  const [confirmCut, setConfirmCut] = useState(false)
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [working, setWorking] = useState(false)
  const [dev, setDev] = useState({ busy: false, done: 0, total: 0 })
  const [latest, setLatest] = useState<{ before: string | null; after: string } | null>(null)
  const [lookId, setLookId] = useState('natural')
  const [strength, setStrength] = useState(0.8)
  const [showOrig, setShowOrig] = useState(false)
  const [sampleUrls, setSampleUrls] = useState<Record<string, string>>({})
  const [cardUrls, setCardUrls] = useState<Record<string, string>>({})
  const bmps = useRef<Map<string, ImageBitmap>>(new Map())

  const samples = (() => {
    const pool = photos.filter((p) => p.cull_label !== 'reject' && p.thumb_path)
    if (pool.length <= 4) return pool
    return [0, 1, 2, 3].map((i) => pool[Math.floor(((i + 0.5) / 4) * pool.length)])
  })()
  const sampleKey = samples.map((p) => p.id).join(',')

  useEffect(() => {
    if (step !== 3 || !sampleKey) return
    let cancelled = false
    ;(async () => {
      for (const p of samples) {
        if (bmps.current.has(p.id) || !p.thumb_path || !thumbs[p.thumb_path]) continue
        try {
          const res = await fetch(thumbs[p.thumb_path])
          const bmp = await createImageBitmap(await res.blob(), { imageOrientation: 'from-image' })
          bmps.current.set(p.id, bmp)
        } catch {
          /* skip this sample */
        }
      }
      if (cancelled) return
      const first = samples[0] ? bmps.current.get(samples[0].id) : undefined
      if (!first) return
      const next: Record<string, string> = {}
      for (const l of LOOKS) next[l.id] = await renderPreview(first, l.id, 1, 320)
      if (cancelled) { Object.values(next).forEach((u) => URL.revokeObjectURL(u)); return }
      setCardUrls((prev) => { Object.values(prev).forEach((u) => URL.revokeObjectURL(u)); return next })
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, sampleKey, thumbs])

  useEffect(() => {
    if (step !== 3 || !sampleKey) return
    let cancelled = false
    const t = setTimeout(async () => {
      const next: Record<string, string> = {}
      for (const p of samples) {
        const bmp = bmps.current.get(p.id)
        if (bmp) next[p.id] = await renderPreview(bmp, lookId, strength, 480)
      }
      if (cancelled) { Object.values(next).forEach((u) => URL.revokeObjectURL(u)); return }
      setSampleUrls((prev) => { Object.values(prev).forEach((u) => URL.revokeObjectURL(u)); return next })
    }, 150)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lookId, strength, sampleKey, cardUrls])

  const loadPhotos = useCallback(async (): Promise<Photo[]> => {
    const sb = supabase
    if (!sb) return []
    const all: Photo[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from('gallery_photos')
        .select(COLS)
        .eq('gallery_id', galleryId)
        .order('sort_order', { ascending: true })
        .range(from, from + 999)
      if (error) { setMsg(error.message); return all }
      const batch = (data ?? []) as Photo[]
      all.push(...batch)
      if (batch.length < 1000) break
    }
    setPhotos(all)
    const paths = all.map((p) => p.thumb_path).filter((x): x is string => !!x)
    const map: Record<string, string> = {}
    for (let i = 0; i < paths.length; i += 200) {
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 200), 3600)
      signed?.forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl })
    }
    setThumbs(map)
    return all
  }, [galleryId])

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    let cancelled = false
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace(`/login?next=/edit/${galleryId}`); return }
      setUserId(data.session.user.id)
      const { data: g } = await sb.from('galleries').select('id, title, status, session_id, token, pin_hash, expires_at, audience').eq('id', galleryId).maybeSingle()
      if (cancelled) return
      if (!g) { setMsg('Shoot not found.'); setLoaded(true); return }
      setGallery(g as G)
      setAudience(((g as G).audience || 'all') as 'picks' | 'picks_maybe' | 'all')
      if ((g as G).session_id) {
        const { data: sw } = await sb.from('weddings').select('id, names, couple_user_id, gallery_sent_at, gallery_url').eq('id', (g as G).session_id).maybeSingle()
        if (!cancelled) setSess((sw as Sess | null) ?? null)
      }
      const list = await loadPhotos()
      if (cancelled) return
      const s = list.length === 0 ? 0 : list.every((p) => p.enhanced) ? 5 : 1
      setStep(s)
      setReached(s)
      setLoaded(true)
    })
    return () => { cancelled = true }
  }, [galleryId, router, loadPhotos])

  function goTo(i: number) {
    setStep(i)
    setReached((r) => Math.max(r, i))
    setConfirmCut(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const img = (p: Photo, cls = 'h-full w-full object-cover') =>
    p.thumb_path && thumbs[p.thumb_path] ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={thumbs[p.thumb_path]} alt="" loading="lazy" draggable={false} className={cls} />
    ) : null

  async function removePhotos(list: Photo[]): Promise<boolean> {
    const sb = supabase
    if (!sb || list.length === 0) return true
    const ids = list.map((p) => p.id)
    const paths = list
      .flatMap((p) => [p.orig_path, p.web_path, p.thumb_path, p.full_path, p.pre_web_path, p.pre_thumb_path, p.pre_full_path])
      .filter((x): x is string => !!x)
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await sb.from('gallery_photos').delete().in('id', ids.slice(i, i + 100))
      if (error) { setMsg(error.message); return false }
    }
    for (let i = 0; i < paths.length; i += 100) {
      await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    }
    return true
  }

  // ---- Step 1: photos ----
  async function addFiles(files: File[]) {
    if (!userId || up.busy || files.length === 0) return
    setMsg(null)
    setUp({ busy: true, done: 0, total: files.length, note: null })
    const r = await uploadPhotos({
      userId,
      galleryId,
      files,
      existing: photos.map((p) => ({ filename: p.filename, size_bytes: p.size_bytes, sort_order: p.sort_order })),
      onProgress: (done, total) => setUp((u) => ({ ...u, done, total })),
    })
    failedRef.current = r.failed
    const note = [r.message, r.failed.length ? `${r.failed.length} could not be uploaded` : null].filter(Boolean).join(' · ') || null
    setUp({ busy: false, done: 0, total: 0, note })
    await loadPhotos()
  }

  // ---- Step 2: cull ----
  async function runCull() {
    const sb = supabase
    if (!sb || cull.busy) return
    const webMap: Record<string, string> = {}
    if (cullEyes) {
      const wp = photos.map((p) => p.web_path).filter((x): x is string => !!x)
      for (let i = 0; i < wp.length; i += 200) {
        const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(wp.slice(i, i + 200), 3600)
        signed?.forEach((s) => { if (s.path && s.signedUrl) webMap[s.path] = s.signedUrl })
      }
    }
    const items = photos
      .filter((p) => p.thumb_path && thumbs[p.thumb_path])
      .map((p) => ({ id: p.id, url: thumbs[p.thumb_path as string], webUrl: p.web_path ? webMap[p.web_path] : undefined }))
    if (items.length === 0) { setMsg('Photos are still loading. Try again in a moment.'); return }
    setCull({ busy: true, done: 0, total: items.length, phase: 'sharp' })
    try {
      const t = parseInt(cullTarget, 10)
      const { results } = await cullPhotos(items, {
        target: t > 0 ? t : undefined,
        eyes: cullEyes,
        onProgress: (done, total, phase) => setCull({ busy: true, done, total, phase }),
      })
      for (let i = 0; i < results.length; i += 10) {
        const rs = await Promise.all(
          results.slice(i, i + 10).map((r) =>
            sb.from('gallery_photos').update({ cull_label: r.label, cull_score: r.score, cull_group: r.group, cull_reason: r.reason }).eq('id', r.id),
          ),
        )
        const bad = rs.find((x) => x.error)
        if (bad?.error) throw bad.error
      }
      setRescued(new Set())
      await loadPhotos()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Culling failed. Please try again.')
    }
    setCull({ busy: false, done: 0, total: 0, phase: 'sharp' })
  }

  const labeled = photos.some((p) => p.cull_label)
  const cuts = photos.filter((p) => p.cull_label === 'reject' && !p.cull_group)
  const toCut = cuts.filter((p) => !rescued.has(p.id))
  const picks = photos.filter((p) => p.cull_label === 'pick').length
  const maybes = photos.filter((p) => p.cull_label === 'maybe').length

  async function doCut() {
    const sb = supabase
    if (!sb || working) return
    setWorking(true)
    const keepIds = cuts.filter((p) => rescued.has(p.id)).map((p) => p.id)
    for (let i = 0; i < keepIds.length; i += 100) {
      await sb.from('gallery_photos').update({ cull_label: 'pick', cull_reason: null }).in('id', keepIds.slice(i, i + 100))
    }
    const ok = await removePhotos(toCut)
    await loadPhotos()
    setRescued(new Set())
    setConfirmCut(false)
    setWorking(false)
    if (ok) goTo(2)
  }

  // ---- Step 3: duplicates ----
  const groupMap = new Map<string, Photo[]>()
  photos.forEach((p) => {
    if (!p.cull_group) return
    const arr = groupMap.get(p.cull_group) ?? []
    arr.push(p)
    groupMap.set(p.cull_group, arr)
  })
  const groupList = Array.from(groupMap.entries()).filter(([, m]) => m.length > 1)
  const bestOf = (key: string, m: Photo[]) => choice[key] ?? (m.find((p) => p.cull_label !== 'reject') ?? m[0]).id

  async function dropDuplicates() {
    const sb = supabase
    if (!sb || working) return
    setWorking(true)
    const drop: Photo[] = []
    const keepIds: string[] = []
    const promote: string[] = []
    groupList.forEach(([key, m]) => {
      const best = bestOf(key, m)
      m.forEach((p) => {
        if (p.id === best) {
          keepIds.push(p.id)
          if (p.cull_label === 'reject') promote.push(p.id)
        } else {
          drop.push(p)
        }
      })
    })
    const ok = await removePhotos(drop)
    for (let i = 0; i < keepIds.length; i += 100) {
      await sb.from('gallery_photos').update({ cull_group: null }).in('id', keepIds.slice(i, i + 100))
    }
    for (let i = 0; i < promote.length; i += 100) {
      await sb.from('gallery_photos').update({ cull_label: 'pick', cull_reason: null }).in('id', promote.slice(i, i + 100))
    }
    await loadPhotos()
    setChoice({})
    setWorking(false)
    if (ok) goTo(3)
  }

  // ---- Step 4: develop ----
  const todoDev = photos.filter((p) => !p.enhanced)

  async function runDevelop() {
    const sb = supabase
    if (!sb || dev.busy) return
    const client = sb
    const todo = photos.filter((p) => !p.enhanced)
    if (todo.length === 0) { goTo(5); return }
    setDev({ busy: true, done: 0, total: todo.length })
    let done = 0
    let failed = 0
    let next = 0
    async function worker() {
      while (true) {
        const i = next++
        if (i >= todo.length) return
        const p = todo[i]
        try {
          const srcPath = p.full_path ?? p.orig_path
          const dl = await client.storage.from(BUCKET).download(srcPath)
          if (dl.error || !dl.data) throw dl.error ?? new Error('Could not load the photo.')
          const out = await enhancePhoto(dl.data, srcPath, { id: lookId, strength })
          const dir = p.orig_path.slice(0, p.orig_path.lastIndexOf('/'))
          const eFull = `${dir}/enh-full.jpg`
          const eWeb = `${dir}/enh-web.jpg`
          const eThumb = `${dir}/enh-thumb.jpg`
          const ups = await Promise.all([
            client.storage.from(BUCKET).upload(eFull, out.full, { contentType: 'image/jpeg', upsert: true }),
            client.storage.from(BUCKET).upload(eWeb, out.web.blob, { contentType: 'image/jpeg', upsert: true }),
            client.storage.from(BUCKET).upload(eThumb, out.thumb.blob, { contentType: 'image/jpeg', upsert: true }),
          ])
          const bad = ups.find((u) => u.error)
          if (bad?.error) throw bad.error
          const { error } = await client
            .from('gallery_photos')
            .update({
              enhanced: true,
              pre_web_path: p.web_path,
              pre_thumb_path: p.thumb_path,
              pre_full_path: p.full_path ?? null,
              web_path: eWeb,
              thumb_path: eThumb,
              full_path: eFull,
              enh_bytes: out.full.size + out.web.blob.size + out.thumb.blob.size,
            })
            .eq('id', p.id)
          if (error) throw error
          const url = URL.createObjectURL(out.web.blob)
          const before = p.thumb_path ? thumbs[p.thumb_path] ?? null : null
          setLatest((prev) => {
            if (prev?.after) URL.revokeObjectURL(prev.after)
            return { before, after: url }
          })
        } catch {
          failed++
        }
        done++
        setDev({ busy: true, done, total: todo.length })
      }
    }
    await Promise.all(Array.from({ length: 2 }, () => worker()))
    await loadPhotos()
    setDev({ busy: false, done: 0, total: 0 })
    if (failed) setMsg(`${failed} photo${failed === 1 ? '' : 's'} could not be developed. You can run this step again.`)
    else goTo(5)
  }

  if (!loaded) {
    return <div className="min-h-screen bg-[#0c0c0e] p-10 text-sm text-white/40">{msg ?? 'Loading…'}</div>
  }

  const enhancedCount = photos.filter((p) => p.enhanced).length

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#ececf0]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/edit" className="text-sm text-white/50 transition hover:text-white">← Editing room</Link>
          <p className="truncate font-fraunces text-lg text-white">{gallery?.title}</p>
          <Link href={`/galleries/${galleryId}`} className="text-sm text-white/50 transition hover:text-white">Gallery</Link>
        </div>

        <ol className="mt-8 flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <button
                disabled={i > reached}
                onClick={() => goTo(i)}
                className="flex items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                    i < step ? 'bg-twilight text-white' : i === step ? 'border border-twilight text-white shadow-[0_0_18px_var(--color-twilight)]' : 'border border-white/15 text-white/40'
                  }`}
                >
                  {i < step ? '✓' : i + 1}
                </span>
                <span className={`text-sm ${i === step ? 'text-white' : 'text-white/40'}`}>{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-white/15" />}
            </li>
          ))}
        </ol>

        {msg && <p className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">{msg}</p>}

        {/* STEP 1: PHOTOS */}
        {step === 0 && (
          <section className="mt-10">
            <h1 className="font-fraunces text-4xl text-white">Bring in the shoot</h1>
            <p className="mt-3 max-w-xl text-white/55">Drop your photos in. RAW files from your camera work. Keep this tab open until they finish.</p>

            <div
              className={`mt-8 flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${dragging ? 'border-twilight bg-twilight/10' : 'border-white/15 bg-[#121215]'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)) }}
            >
              <p className="font-fraunces text-2xl text-white">{up.busy ? `Uploading ${up.done} of ${up.total}` : 'Drop photos here'}</p>
              <p className="mt-2 text-sm text-white/45">JPG, PNG, WebP, HEIC and RAW, up to 250 MB each</p>
              {up.busy && (
                <div className="mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-twilight transition-all" style={{ width: `${up.total ? (up.done / up.total) * 100 : 0}%` }} />
                </div>
              )}
              <input ref={fileInput} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }} />
              <input ref={folderInput} type="file" multiple className="hidden" {...({ webkitdirectory: '' } as Record<string, string>)} onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = '' }} />
              <div className="mt-8 flex gap-3">
                <button className={btnPrimary} disabled={up.busy} onClick={() => fileInput.current?.click()}>Choose photos</button>
                <button className={btnQuiet} disabled={up.busy} onClick={() => folderInput.current?.click()}>Choose folder</button>
              </div>
              {up.note && <p className="mt-6 text-sm text-white/60">{up.note}</p>}
              {!up.busy && failedRef.current.length > 0 && (
                <button className={`${btnQuiet} mt-4`} onClick={() => addFiles(failedRef.current)}>Retry the failed ones</button>
              )}
            </div>

            {photos.length > 0 && (
              <div className="mt-8">
                <p className="text-sm text-white/60">{photos.length} {photos.length === 1 ? 'photo' : 'photos'} in this shoot</p>
                <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
                  {photos.slice(0, 24).map((p) => (
                    <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-white/5">{img(p)}</div>
                  ))}
                </div>
                <div className="mt-8">
                  <button className={btnPrimary} disabled={up.busy} onClick={() => goTo(1)}>Continue</button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* STEP 2: CULL */}
        {step === 1 && (
          <section className="mt-10">
            <h1 className="font-fraunces text-4xl text-white">Find the keepers</h1>

            {!labeled && !cull.busy && (
              <div className={`${panel} mt-8`}>
                <p className="text-white/70">We look through every photo for soft shots and closed eyes, and group near-identical frames. Nothing is removed until you say so.</p>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-white/70">Keep about</span>
                  <input
                    value={cullTarget}
                    onChange={(e) => setCullTarget(e.target.value.replace(/\D/g, ''))}
                    placeholder="all"
                    inputMode="numeric"
                    className="w-24 rounded-xl border border-white/15 bg-transparent px-3 py-2 text-white placeholder:text-white/30 focus:border-twilight focus:outline-none"
                  />
                  <span className="text-white/45">photos (optional)</span>
                </div>
                <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-white/70">
                  <input type="checkbox" checked={cullEyes} onChange={(e) => setCullEyes(e.target.checked)} className="h-4 w-4" />
                  Also check for closed eyes (slower)
                </label>
                <div className="mt-8">
                  <button className={btnPrimary} onClick={runCull}>Start</button>
                </div>
              </div>
            )}

            {cull.busy && (
              <div className={`${panel} mt-8 text-center`}>
                <p className="text-sm uppercase tracking-[0.18em] text-white/40">{cull.phase === 'eyes' ? 'Checking eyes' : 'Checking sharpness'}</p>
                <p className="mt-4 font-fraunces text-6xl text-white">
                  {cull.done}
                  <span className="text-white/25"> / {cull.total}</span>
                </p>
                <div className="mx-auto mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-twilight transition-all" style={{ width: `${cull.total ? (cull.done / cull.total) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            {labeled && !cull.busy && (
              <>
                <div className="mt-6 flex flex-wrap gap-3 text-sm">
                  <span className="rounded-full border border-white/10 px-4 py-1.5 text-white/80"><b className="text-white">{picks}</b> keepers</span>
                  <span className="rounded-full border border-white/10 px-4 py-1.5 text-white/80"><b className="text-white">{maybes}</b> maybe</span>
                  <span className="rounded-full border border-white/10 px-4 py-1.5 text-white/80"><b className="text-white">{cuts.length}</b> suggested cuts</span>
                  <span className="rounded-full border border-white/10 px-4 py-1.5 text-white/80"><b className="text-white">{groupList.length}</b> duplicate groups</span>
                </div>

                {cuts.length > 0 ? (
                  <>
                    <p className="mt-8 max-w-2xl text-white/55">
                      These are the ones we recommend cutting. Tap any you want to keep. Cutting only removes a photo from this gallery, and your own copy stays wherever you saved it.
                    </p>
                    <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                      {cuts.map((p) => {
                        const kept = rescued.has(p.id)
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              setConfirmCut(false)
                              setRescued((prev) => {
                                const n = new Set(prev)
                                if (n.has(p.id)) n.delete(p.id)
                                else n.add(p.id)
                                return n
                              })
                            }}
                            className={`relative aspect-square overflow-hidden rounded-xl bg-white/5 transition ${kept ? 'ring-2 ring-emerald-400' : 'opacity-90 hover:opacity-100'}`}
                          >
                            {img(p)}
                            <span className={`absolute inset-x-0 bottom-0 px-2 py-1 text-[10px] ${kept ? 'bg-emerald-600 text-white' : 'bg-black/70 text-white/80'}`}>
                              {kept ? 'Keeping' : p.cull_reason ?? 'Cut'}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="mt-8 text-white/60">Nothing to cut here. Nice shoot.</p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  {toCut.length > 0 ? (
                    confirmCut ? (
                      <>
                        <button className={btnDanger} disabled={working} onClick={doCut}>{working ? 'Removing…' : `Yes, remove ${toCut.length} photo${toCut.length === 1 ? '' : 's'}`}</button>
                        <button className={btnQuiet} disabled={working} onClick={() => setConfirmCut(false)}>Cancel</button>
                      </>
                    ) : (
                      <button className={btnPrimary} onClick={() => setConfirmCut(true)}>Cut {toCut.length} photo{toCut.length === 1 ? '' : 's'}</button>
                    )
                  ) : (
                    <button className={btnPrimary} onClick={() => goTo(2)}>Continue</button>
                  )}
                  {toCut.length > 0 && !confirmCut && <button className={btnQuiet} onClick={() => goTo(2)}>Skip, keep everything</button>}
                  <button className={btnQuiet} disabled={working} onClick={runCull}>Run again</button>
                </div>
              </>
            )}
          </section>
        )}

        {/* STEP 3: DUPLICATES */}
        {step === 2 && (
          <section className="mt-10">
            <h1 className="font-fraunces text-4xl text-white">Pick the best of each</h1>
            {groupList.length === 0 ? (
              <>
                <p className="mt-4 text-white/60">No near-identical frames found.</p>
                <div className="mt-8"><button className={btnPrimary} onClick={() => goTo(3)}>Continue</button></div>
              </>
            ) : (
              <>
                <p className="mt-3 max-w-2xl text-white/55">
                  We kept the sharpest frame from each group. Tap a different one to choose it instead. The rest are removed from this gallery.
                </p>
                <div className="mt-8 space-y-4">
                  {groupList.map(([key, m]) => {
                    const best = bestOf(key, m)
                    return (
                      <div key={key} className={`${panel} flex flex-wrap gap-3`}>
                        {m.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setChoice((c) => ({ ...c, [key]: p.id }))}
                            className={`relative h-28 w-28 overflow-hidden rounded-xl bg-white/5 transition sm:h-32 sm:w-32 ${p.id === best ? 'ring-2 ring-twilight' : 'opacity-50 hover:opacity-90'}`}
                          >
                            {img(p)}
                            {p.id === best && <span className="absolute left-1.5 top-1.5 rounded-full bg-twilight px-2 py-0.5 text-[10px] text-white">Best</span>}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button className={btnPrimary} disabled={working} onClick={dropDuplicates}>
                    {working ? 'Working…' : `Keep the best, drop ${groupList.reduce((n, [, m]) => n + m.length - 1, 0)}`}
                  </button>
                  <button className={btnQuiet} disabled={working} onClick={() => goTo(3)}>Skip, keep everything</button>
                </div>
              </>
            )}
          </section>
        )}

        {/* STEP 4: STYLE */}
        {step === 3 && (
          <section className="mt-10">
            <h1 className="font-fraunces text-4xl text-white">Choose a look</h1>
            <p className="mt-3 max-w-2xl text-white/55">Pick a style, then set how strong it is. This is what we apply to the whole shoot.</p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {LOOKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLookId(l.id)}
                  className={`overflow-hidden rounded-2xl border text-left transition ${lookId === l.id ? 'border-twilight shadow-[0_0_24px_-6px_var(--color-twilight)]' : 'border-white/10 hover:border-white/30'}`}
                >
                  <div className="aspect-[4/3] bg-white/5">
                    {cardUrls[l.id] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cardUrls[l.id]} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-white">{l.label}</p>
                    <p className="mt-0.5 text-xs text-white/45">{l.blurb}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className={`${panel} mt-8`}>
              <div className="flex items-center justify-between text-sm">
                <p className="text-white/80">Intensity</p>
                <p className="text-white/50">{Math.round(strength * 100)}%</p>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(strength * 100)}
                onChange={(e) => setStrength(Number(e.target.value) / 100)}
                className="mt-3 w-full"
              />
              {samples.length === 0 ? (
                <p className="mt-6 text-sm text-white/50">Add photos first to see the preview.</p>
              ) : (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {samples.map((p) => {
                    const src = showOrig ? (p.thumb_path ? thumbs[p.thumb_path] : undefined) : sampleUrls[p.id]
                    return (
                      <div key={p.id} className="aspect-[4/3] overflow-hidden rounded-xl bg-white/5">
                        {src && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-full w-full object-contain" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <button
                className={`${btnQuiet} mt-5 select-none`}
                onPointerDown={() => setShowOrig(true)}
                onPointerUp={() => setShowOrig(false)}
                onPointerLeave={() => setShowOrig(false)}
              >
                Hold to compare with the original
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button className={btnPrimary} onClick={() => goTo(4)}>Use this look</button>
              <button className={btnQuiet} onClick={() => goTo(2)}>Back</button>
            </div>
          </section>
        )}

        {/* STEP 5: DEVELOP */}
        {step === 4 && (
          <section className="mt-10">
            <h1 className="font-fraunces text-4xl text-white">Develop</h1>
            <p className="mt-3 max-w-2xl text-white/55">A first-pass edit for exposure, contrast and color. Your originals are kept, and you can revert any photo later from the gallery.</p>

            {!dev.busy && todoDev.length === 0 && (
              <div className={`${panel} mt-8`}>
                <p className="text-white/70">Every photo is already developed.</p>
                <div className="mt-6"><button className={btnPrimary} onClick={() => goTo(5)}>Continue</button></div>
              </div>
            )}

            {!dev.busy && todoDev.length > 0 && (
              <div className={`${panel} mt-8`}>
                <p className="text-white/70">{todoDev.length} {todoDev.length === 1 ? 'photo' : 'photos'} ready to develop with the {LOOKS.find((l) => l.id === lookId)?.label ?? 'True to Color'} look at {Math.round(strength * 100)}%. Keep this tab open while it runs.</p>
                <div className="mt-6 flex gap-3">
                  <button className={btnPrimary} onClick={runDevelop}>Develop all</button>
                  <button className={btnQuiet} onClick={() => goTo(5)}>Skip</button>
                </div>
              </div>
            )}

            {dev.busy && (
              <div className={`${panel} mt-8`}>
                <p className="text-center text-sm uppercase tracking-[0.18em] text-white/40">Developing</p>
                <p className="mt-3 text-center font-fraunces text-6xl text-white">
                  {dev.done}
                  <span className="text-white/25"> / {dev.total}</span>
                </p>
                <div className="mx-auto mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-twilight transition-all" style={{ width: `${dev.total ? (dev.done / dev.total) * 100 : 0}%` }} />
                </div>
                {latest && (
                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">Before</p>
                      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/5">
                        {latest.before && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={latest.before} alt="" className="h-full w-full object-contain" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">After</p>
                      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white/5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={latest.after} alt="" className="h-full w-full object-contain" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* STEP 6: SEND */}
        {step === 5 && (
          <section className="mt-10">
            <h1 className="font-fraunces text-4xl text-white">Ready to send</h1>
            <p className="mt-3 max-w-2xl text-white/55">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}, {enhancedCount} developed. Choose what your client sees, then send it.
            </p>
            <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-10">
              {photos.slice(0, 30).map((p) => (
                <div key={p.id} className="aspect-square overflow-hidden rounded-lg bg-white/5">{img(p)}</div>
              ))}
            </div>

            {sentDone ? (
              <div className={`${panel} mt-10`}>
                <p className="font-fraunces text-2xl text-white">{sentDone === 'sent' ? 'Sent' : 'Published'}</p>
                <p className="mt-2 text-white/60">
                  {sentDone === 'sent'
                    ? `${sess?.names || 'Your client'} was notified in the Camrhia app and can open the gallery from their session.`
                    : 'The gallery is live. Attach it to a session to send it to your client in the app.'}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className={btnPrimary} onClick={() => router.push(`/galleries/${galleryId}`)}>Open gallery</button>
                  <button className={btnQuiet} onClick={() => router.push('/edit')}>Back to the editing room</button>
                </div>
              </div>
            ) : (
              <>
                <div className={`${panel} mt-10`}>
                  <p className="text-sm text-white/80">What your client sees</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {([
                      ['picks', 'Picks only', photos.filter((p) => p.cull_label !== 'reject' && p.cull_label !== 'maybe').length],
                      ['picks_maybe', 'Picks and maybes', photos.filter((p) => p.cull_label !== 'reject').length],
                      ['all', 'Everything', photos.length],
                    ] as const).map(([key, label, count]) => (
                      <button
                        key={key}
                        onClick={() => setAudience(key)}
                        className={`rounded-xl border p-4 text-left transition ${audience === key ? 'border-twilight shadow-[0_0_24px_-6px_var(--color-twilight)]' : 'border-white/10 hover:border-white/30'}`}
                      >
                        <p className="text-white">{label}</p>
                        <p className="mt-1 text-sm text-white/50">{count} {count === 1 ? 'photo' : 'photos'}</p>
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-white/40">Hidden photos stay in your gallery. You can change this any time.</p>

                  {gallery?.pin_hash && (
                    <div className="mt-6">
                      <p className="text-sm text-white/80">Gallery PIN</p>
                      <input
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="The PIN your client will use"
                        className="mt-2 w-full max-w-sm rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-white/30"
                      />
                    </div>
                  )}

                  <p className="mt-6 text-sm text-white/55">
                    {sess
                      ? `This will publish the gallery and send it to ${sess.names || 'your client'} in the app.`
                      : 'This shoot is not attached to a session, so this will publish it without sending it to anyone.'}
                  </p>
                  {sendErr && <p className="mt-3 text-sm text-red-300">{sendErr}</p>}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <button className={btnPrimary} disabled={sending} onClick={sendNow}>
                    {sending ? 'Sending…' : sess ? 'Publish and send to client' : 'Publish'}
                  </button>
                  <button className={btnQuiet} onClick={() => router.push(`/galleries/${galleryId}`)}>Review in gallery first</button>
                  <button className={btnQuiet} onClick={() => goTo(4)}>Back</button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
