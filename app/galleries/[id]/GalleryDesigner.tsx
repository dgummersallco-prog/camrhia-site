'use client'

import CamriTyping from '@/app/components/CamriTyping'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FONT_OPTIONS } from '@/lib/siteTheme'
import { COVERS, LAYOUTS, LAYOUT_PRESETS, LOOKS, LOOK_KEYS, PALETTES, resolveDesign, type ElStyle, type GalleryDesign } from '@/lib/galleryDesign'

const THUMBS: Record<string, number[][]> = {
  masonry: [[2, 2, 16, 14], [2, 18, 16, 20], [22, 2, 16, 22], [22, 26, 16, 12], [42, 2, 16, 12], [42, 16, 16, 22]],
  grid: [[2, 2, 16, 17], [22, 2, 16, 17], [42, 2, 16, 17], [2, 21, 16, 17], [22, 21, 16, 17], [42, 21, 16, 17]],
  square: [[2, 3, 16, 16], [22, 3, 16, 16], [42, 3, 16, 16], [2, 21, 16, 16], [22, 21, 16, 16], [42, 21, 16, 16]],
  rows: [[2, 2, 26, 16], [30, 2, 28, 16], [2, 20, 18, 18], [22, 20, 18, 18], [42, 20, 16, 18]],
  feature: [[2, 2, 34, 36], [38, 2, 20, 17], [38, 21, 20, 17]],
  wide: [[2, 2, 27, 22], [2, 26, 27, 12], [31, 2, 27, 12], [31, 16, 27, 22]],
  mosaic: [[2, 2, 27, 17], [31, 2, 27, 17], [2, 21, 17, 17], [21, 21, 17, 17], [40, 21, 18, 17]],
  polaroid: [[4, 5, 16, 22], [22, 9, 16, 22], [40, 5, 16, 22]],
  story: [[12, 2, 36, 16], [12, 20, 36, 18]],
  stagger: [[2, 2, 27, 16], [2, 20, 27, 18], [31, 8, 27, 16], [31, 26, 27, 12]],
  filmstrip: [[0, 8, 14, 24], [16, 8, 26, 24], [44, 8, 16, 24]],
}
const HAS_PNG = new Set(['masonry', 'grid', 'rows', 'feature', 'wide', 'mosaic', 'polaroid', 'story', 'stagger', 'filmstrip', 'square'])
function LayoutThumb({ k }: { k: string }) {
  return (
    <svg viewBox="0 0 60 40" className="block w-full" role="img" aria-label={k}>
      <rect width="60" height="40" fill="#FBF8F2" />
      {(THUMBS[k] ?? []).map((r, i) => <rect key={i} x={r[0]} y={r[1]} width={r[2]} height={r[3]} rx="1" fill="#CDBFAE" />)}
    </svg>
  )
}

const FONT_LIST = Object.entries(FONT_OPTIONS).map(([k, o]) => ({ k, label: o.label, family: o.family })).sort((a, b) => a.label.localeCompare(b.label))
const toHex = (c: string) => {
  const m = c.match(/\d+/g)
  if (!m || m.length < 3) return '#000000'
  return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}

