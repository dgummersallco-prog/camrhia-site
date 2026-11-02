'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { enhancePhoto, renderPreview, originalPreview, photoFeatures, type Adjust } from '@/lib/enhance'
import { briefAdjust, type Brief } from '@/lib/brief'
import type { Crop } from '@/lib/crop'
import ColorMixer from '@/app/edit/ColorMixer'

const BUCKET = 'galleries'

type Row = {
  id: string
  filename: string | null
  orig_path: string
  full_path: string | null
  pre_full_path: string | null
  web_path: string | null
  thumb_path: string | null
  review_adj: Adjust | null
  reviewed: boolean
  crop: Crop | null
}

const TOOLS: { key: keyof Adjust; label: string; scale: number }[] = [
  { key: 'exposure', label: 'Exposure', scale: 1 },
  { key: 'contrast', label: 'Contrast', scale: 0.5 },
  { key: 'highlights', label: 'Highlights', scale: 1 },
  { key: 'shadows', label: 'Shadows', scale: 1 },
  { key: 'whites', label: 'Whites', scale: 1 },
  { key: 'blacks', label: 'Blacks', scale: 1 },
  { key: 'temp', label: 'Temperature', scale: 0.3 },
  { key: 'tint', label: 'Tint', scale: 0.3 },
  { key: 'vibrance', label: 'Vibrance', scale: 0.5 },
  { key: 'saturation', label: 'Saturation', scale: 0.5 },
  { key: 'sharpen', label: 'Sharpen', scale: 1 },
  { key: 'noise', label: 'Noise reduction', scale: 1 },
]

function addAdj(a: Adjust | undefined, b: Adjust): Adjust {
  const out: Adjust = { ...(a ?? {}) }
  for (const k of Object.keys(b) as (keyof Adjust)[]) out[k] = (out[k] ?? 0) + (b[k] ?? 0)
  return out
}

function cleanAdj(a: Adjust): Adjust {
  const out: Adjust = {}
  for (const k of Object.keys(a) as (keyof Adjust)[]) if (a[k]) out[k] = a[k]
  return out
}

const primary = 'rounded-full bg-[var(--color-twilight)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const quiet = 'rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-40'
const tab = (on: boolean) => `rounded-full border px-4 py-1.5 text-xs transition ${on ? 'border-twilight bg-white/10 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`

