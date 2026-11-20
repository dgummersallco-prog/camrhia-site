'use client'

import CamriTyping from '@/app/components/CamriTyping'
import ColorInput from '@/app/components/ColorInput'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { FONT_OPTIONS } from '@/lib/siteTheme'
import { COVERS, LAYOUTS, LAYOUT_PRESETS, LOOKS, LOOK_KEYS, PALETTES, resolveDesign, type ElStyle, type GalleryDesign, COVER_PRESETS, COVER_SLOTS } from '@/lib/galleryDesign'

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

function clearCoverEl<T>(el?: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {}
  for (const [k, v] of Object.entries(el ?? {})) if (!['title', 'title2', 'brand', 'initials', 'titlein'].includes(k)) out[k] = v
  return out
}

function coverPatch(k: string, el?: GalleryDesign['el']): Partial<GalleryDesign> {
  const p = COVER_PRESETS[k] ?? {}
  return { cover: k, ...p, el: { ...clearCoverEl(el), ...(p.el ?? {}) } }
}

type SecM = { id: string; name: string; startId: string; line?: boolean }
export default function GalleryDesigner({ galleryId, token, title, initial, coverUrl, photoChoices, coverPhotoId, onPickCover, onClose, onSaved, onSend, topOffset, flushRef, leftHost, onAddSection, onMoveSection, onSectionLine, onRemoveSection, onRenameSection }: {
  galleryId: string; token: string; title: string; initial: GalleryDesign | null; coverUrl?: string
  photoChoices?: { id: string; url: string }[]; coverPhotoId?: string | null; onPickCover?: (id: string) => void
  onClose: () => void; onSaved: (d: GalleryDesign) => void; onSend?: () => void; topOffset?: number; flushRef?: { current: (() => void) | null }; leftHost?: HTMLElement | null
  onAddSection?: (pid?: string) => Promise<{ id: string; moments: SecM[] } | null>; onMoveSection?: (id: string, pid: string) => Promise<SecM[] | null>; onSectionLine?: (id: string, on: boolean) => Promise<SecM[] | null>; onRemoveSection?: (id: string) => Promise<SecM[] | null>; onRenameSection?: (id: string, name: string) => void
}) {
  const [d, setD] = useState<GalleryDesign>(initial ?? {})
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [slot, setSlot] = useState('main')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [popPos, setPopPos] = useState<{ top?: number; bottom?: number; maxHeight: number } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [pick, setPick] = useState<{ key: string; name: string; size: number; color: string; bold: boolean; mid?: string | null; line?: boolean } | null>(null)
  const [zoom, setZoom] = useState<{ src: string; name: string; top: number } | null>(null)
  const [fontOpen, setFontOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [secPick, setSecPick] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)
  const pendingEdit = useRef<{ key: string; id?: string } | null>(null)
  const renTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [focusOn, setFocusOn] = useState(false)
  const focusRef = useRef(false)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const latest = useRef<GalleryDesign>(initial ?? {})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const eff = resolveDesign(d)
  const nSlots = COVER_SLOTS[eff.cover] ?? 0
  const slotKeys = nSlots ? [...(['mosaic', 'strip'].includes(eff.cover) ? [] : ['main']), ...Array.from({ length: nSlots }, (_, i) => 's' + i)] : []
  const curSlot = slotKeys.includes(slot) ? slot : slotKeys[0] ?? 'main'
  const [gMsgs, setGMsgs] = useState<{ from: 'you' | 'cami'; text: string }[]>([])
  const [gInput, setGInput] = useState('')
  const [gBusy, setGBusy] = useState(false)
  const [gUndo, setGUndo] = useState<GalleryDesign | null>(null)
  const [gTour, setGTour] = useState<number | null>(null)
  const G_Q = ["Let's style your gallery. How should the cover photo look?", 'Now pick a photo layout.', 'All set! Check the preview. Click any line in it to change its font, size or color.']
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

  function pickCover(id: string) {
    if (curSlot !== 'main') { change({ slots: { ...(latest.current.slots ?? {}), [curSlot]: id } }); return }
    pickMain(id)
  }
  function pickMain(id: string) {
    onPickCover?.(id)
    change({ focal: undefined, zoom: undefined })
    try { frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-gallery-cover', id }, '*') } catch { /* ignore */ }
  }
  const pickRef = useRef(pickMain)
  pickRef.current = pickMain
  const setElRef = useRef(setEl)
  setElRef.current = setEl
  const moveBase = useRef<{ key: string; dx: number; dy: number } | null>(null)
  function postFocus(on: boolean) {
    try { frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-gallery-focus-mode', on }, '*') } catch { /* ignore */ }
  }
  function toggleFocus() {
    const on = !focusRef.current
    focusRef.current = on
    setFocusOn(on)
    if (on) setPick(null)
    postFocus(on)
  }
  function postEdit(key: string, id?: string) {
    try { frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-gallery-edit', key, id }, '*') } catch { /* ignore */ }
  }
  function postSectionMode(on: boolean) {
    try { frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-gallery-section-mode', on }, '*') } catch { /* ignore */ }
  }
  function postMoments(ms: SecM[]) {
    try { frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-gallery-moments', moments: ms }, '*') } catch { /* ignore */ }
  }
  async function sectionLine(on: boolean) {
    if (!pick?.mid) return
    setPick((p) => (p ? { ...p, line: on } : p))
    const ms = await onSectionLine?.(pick.mid, on)
    if (ms) postMoments(ms)
  }
  async function removeSection() {
    if (!pick?.mid) return
    const id = pick.mid
    setPick(null)
    const ms = await onRemoveSection?.(id)
    if (ms) postMoments(ms)
  }
  function rowMove(dir: number) {
    if (!pick?.mid) return
    try { frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-gallery-section-row', id: pick.mid, dir }, '*') } catch { /* ignore */ }
  }
  function addCoverText() {
    setAddOpen(false)
    const cur = latest.current.el ?? {}
    let n = 1
    while (cur['x' + n]) n++
    setEl('x' + n, { text: 'Your text' })
    setTimeout(() => postEdit('x' + n), 600)
  }
  async function addSectionAt(pid?: string) {
    setSecPick(false)
    postSectionMode(false)
    const r = await onAddSection?.(pid)
    if (!r) return
    postMoments(r.moments)
    setTimeout(() => postEdit('moment', r.id), 400)
  }
  const onMoveSecRef = useRef(onMoveSection)
  onMoveSecRef.current = onMoveSection
  const addSectionRef = useRef(addSectionAt)
  addSectionRef.current = addSectionAt
  const renameRef = useRef((id: string, text: string) => { void id; void text })
  renameRef.current = (id, text) => {
    if (renTimer.current) clearTimeout(renTimer.current)
    renTimer.current = setTimeout(() => onRenameSection?.(id, text), 600)
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
    if (!flushRef) return
    flushRef.current = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null; void save(latest.current) }
      onSaved(latest.current)
    }
    return () => { flushRef.current = null }
  })

  // First time here: put photos in the cover boxes so nothing starts empty.
  useEffect(() => {
    if (!photoChoices || photoChoices.length === 0) return
    const used = new Set<string>()
    if (coverPhotoId) used.add(coverPhotoId)
    else if (onPickCover) { onPickCover(photoChoices[0].id); used.add(photoChoices[0].id) }
    const have: Record<string, string> = { ...(latest.current.slots ?? {}) }
    Object.values(have).forEach((v) => used.add(v))
    let changed = false
    for (const k of slotKeys) {
      if (k === 'main' || have[k]) continue
      const nx = photoChoices.find((c) => !used.has(c.id))
      if (nx) { have[k] = nx.id; used.add(nx.id); changed = true }
    }
    if (changed) change({ slots: have })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eff.cover, photoChoices?.length])

  useEffect(() => {
    if (!addOpen) return
    const down = (e: PointerEvent) => { if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false) }
    const away = () => setAddOpen(false)
    document.addEventListener('pointerdown', down)
    window.addEventListener('blur', away)
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('blur', away) }
  }, [addOpen])

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const m = e.data
      if (!m || e.source !== frameRef.current?.contentWindow) return
      if (m.type === 'camrhia-gallery-ready') {
        postDesign(latest.current)
        postFocus(focusRef.current)
        const pe = pendingEdit.current
        if (pe) { pendingEdit.current = null; setTimeout(() => postEdit(pe.key, pe.id), 700) }
      }
      if (m.type === 'camrhia-gallery-section-at' && typeof m.id === 'string') void addSectionRef.current(String(m.id))
      if (m.type === 'camrhia-gallery-moment-move' && typeof m.id === 'string' && typeof m.pid === 'string') {
        void (async () => { const ms = await onMoveSecRef.current?.(String(m.id), String(m.pid)); if (ms) postMoments(ms) })()
      }
      if (m.type === 'camrhia-gallery-moment-text' && typeof m.id === 'string') renameRef.current(String(m.id), String(m.text ?? ''))
      if (m.type === 'camrhia-gallery-focus') {
        const x = Number(m.x), y = Number(m.y)
        if (Number.isFinite(x) && Number.isFinite(y)) {
          if (m.cover) change({ focal: { x, y } })
          else if (m.slot) change({ focals: { ...(latest.current.focals ?? {}), ['slot:' + String(m.slot)]: { x, y } } })
          else change({ focals: { ...(latest.current.focals ?? {}), [String(m.id)]: { x, y } } })
        }
      }
      if (m.type === 'camrhia-gallery-slot' && typeof m.key === 'string') setSlot(String(m.key))
      if (m.type === 'camrhia-gallery-setcover' && m.id) pickRef.current(String(m.id))
      if (m.type === 'camrhia-gallery-text' && typeof m.key === 'string') setElRef.current(String(m.key), { text: String(m.text ?? '').slice(0, 60) })
      if (m.type === 'camrhia-gallery-move' && typeof m.key === 'string') {
        const key = String(m.key)
        if (m.phase === 'start') {
          const cur = latest.current.el?.[key]
          moveBase.current = { key, dx: cur?.dx ?? 0, dy: cur?.dy ?? 0 }
        } else if (moveBase.current && moveBase.current.key === key && Number.isFinite(Number(m.dx)) && Number.isFinite(Number(m.dy))) {
          setElRef.current(key, { dx: Math.round(moveBase.current.dx + Number(m.dx)), dy: Math.round(moveBase.current.dy + Number(m.dy)) })
        }
      }
      if (m.type === 'camrhia-gallery-zoom') {
        const z = Number(m.zoom)
        if (Number.isFinite(z)) change({ zoom: z })
      }
      if (m.type === 'camrhia-gallery-pick') {
        setPick({ key: String(m.key), name: String(m.name), size: Number(m.size) || 16, color: toHex(String(m.color)), bold: !!m.bold, mid: m.mid ? String(m.mid) : null, line: m.line === '1' })
        const H = boxRef.current?.clientHeight ?? 0
        const t = Number(m.top)
        const b = Number(m.bottom)
        if (H && Number.isFinite(t) && Number.isFinite(b)) {
          const below = H - (b + 10) - 8
          const above = t - 10 - 8
          if (below >= above && below >= 160) setPopPos({ top: b + 10, maxHeight: below })
          else if (above >= 160) setPopPos({ bottom: H - t + 10, maxHeight: above })
          else setPopPos(null)
        } else setPopPos(null)
      }
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
  return (
    <div ref={rootRef} className="relative flex gap-4" style={{ height: `calc(100vh - ${topOffset ?? 0}px - 16px)` }}>
      <PortalTo host={leftHost}>
        <div className="mb-6 flex items-center justify-between">
          <button type="button" onClick={close} className="text-sm text-ink-soft hover:text-ink">✕ Close</button>
          <span className="text-xs text-ink-soft">{saving ? 'Saving…' : 'Saved'}</span>
        </div>
        <h2 className="font-fraunces text-2xl font-semibold text-ink">Style this gallery</h2>
        <p className="mb-6 truncate text-sm text-ink-soft">{title}</p>
        {err && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}


        {photoChoices && photoChoices.length > 0 && onPickCover && (
          <>
            <p className={head + ' mt-2'}>Cover photo</p>
            <p className="mt-1 text-xs text-ink-soft">Hover a photo in the gallery and press Set as cover.</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {(slotKeys.length > 0 ? slotKeys : ['main']).map((k) => {
                const pid = k === 'main' ? coverPhotoId : eff.slots[k]
                const u = photoChoices.find((c) => c.id === pid)?.url ?? (k === 'main' && pid ? coverUrl : undefined)
                const on = (slotKeys.length > 0 ? curSlot : 'main') === k
                return (
                  <button key={k} type="button" onClick={() => setSlot(k)} className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 bg-paper transition ${on ? 'border-twilight ring-2 ring-twilight/40' : 'border-line hover:border-twilight'}`}>
                    {u ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u} alt="" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <span className="text-lg text-ink-soft">+</span>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
        {coverUrl && (
          <div className="mt-4">
            <label className="flex items-center gap-3 text-xs text-ink-soft"><span className="w-10 shrink-0">Zoom</span>
              <input type="range" min={1} max={3} step={0.05} value={eff.zoom} onChange={(e) => change({ zoom: Number(e.target.value) })} className="accent-[var(--color-twilight)] min-w-0 flex-1" />
            </label>
            <p className="mt-2 text-xs text-ink-soft">Drag the cover in the preview to move it.</p>
          </div>
        )}


        <p className={head + ' mt-8'}>Cover photo</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {COVERS.map((c) => (
            <button key={c.k} type="button" onClick={() => change(coverPatch(c.k, eff.el))} onMouseEnter={(e) => setZoom({ src: '/gallery-cover/' + c.k + '.png', name: c.name, top: e.currentTarget.getBoundingClientRect().top })} onMouseLeave={() => setZoom(null)} className={'rounded-lg border bg-white p-1.5 text-center transition hover:bg-paper ' + (eff.cover === c.k ? ring : 'border-line')}>
              <div className="overflow-hidden rounded border border-black/5">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={"/gallery-cover/" + c.k + ".png"} alt="" className="block w-full" /></div>
              <span className="mt-1 block text-[11px] text-ink">{c.name}</span>
            </button>
          ))}
        </div>


        <p className={head + ' mt-8'}>Photo layout</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {LAYOUTS.map((l) => (
            <button key={l.k} type="button" onClick={() => change({ layout: l.k, ...(LAYOUT_PRESETS[l.k] ?? {}) })} onMouseEnter={(e) => { if (HAS_PNG.has(l.k)) setZoom({ src: '/gallery-layout/' + l.k + '.png', name: l.name, top: e.currentTarget.getBoundingClientRect().top }) }} onMouseLeave={() => setZoom(null)} className={'rounded-lg border bg-white p-1.5 text-center transition hover:bg-paper ' + (eff.layout === l.k ? ring : 'border-line')}>
              <div className="overflow-hidden rounded border border-black/5">{HAS_PNG.has(l.k) ? (/* eslint-disable-next-line @next/next/no-img-element */ <img src={'/gallery-layout/' + l.k + '.png'} alt="" className="block aspect-[3/2] w-full object-cover object-top" />) : <LayoutThumb k={l.k} />}</div>
              <span className="mt-1 block text-[11px] text-ink">{l.name}</span>
            </button>
          ))}
        </div>


        <p className={head + ' mt-8'}>Photo settings</p>
        <div className="mt-3 space-y-3 rounded-lg border border-line bg-white p-3">
          <label className="block text-xs text-ink-soft">Space between photos
            <input type="range" min={0} max={48} value={eff.look.gap} onChange={(e) => change({ gap: Number(e.target.value) })} className="accent-[var(--color-twilight)] mt-1 w-full" />
          </label>
          <label className="block text-xs text-ink-soft">Rounded corners
            <input type="range" min={0} max={40} value={eff.look.radius} onChange={(e) => change({ radius: Number(e.target.value) })} className="accent-[var(--color-twilight)] mt-1 w-full" />
          </label>
        </div>
        <p className="mt-4 text-xs text-ink-soft">Click any line in the preview to change its font, size and color.</p>
      </PortalTo>
      {zoom && (
        <div className="pointer-events-none fixed z-[60] rounded-xl border border-line bg-white p-2 shadow-2xl" style={{ left: (rootRef.current?.getBoundingClientRect().left ?? 330) + 8, top: Math.max(8, Math.min(zoom.top - 40, (typeof window !== 'undefined' ? window.innerHeight : 800) - 600)) }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt="" style={{ maxWidth: 560, maxHeight: '85vh' }} className="block h-auto w-auto rounded" />
          <p className="mt-1 text-center text-xs text-ink-soft">{zoom.name}</p>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col pb-1">
        <div className="mb-5 flex flex-wrap items-center justify-end gap-x-3 gap-y-3 px-1">
          <div className="mr-auto flex flex-wrap items-end gap-x-5 gap-y-2">
            {!['ticket', 'stack'].includes(eff.cover) && <div className="w-40"><ColorInput float label="Cover" value={eff.coverPal.bg} onChange={(v) => change({ coverBg: v })} /></div>}
            <div className="w-40"><ColorInput float label="Page" value={eff.pal.bg} onChange={(v) => change({ bg: v })} /></div>
            <div className="w-40"><ColorInput float label="Accent" value={eff.pal.accent} onChange={(v) => change({ accent: v })} /></div>
            <div ref={addRef} className="relative">
              <button type="button" onClick={() => setAddOpen((o) => !o)} className="h-[42px] rounded-xl border border-line bg-card px-4 text-sm font-medium text-ink transition hover:border-twilight">+ Add text</button>
              {addOpen && (
                <div className="absolute left-0 top-full z-40 mt-2 w-60 rounded-xl border border-line bg-white p-2 shadow-xl">
                  <p className="px-2 pb-1.5 pt-1 text-sm font-medium text-ink">What do you want to add?</p>
                  <button type="button" onClick={addCoverText} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-paper">
                    <span className="block text-sm text-ink">Cover text box</span>
                    <span className="block text-xs text-ink-soft">A line on the cover photo</span>
                  </button>
                  <button type="button" onClick={() => { setAddOpen(false); void addSectionRef.current() }} className="block w-full rounded-lg px-2 py-2 text-left hover:bg-paper">
                    <span className="block text-sm text-ink">Section text box</span>
                    <span className="block text-xs text-ink-soft">Splits your photos into parts</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-line bg-white text-sm">
            {(['desktop', 'phone'] as const).map((x) => (
              <button key={x} type="button" onClick={() => setDevice(x)} className={'px-4 py-2 font-medium transition ' + (device === x ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink')}>{x === 'desktop' ? 'Desktop' : 'Phone'}</button>
            ))}
          </div>
        </div>
        <div ref={boxRef} className="relative flex min-h-0 flex-1 justify-center overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <iframe ref={frameRef} src={`/g/${token}?preview=1`} title="Gallery preview" style={{ width: device === 'phone' ? 390 : '100%', height: '100%', border: 0, background: '#fff' }} />
          {secPick && (
            <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#1f1a14] px-4 py-2 text-sm text-white shadow-lg">
              <span>Click the photo where the section starts</span>
              <button type="button" onClick={() => { setSecPick(false); postSectionMode(false) }} className="text-white/70 underline">Cancel</button>
            </div>
          )}
          {pick && (
            <div className="absolute right-3 z-20 w-64 overflow-y-auto rounded-xl border border-line bg-white p-3 shadow-lg" style={popPos ?? { top: 12, maxHeight: '92%' }}>
              <div className="mb-2 flex items-center justify-between">
                <p className="font-fraunces text-base font-semibold text-ink">{pick.name}</p>
                <button type="button" onClick={() => setPick(null)} className="text-ink-soft hover:text-ink">✕</button>
              </div>
              {pick.key === 'bg' ? (
                <div className="space-y-2">
                  {!['ticket', 'stack'].includes(eff.cover) && <ColorInput label="Cover" value={eff.coverPal.bg} onChange={(v) => change({ coverBg: v })} />}
                  <ColorInput label="Page background" value={eff.pal.bg} onChange={(v) => change({ bg: v })} />
                  <ColorInput label="Accent" value={eff.pal.accent} onChange={(v) => change({ accent: v })} />
                </div>
              ) : pick.key === 'photos' ? (
                <div className="space-y-3">
                  <label className="block text-xs text-ink-soft">Space between photos
                    <input type="range" min={0} max={48} value={eff.look.gap} onChange={(e) => change({ gap: Number(e.target.value) })} className="accent-[var(--color-twilight)] mt-1 w-full" />
                  </label>
                  <label className="block text-xs text-ink-soft">Rounded corners
                    <input type="range" min={0} max={40} value={eff.look.radius} onChange={(e) => change({ radius: Number(e.target.value) })} className="accent-[var(--color-twilight)] mt-1 w-full" />
                  </label>
                  <p className="text-[11px] text-ink-soft">These apply to every photo. Pick a different layout on the left.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
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
                  <label className="flex items-center gap-3 text-xs text-ink-soft"><span className="w-14 shrink-0">Size {cur?.size ?? pick.size}</span>
                    <input type="range" min={8} max={120} value={cur?.size ?? pick.size} onChange={(e) => setEl(pick.key, { size: Number(e.target.value) })} className="accent-[var(--color-twilight)] min-w-0 flex-1" />
                  </label>
                  {pick.key === 'title' && eff.cover === 'bigtype' && (
                    <ColorInput label="Color over the photo" value={eff.el?.titlein?.color ?? '#FFFFFF'} onChange={(v) => setEl('titlein', { color: v })} />
                  )}
                  <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1"><ColorInput label="Color" value={cur?.color ?? pick.color} onChange={(v) => setEl(pick.key, { color: v })} /></div>
                    <label className="flex shrink-0 items-center gap-1.5 pb-3 text-xs text-ink-soft">
                      <input type="checkbox" checked={cur?.bold ?? pick.bold} onChange={(e) => setEl(pick.key, { bold: e.target.checked })} />
                      Bold
                    </label>
                  </div>
                  {pick.key === 'moment' && pick.mid ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => rowMove(-1)} className="flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink hover:border-twilight">Up a row</button>
                        <button type="button" onClick={() => rowMove(1)} className="flex-1 rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink hover:border-twilight">Down a row</button>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                        <input type="checkbox" checked={!!pick.line} onChange={(e) => void sectionLine(e.target.checked)} />
                        Divider line
                      </label>
                    </div>
                  ) : ['title', 'title2', 'brand', 'count', 'initials'].includes(pick.key) || /^x\d+$/.test(pick.key) || pick.key === 'moment' ? null : (
                    <label className="flex items-center gap-3 text-xs text-ink-soft"><span className="w-14 shrink-0">Move {cur?.dy ?? 0}</span>
                      <input type="range" min={-200} max={200} value={cur?.dy ?? 0} onChange={(e) => setEl(pick.key, { dy: Number(e.target.value) })} className="accent-[var(--color-twilight)] min-w-0 flex-1" />
                    </label>
                  )}
                  {pick.key === 'moment' && pick.mid ? (
                    <button type="button" onClick={() => void removeSection()} className="text-[11px] text-twilight underline">Remove this line</button>
                  ) : pick.key === 'count' ? (
                    <button type="button" onClick={() => { setEl('count', { hide: true }); setPick(null) }} className="text-[11px] text-twilight underline">Remove this line</button>
                  ) : /^x\d+$/.test(pick.key) ? (
                    <button type="button" onClick={() => { resetEl(pick.key); setPick(null) }} className="text-[11px] text-twilight underline">Remove this line</button>
                  ) : (
                    <button type="button" onClick={() => resetEl(pick.key)} className="text-[11px] text-twilight underline">Reset this line</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PortalTo({ host, children }: { host?: HTMLElement | null; children: ReactNode }) {
  if (!host) return null
  return createPortal(<div className="flex min-h-full flex-col">{children}</div>, host)
}
