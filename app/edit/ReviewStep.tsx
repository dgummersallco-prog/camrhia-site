'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { enhancePhoto, renderPreview, originalPreview, photoFeatures, type Adjust } from '@/lib/enhance'
import { briefAdjust, type Brief } from '@/lib/brief'

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
  onBack: () => void
  onDone: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [idx, setIdx] = useState(0)
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})
  const [light, setLight] = useState<Record<string, string>>({})
  const [manual, setManual] = useState<Adjust>({})
  const [afterUrl, setAfterUrl] = useState<string | null>(null)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [mode, setMode] = useState<'after' | 'before' | 'split'>('after')
  const [hold, setHold] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [srcTick, setSrcTick] = useState(0)
  const srcRef = useRef<{ id: string; blob: Blob; bmp: ImageBitmap } | null>(null)

  const row: Row | undefined = rows[idx]
  const manualKey = JSON.stringify(manual)

  const base = useMemo(() => {
    const lg = row ? light[row.id] : ''
    return briefAdjust(lg ? { ...brief, light: lg } : brief)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id, light, brief])
  const total = useMemo(() => addAdj(base.adjust, manual), [base, manual])

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
          .select('id, filename, orig_path, full_path, pre_full_path, web_path, thumb_path, review_adj, reviewed')
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
        const url = await renderPreview(src.bmp, lookId, strength, 1400, total, base.skin)
        if (cancelled) { URL.revokeObjectURL(url); return }
        setAfterUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
      } catch {
        /* ignore */
      }
    }, 60)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcTick, manualKey, lookId, strength, base])

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
      const same = JSON.stringify(mine) === JSON.stringify(cleanAdj(row.review_adj ?? {}))
      if (same && row.reviewed) {
        setBusy(false)
        if (next) go(idx + 1)
        return
      }
      let patch: Record<string, unknown> = { reviewed: true }
      const oldPaths: string[] = []
      let newPaths: { full: string; web: string; thumb: string } | null = null
      if (!same) {
        const out = await enhancePhoto(src.blob, row.pre_full_path ?? row.orig_path, { id: lookId, strength, adjust: total, skin: base.skin })
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
          baseline: { look: lookId, strength, adjust: base.adjust ?? {} },
          final: { look: lookId, strength, adjust: total, manual: mine },
        })
      }
      const updated: Row = {
        ...row,
        reviewed: true,
        review_adj: Object.keys(mine).length > 0 ? mine : null,
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
  }, [idx, busy, manualKey, rows])

  useEffect(() => {
    if (!row) return
    document.getElementById(`rv-${row.id}`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [row?.id])

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
    <section className="mt-10">
      <h1 className="font-fraunces text-4xl text-white">Review</h1>
      <p className="mt-3 max-w-2xl text-white/55">
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
            <div>
              <div
                className="relative flex min-h-[320px] select-none items-center justify-center overflow-hidden rounded-2xl bg-black/40"
                onPointerDown={() => setHold(true)}
                onPointerUp={() => setHold(false)}
                onPointerLeave={() => setHold(false)}
              >
                {showing === 'split' ? (
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
                <span className="ml-auto text-xs text-white/45">Photo {idx + 1} of {rows.length} · {reviewed} reviewed</span>
              </div>
              {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#151518] p-4">
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
                <button className={tab(isBw)} onClick={() => setManual({ ...manual, bw: isBw ? 0 : 1 })}>Black &amp; White</button>
                <button className={tab(false)} onClick={() => setManual({})}>Reset this photo</button>
              </div>
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