export default function GalleryDesigner({ galleryId, token, title, initial, coverUrl, onClose, onSaved, onSend }: {
  galleryId: string; token: string; title: string; initial: GalleryDesign | null; coverUrl?: string
  onClose: () => void; onSaved: (d: GalleryDesign) => void; onSend?: () => void
}) {
  const [d, setD] = useState<GalleryDesign>(initial ?? {})
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pick, setPick] = useState<{ key: string; name: string; size: number; color: string; bold: boolean } | null>(null)
  const [zoom, setZoom] = useState<{ src: string; name: string; top: number } | null>(null)
  const [fontOpen, setFontOpen] = useState(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const latest = useRef<GalleryDesign>(initial ?? {})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eff = resolveDesign(d)
  const [gMsgs, setGMsgs] = useState<{ from: 'you' | 'cami'; text: string }[]>([])
  const [gInput, setGInput] = useState('')
  const [gBusy, setGBusy] = useState(false)
  const [gUndo, setGUndo] = useState<GalleryDesign | null>(null)
  const [gTour, setGTour] = useState<number | null>(null)
  const G_Q = ["Let's style your gallery. How should the opening photo look?", 'Now pick a photo layout.', 'All set! Check the preview. Click any line in it to change its font, size or color.']
  const gChip = 'rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-ink transition hover:border-twilight'
  const gSay = (text: string) => setGMsgs((m) => [...m, { from: 'cami', text }])
  const gPick = (label: string, patch: Partial<GalleryDesign>, next: number) => {
    setGMsgs((m) => [...m, { from: 'you', text: label }])
    setGUndo({ ...latest.current })
    change(patch)
    gSay(G_Q[next])
    setGTour(next === 2 ? null : next)
  }
  async function gAsk(raw: string) {
    const t = raw.trim()
    if (!t || gBusy) return
    setGInput('')
    setGBusy(true)
    setGMsgs((m) => [...m, { from: 'you', text: t }])
    try {
      const sess = (await supabase?.auth.getSession())?.data.session
      const res = await fetch('/api/ai/camri-gallery', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: t, history: gMsgs.slice(-6), covers: COVERS.map((c) => ({ k: c.k, name: c.name })), looks: LOOK_KEYS.map((k) => ({ k, name: LOOKS[k].name, blurb: LOOKS[k].blurb })), palettes: PALETTES.map((p) => ({ k: p.key, name: p.name })), current: { cover: eff.cover, look: d.look, colors: eff.pal.key, focal: eff.focal } }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Camri hit a snag.')
      const ch = j.changes ?? {}
      const patch: Record<string, unknown> = {}
      if (ch.cover) patch.cover = ch.cover
      if (ch.look) patch.look = ch.look
      if (ch.colors) patch.colors = ch.colors
      if (ch.focal) patch.focal = ch.focal
      if (Object.keys(patch).length) { setGUndo({ ...latest.current }); change(patch as Partial<GalleryDesign>) }
      gSay(j.reply)
    } catch (e) {
      gSay((e as Error).message)
    } finally {
      setGBusy(false)
    }
  }

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
  function setEl(key: string, patch: Partial<ElStyle>) {
    const el = { ...(latest.current.el ?? {}) }
    el[key] = { ...(el[key] ?? {}), ...patch }
    change({ el })
  }
  function resetEl(key: string) {
    const el = { ...(latest.current.el ?? {}) }
    delete el[key]
    change({ el })
  }
  function close() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; void save(latest.current) }
    onSaved(latest.current)
    onClose()
  }
  function closeAndSend() { close(); onSend?.() }

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const m = e.data
      if (!m || e.source !== frameRef.current?.contentWindow) return
      if (m.type === 'camrhia-gallery-ready') postDesign(latest.current)
      if (m.type === 'camrhia-gallery-pick') setPick({ key: String(m.key), name: String(m.name), size: Number(m.size) || 16, color: toHex(String(m.color)), bold: !!m.bold })
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    if (!pick || document.getElementById('gal-font-preview')) return
    const fams = Array.from(new Set(Object.values(FONT_OPTIONS).map((o) => o.gf).filter(Boolean).map((g) => String(g).replace(/^family=/, '').split(':')[0])))
    const chars = Array.from(new Set(Object.values(FONT_OPTIONS).map((o) => o.label).join('').split(''))).join('')
    const l = document.createElement('link')
    l.id = 'gal-font-preview'
    l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?' + fams.map((f) => 'family=' + f).join('&') + '&text=' + encodeURIComponent(chars) + '&display=swap'
    document.head.appendChild(l)
  }, [pick])

  const ring = 'border-twilight ring-2 ring-twilight'
  const head = 'text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft'
  const cur = pick ? d.el?.[pick.key] : undefined
  const colorRow = (label: string, value: string, isSet: boolean, onSet: (v: string) => void, onReset: () => void) => (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2">
      <input type="color" value={value} onChange={(e) => onSet(e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-black/10 bg-transparent p-0" />
      <span className="flex-1 text-sm text-ink">{label}</span>
      {isSet && <button type="button" onClick={onReset} className="text-[11px] text-twilight underline">Reset</button>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-paper">
      <aside className="flex w-[290px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white/50 p-4">
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={close} className="text-sm text-ink-soft hover:text-ink">✕ Close</button>
          <span className="text-xs text-ink-soft">{saving ? 'Saving…' : 'Saved'}</span>
        </div>
        <h2 className="font-fraunces text-2xl font-semibold text-ink">Style this gallery</h2>
        <p className="mb-4 truncate text-sm text-ink-soft">{title}</p>
        {err && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

        <div className="mb-5 rounded-xl border border-[#E8DDD0] bg-white/80 p-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/13_face_avatar.png" alt="" className="h-7 w-7 rounded-full" />
            <p className="font-fraunces text-base font-semibold text-ink">Camri</p>
          </div>
          <div className="mt-2 space-y-1.5">
            {gMsgs.slice(-3).map((m, i) => (
              <div key={i} className={'max-w-[92%] rounded-xl px-2.5 py-1.5 text-xs ' + (m.from === 'you' ? 'ml-auto bg-twilight text-white' : 'bg-[#EBDDCF] text-ink')}>{m.text}</div>
            ))}
            {gBusy && (
              <div className="flex items-center gap-1.5 text-xs text-ink-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/camri/04_thinking.png" alt="" className="h-8 w-auto" /> <CamriTyping />
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {gTour === null && <button type="button" className={gChip} onClick={() => { gSay(G_Q[0]); setGTour(0) }}>Walk me through it</button>}
            {gTour === 0 && COVERS.map((c) => <button key={c.k} type="button" className={gChip} onClick={() => gPick(c.name, { cover: c.k } as Partial<GalleryDesign>, 1)}>{c.name}</button>)}
            {gTour === 1 && LAYOUTS.map((l) => <button key={l.k} type="button" className={gChip} onClick={() => gPick(l.name, { layout: l.k, ...(LAYOUT_PRESETS[l.k] ?? {}) } as Partial<GalleryDesign>, 2)}>{l.name}</button>)}
            {gTour !== null && <button type="button" className="px-1 text-[11px] text-ink-soft underline" onClick={() => { setGTour(null); gSay('Okay, I am here whenever you want a change.') }}>Skip</button>}
          </div>
          {gUndo && <button type="button" onClick={() => { const u = gUndo; setGUndo(null); change({ cover: u.cover, look: u.look, colors: u.colors, focal: u.focal, layout: u.layout } as Partial<GalleryDesign>) }} className="mt-1.5 text-[11px] text-twilight underline">Undo Camri&apos;s last change</button>}
          <form onSubmit={(e) => { e.preventDefault(); gAsk(gInput) }} className="mt-2 flex gap-1.5">
            <input value={gInput} onChange={(e) => setGInput(e.target.value)} placeholder="Ask Camri to restyle" className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs text-ink outline-none focus:border-twilight" />
            <button type="submit" disabled={gBusy} className="rounded-lg bg-twilight px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Send</button>
          </form>
        </div>

        <p className={head + ' mt-2'}>Opening photo</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {COVERS.map((c) => (
            <button key={c.k} type="button" onClick={() => change({ cover: c.k })} onMouseEnter={(e) => setZoom({ src: '/gallery-cover/' + c.k + '.png', name: c.name, top: e.currentTarget.getBoundingClientRect().top })} onMouseLeave={() => setZoom(null)} className={'rounded-lg border bg-white p-1.5 text-center transition hover:bg-paper ' + (eff.cover === c.k ? ring : 'border-line')}>
              <div className="overflow-hidden rounded border border-black/5">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={"/gallery-cover/" + c.k + ".png"} alt="" className="block w-full" /></div>
              <span className="mt-1 block text-[11px] text-ink">{c.name}</span>
            </button>
          ))}
        </div>

        {coverUrl && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-ink">Focal point <span className="font-normal text-ink-soft">(click the part to keep in frame)</span></p>
            <label className="mb-2 block text-xs text-ink-soft">Zoom ({(eff.zoom ?? 1).toFixed(1)}x)
              <input type="range" min={1} max={3} step={0.1} value={eff.zoom ?? 1} onChange={(e) => change({ zoom: Number(e.target.value) })} className="mt-1 w-full" />
            </label>
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

        <p className={head + ' mt-8'}>Photo layout</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LAYOUTS.map((l) => (
            <button key={l.k} type="button" onClick={() => change({ layout: l.k, ...(LAYOUT_PRESETS[l.k] ?? {}) })} onMouseEnter={(e) => { if (HAS_PNG.has(l.k)) setZoom({ src: '/gallery-layout/' + l.k + '.png', name: l.name, top: e.currentTarget.getBoundingClientRect().top }) }} onMouseLeave={() => setZoom(null)} className={'rounded-lg border bg-white p-1.5 text-center transition hover:bg-paper ' + (eff.layout === l.k ? ring : 'border-line')}>
              <div className="overflow-hidden rounded border border-black/5">{HAS_PNG.has(l.k) ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={'/gallery-layout/' + l.k + '.png'} alt="" className="block aspect-[3/2] w-full object-cover object-top" />) : <LayoutThumb k={l.k} />}</div>
              <span className="mt-1 block text-[11px] text-ink">{l.name}</span>
            </button>
          ))}
        </div>

        <p className={head + ' mt-8'}>Colors</p>
        <div className="mt-3 space-y-2">
          {colorRow('Page background', eff.pal.bg, !!d.bg, (v) => change({ bg: v }), () => change({ bg: undefined }))}
          {colorRow('Opening photo background', eff.coverPal.bg, !!d.coverBg, (v) => change({ coverBg: v }), () => change({ coverBg: undefined }))}
          {colorRow('Accent', eff.pal.accent, !!d.accent, (v) => change({ accent: v }), () => change({ accent: undefined }))}
        </div>

        <p className={head + ' mt-8'}>Photo spacing</p>
        <div className="mt-3 space-y-3 rounded-lg border border-line bg-white p-3">
          <label className="block text-xs text-ink-soft">Space between photos
            <input type="range" min={0} max={48} value={eff.look.gap} onChange={(e) => change({ gap: Number(e.target.value) })} className="mt-1 w-full" />
          </label>
          <label className="block text-xs text-ink-soft">Rounded corners
            <input type="range" min={0} max={40} value={eff.look.radius} onChange={(e) => change({ radius: Number(e.target.value) })} className="mt-1 w-full" />
          </label>
        </div>
        <p className="mt-4 text-xs text-ink-soft">Click any line in the preview to change its font, size and color.</p>
      </aside>
      {zoom && (
        <div className="pointer-events-none fixed z-[60] rounded-xl border border-line bg-white p-2 shadow-2xl" style={{ left: 300, top: Math.max(8, Math.min(zoom.top - 40, (typeof window !== 'undefined' ? window.innerHeight : 800) - 600)) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt="" style={{ maxWidth: 560, maxHeight: '85vh' }} className="block h-auto w-auto rounded" />
          <p className="mt-1 text-center text-xs text-ink-soft">{zoom.name}</p>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-3">
        <div className="mb-3 flex items-center justify-end gap-3">
          <div className="flex overflow-hidden rounded-xl border border-line bg-white text-sm">
            {(['desktop', 'phone'] as const).map((x) => (
              <button key={x} type="button" onClick={() => setDevice(x)} className={'px-4 py-2 font-medium transition ' + (device === x ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink')}>{x === 'desktop' ? 'Desktop' : 'Phone'}</button>
            ))}
          </div>
          {onSend && <button type="button" onClick={closeAndSend} className="rounded-xl bg-twilight px-5 py-2 text-sm font-medium text-white transition hover:opacity-90">Done and send</button>}
          <button type="button" onClick={close} className={onSend ? 'rounded-xl border border-line bg-white px-5 py-2 text-sm font-medium text-ink transition hover:opacity-90' : 'rounded-xl bg-twilight px-5 py-2 text-sm font-medium text-white transition hover:opacity-90'}>Done</button>
        </div>
        <div className="relative flex min-h-0 flex-1 justify-center overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <iframe ref={frameRef} src={`/g/${token}?preview=1`} title="Gallery preview" style={{ width: device === 'phone' ? 390 : '100%', height: '100%', border: 0, background: '#fff' }} />
          {pick && (
            <div className="absolute right-3 top-3 z-20 max-h-[92%] w-64 overflow-y-auto rounded-xl border border-line bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-fraunces text-base font-semibold text-ink">{pick.name}</p>
                <button type="button" onClick={() => setPick(null)} className="text-ink-soft hover:text-ink">✕</button>
              </div>
              {pick.key === 'bg' ? (
                <div className="space-y-2">
                  {colorRow('Page background', eff.pal.bg, !!d.bg, (v) => change({ bg: v }), () => change({ bg: undefined }))}
          {colorRow('Opening photo background', eff.coverPal.bg, !!d.coverBg, (v) => change({ coverBg: v }), () => change({ coverBg: undefined }))}
                  {colorRow('Accent', eff.pal.accent, !!d.accent, (v) => change({ accent: v }), () => change({ accent: undefined }))}
                </div>
              ) : pick.key === 'photos' ? (
                <div className="space-y-3">
                  <label className="block text-xs text-ink-soft">Space between photos
                    <input type="range" min={0} max={48} value={eff.look.gap} onChange={(e) => change({ gap: Number(e.target.value) })} className="mt-1 w-full" />
                  </label>
                  <label className="block text-xs text-ink-soft">Rounded corners
                    <input type="range" min={0} max={40} value={eff.look.radius} onChange={(e) => change({ radius: Number(e.target.value) })} className="mt-1 w-full" />
                  </label>
                  <p className="text-[11px] text-ink-soft">These apply to every photo. Pick a different layout on the left.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs text-ink-soft">Font
                    <button type="button" onClick={() => setFontOpen((o) => !o)} className="mt-1 flex w-full items-center justify-between rounded-lg border border-line bg-white px-2 py-1.5 text-left text-sm text-ink" style={{ fontFamily: cur?.font ? FONT_OPTIONS[cur.font]?.family : undefined }}>
                      <span>{cur?.font ? FONT_OPTIONS[cur.font]?.label : 'Gallery default'}</span><span className="text-ink-soft">▾</span>
                    </button>
                    {fontOpen && (
                      <div className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-line bg-white">
                        <button type="button" onClick={() => { setEl(pick.key, { font: undefined }); setFontOpen(false) }} className="block w-full px-2 py-1.5 text-left text-sm text-ink hover:bg-paper">Gallery default</button>
                        {FONT_LIST.map((f) => (
                          <button key={f.k} type="button" onClick={() => { setEl(pick.key, { font: f.k }); setFontOpen(false) }} className={'block w-full px-2 py-1.5 text-left text-base text-ink hover:bg-paper ' + (cur?.font === f.k ? 'bg-paper' : '')} style={{ fontFamily: f.family }}>{f.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  {pick.key === 'initials' && (
                    <label className="block text-xs text-ink-soft">Initials (first two letters are used)
                      <input type="text" maxLength={4} value={cur?.text ?? ''} placeholder="Auto from title" onChange={(e) => setEl(pick.key, { text: e.target.value })} className="mt-1 w-full rounded border border-black/10 bg-white px-2 py-1.5 text-sm text-ink" />
                    </label>
                  )}
                  {pick.key === 'brand' && (
                    <label className="block text-xs text-ink-soft">Cover subtitle (date, season, etc.)
                      <input type="text" maxLength={40} value={cur?.text ?? ''} placeholder="Studio name" onChange={(e) => setEl(pick.key, { text: e.target.value })} className="mt-1 w-full rounded border border-black/10 px-2 py-1.5 text-sm text-ink" />
                    </label>
                  )}
                  <label className="block text-xs text-ink-soft">Size ({cur?.size ?? pick.size}px)
                    <input type="range" min={8} max={120} value={cur?.size ?? pick.size} onChange={(e) => setEl(pick.key, { size: Number(e.target.value) })} className="mt-1 w-full" />
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink-soft">
                    <input type="color" value={cur?.color ?? pick.color} onChange={(e) => setEl(pick.key, { color: e.target.value })} className="h-8 w-8 cursor-pointer rounded border border-black/10 bg-transparent p-0" />
                    Color
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink-soft">
                    <input type="checkbox" checked={cur?.bold ?? pick.bold} onChange={(e) => setEl(pick.key, { bold: e.target.checked })} />
                    Bold
                  </label>
                  <label className="block text-xs text-ink-soft">Move up or down ({cur?.dy ?? 0}px)
                    <input type="range" min={-200} max={200} value={cur?.dy ?? 0} onChange={(e) => setEl(pick.key, { dy: Number(e.target.value) })} className="mt-1 w-full" />
                  </label>
                  <button type="button" onClick={() => resetEl(pick.key)} className="text-[11px] text-twilight underline">Reset this line</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
