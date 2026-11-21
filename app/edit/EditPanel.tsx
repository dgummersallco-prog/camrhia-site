'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LOOKS, renderPreview, originalPreview, photoFeatures, type Adjust } from '@/lib/enhance'
import { briefAdjust, type Brief } from '@/lib/brief'
import { addAdj } from '@/lib/tools'
import Dials from '@/app/edit/Dials'
import AskCami from '@/app/edit/AskCami'

const BUCKET = 'galleries'

type P = { id: string; orig_path: string; full_path?: string | null; thumb_path?: string | null }

const quiet = 'rounded-full border border-white/15 px-5 py-2 text-sm text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-40'

export default function EditPanel({
  candidates,
  thumbs,
  lookId,
  setLookId,
  strength,
  setStrength,
  brief,
  lightOf,
  tweak,
  setTweak,
  signatureName,
  onSaveToSignature,
}: {
  candidates: P[]
  thumbs: Record<string, string>
  lookId: string
  setLookId: (id: string) => void
  strength: number
  setStrength: (n: number) => void
  brief: Brief
  lightOf: Record<string, string>
  tweak: Adjust
  setTweak: (a: Adjust) => void
  signatureName?: string
  onSaveToSignature?: () => Promise<void>
}) {
  const n = candidates.length
  const samples: P[] = []
  if (n <= 12) samples.push(...candidates)
  else {
    const seen = new Set<string>()
    for (let k = 0; k < 12; k++) {
      const p = candidates[Math.floor(((k + 0.5) / 12) * n)]
      if (p && !seen.has(p.id)) { seen.add(p.id); samples.push(p) }
    }
  }
  const sampleKey = samples.map((p) => p.id).join(',')

  const [selId, setSelId] = useState<string | null>(null)
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null)
  const [afterUrl, setAfterUrl] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [err, setErr] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [view, setView] = useState<'split' | 'after' | 'before'>('split')
  const autoRef = useRef(true)
  const scanned = useRef(0)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { wrapRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [])
  const cache = useRef<Map<string, ImageBitmap>>(new Map())
  const [lookThumbs, setLookThumbs] = useState<Record<string, string>>({})
  const lookRef = useRef<Record<string, string>>({})
  useEffect(() => { lookRef.current = lookThumbs }, [lookThumbs])
  useEffect(() => () => { Object.values(lookRef.current).forEach((u) => URL.revokeObjectURL(u)) }, [])

  useEffect(() => {
    if (samples.length === 0) { setSelId(null); return }
    if (!selId || !samples.some((p) => p.id === selId)) setSelId(samples[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleKey])

  useEffect(() => {
    if (!selId) return
    let cancelled = false
    setErr(null)
    ;(async () => {
      let bmp = cache.current.get(selId)
      if (!bmp) {
        const sb = supabase
        const p = samples.find((x) => x.id === selId)
        if (!sb || !p) return
        const path = p.full_path ?? p.orig_path
        const dl = await sb.storage.from(BUCKET).download(path)
        if (dl.error || !dl.data) { if (!cancelled) setErr('Could not load this photo.'); return }
        try {
          let blob: Blob = dl.data
          if (/\.(heic|heif)$/i.test(path)) {
            const mod = await import('heic2any')
            const out = await mod.default({ blob, toType: 'image/jpeg', quality: 0.95 })
            blob = Array.isArray(out) ? out[0] : out
          }
          bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
        } catch {
          if (!cancelled) setErr('Could not open this photo.')
          return
        }
        if (cache.current.size >= 4) {
          const first = cache.current.keys().next().value
          if (first) { cache.current.get(first)?.close(); cache.current.delete(first) }
        }
        cache.current.set(selId, bmp)
      }
      if (cancelled) return
      if (autoRef.current) {
        const at = samples.findIndex((x) => x.id === selId)
        const sat = photoFeatures(bmp).saturation ?? 1
        if (sat < 0.06 && at >= 0 && at < samples.length - 1 && scanned.current < 8) {
          scanned.current++
          setSelId(samples[at + 1].id)
          return
        }
        autoRef.current = false
      }
      const url = await originalPreview(bmp, 900)
      if (cancelled) { URL.revokeObjectURL(url); return }
      setBeforeUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
      setAfterUrl(null)
      setTick((t) => t + 1)
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId])

  useEffect(() => {
    if (!selId) return
    const bmp = cache.current.get(selId)
    if (!bmp) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const lg = lightOf[selId] ?? ''
        const base = briefAdjust(lg ? { ...brief, light: lg } : brief)
        const url = await renderPreview(bmp, lookId, strength, 900, addAdj(base.adjust, tweak), base.skin)
        if (cancelled) { URL.revokeObjectURL(url); return }
        setAfterUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url })
      } catch {
        /* ignore */
      }
    }, 60)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, lookId, strength, JSON.stringify(tweak), lightOf[selId ?? ''] ?? '', brief.light, brief.mood, brief.setting, brief.skin])

  useEffect(() => {
    if (!selId) return
    const bmp = cache.current.get(selId)
    if (!bmp) return
    let cancelled = false
    const t = setTimeout(async () => {
      const lg = lightOf[selId] ?? ''
      const base = briefAdjust(lg ? { ...brief, light: lg } : brief)
      for (const l of LOOKS) {
        if (cancelled) return
        try {
          const url = await renderPreview(bmp, l.id, strength, 240, base.adjust, base.skin)
          if (cancelled) { URL.revokeObjectURL(url); return }
          setLookThumbs((prev) => {
            const old = prev[l.id]
            if (old) URL.revokeObjectURL(old)
            return { ...prev, [l.id]: url }
          })
        } catch {
          /* ignore */
        }
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, strength, lightOf[selId ?? ''] ?? '', brief.light, brief.mood, brief.setting, brief.skin])

  useEffect(() => () => { cache.current.forEach((b) => b.close()); cache.current.clear() }, [])

  const pane = (label: string, url: string | null) => (
    <div className="relative min-h-0 overflow-hidden rounded-2xl bg-black/40">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />
      )}
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">{label}</span>
    </div>
  )
  const viewTab = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs transition ${on ? 'border-twilight bg-white/10 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`

  return (
    <div ref={wrapRef} className="mt-6 scroll-mt-4 grid gap-4 lg:h-[calc(100vh-7rem)] lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="shrink-0 rounded-2xl border border-white/10 bg-[#151518] p-4">
          <div className="flex gap-3 overflow-x-auto pb-1">
            {LOOKS.map((l) => (
              <button key={l.id} onClick={() => setLookId(l.id)} className="w-24 shrink-0 text-left">
                <div className={`aspect-[4/3] overflow-hidden rounded-lg bg-white/5 transition ${l.id === lookId ? 'ring-2 ring-[var(--color-twilight)]' : 'opacity-90 hover:opacity-100'}`}>
                  {lookThumbs[l.id] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={lookThumbs[l.id]} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <p className={`mt-1.5 truncate text-xs ${l.id === lookId ? 'text-white' : 'text-white/55'}`}>{l.label}</p>
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="text-white/70">Intensity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(strength * 100)}
              onChange={(e) => setStrength(Number(e.target.value) / 100)}
              className="w-full max-w-xs accent-[var(--color-twilight)]"
            />
            <span className="w-10 text-white/50">{Math.round(strength * 100)}%</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button className={viewTab(view === 'split')} onClick={() => setView('split')}>Side by side</button>
          <button className={viewTab(view === 'after')} onClick={() => setView('after')}>After</button>
          <button className={viewTab(view === 'before')} onClick={() => setView('before')}>Before</button>
          <span className="ml-auto text-xs text-white/45">Tap a photo below to try the edit on it</span>
        </div>

        <div className={`grid h-[60vh] min-h-0 gap-3 lg:h-auto lg:flex-1 ${view === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {view !== 'after' && pane('Before', beforeUrl)}
          {view !== 'before' && pane('After', afterUrl)}
        </div>
        {err && <p className="shrink-0 text-sm text-red-300">{err}</p>}

        <div className="flex shrink-0 gap-1.5 overflow-x-auto pb-1">
          {samples.map((p) => {
            const src = p.thumb_path ? thumbs[p.thumb_path] : undefined
            return (
              <button
                key={p.id}
                onClick={() => { autoRef.current = false; setSelId(p.id) }}
                className={`h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white/5 ${selId === p.id ? 'ring-2 ring-[var(--color-twilight)]' : ''}`}
              >
                {src && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt="" className="h-full w-full object-cover" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="min-h-0 lg:overflow-y-auto lg:pr-1">
        <Dials value={tweak} onChange={setTweak} />
        <div className="mt-4">
          <AskCami value={tweak} onChange={setTweak} lookName={lookId} strength={strength} brief={brief} previewUrl={afterUrl} />
        </div>
        {signatureName && onSaveToSignature && (
          <div className="pb-2">
            <button className={quiet} onClick={async () => { await onSaveToSignature(); setSaved(true); setTimeout(() => setSaved(false), 2500) }}>
              Save these dials to {signatureName}
            </button>
            {saved && <p className="mt-2 text-xs text-white/50">Saved.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
