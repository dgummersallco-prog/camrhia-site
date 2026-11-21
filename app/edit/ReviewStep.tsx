'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { enhancePhoto, renderPreview, originalPreview, photoFeatures, type Adjust } from '@/lib/enhance'
import { briefAdjust, type Brief } from '@/lib/brief'
import { cropRect, type Crop } from '@/lib/crop'
import { emptyLocal, cleanLocal, outToSrc, srcToOut, autoHealSource, curveIsFlat, curveLut, type CurvePt, type LocalEdits, type Mask, type MaskAdj } from '@/lib/localEdit'
import ColorMixer from '@/app/edit/ColorMixer'
import CamiPanel from '@/app/edit/CamiPanel'
import { camiRead, camiFix, camiBaselines, camiPickBW, camiBWAdjust, camiLearn, camiDelta, camiFlag, type CamiReading, type Baseline, type CamiBias, type FeedbackRow } from '@/lib/cami'

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
  local_edits: LocalEdits | null
  enhanced: boolean
  pre_web_path: string | null
  pre_thumb_path: string | null
}

// Where to read the untouched picture from. Photos that were never developed start from their own files.
const srcOf = (r: Row) => (r.enhanced ? r.pre_full_path ?? r.orig_path : r.full_path ?? r.orig_path)
// The first time a photo is saved here it becomes a developed photo, the same as the batch develop does.
const firstPatch = (r: Row) => (r.enhanced ? {} : { enhanced: true, pre_web_path: r.web_path, pre_thumb_path: r.thumb_path, pre_full_path: r.full_path ?? null })

const MASK_TOOLS: { key: keyof MaskAdj; label: string; scale: number }[] = [
  { key: 'exposure', label: 'Exposure', scale: 1 },
  { key: 'contrast', label: 'Contrast', scale: 0.5 },
  { key: 'highlights', label: 'Highlights', scale: 1 },
  { key: 'shadows', label: 'Shadows', scale: 1 },
  { key: 'temp', label: 'Temperature', scale: 0.3 },
  { key: 'saturation', label: 'Saturation', scale: 0.5 },
  { key: 'sharpen', label: 'Sharpen', scale: 1 },
]

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
  { key: 'vignette', label: 'Vignette', scale: 1 },
]
const byKeys = (keys: string[]) => TOOLS.filter((t) => keys.includes(t.key as string))
const LIGHT = byKeys(['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'])
const COLOR = byKeys(['temp', 'tint', 'vibrance', 'saturation'])
const DETAIL = byKeys(['sharpen', 'noise'])
const EFFECTS = byKeys(['vignette'])

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
  raw: ['Start from the original', 'Start from the original'],
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
const tab = (on: boolean) => `rounded-full border px-3.5 py-2 text-[13px] font-medium shadow-sm transition ${on ? 'border-twilight bg-twilight/15 text-white' : 'border-white/15 text-white/70 hover:border-white/30 hover:bg-white/5 hover:text-white'}`

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
  const zero = min < 0 && max > 0 ? ((0 - min) / (max - min)) * 100 : 0
  const pct = ((value - min) / (max - min)) * 100
  const lo = Math.min(zero, pct)
  const hi = Math.max(zero, pct)
  const track = 'rgba(120,113,108,0.28)'
  const fill = 'var(--color-twilight)'
  const bg = `linear-gradient(to right, ${track} 0%, ${track} ${lo}%, ${fill} ${lo}%, ${fill} ${hi}%, ${track} ${hi}%, ${track} 100%)`
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/75">{label}</span>
        <span className="tabular-nums text-white/45">{shown}</span>
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
        className="dial"
        style={{ ['--dial-bg' as string]: bg } as CSSProperties}
      />
    </div>
  )
}

type Snap = { manual: Adjust; crop: Crop | null; local: LocalEdits }

function Histogram({ url }: { url: string | null }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [clip, setClip] = useState({ lo: false, hi: false })
  useEffect(() => {
    if (!url) return
    let off = false
    const im = new Image()
    im.onload = () => {
      if (off) return
      const W = 128
      const H = Math.max(1, Math.round((im.naturalHeight / Math.max(1, im.naturalWidth)) * W))
      const c = document.createElement('canvas')
      c.width = W
      c.height = H
      const g = c.getContext('2d', { willReadFrequently: true })
      const out = ref.current
      if (!g || !out) return
      g.drawImage(im, 0, 0, W, H)
      const d = g.getImageData(0, 0, W, H).data
      const bins = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)]
      let lo = 0
      let hi = 0
      for (let i = 0; i < d.length; i += 4) {
        bins[0][d[i]]++
        bins[1][d[i + 1]]++
        bins[2][d[i + 2]]++
        if (d[i] <= 1 || d[i + 1] <= 1 || d[i + 2] <= 1) lo++
        if (d[i] >= 254 || d[i + 1] >= 254 || d[i + 2] >= 254) hi++
      }
      const n = d.length / 4
      setClip({ lo: lo / n > 0.005, hi: hi / n > 0.005 })
      let peak = 1
      for (const b of bins) for (let v = 1; v < 255; v++) peak = Math.max(peak, b[v])
      const ctx = out.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, out.width, out.height)
      ctx.globalCompositeOperation = 'lighter'
      const cols = ['rgba(255,70,70,0.6)', 'rgba(70,220,90,0.6)', 'rgba(80,120,255,0.6)']
      bins.forEach((b, k) => {
        ctx.fillStyle = cols[k]
        ctx.beginPath()
        ctx.moveTo(0, out.height)
        for (let v = 0; v < 256; v++) ctx.lineTo(v, out.height - Math.min(1, b[v] / peak) * (out.height - 2))
        ctx.lineTo(255, out.height)
        ctx.closePath()
        ctx.fill()
      })
    }
    im.src = url
    return () => { off = true }
  }, [url])
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-black/30 p-2">
      <canvas ref={ref} width={256} height={80} className="block h-20 w-full" />
      <div className="mt-1 flex justify-between px-0.5 text-[10px]">
        <span className={clip.lo ? 'text-white' : 'text-white/25'} title="Shadows are clipped">◣ shadows</span>
        <span className={clip.hi ? 'text-white' : 'text-white/25'} title="Highlights are clipped">highlights ◢</span>
      </div>
    </div>
  )
}

