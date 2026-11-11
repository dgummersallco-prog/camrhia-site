'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { COVERS, LOOKS, LOOK_KEYS, PALETTES, resolveDesign, type GalleryDesign } from '@/lib/galleryDesign'

function CoverMock({ k }: { k: string }) {
  const img = '#cdb7a5'
  return (
    <svg viewBox="0 0 120 76" className="block w-full" role="img" aria-label={k}>
      <rect width="120" height="76" fill="#fff" />
      {k === 'bottom' && (<g><rect width="120" height="76" fill={img} /><rect x="8" y="52" width="46" height="5" fill="#fff" /><rect x="8" y="61" width="28" height="3" fill="#fff" opacity=".7" /></g>)}
      {k === 'center' && (<g><rect width="120" height="76" fill={img} /><rect x="30" y="32" width="60" height="5" fill="#fff" /><rect x="42" y="42" width="36" height="3" fill="#fff" opacity=".7" /></g>)}
      {k === 'split' && (<g><rect x="60" y="0" width="60" height="76" fill={img} /><rect x="10" y="30" width="38" height="5" fill="#2A1F24" /><rect x="10" y="40" width="24" height="3" fill="#2A1F24" opacity=".4" /></g>)}
      {k === 'frame' && (<g><rect x="14" y="8" width="92" height="46" fill="none" stroke="#2A1F24" strokeOpacity=".4" /><rect x="18" y="12" width="84" height="38" fill={img} /><rect x="36" y="62" width="48" height="5" fill="#2A1F24" /></g>)}
      {k === 'below' && (<g><rect width="120" height="48" fill={img} /><rect x="34" y="57" width="52" height="5" fill="#2A1F24" /></g>)}
      {k === 'text' && (<g><rect x="28" y="32" width="64" height="6" fill="#2A1F24" /><rect x="44" y="44" width="32" height="3" fill="#2A1F24" opacity=".4" /></g>)}
    </svg>
  )
}

export default function GalleryDesigner({ galleryId, token, title, initial, coverUrl, onClose, onSaved }: {
  galleryId: string; token: string; title: string; initial: GalleryDesign | null; coverUrl?: string
  onClose: () => void; onSaved: (d: GalleryDesign) => void
}) {
  const [d, setD] = useState<GalleryDesign>(initial ?? {})
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const latest = useRef<GalleryDesign>(initial ?? {})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eff = resolveDesign(d)

  function postDesign(next: GalleryDesign) {
    try { frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-gallery-design', design: next }, '*') } catch { /* ignore */ }
  }
  async function save(next: GalleryDesign) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('galleries').update({ design: next }).eq('id', galleryId)
    setSaving(false)
    if (error) setErr(error.message.includes('design') ? 'Run the design SQL in Supabase first.' : error.message)
    else setErr(null)
  }
  function change(patch: Partial<GalleryDesign>) {
    const next = { ...latest.current, ...patch }
    latest.current = next
    setD(next)
    postDesign(next)
    if (timer.current) clearTimeout(timer.current)
    setSaving(true)
    timer.current = setTimeout(() => { void save(latest.current) }, 500)
  }
  function close() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; void save(latest.current) }
    onSaved(latest.current)
    onClose()
  }

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data && e.data.type === 'camrhia-gallery-ready' && e.source === frameRef.current?.contentWindow) postDesign(latest.current)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const ring = 'border-twilight ring-2 ring-twilight'
  const head = 'text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft'

  return (
    <div className="glass mb-6 flex h-[58vh] min-h-[400px] max-h-[560px] overflow-hidden rounded-2xl">
      <aside className="flex w-[290px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white/50 p-4">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={close} className="text-sm text-ink-soft hover:text-ink">✕ Close</button>
          <span className="text-xs text-ink-soft">{saving ? 'Saving…' : 'Saved'}</span>
        </div>
        <h2 className="font-fraunces text-2xl font-semibold text-ink">Style this gallery</h2>
        <p className="mb-4 truncate text-sm text-ink-soft">{title}</p>
        {err && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        <p className={head + ' mt-2'}>Opening photo</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {COVERS.map((c) => (
            <button key={c.k} type="button" onClick={() => change({ cover: c.k })} className={'rounded-lg border bg-white p-1.5 text-center transition hover:bg-paper ' + (eff.cover === c.k ? ring : 'border-line')}>
              <div className="overflow-hidden rounded border border-black/5"><CoverMock k={c.k} /></div>
              <span className="mt-1 block text-[11px] text-ink">{c.name}</span>
            </button>
          ))}
        </div>

        {coverUrl && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-ink">Focal point <span className="font-normal text-ink-soft">(click the part to keep in frame)</span></p>
            <div
              className="relative cursor-crosshair overflow-hidden rounded-xl border border-line"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                change({ focal: { x: Math.round(((e.clientX - r.left) / r.width) * 100), y: Math.round(((e.clientY - r.top) / r.height) * 100) } })
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="Cover" className="block w-full" draggable={false} />
              <span className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/30 shadow" style={{ left: `${eff.focal.x}%`, top: `${eff.focal.y}%` }} />
            </div>
          </div>
        )}

        <p className={head + ' mt-8'}>Mood</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LOOK_KEYS.map((k) => (
            <button key={k} type="button" onClick={() => change({ look: k })} className={'rounded-lg border bg-white px-2 py-3 text-sm text-ink transition hover:bg-paper ' + ((d.look ?? 'classic') === k ? ring : 'border-line')}>{LOOKS[k].name}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{eff.look.blurb}</p>

        <p className={head + ' mt-8'}>Colors</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {PALETTES.map((p) => (
            <button key={p.key} type="button" title={p.name} aria-label={p.name} onClick={() => change({ colors: p.key })} className={'h-9 w-9 overflow-hidden rounded-full border transition hover:scale-110 ' + (eff.pal.key === p.key ? ring : 'border-black/15')}>
              <span className="block h-1/2 w-full" style={{ background: p.bg }} />
              <span className="block h-1/2 w-full" style={{ background: p.accent }} />
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-soft">{eff.pal.name}</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-3 flex items-center justify-end gap-3">
          <div className="flex overflow-hidden rounded-xl border border-line bg-white text-sm">
            {(['desktop', 'phone'] as const).map((x) => (
              <button key={x} type="button" onClick={() => setDevice(x)} className={'px-4 py-2 font-medium transition ' + (device === x ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink')}>{x === 'desktop' ? 'Desktop' : 'Phone'}</button>
            ))}
          </div>
          <button type="button" onClick={close} className="rounded-xl bg-twilight px-5 py-2 text-sm font-medium text-white transition hover:opacity-90">Done</button>
        </div>
        <div className="flex min-h-0 flex-1 justify-center overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <iframe ref={frameRef} src={`/g/${token}?preview=1`} title="Gallery preview" style={{ width: device === 'phone' ? 390 : '100%', height: '100%', border: 0, background: '#fff' }} />
        </div>
      </div>
    </div>
  )
}