export default function ReviewStep({
  galleryId,
  userId,
  signatureId,
  lookId,
  strength,
  brief,
  getLightMap,
  baseTweak,
  onBack,
  onDone,
}: {
  galleryId: string
  userId: string | null
  signatureId: string | null
  lookId: string
  strength: number
  brief: Brief
  getLightMap: () => Promise<Record<string, string>>
  baseTweak: Adjust
  onBack: () => void
  onDone: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const [light, setLight] = useState<Record<string, string>>({})
  const [manual, setManual] = useState<Adjust>({})
  const [crop, setCrop] = useState<Crop | null>(null)
  const [afterUrl, setAfterUrl] = useState<string | null>(null)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<'after' | 'before' | 'split'>('after')
  const [hold, setHold] = useState(false)
  const [picking, setPicking] = useState(false)
  const [zoom100, setZoom100] = useState(false)
  const [fullUrl, setFullUrl] = useState<string | null>(null)
  const [fullBusy, setFullBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [srcTick, setSrcTick] = useState(0)
  const srcRef = useRef<{ id: string; blob: Blob; bmp: ImageBitmap } | null>(null)

  const row: Row | undefined = rows[idx]
  const manualKey = JSON.stringify(manual)
  const cropKey = JSON.stringify(crop)

  const base = useMemo(() => {
    const lg = row ? light[row.id] : ''
    return briefAdjust(lg ? { ...brief, light: lg } : brief)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id, light, brief])
  const total = useMemo(() => addAdj(addAdj(base.adjust, baseTweak), manual), [base, manual, baseTweak])

  // Load the developed photos
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const sb = supabase
      if (!sb) { setLoading(false); return }
      const all: Row[] = []
      for (let from = 0; ; from += 1000) {
        const { data } = await sb
          .from('gallery_photos')
          .select('id, filename, orig_path, full_path, pre_full_path, web_path, thumb_path, review_adj, reviewed, crop')
          .eq('gallery_id', galleryId)
          .eq('enhanced', true)
          .range(from, from + 999)
        const batch = (data ?? []) as Row[]
        all.push(...batch)
        if (batch.length < 1000) break
      }
      all.sort((a, b) => (a.filename ?? '').localeCompare(b.filename ?? '', undefined, { numeric: true }))
      const lm = await getLightMap().catch((): Record<string, string> => ({}))
      if (cancelled) return
      const first = all.findIndex((r) => !r.reviewed)
      setRows(all)
      setLight(lm)
      setIdx(first >= 0 ? first : 0)
      setLoading(false)
      const paths = all.map((r) => r.thumb_path).filter((x): x is string => !!x)
      const out: Record<string, string> = {}
      for (let i = 0; i < paths.length; i += 100) {
        const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 100), 21600)
        data?.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl })
        if (cancelled) return
        setThumbUrls({ ...out })
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId])

  // Load the current photo
  useEffect(() => {
    if (!row) return
    let cancelled = false
    setManual(row.review_adj ?? {})
    setCrop(row.crop ?? null)
    setErr(null)
    ;(async () => {
      const sb = supabase
      if (!sb) return
      const srcPath = row.pre_full_path ?? row.orig_path
      const dl = await sb.storage.from(BUCKET).download(srcPath)
      if (cancelled) return
      if (dl.error || !dl.data) { setErr('Could not load this photo.'); return }
      let blob: Blob = dl.data
      try {
        if (/\.(heic|heif)$/i.test(srcPath)) {
          const mod = await import('heic2any')
          const out = await mod.default({ blob, toType: 'image/jpeg', quality: 0.95 })
          blob = Array.isArray(out) ? out[0] : out
        }
        const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
        if (cancelled) { bmp.close(); return }
        srcRef.current?.bmp.close()
        srcRef.current = { id: row.id, blob: dl.data, bmp }
        const url = await originalPreview(bmp, 1400)
        if (cancelled) { URL.revokeObjectURL(url); return }
        setBeforeUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
        setSrcTick((t) => t + 1)
      } catch {
        if (!cancelled) setErr('Could not open this photo.')
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id])

  // Draw the edited version
  useEffect(() => {
    const src = srcRef.current
    if (!src || !row || src.id !== row.id) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const url = await renderPreview(src.bmp, lookId, strength, 1400, total, base.skin, crop ?? undefined)
        if (cancelled) { URL.revokeObjectURL(url); return }
        setAfterUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
      } catch {
        /* ignore */
      }
    }, 60)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcTick, manualKey, cropKey, lookId, strength, base])

  // Full-size render for checking focus and noise
  useEffect(() => {
    const src = srcRef.current
    if (!zoom100 || !src || !row || src.id !== row.id) return
    let cancelled = false
    setFullBusy(true)
    const t = setTimeout(async () => {
      try {
        const url = await renderPreview(src.bmp, lookId, strength, 100000, total, base.skin, crop ?? undefined)
        if (cancelled) { URL.revokeObjectURL(url); return }
        setFullUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
      } catch {
        /* ignore */
      }
      if (!cancelled) setFullBusy(false)
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom100, srcTick, manualKey, cropKey, lookId, strength, base])

  useEffect(() => () => { srcRef.current?.bmp.close() }, [])

  function go(i: number) {
    if (busy || rows.length === 0) return
    const n = Math.max(0, Math.min(rows.length - 1, i))
    if (n === idx) return
    setAfterUrl(null)
    setIdx(n)
  }

  async function apply(next: boolean) {
    const sb = supabase
    const src = srcRef.current
    if (!sb || !row || !src || src.id !== row.id || busy) return
    setBusy(true)
    setErr(null)
    try {
      const mine = cleanAdj(manual)
      const adjSame = JSON.stringify(mine) === JSON.stringify(cleanAdj(row.review_adj ?? {}))
      const cropSame = JSON.stringify(crop ?? null) === JSON.stringify(row.crop ?? null)
      const same = adjSame && cropSame
      if (same && row.reviewed) {
        setBusy(false)
        if (next) go(idx + 1)
        return
      }
      let patch: Record<string, unknown> = { reviewed: true }
      const oldPaths: string[] = []
      let newPaths: { full: string; web: string; thumb: string } | null = null
      if (!same) {
        const out = await enhancePhoto(src.blob, row.pre_full_path ?? row.orig_path, { id: lookId, strength, adjust: total, skin: base.skin, crop: crop ?? undefined })
        const dir = row.orig_path.slice(0, row.orig_path.lastIndexOf('/'))
        const v = Date.now().toString(36)
        newPaths = { full: `${dir}/enh-full-${v}.jpg`, web: `${dir}/enh-web-${v}.jpg`, thumb: `${dir}/enh-thumb-${v}.jpg` }
        const ups = await Promise.all([
          sb.storage.from(BUCKET).upload(newPaths.full, out.full, { contentType: 'image/jpeg', upsert: true }),
          sb.storage.from(BUCKET).upload(newPaths.web, out.web.blob, { contentType: 'image/jpeg', upsert: true }),
          sb.storage.from(BUCKET).upload(newPaths.thumb, out.thumb.blob, { contentType: 'image/jpeg', upsert: true }),
        ])
        const bad = ups.find((u) => u.error)
        if (bad?.error) throw bad.error
        for (const p of [row.full_path, row.web_path, row.thumb_path]) {
          if (p && p.startsWith(`${dir}/enh-`)) oldPaths.push(p)
        }
        patch = {
          ...patch,
          review_adj: Object.keys(mine).length > 0 ? mine : null,
          full_path: newPaths.full,
          web_path: newPaths.web,
          thumb_path: newPaths.thumb,
          enh_bytes: out.full.size + out.web.blob.size + out.thumb.blob.size,
          crop: crop ?? null,
          ...(cropSame ? {} : { width: out.web.width, height: out.web.height }),
        }
      }
      const { error } = await sb.from('gallery_photos').update(patch).eq('id', row.id)
      if (error) throw error
      if (oldPaths.length > 0) await sb.storage.from(BUCKET).remove(oldPaths)
      if (userId) {
        await sb.from('edit_corrections').insert({
          owner_id: userId,
          gallery_id: galleryId,
          photo_id: row.id,
          signature_id: signatureId,
          light: light[row.id] || brief.light || null,
          features: photoFeatures(src.bmp),
          baseline: { look: lookId, strength, adjust: addAdj(base.adjust, baseTweak) },
          final: { look: lookId, strength, adjust: total, manual: mine, crop: crop ?? null },
        })
      }
      const updated: Row = {
        ...row,
        reviewed: true,
        review_adj: Object.keys(mine).length > 0 ? mine : null,
        crop: crop ?? null,
        ...(newPaths ? { full_path: newPaths.full, web_path: newPaths.web, thumb_path: newPaths.thumb } : {}),
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
      if (newPaths) {
        const { data } = await sb.storage.from(BUCKET).createSignedUrl(newPaths.thumb, 21600)
        if (data?.signedUrl) setThumbUrls((prev) => ({ ...prev, [newPaths!.thumb]: data.signedUrl }))
      }
      setBusy(false)
      if (next) go(idx + 1)
    } catch (e) {
      setBusy(false)
      setErr(e instanceof Error ? e.message : 'Could not save this photo.')
    }
  }

  // Keyboard: arrows move, Enter saves and moves on
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1) }
      else if (e.key === 'Enter') { e.preventDefault(); void apply(true) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, busy, manualKey, cropKey, rows])

  useEffect(() => {
    if (!row) return
    document.getElementById(`rv-${row.id}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [row?.id])

  const landscape = (srcRef.current?.bmp.width ?? 1) >= (srcRef.current?.bmp.height ?? 1)
  const shapeValue = (v: number | null) => (v === null ? null : v === 1 ? 1 : landscape ? 1 / v : v)
  const shapeOn = (v: number | null) => {
    const t = shapeValue(v)
    const a = crop?.aspect ?? null
    return t === null ? a === null : a !== null && Math.abs(a - t) < 0.001
  }
  function setCropPart(p: Partial<Crop>) {
    const next: Crop = { angle: 0, aspect: null, zoom: 1, x: 0, y: 0, ...(crop ?? {}), ...p }
    const plain = next.angle === 0 && next.aspect === null && next.zoom === 1
    setCrop(plain ? null : next)
  }

  function pickBalance(e: React.MouseEvent<HTMLDivElement>) {
    const img = e.target as HTMLImageElement
    if (!picking || img.tagName !== 'IMG' || !afterUrl || showing !== 'after') return
    const rect = img.getBoundingClientRect()
    const nw = img.naturalWidth
    const nh = img.naturalHeight
    if (!nw || !nh) return
    const sc = Math.min(rect.width / nw, rect.height / nh)
    const ox = (rect.width - nw * sc) / 2
    const oy = (rect.height - nh * sc) / 2
    const px = Math.round((e.clientX - rect.left - ox) / sc)
    const py = Math.round((e.clientY - rect.top - oy) / sc)
    if (px < 0 || py < 0 || px >= nw || py >= nh) return
    const c = document.createElement('canvas')
    c.width = nw
    c.height = nh
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    ctx.drawImage(img, 0, 0)
    const x0 = Math.max(0, px - 3)
    const y0 = Math.max(0, py - 3)
    const d = ctx.getImageData(x0, y0, Math.min(7, nw - x0), Math.min(7, nh - y0)).data
    let R = 0
    let G = 0
    let B = 0
    for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2] }
    const cnt = d.length / 4
    R /= cnt
    G /= cnt
    B /= cnt
    if (R < 8 || G < 8 || B < 8) return
    const t = Math.max(-0.3, Math.min(0.3, (2 * (B - R)) / (R + B)))
    const V = R * (1 + 0.5 * t)
    const n = Math.max(-0.3, Math.min(0.3, (1 - V / G) / 0.3))
    setManual({
      ...manual,
      temp: Math.max(-0.3, Math.min(0.3, (manual.temp ?? 0) + t)),
      tint: Math.max(-0.3, Math.min(0.3, (manual.tint ?? 0) + n)),
    })
    setPicking(false)
  }

  function setTool(key: keyof Adjust, ui: number, scale: number) {
    const next: Adjust = { ...manual }
    if (ui === 0) delete next[key]
    else next[key] = (ui / 100) * scale
    setManual(next)
  }

  const showing = hold ? 'before' : mode
  const reviewed = rows.filter((r) => r.reviewed).length
  const isBw = (manual.bw ?? 0) > 0

  return (
    <section className="mt-6">
      <p className="max-w-2xl text-white/55">
        Go through your photos one at a time. Nudge anything that is off, then move on. Use the arrow keys to move, and Enter to save and go to the next.
      </p>

      {loading ? (
        <p className="mt-10 text-white/50">Loading your photos…</p>
      ) : rows.length === 0 || !row ? (
        <div className="mt-10">
          <p className="text-white/60">Nothing has been developed yet.</p>
          <button className={`${quiet} mt-6`} onClick={onBack}>Back</button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="lg:sticky lg:top-4 lg:self-start">
              <div
                className={`relative flex min-h-[320px] select-none items-center justify-center overflow-hidden rounded-2xl bg-black/40 ${picking ? 'cursor-crosshair' : ''}`}
                onClick={pickBalance}
                onPointerDown={() => { if (!picking && !zoom100) setHold(true) }}
                onPointerUp={() => setHold(false)}
                onPointerLeave={() => setHold(false)}
              >
                {zoom100 ? (
                  <div className="max-h-[70vh] w-full overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {fullUrl && <img src={fullUrl} alt="" style={{ maxWidth: 'none' }} />}
                    {fullBusy && <p className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">Rendering at full size…</p>}
                  </div>
                ) : showing === 'split' ? (
                  <div className="grid w-full grid-cols-2 gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {beforeUrl && <img src={beforeUrl} alt="" className="max-h-[70vh] w-full object-contain" />}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {afterUrl && <img src={afterUrl} alt="" className="max-h-[70vh] w-full object-contain" />}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  (showing === 'before' ? beforeUrl : afterUrl) && <img src={(showing === 'before' ? beforeUrl : afterUrl) as string} alt="" className="max-h-[70vh] w-full object-contain" />
                )}
                {!afterUrl && !err && <p className="absolute text-sm text-white/40">Loading…</p>}
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
                  {showing === 'before' ? 'Before' : showing === 'split' ? 'Before · After' : 'After'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button className={tab(mode === 'after')} onClick={() => setMode('after')}>After</button>
                <button className={tab(mode === 'before')} onClick={() => setMode('before')}>Before</button>
                <button className={tab(mode === 'split')} onClick={() => setMode('split')}>Side by side</button>
                <button className={tab(zoom100)} onClick={() => setZoom100(!zoom100)}>100%</button>
                <span className="ml-auto text-xs text-white/45">Photo {idx + 1} of {rows.length} · {reviewed} reviewed</span>
              </div>
              {picking && <p className="mt-2 text-xs text-white/50">Click something that should be neutral gray or white.</p>}
              {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151518] p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
              <div className="mb-5 border-b border-white/10 pb-5">
                <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/40">Crop &amp; straighten</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/75">Straighten</span>
                  <span className="text-white/45">{(crop?.angle ?? 0).toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-15}
                  max={15}
                  step={0.1}
                  value={crop?.angle ?? 0}
                  onChange={(e) => setCropPart({ angle: Number(e.target.value) })}
                  onDoubleClick={() => setCropPart({ angle: 0 })}
                  className="mt-1 w-full accent-[var(--color-twilight)]"
                />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[{ l: 'Original', v: null }, { l: '1:1', v: 1 }, { l: '4:5', v: 0.8 }, { l: '5:7', v: 5 / 7 }, { l: '2:3', v: 2 / 3 }, { l: '9:16', v: 9 / 16 }].map((c) => (
                    <button key={c.l} className={tab(shapeOn(c.v))} onClick={() => setCropPart({ aspect: shapeValue(c.v) })}>{c.l}</button>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-white/75">Zoom</span>
                  <span className="text-white/45">{Math.round((crop?.zoom ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={300}
                  value={Math.round((crop?.zoom ?? 1) * 100)}
                  onChange={(e) => setCropPart({ zoom: Number(e.target.value) / 100 })}
                  onDoubleClick={() => setCropPart({ zoom: 1 })}
                  className="mt-1 w-full accent-[var(--color-twilight)]"
                />
                {crop ? (
                  <>
                    <div className="mt-3 text-xs text-white/75">Move left or right</div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={Math.round(crop.x * 100)}
                      onChange={(e) => setCropPart({ x: Number(e.target.value) / 100 })}
                      onDoubleClick={() => setCropPart({ x: 0 })}
                      className="mt-1 w-full accent-[var(--color-twilight)]"
                    />
                    <div className="mt-3 text-xs text-white/75">Move up or down</div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={Math.round(crop.y * 100)}
                      onChange={(e) => setCropPart({ y: Number(e.target.value) / 100 })}
                      onDoubleClick={() => setCropPart({ y: 0 })}
                      className="mt-1 w-full accent-[var(--color-twilight)]"
                    />
                    <button className={`${tab(false)} mt-3`} onClick={() => setCrop(null)}>Reset crop</button>
                  </>
                ) : null}
              </div>
              <div className="space-y-4">
                {TOOLS.map((t) => {
                  const ui = Math.round((((manual[t.key] ?? 0) as number) / t.scale) * 100)
                  return (
                    <div key={t.key}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/75">{t.label}</span>
                        <span className="text-white/45">{ui > 0 ? `+${ui}` : ui}</span>
                      </div>
                      <input
                        type="range"
                        min={-100}
                        max={100}
                        value={ui}
                        onChange={(e) => setTool(t.key, Number(e.target.value), t.scale)}
                        onDoubleClick={() => setTool(t.key, 0, t.scale)}
                        className="mt-1 w-full accent-[var(--color-twilight)]"
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className={tab(picking)} onClick={() => { setPicking(!picking); setMode('after') }}>White balance picker</button>
                <button className={tab(isBw)} onClick={() => setManual({ ...manual, bw: isBw ? 0 : 1 })}>Black &amp; White</button>
                <button className={tab(false)} onClick={() => { setManual({}); setCrop(null) }}>Reset this photo</button>
              </div>
              <div className="mt-5 border-t border-white/10 pt-5"><ColorMixer value={manual} onChange={setManual} /></div>
            </div>
          </div>

          <div className="mt-6 flex gap-1.5 overflow-x-auto pb-2">
            {rows.map((r, i) => {
              const src = r.thumb_path ? thumbUrls[r.thumb_path] : undefined
              return (
                <button
                  key={r.id}
                  id={`rv-${r.id}`}
                  onClick={() => go(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white/5 ${i === idx ? 'ring-2 ring-[var(--color-twilight)]' : ''}`}
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {r.reviewed && <span className="absolute bottom-0 right-0 rounded-tl bg-emerald-600 px-1 text-[9px] text-white">✓</span>}
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className={primary} disabled={busy} onClick={() => void apply(true)}>{busy ? 'Saving…' : idx === rows.length - 1 ? 'Save' : 'Save and next'}</button>
            <button className={quiet} disabled={busy || idx === 0} onClick={() => go(idx - 1)}>Previous</button>
            <button className={quiet} disabled={busy || idx === rows.length - 1} onClick={() => go(idx + 1)}>Skip</button>
            <button className={quiet} disabled={busy} onClick={onDone}>Done reviewing</button>
            <button className={quiet} disabled={busy} onClick={onBack}>Back</button>
          </div>
        </>
      )}
    </section>
  )
}
