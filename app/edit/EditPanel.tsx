'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LOOKS, renderPreview, originalPreview, type Adjust } from '@/lib/enhance'
import { briefAdjust, type Brief } from '@/lib/brief'
import { addAdj } from '@/lib/tools'
import Dials from '@/app/edit/Dials'

const BUCKET = 'galleries'

type P = { id: string; orig_path: string; full_path?: string | null; thumb_path?: string | null }

const chip = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs transition ${on ? 'border-twilight bg-white/10 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`
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
  const cache = useRef<Map<string, ImageBitmap>>(new Map())

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

  useEffect(() => () => { cache.current.forEach((b) => b.close()); cache.current.clear() }, [])

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-white/10 bg-[#151518] p-5">
        <div className="flex flex-wrap gap-2">
          {LOOKS.map((l) => (
            <button key={l.id} className={chip(l.id === lookId)} onClick={() => setLookId(l.id)}>{l.label}</button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm">
          <span className="text-white/70">Intensity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(strength * 100)}
            onChange={(e) => setStrength(Number(e.target.value) / 100)}
            className="w-full max-w-xs accent-[var(--color-twilight)]"
          />
          <span className="text-white/50">{Math.round(strength * 100)}%</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <p className="mb-2 text-xs text-white/45">Tap a photo to try the edit on it</p>
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {samples.map((p) => {
              const src = p.thumb_path ? thumbs[p.thumb_path] : undefined
              return (
                <button
                  key={p.id}
                  onClick={() => setSelId(p.id)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-md bg-white/5 ${selId === p.id ? 'ring-2 ring-[var(--color-twilight)]' : ''}`}
                >
                  {src && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">Before</p>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-white/5">
                {beforeUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforeUrl} alt="" className="h-full w-full object-contain" />
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/40">After</p>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-white/5">
                {afterUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={afterUrl} alt="" className="h-full w-full object-contain" />
                )}
              </div>
            </div>
          </div>
          {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
        </div>

        <div>
          <Dials value={tweak} onChange={setTweak} />
          {signatureName && onSaveToSignature && (
            <div className="mt-4">
              <button className={quiet} onClick={async () => { await onSaveToSignature(); setSaved(true); setTimeout(() => setSaved(false), 2500) }}>
                Save these dials to {signatureName}
              </button>
              {saved && <p className="mt-2 text-xs text-white/50">Saved.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