export function CurveEditor({ pts, onChange }: { pts: CurvePt[]; onChange: (p: CurvePt[]) => void }) {
  const ref = useRef<SVGSVGElement | null>(null)
  const drag = useRef<number | null>(null)
  const cl = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const at = (e: React.PointerEvent): CurvePt => {
    const r = ref.current!.getBoundingClientRect()
    return [cl((e.clientX - r.left) / r.width, 0, 1), cl(1 - (e.clientY - r.top) / r.height, 0, 1)]
  }
  const near = (x: number, y: number) => {
    let hit = -1
    let best = 0.07
    pts.forEach((q, i) => {
      const d = Math.hypot(q[0] - x, q[1] - y)
      if (d < best) { best = d; hit = i }
    })
    return hit
  }
  function down(e: React.PointerEvent<SVGSVGElement>) {
    const [x, y] = at(e)
    ref.current!.setPointerCapture(e.pointerId)
    const hit = near(x, y)
    if (hit >= 0) { drag.current = hit; return }
    const next = [...pts, [x, y] as CurvePt].sort((a, b) => a[0] - b[0])
    onChange(next)
    drag.current = next.findIndex((q) => q[0] === x && q[1] === y)
  }
  function move(e: React.PointerEvent<SVGSVGElement>) {
    const i = drag.current
    if (i === null) return
    const [x, y] = at(e)
    const next = pts.map((q) => [q[0], q[1]] as CurvePt)
    const last = next.length - 1
    next[i][1] = y
    if (i > 0 && i < last) next[i][0] = cl(x, next[i - 1][0] + 0.02, next[i + 1][0] - 0.02)
    onChange(next)
  }
  function dbl(e: React.MouseEvent<SVGSVGElement>) {
    const r = ref.current!.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = 1 - (e.clientY - r.top) / r.height
    const hit = near(x, y)
    if (hit > 0 && hit < pts.length - 1) onChange(pts.filter((_, i) => i !== hit))
  }
  const lut = curveLut(pts)
  let path = ''
  for (let v = 0; v <= 255; v += 5) path += `${v === 0 ? 'M' : 'L'}${(v / 255) * 200},${200 - (lut[v] / 255) * 200} `
  return (
    <svg
      ref={ref}
      viewBox="0 0 200 200"
      className="w-full touch-none select-none rounded-lg border border-white/10 bg-black/30"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={() => { drag.current = null }}
      onDoubleClick={dbl}
    >
      {[50, 100, 150].map((g) => (
        <g key={g}>
          <line x1={g} y1={0} x2={g} y2={200} stroke="rgba(255,255,255,0.08)" />
          <line x1={0} y1={g} x2={200} y2={g} stroke="rgba(255,255,255,0.08)" />
        </g>
      ))}
      <line x1={0} y1={200} x2={200} y2={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
      <path d={path} fill="none" stroke="white" strokeWidth={1.6} />
      {pts.map((q, i) => (
        <circle key={i} cx={q[0] * 200} cy={200 - q[1] * 200} r={4.5} fill="white" stroke="rgba(0,0,0,0.6)" />
      ))}
    </svg>
  )
}

function Panel({ title, defaultOpen = true, keep = false, children }: { title: string; defaultOpen?: boolean; keep?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/10 py-3 first:pt-0 last:border-b-0">
      <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(!open)}>
        <span className="text-xs uppercase tracking-[0.18em] text-white/50">{title}</span>
        <span className="text-sm text-white/35">{open ? '–' : '+'}</span>
      </button>
      {(open || keep) && <div className={open ? 'mt-3 space-y-3' : 'hidden'}>{children}</div>}
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
  onApplyRest,
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
  onApplyRest?: (adj: Adjust) => Promise<void>
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
  const [local, setLocal] = useState<LocalEdits>(emptyLocal())
  const [openTool, setOpenTool] = useState<null | 'spot' | 'masks'>(null)
  const [pen, setPen] = useState<null | 'heal' | 'radial' | 'linear' | 'brush'>(null)
  const [selMask, setSelMask] = useState<string | null>(null)
  const [healSize, setHealSize] = useState(0.02)
  const [brushSize, setBrushSize] = useState(0.05)
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<string | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
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
  const [askBusy, setAskBusy] = useState(false)
  const [camiNote, setCamiNote] = useState<{ id: string; notes: string[]; bw: boolean } | null>(null)
  const [camiProgress, setCamiProgress] = useState(0)
  const [sceneBusy, setSceneBusy] = useState<{ done: number; total: number } | null>(null)
  const sceneStop = useRef(false)
  const camiPromise = useRef<Promise<NonNullable<typeof camiShoot.current>> | null>(null)
  const camiApplied = useRef<Record<string, { reading: CamiReading; suggested: Adjust; studyAdj: Adjust }>>({})
  const camiShoot = useRef<{ readings: Record<string, CamiReading>; sceneOf: Record<string, string>; bases: Record<string, Baseline>; bw: Set<string>; bias: CamiBias | null; studyAdj: Record<string, Adjust> } | null>(null)
  const camiPrev = useRef<{ adj: Adjust } | null>(null)
  const [filter, setFilter] = useState<'flagged' | 'all'>('all')
  const [dirty, setDirty] = useState(0)
  const [naming, setNaming] = useState(false)
  const [styleName, setStyleName] = useState('')
  const [styleBusy, setStyleBusy] = useState(false)
  const [styleSaved, setStyleSaved] = useState<string | null>(null)
  const [restAsk, setRestAsk] = useState(false)
  const [restBusy, setRestBusy] = useState(false)
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
  const localKey = JSON.stringify(local)
  const snapRef = useRef<Snap>({ manual: {}, crop: null, local: emptyLocal() })
  snapRef.current = { manual, crop, local }
  const hist = useRef<{ past: Snap[]; future: Snap[] }>({ past: [], future: [] })
  const histT = useRef(0)
  const [, setHistTick] = useState(0)
  const [clip, setClip] = useState<{ adj: Adjust; curve?: CurvePt[] } | null>(null)

  const base = useMemo(() => {
    const lg = row ? light[row.id] : ''
    return briefAdjust(lg ? { ...brief, light: lg } : brief)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row?.id, light, brief])
  const total = useMemo(() => (manual.raw ? manual : addAdj(addAdj(base.adjust, baseTweak), manual)), [base, manual, baseTweak])

  function bump() {
    dirtyRef.current += 1
    setDirty(dirtyRef.current)
  }
  function camiStudy() {
    if (!camiPromise.current) {
      camiPromise.current = camiStudyRun().catch((e) => { camiPromise.current = null; throw e })
    }
    return camiPromise.current
  }
  // Study the whole shoot in the background and flag photos Camri would fix in a big way
  useEffect(() => {
    if (!checked || rows.length === 0) return
    let off = false
    void (async () => {
      try {
        const shoot = await camiStudy()
        if (off) return
        const extra: Record<string, string> = {}
        for (const r of rows) {
          const rd = shoot.readings[r.id]
          if (!rd || (shoot.studyAdj[r.id] ?? {}).bw) continue
          const sid = shoot.sceneOf[r.id]
          const label = camiFlag(camiFix(rd, sid ? shoot.bases[sid] ?? null : null, null, lookId, brief.light || null).adjust)
          if (label) extra[r.id] = label
        }
        setFlags((prev) => ({ ...extra, ...prev }))
      } catch { /* flags stay as they were */ }
    })()
    return () => { off = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checked])
  async function camiStudyRun() {
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
    camiShoot.current = { readings, sceneOf, bases: camiBaselines(readings, sceneOf), bw: camiPickBW(readings, sceneOf), bias, studyAdj }
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
        setCamiNote({ id: row.id, notes: ['This one is black and white, so Camri left it alone.'], bw: false })
      } else {
        const fix = camiFix(rd, sid ? shoot.bases[sid] ?? null : null, shoot.bias, lookId, light[row.id] || brief.light || null)
        camiPrev.current = { adj: manual }
        camiApplied.current[row.id] = { reading: rd, suggested: fix.raw, studyAdj: before }
        editManual(addAdj(before, fix.adjust))
        setCamiNote({ id: row.id, notes: fix.notes, bw: shoot.bw.has(row.id) })
      }
    } catch {
      setCamiNote({ id: row.id, notes: ['Camri could not read this photo.'], bw: false })
    }
    setCamiProgress(0)
    setCamiBusy(false)
  }
  async function camiScanScene() {
    const sb = supabase
    if (!sb || !row || camiBusy || sceneBusy) return
    setCamiBusy(true)
    setCamiProgress(0)
    let shoot: NonNullable<typeof camiShoot.current>
    try {
      shoot = await camiStudy()
    } catch {
      setCamiNote({ id: row.id, notes: ['Camri could not read this shoot.'], bw: false })
      setCamiProgress(0)
      setCamiBusy(false)
      return
    }
    setCamiProgress(0)
    setCamiBusy(false)
    const sid = shoot.sceneOf[row.id]
    if (!sid) {
      setCamiNote({ id: row.id, notes: ['Split this shoot into scenes first, so Camri knows which photos belong together.'], bw: false })
      return
    }
    const targets = rows.filter((r) => r.id !== row.id && !r.reviewed && shoot.sceneOf[r.id] === sid && shoot.readings[r.id] && !(shoot.studyAdj[r.id] ?? {}).bw && !(shoot.studyAdj[r.id] ?? {}).raw)
    if (targets.length === 0) {
      setCamiNote({ id: row.id, notes: ['Nothing else in this scene needs Camri.'], bw: false })
      return
    }
    sceneStop.current = false
    setSceneBusy({ done: 0, total: targets.length })
    const updated: Record<string, Partial<Row>> = {}
    let fixedCount = 0
    let failed = 0
    for (let i = 0; i < targets.length; i++) {
      if (sceneStop.current) break
      const r = targets[i]
      try {
        const cur = await sb.from('gallery_photos').select('reviewed').eq('id', r.id).maybeSingle()
        if (!cur.data || cur.data.reviewed) { setSceneBusy({ done: i + 1, total: targets.length }); continue }
        const fix = camiFix(shoot.readings[r.id], shoot.bases[sid] ?? null, shoot.bias, lookId, light[r.id] || brief.light || null)
        if (Object.keys(fix.adjust).length > 0) {
          const before = shoot.studyAdj[r.id] ?? {}
          const mine = cleanAdj(addAdj(before, fix.adjust))
          const srcPath = srcOf(r)
          const dl = await sb.storage.from(BUCKET).download(srcPath)
          if (dl.error || !dl.data) throw new Error('download')
          const lg = light[r.id]
          const b = briefAdjust(lg ? { ...brief, light: lg } : brief)
          const tot = mine.raw ? mine : addAdj(addAdj(b.adjust, baseTweak), mine)
          const out = await enhancePhoto(dl.data, srcPath, { id: lookId, strength, adjust: tot, skin: b.skin, crop: r.crop ?? undefined, local: r.local_edits ?? (brief.curve ? { masks: [], heals: [], curve: brief.curve } : undefined) })
          const dir = r.orig_path.slice(0, r.orig_path.lastIndexOf('/'))
          const v = Date.now().toString(36) + i
          const np = { full: `${dir}/enh-full-${v}.jpg`, web: `${dir}/enh-web-${v}.jpg`, thumb: `${dir}/enh-thumb-${v}.jpg` }
          const ups = await Promise.all([
            sb.storage.from(BUCKET).upload(np.full, out.full, { contentType: 'image/jpeg', upsert: true }),
            sb.storage.from(BUCKET).upload(np.web, out.web.blob, { contentType: 'image/jpeg', upsert: true }),
            sb.storage.from(BUCKET).upload(np.thumb, out.thumb.blob, { contentType: 'image/jpeg', upsert: true }),
          ])
          const bad = ups.find((u) => u.error)
          if (bad?.error) throw bad.error
          const patch = {
            ...firstPatch(r),
            review_adj: Object.keys(mine).length > 0 ? mine : null,
            full_path: np.full,
            web_path: np.web,
            thumb_path: np.thumb,
            enh_bytes: out.full.size + out.web.blob.size + out.thumb.blob.size,
          }
          const { error } = await sb.from('gallery_photos').update(patch).eq('id', r.id)
          if (error) throw error
          const oldPaths = [r.full_path, r.web_path, r.thumb_path].filter((x): x is string => !!x && x.startsWith(`${dir}/enh-`))
          if (oldPaths.length > 0) await sb.storage.from(BUCKET).remove(oldPaths)
          updated[r.id] = patch as unknown as Partial<Row>
          camiApplied.current[r.id] = { reading: shoot.readings[r.id], suggested: fix.raw, studyAdj: before }
          fixedCount++
        }
      } catch {
        failed++
      }
      setSceneBusy({ done: i + 1, total: targets.length })
    }
    setRows((prev) => prev.map((x) => (updated[x.id] ? { ...x, ...updated[x.id] } : x)))
    setSceneBusy(null)
    setCamiNote({
      id: row.id,
      notes: [`Camri fixed ${fixedCount} other ${fixedCount === 1 ? 'photo' : 'photos'} in this scene. They still show as unchecked so you can look them over.` + (failed > 0 ? ` ${failed} could not be fixed.` : '')],
      bw: false,
    })
  }
  function camiTryBW() {
    if (!row) return
    camiPrev.current = { adj: manual }
    const rdBw = camiShoot.current?.readings[row.id]
    editManual({ ...manual, ...(rdBw ? camiBWAdjust(rdBw) : { bw: 1 }), contrast: Math.round(((manual.contrast ?? 0) + 0.15) * 100) / 100 })
    setCamiNote({ id: row.id, notes: ['Switched to black and white with a little extra contrast.'], bw: false })
  }
  function camiUndo() {
    if (!camiPrev.current) return
    editManual(camiPrev.current.adj)
    camiPrev.current = null
    setCamiNote(null)
  }
  function editLocal(l: LocalEdits) {
    pushHist(false)
    setLocal(l)
    bump()
  }
  function editLocalLive(l: LocalEdits) {
    pushHist(true)
    setLocal(l)
    bump()
  }
  function editManual(m: Adjust) {
    pushHist(true)
    setManual(m)
    bump()
  }
  function pushHist(coalesce: boolean) {
    const now = Date.now()
    if (coalesce && now - histT.current < 700) {
      histT.current = now
      return
    }
    histT.current = now
    const h = hist.current
    h.past.push(snapRef.current)
    if (h.past.length > 60) h.past.shift()
    h.future = []
    setHistTick((t) => t + 1)
  }
  function undo() {
    const h = hist.current
    const prev = h.past.pop()
    if (!prev) return
    h.future.push(snapRef.current)
    histT.current = 0
    setManual(prev.manual)
    setCrop(prev.crop)
    setLocal(prev.local)
    bump()
    setHistTick((t) => t + 1)
  }
  function redo() {
    const h = hist.current
    const next = h.future.pop()
    if (!next) return
    h.past.push(snapRef.current)
    histT.current = 0
    setManual(next.manual)
    setCrop(next.crop)
    setLocal(next.local)
    bump()
    setHistTick((t) => t + 1)
  }
  function resetPhoto() {
    pushHist(false)
    setManual({ raw: 1 })
    setCrop(null)
    setLocal(emptyLocal())
    setSelMask(null)
    setPen(null)
    bump()
  }
  function copySettings() {
    setClip({ adj: cleanAdj(manual), curve: local.curve })
  }
  function pasteSettings() {
    if (!clip) return
    editManual({ ...clip.adj })
    editLocalLive({ ...local, curve: clip.curve })
  }
  function editCrop(c: Crop | null) {
    pushHist(true)
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
          .select('id, filename, orig_path, full_path, pre_full_path, web_path, thumb_path, review_adj, reviewed, crop, local_edits, enhanced, pre_web_path, pre_thumb_path')
          .eq('gallery_id', galleryId)
          .or('cull_label.is.null,cull_label.neq.reject')
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
      setFilter('all')
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
    setLocal(row.local_edits ?? (brief.curve ? { ...emptyLocal(), curve: brief.curve } : emptyLocal()))
    setPen(null)
    setSelMask(null)
    hist.current = { past: [], future: [] }
    setHistTick((t) => t + 1)
    dirtyRef.current = 0
    pendingRef.current = false
    setDirty(0)
    setErr(null)
    ;(async () => {
      const sb = supabase
      if (!sb) return
      const srcPath = srcOf(row)
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

  // Draw the edited version: a quick small draw while dragging, then the sharp one
  const latestRef = useRef({ rowId: row?.id ?? '', lookId, strength, total, skin: base.skin, crop, local })
  latestRef.current = { rowId: row?.id ?? '', lookId, strength, total, skin: base.skin, crop, local }
  const liveRef = useRef({ busy: false, again: false })
  useEffect(() => {
    const src = srcRef.current
    if (!src || !row || src.id !== row.id) return
    let cancelled = false
    const live = liveRef.current
    const show = (url: string) => setAfterUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })

    async function draft() {
      if (live.busy) { live.again = true; return }
      live.busy = true
      try {
        do {
          live.again = false
          const s2 = srcRef.current
          const L = latestRef.current
          if (!s2 || s2.id !== L.rowId) break
          const url = await renderPreview(s2.bmp, L.lookId, L.strength, 520, L.total, L.skin, L.crop ?? undefined, L.local)
          if (!srcRef.current || srcRef.current.id !== latestRef.current.rowId) { URL.revokeObjectURL(url); break }
          show(url)
        } while (live.again)
      } catch {
        /* ignore */
      }
      live.busy = false
    }
    void draft()

    const t = setTimeout(async () => {
      try {
        const L = latestRef.current
        const url = await renderPreview(src.bmp, L.lookId, L.strength, 1400, L.total, L.skin, L.crop ?? undefined, L.local)
        if (cancelled) { URL.revokeObjectURL(url); return }
        show(url)
      } catch {
        /* ignore */
      }
    }, 220)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcTick, manualKey, cropKey, localKey, lookId, strength, base])

  // Full-size render for checking focus and noise
  useEffect(() => {
    const src = srcRef.current
    if (!zoom100 || !src || !row || src.id !== row.id) return
    let cancelled = false
    setFullBusy(true)
    const t = setTimeout(async () => {
      try {
        const url = await renderPreview(src.bmp, lookId, strength, 100000, total, base.skin, crop ?? undefined, local)
        if (cancelled) { URL.revokeObjectURL(url); return }
        setFullUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
      } catch {
        /* ignore */
      }
      if (!cancelled) setFullBusy(false)
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom100, srcTick, manualKey, cropKey, localKey, lookId, strength, base])

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
      const localSame = JSON.stringify(cleanLocal(local)) === JSON.stringify(cleanLocal(row.local_edits))
      const same = row.enhanced && adjSame && cropSame && localSame
      if (same && row.reviewed) {
        setBusy(false)
        finishSave(mark)
        return true
      }
      let patch: Record<string, unknown> = { reviewed: true }
      const oldPaths: string[] = []
      let newPaths: { full: string; web: string; thumb: string } | null = null
      if (!same) {
        const out = await enhancePhoto(src.blob, srcOf(row), { id: lookId, strength, adjust: total, skin: base.skin, crop: crop ?? undefined, local })
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
          ...firstPatch(row),
          review_adj: Object.keys(mine).length > 0 ? mine : null,
          full_path: newPaths.full,
          web_path: newPaths.web,
          thumb_path: newPaths.thumb,
          enh_bytes: out.full.size + out.web.blob.size + out.thumb.blob.size,
          crop: crop ?? null,
          local_edits: cleanLocal(local),
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
        ...(newPaths ? firstPatch(row) : {}),
        reviewed: true,
        review_adj: Object.keys(mine).length > 0 ? mine : null,
        crop: crop ?? null,
        local_edits: cleanLocal(local),
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

  async function applyRest() {
    if (!onApplyRest || !row || busy || restBusy) return
    setRestBusy(true)
    let ok = true
    if (srcRef.current?.id === row.id && (dirtyRef.current > 0 || !row.enhanced || !row.reviewed)) ok = await apply()
    if (!ok) { setRestBusy(false); return }
    await onApplyRest(cleanAdj(manual))
    setRestBusy(false)
    setRestAsk(false)
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


  // ---- masks and spot removal ----
  function measure() {
    const im = imgRef.current
    const st = stageRef.current
    if (!im || !st || !im.naturalWidth) { setBox(null); return }
    const r = im.getBoundingClientRect()
    const sr = st.getBoundingClientRect()
    const sc = Math.min(r.width / im.naturalWidth, r.height / im.naturalHeight)
    const w = im.naturalWidth * sc
    const h = im.naturalHeight * sc
    setBox({ x: r.left - sr.left + (r.width - w) / 2, y: r.top - sr.top + (r.height - h) / 2, w, h })
  }
  useEffect(() => {
    measure()
    const st = stageRef.current
    const ro = typeof ResizeObserver !== 'undefined' && st ? new ResizeObserver(() => measure()) : null
    if (ro && st) ro.observe(st)
    window.addEventListener('resize', measure)
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [afterUrl, row?.id, mode, zoom100, hold])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'range'))) return
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo() }
      else if (mod && k === 'y') { e.preventDefault(); redo() }
      else if (mod && e.shiftKey && k === 'c') { e.preventDefault(); copySettings() }
      else if (mod && e.shiftKey && k === 'v') { e.preventDefault(); pasteSettings() }
      else if (!mod && e.key === '\\') { e.preventDefault(); setMode((m) => (m === 'after' ? 'before' : 'after')) }
      else if (!mod && e.key === 'Escape') setPen(null)
      else if (!mod && (e.key === '[' || e.key === ']')) {
        const f = e.key === ']' ? 1.2 : 1 / 1.2
        if (pen === 'heal') setHealSize((v) => Math.max(0.005, Math.min(0.08, v * f)))
        else if (pen === 'brush') setBrushSize((v) => Math.max(0.005, Math.min(0.15, v * f)))
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  function pickPen(p: 'heal' | 'radial' | 'linear' | 'brush') {
    setPicking(false)
    setMode('after')
    setZoom100(false)
    setPen(pen === p ? null : p)
  }
  function ptOf(e: React.PointerEvent): { u: number; v: number } | null {
    const st = stageRef.current
    if (!box || !st) return null
    const sr = st.getBoundingClientRect()
    return { u: (e.clientX - sr.left - box.x) / box.w, v: (e.clientY - sr.top - box.y) / box.h }
  }
  function srcPt(e: React.PointerEvent): [number, number] | null {
    const p = ptOf(e)
    const s = srcRef.current
    if (!p || !s) return null
    return outToSrc(Math.max(0, Math.min(1, p.u)), Math.max(0, Math.min(1, p.v)), s.bmp.width, s.bmp.height, crop)
  }
  function toolDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    const pt = srcPt(e)
    const s = srcRef.current
    if (!pt || !s || !pen) return
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pen === 'heal') {
      const [sx, sy] = autoHealSource(s.bmp, pt[0], pt[1], healSize)
      editLocal({ ...local, heals: [...local.heals, { x: pt[0], y: pt[1], r: healSize, sx, sy }] })
      return
    }
    pushHist(false)
    const id = 'm' + Date.now().toString(36)
    const m: Mask = pen === 'radial'
      ? { id, kind: 'radial', a: pt, b: [0.005, 0.005], feather: 0.5, adj: { exposure: 0.3 } }
      : pen === 'linear'
        ? { id, kind: 'linear', a: pt, b: pt, feather: 0.5, adj: { exposure: -0.3 } }
        : { id, kind: 'brush', a: pt, b: pt, pts: [pt], size: brushSize, feather: 0.5, adj: { exposure: 0.3 } }
    dragRef.current = id
    setLocal((prev) => ({ ...prev, masks: [...prev.masks, m] }))
    setSelMask(id)
  }
  function toolMove(e: React.PointerEvent<HTMLDivElement>) {
    const p = ptOf(e)
    if (p && box) setCursor({ x: p.u * box.w, y: p.v * box.h })
    const id = dragRef.current
    if (!id) return
    const pt = srcPt(e)
    if (!pt) return
    setLocal((prev) => ({
      ...prev,
      masks: prev.masks.map((m) => {
        if (m.id !== id) return m
        if (m.kind === 'radial') return { ...m, b: [Math.max(0.005, Math.abs(pt[0] - m.a[0])), Math.max(0.005, Math.abs(pt[1] - m.a[1]))] as [number, number] }
        if (m.kind === 'linear') return { ...m, b: pt }
        const pts = m.pts ?? []
        const last = pts[pts.length - 1]
        if (last && Math.hypot(pt[0] - last[0], pt[1] - last[1]) < (m.size ?? 0.05) * 0.25) return m
        return { ...m, pts: [...pts, pt] }
      }),
    }))
  }
  function toolUp(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    const id = dragRef.current
    if (!id) return
    dragRef.current = null
    setLocal((prev) => ({
      ...prev,
      masks: prev.masks.map((m) => {
        if (m.id !== id) return m
        if (m.kind === 'radial' && m.b[0] < 0.012 && m.b[1] < 0.012) return { ...m, b: [0.18, 0.18] as [number, number] }
        if (m.kind === 'linear' && Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]) < 0.02) return { ...m, b: [m.a[0], Math.min(1, m.a[1] + 0.3)] as [number, number] }
        return m
      }),
    }))
    bump()
  }
  function patchMask(id: string, p: Partial<Mask>) {
    editLocalLive({ ...local, masks: local.masks.map((m) => (m.id === id ? { ...m, ...p } : m)) })
  }
  function setMaskAdj(m: Mask, key: keyof MaskAdj, ui: number, scale: number) {
    const next: MaskAdj = { ...m.adj }
    if (ui === 0) delete next[key]
    else next[key] = (ui / 100) * scale
    patchMask(m.id, { adj: next })
  }
  function removeMask(id: string) {
    editLocal({ ...local, masks: local.masks.filter((m) => m.id !== id) })
    if (selMask === id) setSelMask(null)
  }

  function penOverlay() {
    const sel = local.masks.find((m) => m.id === selMask)
    const s = srcRef.current
    if (!box || !s || showing !== 'after' || zoom100 || (!pen && !sel)) return null
    const sw = s.bmp.width
    const sh = s.bmp.height
    const L = Math.max(sw, sh)
    const so = crop ? box.w / cropRect(sw, sh, crop).cw : box.w / sw
    const P = (p: [number, number]): [number, number] => {
      const [u, v] = srcToOut(p[0], p[1], sw, sh, crop)
      return [u * box.w, v * box.h]
    }
    const ang = crop?.angle ?? 0
    const ring = (key: string, cx: number, cy: number, r: number, dash?: string) => (
      <g key={key}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={3} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="white" strokeWidth={1.5} strokeDasharray={dash} />
      </g>
    )
    const parts: ReactNode[] = []
    if (pen === 'heal') {
      local.heals.forEach((h, i) => {
        const [cx, cy] = P([h.x, h.y])
        parts.push(ring('h' + i, cx, cy, Math.max(3, h.r * L * so)))
      })
    }
    if (sel) {
      if (sel.kind === 'radial') {
        const [cx, cy] = P(sel.a)
        const rx = Math.max(2, sel.b[0] * sw * so)
        const ry = Math.max(2, sel.b[1] * sh * so)
        parts.push(
          <g key="sel" transform={`rotate(${ang} ${cx} ${cy})`}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="rgba(0,0,0,0.55)" strokeWidth={3} />
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="white" strokeWidth={1.5} />
            <ellipse cx={cx} cy={cy} rx={rx * (1 - sel.feather)} ry={ry * (1 - sel.feather)} fill="none" stroke="white" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="4 4" />
            <circle cx={cx} cy={cy} r={3} fill="white" />
          </g>,
        )
      } else if (sel.kind === 'linear') {
        const [ax, ay] = P(sel.a)
        const [bx, by] = P(sel.b)
        const len = Math.max(1, Math.hypot(bx - ax, by - ay))
        const nx = (-(by - ay) / len) * 70
        const ny = ((bx - ax) / len) * 70
        for (const [lx, ly, k] of [[ax, ay, 'a'], [bx, by, 'b']] as [number, number, string][]) {
          parts.push(<line key={'l' + k} x1={lx - nx} y1={ly - ny} x2={lx + nx} y2={ly + ny} stroke="white" strokeWidth={1.5} />)
          parts.push(<circle key={'c' + k} cx={lx} cy={ly} r={4} fill="white" stroke="rgba(0,0,0,0.5)" />)
        }
        parts.push(<line key="lab" x1={ax} y1={ay} x2={bx} y2={by} stroke="white" strokeOpacity={0.7} strokeWidth={1} strokeDasharray="4 4" />)
      } else {
        const pts = (sel.pts ?? []).map(P)
        const sw2 = Math.max(2, 2 * (sel.size ?? 0.05) * L * so)
        if (pts.length > 0) {
          parts.push(<circle key="b0" cx={pts[0][0]} cy={pts[0][1]} r={sw2 / 2} fill="rgba(255,80,80,0.3)" />)
          parts.push(<polyline key="b1" points={pts.map((q) => q.join(',')).join(' ')} fill="none" stroke="rgba(255,80,80,0.3)" strokeWidth={sw2} strokeLinecap="round" strokeLinejoin="round" />)
        }
      }
    }
    if (cursor && (pen === 'heal' || pen === 'brush')) {
      parts.push(ring('cur', cursor.x, cursor.y, Math.max(3, (pen === 'heal' ? healSize : brushSize) * L * so), '3 3'))
    }
    return (
      <div
        className={`absolute z-[6] touch-none ${pen ? 'cursor-crosshair' : 'pointer-events-none'}`}
        style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        onPointerDown={pen ? toolDown : undefined}
        onPointerMove={pen ? toolMove : undefined}
        onPointerUp={pen ? toolUp : undefined}
        onPointerLeave={() => setCursor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${box.w} ${box.h}`}>{parts}</svg>
      </div>
    )
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
  const hasAdj = !manual.raw && Object.keys(cleanAdj(manual)).length > 0
  const restCount = rows.filter((r) => !r.enhanced && r.id !== row?.id).length
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

  const frameImg = 'max-h-[80vh] w-full object-contain lg:h-full lg:max-h-full'

  return (
    <section className="mt-6">
      {loading ? (
        <p className="mt-10 text-white/50">Loading your photos…</p>
      ) : rows.length === 0 || !row ? (
        <div className="mt-10">
          <p className="text-white/60">There are no photos to edit yet.</p>
          <button className={`${quiet} mt-6`} onClick={onBack}>Back</button>
        </div>
      ) : (
        <>
          <div ref={wrapRef} className="mt-2 grid scroll-mt-4 gap-4 lg:h-[calc(100vh-1rem)] lg:grid-cols-[15rem_minmax(0,1fr)_18rem] xl:grid-cols-[16rem_minmax(0,1fr)_19rem]">
            {/* LEFT: light and color */}
            <div className="min-h-0 rounded-2xl border border-white/10 bg-[#151518] p-4 lg:overflow-y-auto">
              <Histogram url={afterUrl} />
              <Panel title="Light">{tools(LIGHT)}</Panel>
              <Panel title="Color">
                {tools(COLOR)}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button className={tab(picking)} onClick={() => { setPen(null); setPicking(!picking); setMode('after') }}>White balance picker</button>
                  <button className={tab(isBw)} onClick={() => editManual({ ...manual, bw: isBw ? 0 : 1 })}>Black &amp; White</button>
                </div>
                {picking && <p className="text-xs text-white/50">Click something that should be neutral gray or white.</p>}
              </Panel>
              <Panel title="Tone curve" defaultOpen={false}>
                <p className="text-xs text-white/50">Click the line to add a point and drag it. Double-click a point to remove it.</p>
                <CurveEditor pts={local.curve && local.curve.length >= 2 ? local.curve : [[0, 0], [1, 1]]} onChange={(c) => editLocalLive({ ...local, curve: c })} />
                {!curveIsFlat(local.curve) && <button className={tab(false)} onClick={() => editLocalLive({ ...local, curve: undefined })}>Reset curve</button>}
              </Panel>
            </div>

            {/* CENTER: the photo */}
            <div className="flex min-h-0 flex-col">
              <div
                ref={stageRef}
                className={`relative flex min-h-[420px] flex-1 select-none items-center justify-center overflow-hidden rounded-2xl bg-black/40 ${picking ? 'cursor-crosshair' : ''}`}
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
                  (showing === 'before' ? beforeUrl : afterUrl) && <img ref={imgRef} onLoad={measure} src={(showing === 'before' ? beforeUrl : afterUrl) as string} alt="" className={frameImg} />
                )}
                {!afterUrl && !err && <p className="absolute text-sm text-white/40">Loading…</p>}
                {penOverlay()}
                {(askBusy || camiBusy || sceneBusy) && (
                  <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-2xl">
                    <style>{`
                      @keyframes camriScan { 0% { top: -6rem; } 100% { top: 100%; } }
                      @keyframes camriGlow { 0%, 100% { opacity: 0.05; } 50% { opacity: 0.16; } }
                      .camri-scan { animation: camriScan 2.2s ease-in-out infinite; }
                      .camri-glow { animation: camriGlow 2.2s ease-in-out infinite; }
                      @media (prefers-reduced-motion: reduce) { .camri-scan, .camri-glow { animation: none; } }
                    `}</style>
                    <div className="camri-glow absolute inset-0 bg-[rgb(255,236,200)]" />
                    <div
                      className="camri-scan absolute inset-x-0 h-24"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(255,236,200,0), rgba(255,236,200,0.28) 65%, rgba(255,246,225,0.8) 100%)',
                        borderBottom: '2px solid rgba(255,246,225,0.95)',
                        boxShadow: '0 8px 28px rgba(255,230,180,0.55)',
                      }}
                    />
                    <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white/85">
                      {sceneBusy ? 'Camri is fixing this scene…' : 'Camri is reading this photo…'}
                    </span>
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">
                  {showing === 'before' ? 'Before' : showing === 'split' ? 'Before · After' : 'After'}
                </span>
                {saveLabel && <span className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">{saveLabel}</span>}
                <button
                  aria-label="Previous photo"
                  disabled={busy || nextVisible(-1) === idx}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); void go(nextVisible(-1)) }}
                  className="group absolute inset-y-0 left-0 z-10 flex w-16 items-center justify-start pl-2 disabled:pointer-events-none disabled:opacity-0"
                >
                  <span className="rounded-full bg-black/55 px-3.5 py-5 text-2xl leading-none text-white/85 transition group-hover:bg-black/80">&lsaquo;</span>
                </button>
                <button
                  aria-label="Next photo"
                  disabled={busy || nextVisible(1) === idx}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); void go(nextVisible(1), true) }}
                  className="group absolute inset-y-0 right-0 z-10 flex w-16 items-center justify-end pr-2 disabled:pointer-events-none disabled:opacity-0"
                >
                  <span className="rounded-full bg-black/55 px-3.5 py-5 text-2xl leading-none text-white/85 transition group-hover:bg-black/80">&rsaquo;</span>
                </button>
              </div>

              <div className="relative mt-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-white/45">Tools</span>
                  <button className={tab(openTool === 'spot' || pen === 'heal')} onClick={() => { setPen(null); setOpenTool(openTool === 'spot' ? null : 'spot') }}>Spot removal</button>
                  <button className={tab(openTool === 'masks' || (!!pen && pen !== 'heal'))} onClick={() => { setPen(null); setOpenTool(openTool === 'masks' ? null : 'masks') }}>Masks</button>
                </div>
                {openTool && (
                  <div className="absolute bottom-full left-0 z-30 mb-2 max-h-[55vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-[#151518] p-4 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.18em] text-white/50">{openTool === 'spot' ? 'Spot removal' : 'Masks'}</span>
                      <button className="text-sm text-white/45 hover:text-white/80" onClick={() => { setPen(null); setOpenTool(null) }}>Close</button>
                    </div>
                    {openTool === 'spot' ? (
              <div className="space-y-3">
                <p className="text-xs text-white/50">Click a spot on the photo. Camri copies a clean patch over it.</p>
                <div className="flex flex-wrap gap-2">
                  <button className={tab(pen === 'heal')} onClick={() => pickPen('heal')}>{pen === 'heal' ? 'Done' : 'Remove spots'}</button>
                  {local.heals.length > 0 && <button className={tab(false)} onClick={() => editLocal({ ...local, heals: local.heals.slice(0, -1) })}>Undo last spot</button>}
                  {local.heals.length > 0 && <button className={tab(false)} onClick={() => editLocal({ ...local, heals: [] })}>Clear all ({local.heals.length})</button>}
                </div>
                <Slide label="Spot size" shown={Math.round(healSize * 1000)} min={5} max={80} value={Math.round(healSize * 1000)} onChange={(v) => setHealSize(v / 1000)} onReset={() => setHealSize(0.02)} />
              </div>
                    ) : (
              <div className="space-y-3">
                <p className="text-xs text-white/50">Change just one part of the photo.</p>
                <div className="flex flex-wrap gap-2">
                  <button className={tab(pen === 'radial')} onClick={() => pickPen('radial')}>Radial</button>
                  <button className={tab(pen === 'linear')} onClick={() => pickPen('linear')}>Linear</button>
                  <button className={tab(pen === 'brush')} onClick={() => pickPen('brush')}>Brush</button>
                </div>
                {pen && pen !== 'heal' && (
                  <p className="text-xs text-white/50">
                    {pen === 'brush' ? 'Paint over the part you want to change.' : pen === 'radial' ? 'Drag from the center outward.' : 'Drag from where the change is full to where it fades out.'}
                  </p>
                )}
                {pen === 'brush' && <Slide label="Brush size" shown={Math.round(brushSize * 1000)} min={5} max={150} value={Math.round(brushSize * 1000)} onChange={(v) => setBrushSize(v / 1000)} onReset={() => setBrushSize(0.05)} />}
                {local.masks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {local.masks.map((m, i) => {
                      const n = local.masks.slice(0, i + 1).filter((x) => x.kind === m.kind).length
                      return (
                        <button key={m.id} className={tab(selMask === m.id)} onClick={() => setSelMask(selMask === m.id ? null : m.id)}>
                          {m.kind === 'radial' ? 'Radial' : m.kind === 'linear' ? 'Linear' : 'Brush'} {n}
                        </button>
                      )
                    })}
                  </div>
                )}
                {(() => {
                  const sm = local.masks.find((m) => m.id === selMask)
                  if (!sm) return null
                  return (
                    <div className="space-y-3 border-t border-white/10 pt-3">
                      {MASK_TOOLS.map((t) => {
                        const ui = Math.round(((sm.adj[t.key] ?? 0) / t.scale) * 100)
                        return (
                          <Slide
                            key={t.key}
                            label={t.label}
                            shown={ui > 0 ? `+${ui}` : ui}
                            min={-100}
                            max={100}
                            value={ui}
                            onChange={(v) => setMaskAdj(sm, t.key, v, t.scale)}
                            onReset={() => setMaskAdj(sm, t.key, 0, t.scale)}
                          />
                        )
                      })}
                      <Slide label="Feather" shown={Math.round(sm.feather * 100)} min={0} max={100} value={Math.round(sm.feather * 100)} onChange={(v) => patchMask(sm.id, { feather: v / 100 })} onReset={() => patchMask(sm.id, { feather: 0.5 })} />
                      {sm.kind === 'brush' && !pen && (
                        <Slide label="Size" shown={Math.round((sm.size ?? 0.05) * 1000)} min={5} max={150} value={Math.round((sm.size ?? 0.05) * 1000)} onChange={(v) => patchMask(sm.id, { size: v / 1000 })} onReset={() => patchMask(sm.id, { size: 0.05 })} />
                      )}
                      <div className="flex gap-2">
                        <button className={tab(!!sm.invert)} onClick={() => patchMask(sm.id, { invert: !sm.invert })}>Invert</button>
                        <button className={tab(false)} onClick={() => removeMask(sm.id)}>Delete mask</button>
                      </div>
                    </div>
                  )
                })()}
              </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2">
                <button className={tab(mode === 'after')} onClick={() => setMode('after')}>After</button>
                <button className={tab(mode === 'before')} onClick={() => setMode('before')}>Before</button>
                <button className={tab(mode === 'split')} onClick={() => setMode('split')}>Side by side</button>
                <button className={tab(zoom100)} onClick={() => setZoom100(!zoom100)}>100%</button>
                {flags[row.id] && !row.reviewed && <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs text-amber-300">{flags[row.id]}</span>}
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  <button className={`${tab(false)} disabled:opacity-40`} disabled={hist.current.past.length === 0} onClick={undo} title="Undo (Ctrl or Cmd + Z)">Undo</button>
                  <button className={`${tab(false)} disabled:opacity-40`} disabled={hist.current.future.length === 0} onClick={redo} title="Redo (Shift + Ctrl or Cmd + Z)">Redo</button>
                  <button className={tab(false)} onClick={copySettings} title="Copy these settings (Shift + Ctrl or Cmd + C)">Copy settings</button>
                  <button className={`${tab(false)} disabled:opacity-40`} disabled={!clip} onClick={pasteSettings} title="Paste settings (Shift + Ctrl or Cmd + V)">Paste settings</button>
                  <span className="text-xs text-white/45">Photo {idx + 1} of {rows.length} · {reviewed} checked</span>
                </span>
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
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-white/5 ${i === idx ? 'ring-2 ring-[var(--color-twilight)]' : ''}`}
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
                {onApplyRest && hasAdj && restCount > 0 && (
                  restAsk ? (
                    <span className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                      Use these edits on the other {restCount} {restCount === 1 ? 'photo' : 'photos'}?
                      <button className={primary} disabled={busy || restBusy} onClick={() => void applyRest()}>{restBusy ? 'Starting…' : 'Yes, apply to the rest'}</button>
                      <button className={quiet} disabled={restBusy} onClick={() => setRestAsk(false)}>Cancel</button>
                    </span>
                  ) : (
                    <button className={primary} disabled={busy} onClick={() => setRestAsk(true)}>Apply these edits to the rest of the shoot</button>
                  )
                )}
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
              <Panel title="Effects" defaultOpen={false}>
                {tools(EFFECTS)}
                <Slide
                  label="Grain"
                  shown={Math.round((manual.grain ?? 0) * 100)}
                  min={0}
                  max={100}
                  value={Math.round((manual.grain ?? 0) * 100)}
                  onChange={(v) => { const n: Adjust = { ...manual }; if (v === 0) delete n.grain; else n.grain = v / 100; editManual(n) }}
                  onReset={() => { const n: Adjust = { ...manual }; delete n.grain; editManual(n) }}
                />
              </Panel>
              <Panel title="Color mix" defaultOpen={false}>
                <ColorMixer value={manual} onChange={editManual} />
              </Panel>
              <div className="py-3">
                <button className={tab(false)} onClick={resetPhoto}>Reset this photo</button>
                {manual.raw ? <button className="ml-3 text-xs text-white/55 underline" onClick={() => editManual({})}>Back to the shoot&apos;s look</button> : null}
              </div>
              <Panel title="Ask Camri" defaultOpen={false} keep>
              <CamiPanel onBusyChange={setAskBusy} value={manual} onChange={editManual} previewUrl={afterUrl} lookName={lookId} strength={strength} brief={brief} light={light[row.id] || brief.light || ''} photoId={row.id}>
              <div className="mt-3 border-t border-white/10 pt-3">
                <button className={tab(true)} disabled={camiBusy || !!sceneBusy} onClick={camiScanThis}>
                  {camiBusy ? (camiProgress > 0 ? 'Camri is studying this shoot… ' + camiProgress + '/' + rows.length : 'Camri is looking…') : 'Use Camri to scan & fix'}
                </button>
                <button className={tab(false) + ' mt-2'} disabled={camiBusy || !!sceneBusy} onClick={camiScanScene}>
                  {sceneBusy ? 'Camri is fixing this scene… ' + sceneBusy.done + '/' + sceneBusy.total : 'Scan the whole scene'}
                </button>
                {sceneBusy && <button className="mt-2 block text-xs text-white/60 underline" onClick={() => { sceneStop.current = true }}>Stop</button>}
                {camiNote && camiNote.id === row.id && (
                  <div className="mt-2 space-y-1 text-xs text-white/60">
                    <p>{camiNote.notes.join(' ')}</p>
                    {camiNote.bw && <button className="block underline" onClick={camiTryBW}>Camri thinks this could be black &amp; white. Try it</button>}
                    {camiPrev.current && <button className="block underline" onClick={camiUndo}>Undo Camri</button>}
                  </div>
                )}
              </div>
              </CamiPanel>
              </Panel>
              <Panel title="Your style" defaultOpen={false}>
                <p className="text-xs text-white/55">Every fix you make is saved, so Camrhia can learn how you edit.</p>
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
              </Panel>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
