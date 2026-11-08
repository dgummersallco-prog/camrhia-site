'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { enhancePhoto, renderPreview, originalPreview, photoFeatures, type Adjust } from '@/lib/enhance'
import { briefAdjust, type Brief } from '@/lib/brief'
import type { Crop } from '@/lib/crop'
import ColorMixer from '@/app/edit/ColorMixer'
import { camiRead, camiFix, camiBaselines, camiPickBW, camiLearn, camiDelta, type CamiReading, type Baseline, type CamiBias, type FeedbackRow } from '@/lib/cami'

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
const byKeys = (keys: string[]) => TOOLS.filter((t) => keys.includes(t.key as string))
const LIGHT = byKeys(['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'])
const COLOR = byKeys(['temp', 'tint', 'vibrance', 'saturation'])
const DETAIL = byKeys(['sharpen', 'noise'])

const PHRASE: Record<string, [string, string]> = {
  exposure: ['Brighten', 'Darken'],
  contrast: ['Add contrast', 'Soften contrast'],
  highlights: ['Boost highlights', 'Pull back highlights'],
  shadows: ['Lift shadows', 'Deepen shadows'],
  whites: ['Brighten whites', 'Tame whites'],
  blacks: ['Lift blacks', 'Deepen blacks'],
  temp: ['Warm up', 'Cool down'],
  tint: ['Add magenta', 'Add green'],
  vibrance: ['Boost vibrance', 'Tone down vibrance'],
  saturation: ['Boost color', 'Mute color'],
  sharpen: ['Sharpen', 'Soften'],
  noise: ['Reduce noise', 'Add grain'],
}

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

const primary = 'rounded-full bg-[var(--color-twilight)] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
const quiet = 'rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-40'
const tab = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs transition ${on ? 'border-twilight bg-white/10 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`

function Slide({ label, shown, min, max, step, value, onChange, onReset }: {
  label: string
  shown: string | number
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  onReset: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/75">{label}</span>
        <span className="text-white/45">{shown}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={onReset}
        onPointerUp={(e) => e.currentTarget.blur()}
        className="mt-1 w-full accent-[var(--color-twilight)]"
      />
    </div>
  )
}

function Panel({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/10 py-3 first:pt-0 last:border-b-0">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="text-xs uppercase tracking-[0.18em] text-white/50">{title}</span>
        <span className="text-sm text-white/35">{open ? '–' : '+'}</span>
      </button>
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  )
}

export default function ReviewStep({
  galleryId,
  userId,
  signatureId,
  lookId,
  strength,
  brief,
  getLightMap,
  getSceneMap,
  baseTweak,
  onSaveStyle,
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
  getSceneMap?: () => Promise<Record<string, string>>
  baseTweak: Adjust
  onSaveStyle?: (name: string, tweak: Adjust) => Promise<void>
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
  const [flags, setFlags] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [camiBusy, setCamiBusy] = useState(false)
  const [camiNote, setCamiNote] = useState<{ id: string; notes: string[]; bw: boolean } | null>(null)
  const [camiProgress, setCamiProgress] = useState(0)
  const camiApplied = useRef<Record<string, { reading: CamiReading; suggested: Adjust; studyAdj: Adjust }>>({})
  const camiShoot = useRef<{ readings: Record<string, CamiReading>; sceneOf: Record<string, string>; bases: Record<string, Baseline>; bw: Set<string>; bias: CamiBias | null; studyAdj: Record<string, Adjust> } | null>(null)
  const camiPrev = useRef<{ adj: Adjust } | null>(null)
  const [filter, setFilter] = useState<'flagged' | 'all'>('all')
  const [dirty, setDirty] = useState(0)
  const [naming, setNaming] = useState(false)
  const [styleName, setStyleName] = useState('')
  const [styleBusy, setStyleBusy] = useState(false)
  const [styleSaved, setStyleSaved] = useState<string | null>(null)
  const movedRef = useRef(false)
  const autoRef = useRef(false)
  const dirtyRef = useRef(0)
  const pendingRef = useRef(false)
  const scrolledRef = useRef(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)
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

  function bump() {
    dirtyRef.current += 1
    setDirty(dirtyRef.current)
  }
  async function camiStudy() {
    if (camiShoot.current) return camiShoot.current
    const sb = supabase
    if (!sb) throw new Error('no connection')
    const readings: Record<string, CamiReading> = {}
    let next = 0
    let done = 0
    async function worker() {
      while (true) {
        const r = rows[next++]
        if (!r) return
        const path = r.thumb_path ?? r.web_path
        if (path && sb) {
          try {
            const dl = await sb.storage.from(BUCKET).download(path)
            if (dl.data) readings[r.id] = await camiRead(dl.data)
          } catch { /* skip this one */ }
        }
        done++
        setCamiProgress(done)
      }
    }
    await Promise.all(Array.from({ length: 6 }, () => worker()))
    let sceneOf: Record<string, string> = {}
    try { sceneOf = getSceneMap ? await getSceneMap() : {} } catch { /* no scenes */ }
    let bias: CamiBias | null = null
    if (userId) {
      try {
        const { data } = await sb.from('cami_feedback').select('features, suggested, final').eq('owner_id', userId).order('created_at', { ascending: false }).limit(300)
        if (data && data.length > 0) bias = camiLearn(data as FeedbackRow[])
      } catch { /* no learning yet */ }
    }
    const studyAdj: Record<string, Adjust> = {}
    for (const r of rows) studyAdj[r.id] = r.review_adj ?? {}
    camiShoot.current = { readings, sceneOf, bases: camiBaselines(readings, sceneOf), bw: camiPickBW(readings), bias, studyAdj }
    return camiShoot.current
  }
  async function camiScanThis() {
    if (!row || camiBusy) return
    setCamiBusy(true)
    setCamiProgress(0)
    try {
      const shoot = await camiStudy()
      const rd = shoot.readings[row.id]
      if (!rd) throw new Error('no reading')
      const sid = shoot.sceneOf[row.id]
      const before = shoot.studyAdj[row.id] ?? {}
      if (before.bw) {
        setCamiNote({ id: row.id, notes: ['This one is black and white, so Cami left it alone.'], bw: false })
      } else {
        const fix = camiFix(rd, sid ? shoot.bases[sid] ?? null : null, shoot.bias)
        camiPrev.current = { adj: manual }
        camiApplied.current[row.id] = { reading: rd, suggested: fix.raw, studyAdj: before }
        editManual(addAdj(before, fix.adjust))
        setCamiNote({ id: row.id, notes: fix.notes, bw: shoot.bw.has(row.id) })
      }
    } catch {
      setCamiNote({ id: row.id, notes: ['Cami could not read this photo.'], bw: false })
    }
    setCamiProgress(0)
    setCamiBusy(false)
  }
  function camiTryBW() {
    if (!row) return
    camiPrev.current = { adj: manual }
    editManual({ ...manual, bw: 1, contrast: Math.round(((manual.contrast ?? 0) + 0.15) * 100) / 100 })
    setCamiNote({ id: row.id, notes: ['Switched to black and white with a little extra contrast.'], bw: false })
  }
  function camiUndo() {
    if (!camiPrev.current) return
    editManual(camiPrev.current.adj)
    camiPrev.current = null
    setCamiNote(null)
  }
  function editManual(m: Adjust) {
    setManual(m)
    bump()
  }
  function editCrop(c: Crop | null) {
    setCrop(c)
    bump()
  }

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
      const stats: { id: string; m: number; clip: number; w: number; sat: number }[] = []
      let nextI = 0
      const worker = async () => {
        while (nextI < all.length && !cancelled) {
          const r = all[nextI++]
          if (!r.thumb_path) continue
          try {
            const dl = await sb.storage.from(BUCKET).download(r.thumb_path)
            if (dl.error || !dl.data) continue
            const bmp = await createImageBitmap(dl.data)
            const W = 40
            const H = Math.max(1, Math.round((bmp.height / bmp.width) * W))
            const c = document.createElement('canvas')
            c.width = W
            c.height = H
            const ctx = c.getContext('2d', { willReadFrequently: true })
            if (!ctx) { bmp.close(); continue }
            ctx.drawImage(bmp, 0, 0, W, H)
            bmp.close()
            const d = ctx.getImageData(0, 0, W, H).data
            let L = 0
            let R = 0
            let B = 0
            let hi = 0
            let sat = 0
            const n = d.length / 4
            for (let i = 0; i < d.length; i += 4) {
              const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
              L += l
              R += d[i]
              B += d[i + 2]
              if (l > 250) hi++
              sat += Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2])
            }
            stats.push({ id: r.id, m: L / n, clip: hi / n, w: (R - B) / Math.max(1, R + B), sat: sat / n })
          } catch {
            /* skip this one */
          }
        }
      }
      await Promise.all([worker(), worker(), worker(), worker(), worker(), worker()])
      if (cancelled) return
      if (stats.length > 0) {
        const med = (a: number[]) => { const q = [...a].sort((x, y) => x - y); return q[Math.floor(q.length / 2)] }
        const mm = med(stats.map((x) => x.m))
        const madM = med(stats.map((x) => Math.abs(x.m - mm))) * 1.4826
        const mw = med(stats.map((x) => x.w))
        const madW = med(stats.map((x) => Math.abs(x.w - mw))) * 1.4826
        const found: Record<string, string> = {}
        for (const x of stats) {
          const zm = (x.m - mm) / Math.max(madM, 14)
          const zw = (x.w - mw) / Math.max(madW, 0.04)
          if (x.m < 55) found[x.id] = 'Very dark'
          else if (x.m > 210) found[x.id] = 'Very bright'
          else if (x.clip > 0.08) found[x.id] = 'Blown highlights'
          else if (zm < -2.2) found[x.id] = 'Darker than the rest'
          else if (zm > 2.2) found[x.id] = 'Brighter than the rest'
          else if (x.sat > 12 && Math.abs(zw) > 2.8) found[x.id] = zw > 0 ? 'Looks too warm' : 'Looks too cool'
        }
        setFlags(found)
      }
      setChecked(true)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [galleryId])

  // Jump to the first flagged photo once the check is done
  useEffect(() => {
    if (!checked || autoRef.current) return
    autoRef.current = true
    const first = rows.findIndex((r) => flags[r.id] && !r.reviewed)
    if (first >= 0) {
      setFilter('flagged')
      if (!movedRef.current) setIdx(first)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked])

  // Bring the workspace into view once
  useEffect(() => {
    if (loading || rows.length === 0 || scrolledRef.current) return
    scrolledRef.current = true
    wrapRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [loading, rows.length])

  // Load the current photo
  useEffect(() => {
    if (!row) return
    let cancelled = false
    setManual(row.review_adj ?? {})
    setCrop(row.crop ?? null)
    dirtyRef.current = 0
    pendingRef.current = false
    setDirty(0)
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

  const needs = (r: Row) => !!flags[r.id] && !r.reviewed
  const shown = (r: Row, i: number) => filter === 'all' || needs(r) || i === idx
  function nextVisible(dir: 1 | -1) {
    for (let j = idx + dir; j >= 0 && j < rows.length; j += dir) if (shown(rows[j], j)) return j
    return idx
  }

  function finishSave(mark: number) {
    if (dirtyRef.current === mark) {
      dirtyRef.current = 0
      setDirty(0)
    }
    if (pendingRef.current) {
      pendingRef.current = false
      bump()
    }
  }

  async function apply(): Promise<boolean> {
    const sb = supabase
    const src = srcRef.current
    if (!sb || !row || !src || src.id !== row.id) return false
    if (busy) { pendingRef.current = true; return false }
    const mark = dirtyRef.current
    setBusy(true)
    setErr(null)
    try {
      const mine = cleanAdj(manual)
      const adjSame = JSON.stringify(mine) === JSON.stringify(cleanAdj(row.review_adj ?? {}))
      const cropSame = JSON.stringify(crop ?? null) === JSON.stringify(row.crop ?? null)
      const same = adjSame && cropSame
      if (same && row.reviewed) {
        setBusy(false)
        finishSave(mark)
        return true
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
      const ca = camiApplied.current[row.id]
      if (ca && userId) {
        await sb.from('cami_feedback').upsert({ owner_id: userId, gallery_id: galleryId, photo_id: row.id, features: ca.reading, suggested: ca.suggested, final: camiDelta(mine, ca.studyAdj) }, { onConflict: 'photo_id' })
      }
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
      finishSave(mark)
      return true
    } catch (e) {
      setBusy(false)
      setErr(e instanceof Error ? e.message : 'Could not save this photo.')
      return false
    }
  }

  // Save a second after the last change
  useEffect(() => {
    if (dirty === 0) return
    const t = setTimeout(() => { void apply() }, 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty])

  // Leaving a photo saves it. Going forward also counts it as checked.
  async function go(i: number, accept = false) {
    if (busy || rows.length === 0 || !row) return
    const n = Math.max(0, Math.min(rows.length - 1, i))
    if (n === idx) return
    movedRef.current = true
    const loaded = srcRef.current?.id === row.id
    if (loaded && (dirtyRef.current > 0 || (accept && !row.reviewed))) {
      const ok = await apply()
      if (!ok) return
    }
    setAfterUrl(null)
    setIdx(n)
  }

  async function flush() {
    if (row && srcRef.current?.id === row.id && dirtyRef.current > 0) await apply()
  }

  // Keyboard: arrows move between photos
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); void go(nextVisible(1), true) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); void go(nextVisible(-1)) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

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
    editCrop(plain ? null : next)
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
    editManual({
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
    editManual(next)
  }

  const tools = (list: typeof TOOLS) =>
    list.map((t) => {
      const ui = Math.round((((manual[t.key] ?? 0) as number) / t.scale) * 100)
      return (
        <Slide
          key={t.key}
          label={t.label}
          shown={ui > 0 ? `+${ui}` : ui}
          min={-100}
          max={100}
          value={ui}
          onChange={(v) => setTool(t.key, v, t.scale)}
          onReset={() => setTool(t.key, 0, t.scale)}
        />
      )
    })

  const showing = hold ? 'before' : mode
  const reviewed = rows.filter((r) => r.reviewed).length
  const isBw = (manual.bw ?? 0) > 0
  const saveLabel = busy ? 'Saving…' : dirty > 0 ? 'Saving soon…' : row?.reviewed ? 'Saved ✓' : ''

  const style = useMemo(() => {
    const fixed = rows.filter((r) => r.review_adj && Object.values(r.review_adj).some((v) => v))
    const tally = new Map<string, number>()
    for (const r of fixed) {
      const a = r.review_adj as unknown as Record<string, number>
      const seen = new Set<string>()
      for (const [k, v] of Object.entries(a)) {
        if (!v) continue
        if (k === 'bw') { seen.add('Go black & white'); continue }
        const ph = PHRASE[k]
        if (ph) seen.add(v > 0 ? ph[0] : ph[1])
        else if (/^[hsl]_/.test(k)) seen.add('Adjust colors by hue')
      }
      seen.forEach((x) => tally.set(x, (tally.get(x) ?? 0) + 1))
    }
    const top = Array.from(tally.entries()).sort((x, y) => y[1] - x[1]).slice(0, 4)
    return { fixed: fixed.length, top }
  }, [rows])

  const usual = useMemo(() => {
    const fixed = rows.filter((r) => r.review_adj && Object.values(r.review_adj).some((v) => v))
    const sum: Record<string, number> = {}
    const cnt: Record<string, number> = {}
    for (const r of fixed) {
      const a = r.review_adj as unknown as Record<string, number>
      for (const [k, v] of Object.entries(a)) {
        if (!v || k === 'bw') continue
        sum[k] = (sum[k] ?? 0) + v
        cnt[k] = (cnt[k] ?? 0) + 1
      }
    }
    const out: Record<string, number> = {}
    for (const k of Object.keys(sum)) if (fixed.length > 0 && cnt[k] / fixed.length >= 0.4) out[k] = sum[k] / fixed.length
    return out as Adjust
  }, [rows])

  async function saveStyle() {
    const name = styleName.trim()
    if (!onSaveStyle || !name) return
    setStyleBusy(true)
    try {
      await onSaveStyle(name, cleanAdj(addAdj(baseTweak, usual)))
      setStyleSaved(name)
      setNaming(false)
    } catch {
      setErr('Could not save the style.')
    }
    setStyleBusy(false)
  }

  const frameImg = 'max-h-[70vh] w-full object-contain lg:h-full lg:max-h-full'

  return (
    <section className="mt-6">
      <p className="max-w-2xl text-white/55">
        Change anything and it saves on its own. Use the arrows to move between photos.
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
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className={tab(filter === 'flagged')} onClick={() => setFilter('flagged')}>Needs a look ({rows.filter(needs).length})</button>
            <button className={tab(filter === 'all')} onClick={() => setFilter('all')}>All photos ({rows.length})</button>
            {!checked && <span className="text-xs text-white/40">Checking your photos…</span>}
          </div>

          <div ref={wrapRef} className="mt-4 grid scroll-mt-4 gap-4 lg:h-[calc(100vh-2rem)] lg:grid-cols-[17rem_minmax(0,1fr)_17rem] xl:grid-cols-[20rem_minmax(0,1fr)_20rem]">
            {/* LEFT: light and color */}
            <div className="min-h-0 rounded-2xl border border-white/10 bg-[#151518] p-4 lg:overflow-y-auto">
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <button className={tab(true)} disabled={camiBusy} onClick={camiScanThis}>
                  {camiBusy ? (camiProgress > 0 ? 'Cami is studying this shoot… ' + camiProgress + '/' + rows.length : 'Cami is looking…') : 'Use Cami to scan & fix'}
                </button>
                {camiNote && camiNote.id === row.id && (
                  <div className="mt-2 space-y-1 text-xs text-white/60">
                    {camiNote.notes.map((n) => <p key={n}>{n}</p>)}
                    {camiNote.bw && <button className="block underline" onClick={camiTryBW}>Cami thinks this could be black &amp; white. Try it</button>}
                    {camiPrev.current && <button className="block underline" onClick={camiUndo}>Undo Cami</button>}
                  </div>
                )}
              </div>
              <Panel title="Light">{tools(LIGHT)}</Panel>
              <Panel title="Color">
                {tools(COLOR)}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className={tab(picking)} onClick={() => { setPicking(!picking); setMode('after') }}>White balance picker</button>
                  <button className={tab(isBw)} onClick={() => editManual({ ...manual, bw: isBw ? 0 : 1 })}>Black &amp; White</button>
                </div>
                {picking && <p className="text-xs text-white/50">Click something that should be neutral gray or white.</p>}
              </Panel>
            </div>

            {/* CENTER: the photo */}
            <div className="flex min-h-0 flex-col">
              <div
                className={`relative flex min-h-[320px] flex-1 select-none items-center justify-center overflow-hidden rounded-2xl bg-black/40 ${picking ? 'cursor-crosshair' : ''}`}
                onClick={pickBalance}
                onPointerDown={() => { if (!picking && !zoom100) setHold(true) }}
                onPointerUp={() => setHold(false)}
                onPointerLeave={() => setHold(false)}
              >
                {zoom100 ? (
                  <div className="max-h-[70vh] w-full overflow-auto lg:h-full lg:max-h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {fullUrl && <img src={fullUrl} alt="" style={{ maxWidth: 'none' }} />}
                    {fullBusy && <p className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">Rendering at full size…</p>}
                  </div>
                ) : showing === 'split' ? (
                  <div className="grid w-full grid-cols-2 gap-1 lg:h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {beforeUrl && <img src={beforeUrl} alt="" className={frameImg} />}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {afterUrl && <img src={afterUrl} alt="" className={frameImg} />}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  (showing === 'before' ? beforeUrl : afterUrl) && <img src={(showing === 'before' ? beforeUrl : afterUrl) as string} alt="" className={frameImg} />
                )}
                {!afterUrl && !err && <p className="absolute text-sm text-white/40">Loading…</p>}
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
                  {showing === 'before' ? 'Before' : showing === 'split' ? 'Before · After' : 'After'}
                </span>
                {saveLabel && <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">{saveLabel}</span>}
              </div>

              <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2">
                <button className={tab(mode === 'after')} onClick={() => setMode('after')}>After</button>
                <button className={tab(mode === 'before')} onClick={() => setMode('before')}>Before</button>
                <button className={tab(mode === 'split')} onClick={() => setMode('split')}>Side by side</button>
                <button className={tab(zoom100)} onClick={() => setZoom100(!zoom100)}>100%</button>
                {flags[row.id] && !row.reviewed && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">{flags[row.id]}</span>}
                <span className="ml-auto text-xs text-white/45">Photo {idx + 1} of {rows.length} · {reviewed} checked</span>
              </div>
              {err && <p className="mt-2 shrink-0 text-sm text-red-300">{err}</p>}

              <div className="mt-3 flex shrink-0 gap-1.5 overflow-x-auto pb-1">
                {rows.map((r, i) => {
                  if (!shown(r, i)) return null
                  const src = r.thumb_path ? thumbUrls[r.thumb_path] : undefined
                  return (
                    <button
                      key={r.id}
                      id={`rv-${r.id}`}
                      onClick={() => void go(i)}
                      className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white/5 ${i === idx ? 'ring-2 ring-[var(--color-twilight)]' : ''}`}
                    >
                      {src && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                      {r.reviewed && <span className="absolute bottom-0 right-0 rounded-tl bg-emerald-600 px-1 text-[9px] text-white">✓</span>}
                      {needs(r) && <span className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-amber-400" />}
                    </button>
                  )
                })}
              </div>

              <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2">
                <button className={quiet} disabled={busy || nextVisible(-1) === idx} onClick={() => void go(nextVisible(-1))}>‹ Back a photo</button>
                <button className={primary} disabled={busy || nextVisible(1) === idx} onClick={() => void go(nextVisible(1), true)}>Next photo ›</button>
                <button className={`${quiet} ml-auto`} disabled={busy} onClick={async () => { await flush(); onDone() }}>Done editing</button>
              </div>
            </div>

            {/* RIGHT: crop, detail, color mix, your style */}
            <div className="min-h-0 rounded-2xl border border-white/10 bg-[#151518] p-4 lg:overflow-y-auto">
              <Panel title="Crop & straighten">
                <Slide
                  label="Straighten"
                  shown={`${(crop?.angle ?? 0).toFixed(1)}°`}
                  min={-15}
                  max={15}
                  step={0.1}
                  value={crop?.angle ?? 0}
                  onChange={(v) => setCropPart({ angle: v })}
                  onReset={() => setCropPart({ angle: 0 })}
                />
                <div className="flex flex-wrap gap-1.5">
                  {[{ l: 'Original', v: null }, { l: '1:1', v: 1 }, { l: '4:5', v: 0.8 }, { l: '5:7', v: 5 / 7 }, { l: '2:3', v: 2 / 3 }, { l: '9:16', v: 9 / 16 }].map((c) => (
                    <button key={c.l} className={tab(shapeOn(c.v))} onClick={() => setCropPart({ aspect: shapeValue(c.v) })}>{c.l}</button>
                  ))}
                </div>
                <Slide
                  label="Zoom"
                  shown={`${Math.round((crop?.zoom ?? 1) * 100)}%`}
                  min={100}
                  max={300}
                  value={Math.round((crop?.zoom ?? 1) * 100)}
                  onChange={(v) => setCropPart({ zoom: v / 100 })}
                  onReset={() => setCropPart({ zoom: 1 })}
                />
                {crop ? (
                  <>
                    <Slide label="Move left or right" shown="" min={-100} max={100} value={Math.round(crop.x * 100)} onChange={(v) => setCropPart({ x: v / 100 })} onReset={() => setCropPart({ x: 0 })} />
                    <Slide label="Move up or down" shown="" min={-100} max={100} value={Math.round(crop.y * 100)} onChange={(v) => setCropPart({ y: v / 100 })} onReset={() => setCropPart({ y: 0 })} />
                    <button className={tab(false)} onClick={() => editCrop(null)}>Reset crop</button>
                  </>
                ) : null}
              </Panel>
              <Panel title="Detail" defaultOpen={false}>{tools(DETAIL)}</Panel>
              <Panel title="Color mix" defaultOpen={false}>
                <ColorMixer value={manual} onChange={editManual} />
              </Panel>
              <div className="py-3">
                <button className={tab(false)} onClick={() => { editManual({}); editCrop(null) }}>Reset this photo</button>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-white/50">Your style</p>
                <p className="mt-2 text-xs text-white/55">Every fix you make is saved, so Camrhia can learn how you edit.</p>
                <p className="mt-2 text-sm text-white/80">{reviewed} checked · {style.fixed} changed</p>
                {style.fixed >= 3 ? (
                  <ul className="mt-2 space-y-1">
                    {style.top.map(([label, n]) => (
                      <li key={label} className="flex justify-between text-xs text-white/70">
                        <span>{label}</span>
                        <span className="text-white/40">{n} of {style.fixed}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-white/45">Make a few more fixes and your patterns show up here.</p>
                )}
                {onSaveStyle && style.fixed >= 3 && (
                  <div className="mt-3">
                    {styleSaved ? (
                      <p className="text-xs text-emerald-300">Saved as {styleSaved} ✓</p>
                    ) : naming ? (
                      <div className="flex gap-2">
                        <input
                          value={styleName}
                          onChange={(e) => setStyleName(e.target.value)}
                          placeholder="Name this style"
                          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none focus:border-white/30"
                        />
                        <button className={tab(true)} disabled={!styleName.trim() || styleBusy} onClick={() => void saveStyle()}>{styleBusy ? 'Saving…' : 'Save'}</button>
                      </div>
                    ) : (
                      <button className={tab(false)} onClick={() => setNaming(true)}>Save as signature style</button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
