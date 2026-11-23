'use client'

import { createPortal } from 'react-dom'
import { Fragment, useLayoutEffect, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import ReviewCard from './ReviewCard'
import { resolveDesign, type GalleryDesign, elCss } from '@/lib/galleryDesign'
import { FONT_OPTIONS } from '@/lib/siteTheme'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

type Photo = { id: string; filename: string | null; width: number | null; height: number | null; thumb: string | null; web: string | null; tags?: string[] }
type Data = { title: string; allowDownloads: boolean; coverId: string | null; access: string; favorites: string[]; photos: Photo[]; design?: GalleryDesign | null }
type Phase = 'loading' | 'pin' | 'ready' | 'missing' | 'expired'
type ZipFile = { id: string; name: string; size: number | null; url: string }
type Brand = { name: string | null; accent: string | null }

function visitorId(): string {
  try {
    let v = localStorage.getItem('camrhia_visitor')
    if (!v) { v = crypto.randomUUID(); localStorage.setItem('camrhia_visitor', v) }
    return v
  } catch {
    return crypto.randomUUID()
  }
}

function Heart({ filled, className = 'h-5 w-5' }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

function scaleOf(el: HTMLElement): number {
  const st = el.closest('[data-stage]') as HTMLElement | null
  if (st) return st.getBoundingClientRect().width / 900 || 1
  return el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1
}

function CoverStage({ children, z }: { children: ReactNode; z: number }) {
  const mark = useRef<HTMLSpanElement>(null)
  const st = useRef<HTMLDivElement>(null)
  const [host, setHost] = useState<HTMLElement | null>(null)
  useLayoutEffect(() => { setHost((mark.current?.closest('[data-cover-wrap]') as HTMLElement | null) ?? null) }, [])
  useLayoutEffect(() => {
    const el = st.current
    const h = el?.parentElement
    if (!el || !h) return
    const fit = () => { const w = h.offsetWidth; if (w > 0) el.style.transform = 'scale(' + w / 900 + ')' }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(h)
    return () => ro.disconnect()
  }, [host])
  return (
    <>
      <span ref={mark} style={{ display: 'none' }} />
      {host ? createPortal(
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none', zIndex: z }}>
          <div ref={st} data-stage="1" style={{ position: 'absolute', left: 0, top: 0, width: 900, height: 450, transformOrigin: '0 0', pointerEvents: 'none' }}>{children}</div>
        </div>,
        host,
      ) : null}
    </>
  )
}

export default function GalleryViewPage() {
  const { token } = useParams<{ token: string }>()
  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<Data | null>(null)
  const [title, setTitle] = useState('')
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [favs, setFavs] = useState<Set<string>>(new Set())
  const [onlyFavs, setOnlyFavs] = useState(false)
  const [query, setQuery] = useState('')
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [designPreview, setDesignPreview] = useState<GalleryDesign | null>(null)
  const [momentText, setMomentText] = useState<Record<string, string>>({})
  const [liveMoments, setLiveMoments] = useState<{ id: string; name: string; startId: string; line?: boolean }[] | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const textRef = useRef<Record<string, string>>({})
  const [coverOverride, setCoverOverride] = useState<string | null>(null)
  const [dlPrompt, setDlPrompt] = useState(false)
  const [zip, setZip] = useState<{ busy: boolean; done: number; total: number; error: string | null }>({ busy: false, done: 0, total: 0, error: null })

  const load = useCallback(async (pinValue?: string) => {
    let stored: string | null = null
    try { stored = sessionStorage.getItem(`g_access_${token}`) } catch {}
    setBusy(true)
    try {
      let bearer = ''
      try { const { data: ss } = (await supabase?.auth.getSession()) ?? { data: null }; bearer = ss?.session?.access_token ?? '' } catch {}
      const res = await fetch('/api/gallery/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
        body: JSON.stringify({ token, pin: pinValue, access: pinValue ? undefined : stored, visitorId: visitorId(), preview: new URLSearchParams(window.location.search).get('preview') === '1', coverOnly: new URLSearchParams(window.location.search).get('cover') === '1' }),
      })
      const j = await res.json().catch(() => ({}))
      if (j.brand) setBrand(j.brand as Brand)
      if (res.ok) {
        setData(j as Data)
        setFavs(new Set((j as Data).favorites))
        try { sessionStorage.setItem(`g_access_${token}`, j.access) } catch {}
        setPhase('ready')
        return
      }
      if (res.status === 401 || res.status === 403) {
        setTitle(j.title ?? '')
        setPhase('pin')
        if (pinValue) setPinError(!j.error || j.error === 'Wrong PIN' ? 'That PIN is not right. Please try again.' : j.error)
        return
      }
      setPhase(res.status === 410 ? 'expired' : 'missing')
    } catch {
      setPhase('missing')
    } finally {
      setBusy(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('cover') !== '1') return
    const st = document.createElement('style')
    st.textContent = 'html,body{overflow:hidden!important;background:transparent!important}.gal-root{min-height:0!important;background:transparent!important}.gal-root>*:not([data-cover-wrap]):not(link):not(style){display:none!important}'
    document.head.appendChild(st)
    return () => st.remove()
  }, [])

  useEffect(() => {
    if (phase !== 'ready' || typeof window === 'undefined') return
    const q = new URLSearchParams(window.location.search)
    if (q.get('download') === '1') setDlPrompt(true)
    if (q.get('favs') === '1') setOnlyFavs(true)
  }, [phase])

  // Tint the page with the photographer's accent color.
  useEffect(() => {
    const a = brand?.accent
    if (!a) return
    const root = document.documentElement
    root.style.setProperty('--color-twilight', a)
    return () => { root.style.removeProperty('--color-twilight') }
  }, [brand])

  useLayoutEffect(() => { document.querySelectorAll<HTMLElement>('[data-photo]').forEach((e) => e.style.removeProperty('translate')) }, [designPreview])
  const list = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    const names = new Map((liveMoments ?? ((data as unknown as { moments?: { id: string; name: string }[] }).moments ?? [])).map((m) => [m.id, m.name.toLowerCase()]))
    let all = data.photos
    if (liveMoments) {
      const st = new Map(liveMoments.map((m) => [m.startId, m.id]))
      let cur: string | null = null
      all = data.photos.map((p) => { const sid = st.get(p.id); if (sid) cur = sid; return { ...p, moment: cur } as typeof p })
    }
    const base = onlyFavs ? all.filter((p) => favs.has(p.id)) : all
    return q ? base.filter((p) => (p.tags ?? []).some((t) => t.includes(q)) || (names.get((p as unknown as { moment?: string | null }).moment ?? '') ?? '').includes(q)) : base
  }, [data, favs, onlyFavs, query, liveMoments])

  async function toggleFav(id: string) {
    if (!data) return
    const on = !favs.has(id)
    setFavs((prev) => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n })
    const res = await fetch('/api/gallery/favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access: data.access, photoId: id, visitorId: visitorId(), on }),
    }).catch(() => null)
    if (!res || !res.ok) {
      setFavs((prev) => { const n = new Set(prev); if (on) n.delete(id); else n.add(id); return n })
    }
  }

  // Builds the zip in the browser so big galleries never hit a server time limit.
  async function downloadAll() {
    if (!data || zip.busy) return
    const w = window as unknown as {
      showSaveFilePicker?: (o: unknown) => Promise<{ createWritable: () => Promise<WritableStream> }>
    }
    let done = 0
    async function* items(list: ZipFile[]) {
      for (const f of list) {
        const r = await fetch(f.url)
        if (!r.ok) throw new Error(`Could not fetch ${f.name}`)
        yield { name: f.name, input: r, lastModified: new Date() }
        done++
        setZip((z) => ({ ...z, done }))
      }
    }
    setZip({ busy: true, done: 0, total: 0, error: null })
    try {
      // The save dialog has to open while the click is still fresh.
      let handle: { createWritable: () => Promise<WritableStream> } | null = null
      if (w.showSaveFilePicker) {
        try {
          handle = await w.showSaveFilePicker({
            suggestedName: `${(data.title || 'Gallery').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Gallery'}.zip`,
            types: [{ description: 'Zip file', accept: { 'application/zip': ['.zip'] } }],
          })
        } catch {
          setZip({ busy: false, done: 0, total: 0, error: null })
          return
        }
      }

      const res = await fetch(`/api/gallery/download-all?access=${encodeURIComponent(data.access)}`)
      if (!res.ok) {
        throw new Error(res.status === 403 ? 'Downloads are turned off for this gallery.' : 'Could not prepare your download. Please try again.')
      }
      const j = (await res.json()) as { title: string; files: ZipFile[] }
      const files = onlyFavs ? j.files.filter((f) => favs.has(f.id)) : j.files
      if (files.length === 0) throw new Error('No photos to download.')
      const safe = (j.title || 'Gallery').replace(/[\\/:*?"<>|]+/g, '').trim() || 'Gallery'
      setZip({ busy: true, done: 0, total: files.length, error: null })

      const { downloadZip } = await import('client-zip')

      if (handle) {
        const out = await handle.createWritable()
        await downloadZip(items(files)).body!.pipeTo(out)
      } else {
        // Browsers without the save dialog build each zip in memory, so split into ~500 MB parts.
        const parts: ZipFile[][] = []
        let cur: ZipFile[] = []
        let size = 0
        for (const f of files) {
          const sz = f.size ?? 10_000_000
          if (cur.length && size + sz > 500_000_000) { parts.push(cur); cur = []; size = 0 }
          cur.push(f)
          size += sz
        }
        if (cur.length) parts.push(cur)
        for (let i = 0; i < parts.length; i++) {
          const blob = await downloadZip(items(parts[i])).blob()
          const href = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = href
          a.download = parts.length > 1 ? `${safe} (part ${i + 1} of ${parts.length}).zip` : `${safe}.zip`
          document.body.appendChild(a)
          a.click()
          a.remove()
          setTimeout(() => URL.revokeObjectURL(href), 60000)
          await new Promise((r) => setTimeout(r, 800))
        }
      }
      if (!onlyFavs) {
        let bearer2 = ''
        try { const { data: ss } = (await supabase?.auth.getSession()) ?? { data: null }; bearer2 = ss?.session?.access_token ?? '' } catch {}
        fetch('/api/gallery/downloaded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(bearer2 ? { Authorization: `Bearer ${bearer2}` } : {}) },
          body: JSON.stringify({ access: data.access }),
        }).catch(() => {})
      }
      setZip({ busy: false, done: 0, total: 0, error: null })
    } catch (e) {
      setZip({ busy: false, done: 0, total: 0, error: e instanceof Error ? e.message : 'Download failed. Please try again.' })
    }
  }

  // Keyboard controls for the lightbox.
  useEffect(() => {
    if (openIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenIndex(null)
      if (e.key === 'ArrowRight') setOpenIndex((i) => (i === null ? i : Math.min(list.length - 1, i + 1)))
      if (e.key === 'ArrowLeft') setOpenIndex((i) => (i === null ? i : Math.max(0, i - 1)))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, list.length])

  // Inside the designer's preview, show design changes live.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const onMsg = (e: MessageEvent) => { const m = e.data; if (m && m.type === 'camrhia-gallery-design') setDesignPreview((m.design ?? {}) as GalleryDesign); if (m && m.type === 'camrhia-gallery-cover' && m.id) setCoverOverride(String(m.id)) }
    window.addEventListener('message', onMsg)
    setIsPreview(true)
    window.parent?.postMessage({ type: 'camrhia-gallery-ready' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // Preview only: focus mode lets the photographer click a photo to choose the part that stays in frame.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const onMsg = (e: MessageEvent) => { const m = e.data; if (m && m.type === 'camrhia-gallery-focus-mode') setFocusMode(!!m.on) }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])
  useEffect(() => {
    if (!focusMode) return
    const st = document.createElement('style')
    st.textContent = '.gal-root img[data-pid]{cursor:crosshair!important}'
    document.head.appendChild(st)
    const click = (e: MouseEvent) => {
      const img = (e.target as HTMLElement | null)?.closest?.('img[data-pid]') as HTMLImageElement | null
      if (!img) return
      e.preventDefault()
      e.stopPropagation()
      const r = img.getBoundingClientRect()
      const cx = e.clientX - r.left
      const cy = e.clientY - r.top
      let x = (cx / r.width) * 100
      let y = (cy / r.height) * 100
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      if (nw && nh && r.width && r.height) {
        const scale = Math.max(r.width / nw, r.height / nh)
        const dw = nw * scale
        const dh = nh * scale
        const op = getComputedStyle(img).objectPosition.split(' ')
        const px = Number.isFinite(parseFloat(op[0])) ? parseFloat(op[0]) / 100 : 0.5
        const py = Number.isFinite(parseFloat(op[1])) ? parseFloat(op[1]) / 100 : 0.5
        x = ((cx - (r.width - dw) * px) / dw) * 100
        y = ((cy - (r.height - dh) * py) / dh) * 100
      }
      x = Math.round(Math.min(100, Math.max(0, x)))
      y = Math.round(Math.min(100, Math.max(0, y)))
      window.parent?.postMessage({ type: 'camrhia-gallery-focus', id: img.dataset.pid, slot: img.dataset.slot, cover: img.dataset.cover === '1', x, y }, '*')
    }
    window.addEventListener('click', click, true)
    return () => { window.removeEventListener('click', click, true); st.remove() }
  }, [focusMode])

  // Preview only: drag the cover to move it, pinch (or hold Ctrl and scroll) to zoom it.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const st = document.createElement('style')
    st.textContent = '.gal-root img[data-cover],.gal-root img[data-slot],.gal-root img[data-pid]{cursor:grab}'
    document.head.appendChild(st)
    const coverImg = () => document.querySelector('img[data-cover]') as HTMLImageElement | null
    let lx = 0
    let ly = 0
    const zoomImgAt = (x: number, y: number) => {
      const topPh = document.elementsFromPoint(x, y).find((n) => n instanceof HTMLImageElement && !!n.closest('[data-photo]')) as HTMLImageElement | undefined
      if (topPh) return topPh
      const all = Array.from(document.querySelectorAll('img[data-cover], img[data-slot]')) as HTMLImageElement[]
      for (let i = all.length - 1; i >= 0; i--) {
        const r = (all[i].parentElement ?? all[i]).getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return all[i]
      }
      return null
    }
    let gImg: HTMLImageElement | null = null
    const imgAt = (x: number, y: number) => {
      const topPh = document.elementsFromPoint(x, y).find((n) => n instanceof HTMLImageElement && !!n.closest('[data-photo]')) as HTMLImageElement | undefined
      if (topPh) return topPh
      const all = Array.from(document.querySelectorAll('img[data-cover], img[data-slot], img[data-pid]')) as HTMLImageElement[]
      for (let i = all.length - 1; i >= 0; i--) {
        const r = (all[i].parentElement ?? all[i]).getBoundingClientRect()
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return all[i]
      }
      return null
    }
    const inside = (img: HTMLImageElement, x: number, y: number) => {
      const r = (img.parentElement ?? img).getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }
    const curZoom = (img: HTMLImageElement) => {
      const m = /scale\(([\d.]+)\)/.exec(img.style.transform || '')
      return m ? parseFloat(m[1]) : 1
    }
    const curPos = (img: HTMLImageElement): [number, number] => {
      const op = getComputedStyle(img).objectPosition.split(' ')
      const px = parseFloat(op[0])
      const py = parseFloat(op[1])
      return [Number.isFinite(px) ? px : 50, Number.isFinite(py) ? py : 50]
    }
    let drag: { x: number; y: number; px: number; py: number; moved: boolean; img: HTMLImageElement } | null = null
    let suppress = false
    let zl: number | null = null
    let zt = 0
    let gBase = 1
    const sendZoom = (z: number, img?: HTMLImageElement | null) => {
      const v = Math.round(Math.min(3, Math.max(1, z)) * 100) / 100
      zl = v
      zt = Date.now()
      window.parent?.postMessage({ type: 'camrhia-gallery-zoom', zoom: v, slot: img?.dataset.slot ?? undefined }, '*')
    }
    const baseZoom = (img: HTMLImageElement) => (zl !== null && Date.now() - zt < 400 ? zl : curZoom(img))
    const MOVABLE = ['title', 'title2', 'brand', 'count', 'initials']
    let tdrag: { key: string; x: number; y: number; k: number; moved: boolean } | null = null
    const down = (e: MouseEvent) => {
      if (e.button !== 0) return
      const tg = (e.target as Element | null)?.closest?.('[data-gk]') as Element | null
      const gk = tg?.getAttribute('data-gk') ?? ''
      if ((e.target as Element | null)?.closest?.('[data-pb]')) return
      if (tg && (MOVABLE.includes(gk) || /^(x|ph)\d+$/.test(gk)) && !(/^ph\d+$/.test(gk) && (e.altKey || tg.hasAttribute('data-pan')))) {
        const svg = tg.closest('svg') as SVGSVGElement | null
        const he = tg as HTMLElement
        const k = svg ? svg.getBoundingClientRect().width / (svg.viewBox.baseVal?.width || 900) || 1 : scaleOf(he)
        tdrag = { key: gk, x: e.clientX, y: e.clientY, k, moved: false }
        e.preventDefault()
        return
      }
      const img = imgAt(e.clientX, e.clientY)
      if (!img) return
      const [px, py] = curPos(img)
      drag = { x: e.clientX, y: e.clientY, px, py, moved: false, img }
      if (img.dataset.slot || img.hasAttribute('data-cover')) window.parent?.postMessage({ type: 'camrhia-gallery-slot', key: img.dataset.slot ?? 'main' }, '*')
      e.preventDefault()
    }
    const move = (e: MouseEvent) => {
      lx = e.clientX
      ly = e.clientY
      if (tdrag) {
        const tx = e.clientX - tdrag.x
        const ty = e.clientY - tdrag.y
        if (!tdrag.moved && Math.hypot(tx, ty) < 4) return
        if (!tdrag.moved) window.parent?.postMessage({ type: 'camrhia-gallery-move', key: tdrag.key, phase: 'start' }, '*')
        tdrag.moved = true
        window.parent?.postMessage({ type: 'camrhia-gallery-move', key: tdrag.key, phase: 'move', dx: tx / tdrag.k, dy: ty / tdrag.k }, '*')
        return
      }
      if (!drag) return
      const img = drag.img
      const dx = e.clientX - drag.x
      const dy = e.clientY - drag.y
      if (!drag.moved && Math.hypot(dx, dy) < 4) return
      drag.moved = true
      const W = img.clientWidth
      const H = img.clientHeight
      const nw = img.naturalWidth
      const nh = img.naturalHeight
      if (!W || !H || !nw || !nh) return
      const z = curZoom(img)
      const sc = Math.max(W / nw, H / nh)
      const kx = W - z * nw * sc
      const ky = H - z * nh * sc
      let x = drag.px
      let y = drag.py
      if (Math.abs(kx) > 1) x = drag.px + (dx / kx) * 100
      if (Math.abs(ky) > 1) y = drag.py + (dy / ky) * 100
      x = Math.round(Math.min(100, Math.max(0, x)) * 10) / 10
      y = Math.round(Math.min(100, Math.max(0, y)) * 10) / 10
      window.parent?.postMessage({ type: 'camrhia-gallery-focus', id: img.dataset.pid, slot: img.dataset.slot, cover: img.hasAttribute('data-cover'), x, y }, '*')
    }
    const up = () => {
      if (drag?.moved || tdrag?.moved) { suppress = true; setTimeout(() => { suppress = false }, 0) }
      drag = null
      tdrag = null
    }
    const click = (e: MouseEvent) => {
      if (!suppress) return
      e.preventDefault()
      e.stopImmediatePropagation()
    }
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      const img = zoomImgAt(e.clientX, e.clientY)
      if (!img) return
      e.preventDefault()
      sendZoom(baseZoom(img) * Math.exp(-e.deltaY * 0.01), img)
    }
    const gStart = (e: Event) => {
      const ge = e as Event & { clientX?: number; clientY?: number }
      const img = zoomImgAt(typeof ge.clientX === 'number' ? ge.clientX : lx, typeof ge.clientY === 'number' ? ge.clientY : ly)
      if (!img) return
      e.preventDefault()
      gImg = img
      gBase = curZoom(img)
    }
    const gChange = (e: Event) => {
      const ge = e as Event & { scale?: number; clientX?: number; clientY?: number }
      const img = gImg
      if (!img || !ge.scale) return
      e.preventDefault()
      sendZoom(gBase * ge.scale, img)
    }
    window.addEventListener('click', click, true)
    window.addEventListener('mousedown', down, true)
    window.addEventListener('mousemove', move, true)
    window.addEventListener('mouseup', up, true)
    window.addEventListener('wheel', wheel, { passive: false, capture: true })
    window.addEventListener('gesturestart', gStart as EventListener, true)
    window.addEventListener('gesturechange', gChange as EventListener, true)
    return () => {
      window.removeEventListener('click', click, true)
      window.removeEventListener('mousedown', down, true)
      window.removeEventListener('mousemove', move, true)
      window.removeEventListener('mouseup', up, true)
      window.removeEventListener('wheel', wheel, true)
      window.removeEventListener('gesturestart', gStart as EventListener, true)
      window.removeEventListener('gesturechange', gChange as EventListener, true)
      st.remove()
    }
  }, [])

  // Preview only: drag a section heading onto the photo where it should start.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const st = document.createElement('style')
    st.textContent = '.gal-root [data-gk="moment"]{cursor:grab}.gal-root [data-gk]{-webkit-user-select:none;user-select:none}'
    document.head.appendChild(st)
    let d: { mid: string; x: number; y: number; moved: boolean } | null = null
    let swallow = false
    const down = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.('[data-gk="moment"]') as HTMLElement | null
      const mid = t?.getAttribute('data-mid')
      if (!t || !mid || e.button !== 0 || (e.target as HTMLElement).tagName === 'INPUT') return
      d = { mid, x: e.clientX, y: e.clientY, moved: false }
    }
    const move = (e: MouseEvent) => {
      if (!d) return
      if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) { d.moved = true; document.body.style.cursor = 'grabbing' }
    }
    const up = (e: MouseEvent) => {
      if (!d) return
      const was = d
      d = null
      document.body.style.cursor = ''
      if (!was.moved) return
      swallow = true
      setTimeout(() => { swallow = false }, 50)
      let im = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n instanceof HTMLImageElement && n.hasAttribute('data-pid') && !n.hasAttribute('data-cover') && !n.hasAttribute('data-slot')) as HTMLImageElement | undefined
      if (!im) return
      const rc = im.getBoundingClientRect()
      if (e.clientY > rc.top + rc.height / 2) {
        const all = Array.from(document.querySelectorAll<HTMLImageElement>('.gal-root img[data-pid]:not([data-cover]):not([data-slot])'))
        const nx = all[all.indexOf(im) + 1]
        if (!nx) return
        im = nx
      }
      window.parent?.postMessage({ type: 'camrhia-gallery-moment-move', id: was.mid, pid: im.getAttribute('data-pid') }, '*')
    }
    const click = (e: MouseEvent) => { if (swallow) { e.preventDefault(); e.stopPropagation() } }
    window.addEventListener('mousedown', down, true)
    window.addEventListener('mousemove', move, true)
    window.addEventListener('mouseup', up, true)
    window.addEventListener('click', click, true)
    return () => {
      st.remove()
      window.removeEventListener('mousedown', down, true)
      window.removeEventListener('mousemove', move, true)
      window.removeEventListener('mouseup', up, true)
      window.removeEventListener('click', click, true)
    }
  }, [])

  // Preview only: move photos (to top, earlier, later) from a small bar on hover.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const SEL = '.gal-root img[data-pid]:not([data-cover]):not([data-slot])'
    const bar = document.createElement('div')
    bar.style.cssText = 'position:fixed;z-index:2147483645;display:none;align-items:center;padding:3px;border-radius:999px;background:rgba(42,31,36,0.8);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(217,190,143,0.55);box-shadow:0 14px 30px -10px rgba(20,12,8,0.7);font:500 11px/1 system-ui,sans-serif;letter-spacing:0.16em;text-transform:uppercase'
    let cur: string | null = null
    const ICON: Record<string, string> = {
      top: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#D9BE8F" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
      left: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D9BE8F" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
      right: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D9BE8F" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    }
    const mk = (label: string, to: string) => {
      if (bar.children.length > 0) {
        const dv = document.createElement('span')
        dv.style.cssText = 'width:1px;height:16px;background:rgba(217,190,143,0.4)'
        bar.appendChild(dv)
      }
      const b = document.createElement('button')
      b.type = 'button'
      b.innerHTML = ICON[to] + (label ? '<span>' + label + '</span>' : '')
      b.style.cssText = 'border:0;background:transparent;color:#F3E6CC;cursor:pointer;height:34px;min-width:36px;padding:0 14px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font:inherit;letter-spacing:inherit;text-transform:inherit;transition:background .18s,color .18s'
      b.addEventListener('mouseenter', () => { b.style.background = 'rgba(217,190,143,0.24)'; b.style.color = '#fff' })
      b.addEventListener('mouseleave', () => { b.style.background = 'transparent'; b.style.color = '#F3E6CC' })
      b.addEventListener('click', (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
        if (!cur) return
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(SEL))
        const idx = imgs.findIndex((x) => x.getAttribute('data-pid') === cur)
        const nbEl = to === 'left' ? imgs[idx - 1] : to === 'right' ? imgs[idx + 1] : null
        window.parent?.postMessage({ type: 'camrhia-gallery-photo-move', id: cur, to, nb: nbEl?.getAttribute('data-pid') ?? undefined }, '*')
      })
      bar.appendChild(b)
    }
    mk('Top', 'top')
    mk('', 'left')
    mk('', 'right')
    document.body.appendChild(bar)
    let hideT: number | undefined
    let raf2 = 0
    const place = () => {
      raf2 = requestAnimationFrame(place)
      if (bar.style.display !== 'flex' || !cur) return
      const el = document.querySelector<HTMLImageElement>(SEL + '[data-pid="' + cur + '"]')
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.bottom < 0 || r.top > window.innerHeight) { bar.style.display = 'none'; return }
      bar.style.left = Math.max(4, r.left + 10) + 'px'
      bar.style.top = Math.max(4, r.top + 10) + 'px'
    }
    raf2 = requestAnimationFrame(place)
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t && bar.contains(t)) { window.clearTimeout(hideT); return }
      const im = t?.closest?.(SEL) as HTMLImageElement | null
      if (!im) { window.clearTimeout(hideT); hideT = window.setTimeout(() => { bar.style.display = 'none' }, 250); return }
      window.clearTimeout(hideT)
      cur = im.getAttribute('data-pid')
      const r = im.getBoundingClientRect()
      bar.style.display = 'flex'
      bar.style.left = Math.max(4, r.left + 10) + 'px'
      bar.style.top = Math.max(4, r.top + 10) + 'px'
    }
    const onMsg = (e: MessageEvent) => {
      const m = e.data
      if (!m || m.type !== 'camrhia-gallery-photo-order' || !Array.isArray(m.ids)) return
      const ids = (m.ids as unknown[]).map(String)
      setData((d) => {
        if (!d) return d
        const by = new Map(d.photos.map((p) => [p.id, p]))
        const ordered = ids.map((id) => by.get(id)).filter((p): p is Photo => !!p)
        const seen = new Set(ordered.map((p) => p.id))
        return { ...d, photos: [...ordered, ...d.photos.filter((p) => !seen.has(p.id))] }
      })
    }
    document.addEventListener('mouseover', over, true)
    window.addEventListener('message', onMsg)
    return () => { document.removeEventListener('mouseover', over, true); window.removeEventListener('message', onMsg); cancelAnimationFrame(raf2); bar.remove() }
  }, [])

  // Preview only: hover names and click-to-edit for the gallery lines.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const NAMES: Record<string, string> = { title: 'Gallery title', brand: 'Studio name', count: 'Photo count', download: 'Download button', all: 'All button', favs: 'Favorites button', moment: 'Section heading', footer: 'Footer line', photos: 'Photos', initials: 'Cover initials', title2: 'Gallery title line 2', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['x' + (i + 1), 'Text'])), ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['ph' + (i + 1), 'Photo'])) }
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:1.5px dashed #d9a21b;border-radius:3px;display:none'
    const tag = document.createElement('div')
    tag.style.cssText = 'position:absolute;left:-1.5px;bottom:100%;margin-bottom:3px;background:linear-gradient(135deg,#FFFDF9,#F3E7D3);border:1px solid #B08D57;color:#6B4A2B;box-shadow:inset 0 0 0 2px #FFFDF9,inset 0 0 0 3px #E4D3B6,0 3px 10px rgba(90,60,30,.22);font:600 11px/1 Georgia,serif;letter-spacing:.04em;padding:5px 9px;border-radius:6px;white-space:nowrap'
    box.appendChild(tag)
    document.body.appendChild(box)
    const hnd: HTMLDivElement[] = []
    const mkH = (kind: string, css: string) => {
      const d = document.createElement('div')
      d.dataset.h = kind
      d.style.cssText = 'position:absolute;pointer-events:auto;display:none;background:#fff;border:1.5px solid #b08d57;box-shadow:0 2px 6px rgba(0,0,0,.25);' + css
      box.appendChild(d)
      hnd.push(d)
      d.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
      d.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const el = curEl
        if (!el) return
        try { d.setPointerCapture(e.pointerId) } catch {}
        const r0 = el.getBoundingClientRect()
        const sc = scaleOf(el)
        const cx = r0.left + r0.width / 2
        const cy = r0.top + r0.height / 2
        const diag = Math.hypot(r0.width, r0.height) / 2 || 1
        const w0 = r0.width / sc
        const s0 = parseFloat(getComputedStyle(el).fontSize) || 38
        const isPh = el.hasAttribute('data-photo')
        const tr0 = (getComputedStyle(el).translate || '').split(' ').map((v) => parseFloat(v))
        const tx0 = tr0[0] || 0
        const ty0 = tr0[1] || 0
        const h0 = r0.height / sc
        let last: { w: number; h?: number; size?: number; sx?: number; sy?: number } | null = null
        let raf = 0
        const apply = () => {
          raf = 0
          if (!last) return
          if (!el.hasAttribute('data-nowidth')) el.style.width = last.w + 'px'
          if (last.size !== undefined) el.style.setProperty('font-size', last.size + 'px', 'important')
          if (last.h !== undefined) el.style.height = last.h + 'px'
          if (last.sx !== undefined) el.style.setProperty('translate', (tx0 + last.sx) + 'px ' + (ty0 + (last.sy ?? 0)) + 'px', 'important')
        }
        const mv = (ev: PointerEvent) => {
          if (isPh) {
            const L = kind.includes('w'), R = kind.includes('e'), T = kind.includes('n'), B = kind.includes('s')
            const minS = 30 * sc
            let wS = r0.width
            let hS = r0.height
            if (R) wS = Math.max(minS, ev.clientX - r0.left)
            if (L) wS = Math.max(minS, r0.right - ev.clientX)
            if (B) hS = Math.max(minS, ev.clientY - r0.top)
            if (T) hS = Math.max(minS, r0.bottom - ev.clientY)
            const nw = Math.min(900, wS / sc)
            const nh = Math.min(900, hS / sc)
            const sx = R ? (nw - w0) / 2 : L ? -(nw - w0) / 2 : 0
            const sy = B ? (nh - h0) / 2 : T ? -(nh - h0) / 2 : 0
            const r1 = (v: number) => Math.round(v * 10) / 10
            last = { w: r1(nw), h: r1(nh), sx: r1(sx), sy: r1(sy) }
            if (!raf) raf = requestAnimationFrame(apply)
            return
          }
          const ratio = Math.hypot(ev.clientX - cx, ev.clientY - cy) / diag
          const nw = kind.length === 2 ? Math.min(900, Math.max(14, w0 * ratio)) : Math.min(900, Math.max(14, (2 * Math.abs(ev.clientX - cx)) / sc))
          const w = Math.round(nw * 10) / 10
          last = kind.length === 2 ? { w, size: Math.round(Math.min(160, Math.max(8, s0 * ratio)) * 10) / 10 } : { w }
          if (!raf) raf = requestAnimationFrame(apply)
        }
        const up = () => {
          d.removeEventListener('pointermove', mv)
          d.removeEventListener('pointerup', up)
          d.removeEventListener('pointercancel', up)
          if (raf) cancelAnimationFrame(raf)
          apply()
          if (last) window.parent?.postMessage({ type: 'camrhia-gallery-box', key: el.getAttribute('data-gk') || 'title', w: el.hasAttribute('data-nowidth') ? undefined : last.w, size: last.size, h: last.h, sx: last.sx, sy: last.sy }, '*')
        }
        d.addEventListener('pointermove', mv)
        d.addEventListener('pointerup', up)
        d.addEventListener('pointercancel', up)
      })
    }
    const xb = document.createElement('div')
    xb.textContent = String.fromCharCode(215)
    xb.title = 'Delete this text'
    xb.style.cssText = 'position:absolute;right:-9px;top:-34px;width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#FFFDF9,#F3E7D3);border:1px solid #B08D57;color:#6B4A2B;box-shadow:inset 0 0 0 2px #FFFDF9,inset 0 0 0 3px #E4D3B6,0 3px 10px rgba(90,60,30,.22);font:600 16px/22px Georgia,serif;text-align:center;cursor:pointer;pointer-events:auto;display:none'
    box.appendChild(xb)
    const pb = document.createElement('div')
    pb.setAttribute('data-pb', '1')
    pb.style.cssText = 'position:absolute;left:50%;bottom:-36px;transform:translateX(-50%);padding:0 14px;height:28px;border-radius:14px;background:linear-gradient(135deg,#FFFDF9,#F3E7D3);border:1px solid #B08D57;color:#6B4A2B;box-shadow:inset 0 0 0 2px #FFFDF9,inset 0 0 0 3px #E4D3B6,0 3px 10px rgba(90,60,30,.22);font:600 12px/26px Georgia,serif;letter-spacing:.03em;white-space:nowrap;cursor:pointer;pointer-events:auto;display:none'
    pb.textContent = 'Move photo inside'
    box.appendChild(pb)
    pb.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
    pb.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!curEl) return
      if (curEl.hasAttribute('data-pan')) curEl.removeAttribute('data-pan')
      else curEl.setAttribute('data-pan', '1')
    })
    xb.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation() })
    xb.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const k = curEl?.getAttribute('data-gk') || ''
      if (!/^(x|ph)\d+$/.test(k)) return
      closeEditor()
      box.style.display = 'none'
      curEl = null
      selEl = null
      window.parent?.postMessage({ type: 'camrhia-gallery-delete', key: k }, '*')
    })
    const corner = 'width:13px;height:13px;border-radius:50%;'
    mkH('nw', corner + 'left:-7px;top:-7px;cursor:nwse-resize')
    mkH('ne', corner + 'right:-7px;top:-7px;cursor:nesw-resize')
    mkH('sw', corner + 'left:-7px;bottom:-7px;cursor:nesw-resize')
    mkH('se', corner + 'right:-7px;bottom:-7px;cursor:nwse-resize')
    mkH('w', 'left:-5px;top:calc(50% - 15px);width:9px;height:30px;border-radius:5px;cursor:ew-resize')
    mkH('e', 'right:-5px;top:calc(50% - 15px);width:9px;height:30px;border-radius:5px;cursor:ew-resize')
    mkH('n', 'top:-5px;left:calc(50% - 15px);width:30px;height:9px;border-radius:5px;cursor:ns-resize')
    mkH('s', 'bottom:-5px;left:calc(50% - 15px);width:30px;height:9px;border-radius:5px;cursor:ns-resize')
    const hit = (t: EventTarget | null) => {
      const el = (t as HTMLElement | null)?.closest?.('[data-gk],h1') as HTMLElement | null
      if (!el) return null
      const k = el.getAttribute('data-gk') ?? 'title'
      return NAMES[k] ? { el, k } : null
    }
    let curEl: HTMLElement | null = null
    let selEl: HTMLElement | null = null
    let selK = ''
    const rectOf = (el: HTMLElement) => {
      const k = el.getAttribute('data-gk')
      let parts: HTMLElement[] = [el]
      const grp = k === 'title' || k === 'title2' ? '[data-gk="title"],[data-gk="title2"]' : k === 'brand' ? '[data-gk="brand"]' : ''
      if (grp && !el.hasAttribute('data-box')) parts = (Array.from(document.querySelectorAll(grp)) as HTMLElement[]).filter((e) => !e.hasAttribute('data-box'))
      if (parts.length === 0) parts = [el]
      let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
      for (const p of parts) {
        const q = p.getBoundingClientRect()
        l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom)
      }
      const pad = el.hasAttribute('data-box') ? 0 : 3
      return { left: l - pad, top: t - pad, width: r - l + 2 * pad, height: b - t + 2 * pad }
    }
    let rafId = 0
    const follow = () => {
      if (curEl && box.style.display === 'block') {
        if (!curEl.isConnected) { box.style.display = 'none'; curEl = null }
        else {
          const rr = rectOf(curEl)
          box.style.left = rr.left + 'px'
          box.style.top = rr.top + 'px'
          box.style.width = rr.width + 'px'
          box.style.height = rr.height + 'px'
          const isX = /^(x|ph)\d+$/.test(curEl.getAttribute('data-gk') || '')
          xb.style.display = isX ? 'block' : 'none'
          xb.style.top = rr.top < 44 ? 'auto' : '-34px'
          xb.style.bottom = rr.top < 44 ? '-34px' : 'auto'
          const isP = curEl.hasAttribute('data-photo')
          const pan = isP && curEl.hasAttribute('data-pan')
          pb.style.display = isP ? 'block' : 'none'
          const pt = pan ? 'Done' : 'Move photo inside'
          if (pb.textContent !== pt) pb.textContent = pt
          pb.style.background = pan ? '#A8553A' : 'linear-gradient(135deg,#FFFDF9,#F3E7D3)'
          pb.style.color = pan ? '#fff' : '#6B4A2B'
          const flipP = rr.top + rr.height > window.innerHeight - 44
          pb.style.bottom = flipP ? 'auto' : '-36px'
          pb.style.top = flipP ? '-36px' : 'auto'
          if (isP) curEl.style.cursor = pan ? 'move' : 'grab'
        }
      }
      rafId = requestAnimationFrame(follow)
    }
    rafId = requestAnimationFrame(follow)
    const over = (e: MouseEvent) => {
      if (editor || box.contains(e.target as Node)) return
      const h = hit(e.target)
      if (!h) { if (selEl && selEl.isConnected) showBoxFor(selEl, selK); else { box.style.display = 'none'; curEl = null }; return }
      showBoxFor(h.el, h.k)
    }
    const showBoxFor = (el: HTMLElement, k: string) => {
      curEl = el
      const isPhoto = el.hasAttribute('data-photo')
      hnd.forEach((x) => { const hk = x.dataset.h || ''; x.style.display = el.hasAttribute('data-box') && !(el.hasAttribute('data-nowidth') && hk.length === 1) && (isPhoto || (hk !== 'n' && hk !== 's')) ? 'block' : 'none' })
      const r = rectOf(el)
      box.style.display = 'block'
      box.style.left = r.left + 'px'
      box.style.top = r.top + 'px'
      box.style.width = r.width + 'px'
      box.style.height = r.height + 'px'
      tag.textContent = isPhoto ? 'Photo · drag to move' : NAMES[k] + ' · click to edit'
      const flip = r.top < 28
      tag.style.bottom = flip ? 'auto' : '100%'
      tag.style.top = flip ? '100%' : 'auto'
    }
    const hide = () => { if (selEl && selEl.isConnected) return; box.style.display = 'none'; curEl = null }
    let editor: HTMLInputElement | HTMLTextAreaElement | null = null
    let hidden: HTMLElement | null = null
    let hiddenMore: HTMLElement[] = []
    let secOn = false
    const closeEditor = () => { if (editor) { editor.remove(); editor = null } if (hidden) { hidden.style.visibility = ''; hidden = null }; hiddenMore.forEach((e) => { e.style.visibility = '' }); hiddenMore = [] }
    // Several lines (like a stacked "Maya / & / Theo" title): edit them all in one place, same size, free to run over the photos.
    const openMulti = (peers: HTMLElement[], r: DOMRect) => {
      const lines = peers.map((e) => (e.textContent ?? '').trim())
      const cs0 = getComputedStyle(peers[0])
      const svg0 = peers[0] instanceof SVGElement
      const sc0 = svg0 ? ((peers[0] as unknown as SVGGraphicsElement).getScreenCTM?.()?.a ?? 1) : 1
      const fs0 = (parseFloat(cs0.fontSize) || 16) * sc0
      const col0 = svg0 && cs0.fill && cs0.fill !== 'none' ? cs0.fill : cs0.color
      const rects = peers.map((e) => e.getBoundingClientRect())
      const pitch = rects.length > 1 ? Math.max(fs0 * 1.1, (rects[rects.length - 1].top - rects[0].top) / (rects.length - 1)) : Math.max(fs0 * 1.2, rects[0].height)
      const cx = r.left + r.width / 2
      const topY = rects[0].top + rects[0].height / 2 - pitch / 2
      const ta = document.createElement('textarea')
      ta.value = lines.join('\n')
      ta.maxLength = 80
      ta.spellcheck = false
      ta.className = 'cam-edit'
      const mc = document.createElement('canvas').getContext('2d')
      const al = svg0 ? 'center' : cs0.textAlign === 'right' || cs0.textAlign === 'end' ? 'right' : cs0.textAlign === 'left' || cs0.textAlign === 'start' ? 'left' : 'center'
      const place = () => {
        const ls = ta.value.split('\n')
        let tw = 40
        if (mc) {
          mc.font = `${cs0.fontStyle} ${cs0.fontWeight} ${fs0}px ${cs0.fontFamily}`
          tw = Math.max(...ls.map((t) => mc.measureText(cs0.textTransform === 'uppercase' ? t.toUpperCase() : t).width))
        }
        const wd = Math.min(Math.max(tw, r.width) + 48, window.innerWidth - 8)
        ta.style.width = wd + 'px'
        ta.style.height = ls.length * pitch + 'px'
        const left = al === 'left' ? r.left : al === 'right' ? r.right - wd : cx - wd / 2
        ta.style.left = Math.max(4, Math.min(window.innerWidth - wd - 4, left)) + window.scrollX + 'px'
      }
      ta.style.cssText = `position:absolute;z-index:2147483646;box-sizing:border-box;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${col0};caret-color:${col0};outline:none;box-shadow:none;resize:none;overflow:hidden;white-space:pre;font-family:${cs0.fontFamily};font-weight:${cs0.fontWeight};font-style:${cs0.fontStyle};font-size:${fs0}px;line-height:${pitch}px;text-align:${al};text-transform:${cs0.textTransform};text-shadow:none`
      ta.style.top = topY + window.scrollY + 'px'
      place()
      const orig = lines.join(' ')
      const send = (t: string) => window.parent?.postMessage({ type: 'camrhia-gallery-text', key: 'title', text: t }, '*')
      closeEditor()
      peers.forEach((e) => { e.style.visibility = 'hidden' })
      hidden = peers[0]
      hiddenMore = peers.slice(1)
      let finished = false
      ta.addEventListener('input', () => { place(); send(ta.value.replace(/\s*\n+\s*/g, ' ').trim()) })
      ta.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); finished = true; closeEditor() }
        if (ev.key === 'Escape') { ev.preventDefault(); finished = true; send(orig); closeEditor() }
      })
      ta.addEventListener('blur', () => { if (!finished) { finished = true; closeEditor() } })
      document.body.appendChild(ta)
      editor = ta
      ta.focus()
      ta.select()
    }
    const openBox = (target: HTMLElement) => {
      closeEditor()
      curEl = target
      box.style.display = 'block'
      hnd.forEach((x) => { x.style.display = 'block' })
      const gkey = target.getAttribute('data-gk') || 'title'
      const topAnchor = !target.hasAttribute('data-center')
      const sc = scaleOf(target)
      const cs = getComputedStyle(target)
      const r = target.getBoundingClientRect()
      const fsPx = (parseFloat(cs.fontSize) || 16) * sc
      const lhR = (parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 16) * 1.12) / (parseFloat(cs.fontSize) || 16)
      const ta = document.createElement('textarea')
      ta.className = 'cam-edit'
      ta.value = target.getAttribute('data-raw') ?? target.textContent ?? ''
      ta.maxLength = 80
      ta.spellcheck = false
      ta.style.cssText = `position:absolute;z-index:2147483646;box-sizing:border-box;margin:0;padding:0;border:0;background:transparent;resize:none;overflow:hidden;outline:none;white-space:pre-wrap;overflow-wrap:anywhere;text-align:center;text-transform:${cs.textTransform};letter-spacing:${cs.letterSpacing === 'normal' ? 'normal' : parseFloat(cs.letterSpacing) * sc + 'px'};color:${cs.color};caret-color:${cs.color};font-family:${cs.fontFamily};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};font-size:${fsPx}px;line-height:${lhR};width:${r.width}px;text-shadow:none`
      const cy = r.top + r.height / 2
      ta.style.left = r.left + window.scrollX + 'px'
      const fit = () => {
        ta.style.height = '0px'
        const h = Math.max(ta.scrollHeight, fsPx * lhR)
        ta.style.height = h + 'px'
        ta.style.top = (topAnchor ? r.top : cy - h / 2) + window.scrollY + 'px'
      }
      document.body.appendChild(ta)
      fit()
      const orig = ta.value
      const send = (t: string) => window.parent?.postMessage({ type: 'camrhia-gallery-text', key: gkey, text: t }, '*')
      target.style.visibility = 'hidden'
      hidden = target
      hiddenMore = []
      let finished = false
      ta.addEventListener('input', () => { fit(); send(ta.value) })
      ta.addEventListener('keydown', (ev) => {
        if (ev.key === 'Escape') { ev.preventDefault(); finished = true; send(orig); closeEditor() }
      })
      ta.addEventListener('blur', () => { if (!finished) { finished = true; closeEditor() } })
      editor = ta
      ta.focus()
      ta.setSelectionRange(ta.value.length, ta.value.length)
    }
    const openEditor = (target: HTMLElement, k: string) => {
      if (target.hasAttribute('data-box') && k !== 'initials') { openBox(target); return }
      if (!['title', 'title2', 'brand', 'count', 'initials', 'moment'].includes(k) && !/^x\d+$/.test(k)) return
      const key = k === 'title2' ? 'title' : k
      const orig = k === 'moment' ? (target.textContent ?? '') : textRef.current[key] ?? ''
      closeEditor()
      const peers = key === 'title' ? (Array.from(document.querySelectorAll('[data-gk="title"],[data-gk="title2"]')) as HTMLElement[]) : [target]
      const multi = peers.length > 1
      const rects = peers.map((e) => e.getBoundingClientRect())
      const r = multi
        ? (() => { const l = Math.min(...rects.map((q) => q.left)), t = Math.min(...rects.map((q) => q.top)), rt = Math.max(...rects.map((q) => q.right)), b = Math.max(...rects.map((q) => q.bottom)); return { left: l, top: t, width: rt - l, height: b - t } as DOMRect })()
        : target instanceof SVGElement
          ? target.getBoundingClientRect()
          : (() => { const rg = document.createRange(); rg.selectNodeContents(target); const q = rg.getBoundingClientRect(); return q.width > 0 ? q : target.getBoundingClientRect() })()
      if (multi) { openMulti(peers, r); return }
      const cs = getComputedStyle(target)
      const isSvg = target instanceof SVGElement
      const sc = isSvg ? ((target as unknown as SVGGraphicsElement).getScreenCTM?.()?.a ?? 1) : 1
      const fs = (parseFloat(cs.fontSize) || 16) * sc
      const colr = isSvg && cs.fill && cs.fill !== 'none' ? cs.fill : cs.color
      const isInit = k === 'initials'
      const w = isInit ? 280 : Math.min(Math.max(r.width + 24, 60), window.innerWidth - 12)
      const hgt = isInit ? 76 : Math.max(r.height + 6, fs * 1.3)
      const inp = document.createElement('input')
      inp.type = 'text'
      inp.maxLength = key === 'brand' ? 40 : key === 'initials' ? 4 : 60
      inp.value = orig
      const shownTxt = cs.textTransform === 'uppercase' ? orig.toUpperCase() : orig
      const mc = document.createElement('canvas').getContext('2d')
      let ls = 0
      let fs2 = isInit ? 48 : fs
      if (multi && mc) {
        mc.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`
        const tw = mc.measureText(shownTxt).width
        if (tw > w - 8) fs2 = (fs * (w - 8)) / tw
      }
      if (!multi && !isInit && isSvg && mc && shownTxt.length > 1) {
        mc.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`
        ls = Math.min(40, Math.max(-2, (r.width - mc.measureText(shownTxt).width) / shownTxt.length))
      } else if (!isInit && !isSvg) {
        ls = (parseFloat(cs.letterSpacing) || 0) * (fs2 / fs)
      }
      if (!document.getElementById('cam-edit-style')) { const st = document.createElement('style'); st.id = 'cam-edit-style'; st.textContent = '.cam-edit::selection{background:rgba(176,141,87,0.35)}'; document.head.appendChild(st) }
      inp.className = 'cam-edit'
      const fam = cs.fontFamily
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const fsz = isInit ? fs : fs2
      const al = isSvg ? 'center' : cs.textAlign === 'right' || cs.textAlign === 'end' ? 'right' : cs.textAlign === 'left' || cs.textAlign === 'start' ? 'left' : 'center'
      const place = () => {
        let tw = r.width
        if (mc) {
          mc.font = `${cs.fontStyle} ${cs.fontWeight} ${fsz}px ${fam}`
          const t = cs.textTransform === 'uppercase' ? inp.value.toUpperCase() : inp.value
          tw = Math.max(r.width, mc.measureText(t).width + ls * t.length)
        }
        const wd = Math.min(tw + 48, window.innerWidth - 8)
        inp.style.width = wd + 'px'
        const left = al === 'left' ? r.left : al === 'right' ? r.right - wd : cx - wd / 2
        inp.style.left = Math.max(4, Math.min(window.innerWidth - wd - 4, left)) + window.scrollX + 'px'
      }
      inp.style.cssText = `position:absolute;z-index:2147483646;box-sizing:border-box;margin:0;padding:0;border:0;border-radius:0;background:transparent;color:${colr};caret-color:${colr};outline:none;box-shadow:none;font-family:${fam};font-weight:${cs.fontWeight};font-style:${cs.fontStyle};font-size:${fsz}px;line-height:1.2;text-align:${al};text-transform:${cs.textTransform};letter-spacing:${ls}px;text-shadow:none`
      inp.style.height = Math.max(hgt, fsz * 1.35) + 'px'
      inp.style.top = (cy - Math.max(hgt, fsz * 1.35) / 2 + window.scrollY) + 'px'
      place()
      inp.addEventListener('input', place)
      peers.forEach((e) => { e.style.visibility = 'hidden' })
      const keepHidden = [...peers]
      hidden = keepHidden[0] ?? null
      hiddenMore = keepHidden.slice(1)
      let finished = false
      const mid = k === 'moment' ? target.getAttribute('data-mid') : null
      const send = (t: string) => {
        if (mid) { setMomentText((p) => ({ ...p, [mid]: t })); window.parent?.postMessage({ type: 'camrhia-gallery-moment-text', id: mid, text: t, prev: orig }, '*') }
        else window.parent?.postMessage({ type: 'camrhia-gallery-text', key, text: t }, '*')
      }
      inp.addEventListener('input', () => send(inp.value))
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); finished = true; closeEditor() }
        if (ev.key === 'Escape') { ev.preventDefault(); finished = true; send(orig); closeEditor() }
      })
      inp.addEventListener('blur', () => { if (!finished) { finished = true; closeEditor() } })
      document.body.appendChild(inp)
      editor = inp
      inp.focus()
      inp.select()
    }
    const click = (e: MouseEvent) => {
      if (secOn) {
        const im = (e.target as HTMLElement | null)?.closest?.('img[data-pid]:not([data-cover]):not([data-slot])')
        if (im) { e.preventDefault(); e.stopPropagation(); window.parent?.postMessage({ type: 'camrhia-gallery-section-at', id: im.getAttribute('data-pid') }, '*'); return }
      }
      const sc = (e.target as HTMLElement | null)?.closest?.('[data-setcover]')
      if (sc) {
        e.preventDefault()
        e.stopPropagation()
        window.parent?.postMessage({ type: 'camrhia-gallery-setcover', id: sc.getAttribute('data-setcover') }, '*')
        return
      }
      const h = hit(e.target)
      if (!h) {
        const t = e.target as HTMLElement | null
        const root = document.querySelector('.gal-root')
        if (t && root && (t === root || t.tagName === 'MAIN' || t.parentElement === root || t.parentElement?.parentElement === root || t.parentElement?.tagName === 'MAIN')) {
          e.preventDefault()
          e.stopPropagation()
        }
        return
      }
      e.preventDefault()
      e.stopPropagation()
      if (h.el.hasAttribute('data-photo')) { window.parent?.postMessage({ type: 'camrhia-gallery-slot', key: h.k }, '*'); return }
      openEditor(h.el, h.k)
      const cs = getComputedStyle(h.el)
      const rr = h.el.getBoundingClientRect()
      window.parent?.postMessage({ type: 'camrhia-gallery-pick', key: h.k, top: rr.top, bottom: rr.bottom, name: NAMES[h.k], mid: h.el.getAttribute('data-mid'), line: h.el.getAttribute('data-line'), size: Math.round(parseFloat(cs.fontSize)), color: cs.color, bold: parseInt(cs.fontWeight, 10) >= 600 }, '*')
    }
    document.addEventListener('mouseover', over, true)
    document.addEventListener('scroll', hide, true)
    document.addEventListener('click', click, true)
    const away = (e: PointerEvent) => {
      const ht = hit(e.target)
      if (!box.contains(e.target as Node) && !ht) { selEl = null; box.style.display = 'none'; curEl = null; window.parent?.postMessage({ type: 'camrhia-gallery-dismiss' }, '*') }
      else if (ht && ht.el !== selEl) selEl = null
    }
    document.addEventListener('pointerdown', away, true)
    const selDown = (e: MouseEvent) => { if (editor || box.contains(e.target as Node)) return; const h = hit(e.target); if (h) { selEl = h.el; selK = h.k } }
    document.addEventListener('mousedown', selDown, true)
    const repaint = new MutationObserver((ms) => {
      const svgs = new Set<SVGElement>()
      for (const m of ms) {
        const n = m.target as Node
        const el = n.nodeType === 3 ? n.parentElement : (n as Element)
        const sv = el?.closest?.('svg') as SVGElement | null
        if (sv) svgs.add(sv)
      }
      if (svgs.size === 0) return
      requestAnimationFrame(() => svgs.forEach((sv) => { sv.style.display = 'none'; void sv.getBoundingClientRect(); sv.style.display = '' }))
    })
    repaint.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['textLength'] })
    const secSt = document.createElement('style')
    document.head.appendChild(secSt)
    const onCtl = (e: MessageEvent) => {
      const m = e.data
      if (!m) return
      if (m.type === 'camrhia-gallery-section-mode') { secOn = !!m.on; secSt.textContent = secOn ? '.gal-root img[data-pid]{cursor:copy!important}' : '' }
      if (m.type === 'camrhia-gallery-select' && typeof m.key === 'string') {
        const sel = String(m.key).replace(/[^a-zA-Z0-9_-]/g, '')
        const go = (n: number) => {
          const el = (document.querySelector(`[data-gk="${sel}"][data-box]`) || document.querySelector(`[data-gk="${sel}"]`)) as HTMLElement | null
          if (el) {
            el.scrollIntoView({ block: 'center' })
            setTimeout(() => {
              el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }))
              el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
            }, 250)
          } else if (n < 12) setTimeout(() => go(n + 1), 120)
        }
        go(0)
      }
      if (m.type === 'camrhia-gallery-edit') {
        const go = (n: number) => {
          const el = (m.key === 'moment' ? document.querySelector(`[data-mid="${String(m.id)}"]`) : document.querySelector(`[data-gk="${String(m.key)}"]`)) as HTMLElement | null
          if (el) { el.scrollIntoView({ block: 'center' }); setTimeout(() => openEditor(el, String(m.key)), 250) }
          else if (n < 12) setTimeout(() => go(n + 1), 120)
        }
        go(0)
      }
      if (m.type === 'camrhia-gallery-moment-set' && typeof m.id === 'string') setMomentText((p) => ({ ...p, [String(m.id)]: String(m.text ?? '') }))
      if (m.type === 'camrhia-gallery-moments') setLiveMoments(Array.isArray(m.moments) ? m.moments : null)
      if (m.type === 'camrhia-gallery-section-row') {
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.gal-root img[data-pid]:not([data-cover]):not([data-slot])'))
        const hd = document.querySelector(`[data-mid="${String(m.id)}"]`)
        if (hd && imgs.length > 0) {
          const idx = imgs.findIndex((im) => !!(hd.compareDocumentPosition(im) & Node.DOCUMENT_POSITION_FOLLOWING))
          if (idx >= 0) {
            const t0 = imgs[0].getBoundingClientRect().top
            const perRow = Math.max(1, imgs.filter((im) => Math.abs(im.getBoundingClientRect().top - t0) < 24).length)
            const ni = Math.min(imgs.length - 1, Math.max(0, idx + (Number(m.dir) > 0 ? perRow : -perRow)))
            if (ni !== idx) window.parent?.postMessage({ type: 'camrhia-gallery-moment-move', id: String(m.id), pid: imgs[ni].getAttribute('data-pid') }, '*')
          }
        }
      }
    }
    window.addEventListener('message', onCtl)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('message', onCtl)
      secSt.remove()
      document.removeEventListener('mouseover', over, true)
      document.removeEventListener('scroll', hide, true)
      document.removeEventListener('click', click, true)
      document.removeEventListener('pointerdown', away, true)
      document.removeEventListener('mousedown', selDown, true)
      repaint.disconnect()
      box.remove()
    }
  }, [])

  // Tag the studio-name line wherever a cover prints it, so it can be edited like the rest.
  useEffect(() => {
    const bn = brand?.name?.trim().toLowerCase()
    if (!bn || typeof document === 'undefined') return
    document.querySelectorAll<HTMLElement>('.gal-root *').forEach((n) => {
      if (n.children.length === 0 && !n.hasAttribute('data-gk') && (n.textContent ?? '').trim().toLowerCase() === bn) n.setAttribute('data-gk', 'brand')
    })
  })

  if (phase === 'loading') {
    return <div className="flex min-h-screen items-center justify-center bg-paper text-sm text-ink-soft">Loading gallery…</div>
  }

  if (phase === 'missing' || phase === 'expired') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
        <h1 className="font-fraunces text-2xl font-semibold text-ink">
          {phase === 'expired' ? 'This gallery has expired' : 'Gallery not found'}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {phase === 'expired' ? 'Please contact your photographer to have it reopened.' : 'Check the link, or ask your photographer to resend it.'}
        </p>
      </div>
    )
  }

  if (phase === 'pin') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6">
        <form
          onSubmit={(e) => { e.preventDefault(); setPinError(null); load(pin.trim()) }}
          className="w-full max-w-sm text-center"
        >
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">{brand?.name || 'Private gallery'}</p>
          <h1 className="mb-6 font-fraunces text-3xl font-semibold text-ink">{title || 'Enter your PIN'}</h1>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            autoFocus
            autoComplete="off"
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-center text-lg tracking-widest text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
          />
          {pinError && <p className="mt-3 text-sm text-red-600">{pinError}</p>}
          <button
            type="submit"
            disabled={busy || !pin.trim()}
            className="mt-4 w-full rounded-xl bg-twilight px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'View gallery'}
          </button>
        </form>
      </div>
    )
  }

  if (!data) return null
  const { look, cover: coverKind, pal, coverPal, focal, focals, zoom, zooms, layout, el, slots } = resolveDesign(designPreview ?? data.design ?? null)
  const elRules = elCss(el, (k) => FONT_OPTIONS[k]?.family)
  const fontHref = (() => {
    const g = Array.from(new Set(Object.values(el).map((x) => FONT_OPTIONS[x?.font ?? '']?.gf).filter(Boolean) as string[]))
    return g.length ? 'https://fonts.googleapis.com/css2?' + g.map((x) => 'family=' + x.replace(/^family=/, '')).join('&') + '&display=swap' : ''
  })()
  const pos = `${focal.x}% ${focal.y}%`
  const fpos = (id: string) => (focals[id] ? `${focals[id].x}% ${focals[id].y}%` : undefined)
  const cineBg = (() => { const v = ((designPreview ?? data.design ?? null) as { coverBg?: string } | null)?.coverBg; return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000' })()
  const cineLight = (() => { const n = parseInt(cineBg.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6 })()
  const headCls = look.font === 'fraunces' ? 'font-fraunces' : ''
  const headStyle: CSSProperties = { ...(look.font === 'fraunces' ? {} : { fontFamily: look.font }), fontWeight: look.weight, letterSpacing: look.track, textTransform: look.upper ? 'uppercase' : 'none', fontStyle: look.italic ? 'italic' : 'normal' }
  const cover = data.photos.find((p) => p.id === (coverOverride ?? data.coverId)) ?? data.photos[0]
  const slotPh = (key: string, fb: (typeof data.photos)[number] | undefined) => (slots[key] ? data.photos.find((p) => p.id === slots[key]) : undefined) ?? fb
  const slotImg = (key: string, ph: (typeof data.photos)[number] | undefined, src: string | undefined, fallbackPos?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" data-pid={ph?.id} data-slot={key} className="h-full w-full object-cover" style={{ objectPosition: fpos('slot:' + key) || fallbackPos, transform: (zooms['slot:' + key] ?? 1) > 1 ? `scale(${zooms['slot:' + key]})` : undefined, transformOrigin: fpos('slot:' + key) || fallbackPos || '50% 50%' }} />
  )
  const momentMeta: { id: string; name: string; line?: boolean }[] = liveMoments ?? (data as unknown as { moments?: { id: string; name: string; line?: boolean }[] }).moments ?? []
  const momentHead = (p: unknown, i: number) => {
    if (momentMeta.length === 0) return null
    const m = (p as { moment?: string | null }).moment ?? null
    const prev = i > 0 ? ((list[i - 1] as unknown as { moment?: string | null }).moment ?? null) : undefined
    if (i > 0 && m === prev) return null
    const name = m ? (m in momentText ? momentText[m] : momentMeta.find((x) => x.id === m)?.name) : null
    if (name === null || name === undefined) return null
    const elR = el as Record<string, { align?: string; lineColor?: string } | undefined>
    const mEl: { align?: string; lineColor?: string } = { ...(elR.moment ?? {}), ...(m ? (elR['s_' + m] ?? {}) : {}) }
    const al = mEl?.align === 'center' || mEl?.align === 'right' ? mEl.align : 'left'
    const lc = mEl?.lineColor && /^#[0-9a-fA-F]{6}$/.test(mEl.lineColor) ? mEl.lineColor : null
    if (m && momentMeta.find((x) => x.id === m)?.line) {
      const rule = <span aria-hidden className="h-px min-w-0 flex-1" style={{ background: lc ?? pal.accent, opacity: lc ? 1 : 0.55 }} />
      return (
        <div className="mb-4 mt-8 flex w-full basis-full items-center gap-4 first:mt-0 [column-span:all] col-span-full">
          {al !== 'left' && rule}
          <h2 data-gk="moment" data-mid={m} data-line="1" className={`shrink-0 text-2xl ${headCls}`} style={{ ...headStyle, color: pal.ink }}>{name}</h2>
          {al !== 'right' && rule}
        </div>
      )
    }
    return <h2 data-gk="moment" data-mid={m ?? undefined} data-line="0" className={`mb-4 mt-8 w-full basis-full text-2xl first:mt-0 [column-span:all] col-span-full ${headCls}`} style={{ ...headStyle, color: pal.ink, textAlign: al }}>{name}</h2>
  }
  const current = openIndex !== null ? list[openIndex] : null
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  async function savePhoto(p: { id: string; filename: string | null }) {
    const url = `/api/gallery/download?access=${encodeURIComponent(data!.access)}&photo=${p.id}`
    if (isTouch) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const blob = await res.blob()
          const file = new File([blob], p.filename || 'photo.jpg', { type: blob.type || 'image/jpeg' })
          if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return }
        }
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return
      }
    }
    window.location.href = url
  }
  const heart = brand?.accent || '#fb7185'
  const wmCfg = (designPreview ?? data.design ?? null)?.watermark
  const wmText = wmCfg?.on ? String(wmCfg.text ?? '').trim() : ''
  const wmEl = wmText ? (() => {
    const t = wmText.toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const tw = wmText.length * 31
    const w = 2 * (tw + 30)
    const h = Math.max(200, Math.round(1.16 * tw + 56))
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><g font-family='Arial, Helvetica, sans-serif' font-size='40' font-weight='800' letter-spacing='2' text-anchor='middle' dominant-baseline='middle' fill='white' fill-opacity='0.55' stroke='black' stroke-opacity='0.12' stroke-width='1'><text x='${w / 4}' y='${h / 4}' transform='rotate(-35 ${w / 4} ${h / 4})'>${t}</text><text x='${(w * 3) / 4}' y='${(h * 3) / 4}' transform='rotate(-35 ${(w * 3) / 4} ${(h * 3) / 4})'>${t}</text></g></svg>`
    return <span aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden" style={{ backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundRepeat: 'repeat', backgroundSize: `min(${Math.round((w / tw) * 300)}px, ${((w / tw) * 40).toFixed(1)}%) auto` }} />
  })() : null

  const imgEl = cover?.web ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cover.web} alt="" data-pid={cover.id} data-cover="1" className="h-full w-full object-cover" style={{ objectPosition: pos, transform: zoom > 1 ? `scale(${zoom})` : undefined, transformOrigin: pos }} />
  ) : null
  const coverTitle = String((el as Record<string, { text?: string }> | undefined)?.title?.text ?? '').trim() || String(data.title)
  const coverSub = String((el as Record<string, { text?: string }> | undefined)?.brand?.text ?? '').trim()
  const countText = String((el as Record<string, { text?: string }> | undefined)?.count?.text ?? '').trim()
  const extraKeys = Object.keys((el ?? {}) as Record<string, unknown>).filter((k) => /^x\d+$/.test(k)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
  const photoKeys = Object.keys((el ?? {}) as Record<string, unknown>).filter((k) => /^ph\d+$/.test(k)).sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)))
  const phBox = (k: string) => {
    const s = ((el ?? {}) as Record<string, { w?: number; h?: number; shape?: string } | undefined>)[k] ?? {}
    const w = typeof s.w === 'number' && Number.isFinite(s.w) ? Math.min(900, Math.max(30, s.w)) : 240
    const h = typeof s.h === 'number' && Number.isFinite(s.h) ? Math.min(900, Math.max(30, s.h)) : 240
    const sh = s.shape || 'rect'
    const ph = slotPh(k, cover)
    const src = ph?.web || ph?.thumb || undefined
    const shapeCss: CSSProperties = sh === 'rounded' ? { borderRadius: 26 } : sh === 'circle' ? { borderRadius: '50%' } : sh === 'arch' ? { borderRadius: `${w / 2}px ${w / 2}px 0 0` } : sh === 'heart' ? { clipPath: 'url(#camheart)' } : {}
    return (
      <div key={k} data-gk={k} data-box="1" data-photo="1" style={{ position: 'absolute', pointerEvents: 'auto', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: w, height: h, maxWidth: '96%', zIndex: 6, overflow: 'hidden', cursor: 'grab', background: pal.line, ...shapeCss }}>
        {src ? slotImg(k, ph, src) : null}
      </div>
    )
  }
  const xBox = (k: string, i: number) => (<div key={k} data-gk={k} data-box="1" style={{ position: 'absolute', pointerEvents: 'auto', left: '50%', top: 24 + i * 56, transform: 'translateX(-50%)', zIndex: 6, fontSize: 28, lineHeight: 1.2, width: extraW(k) ?? 'max-content', whiteSpace: extraW(k) ? 'pre-wrap' : 'pre', overflowWrap: 'anywhere', textAlign: 'center', color: coverPal.ink, fontFamily: "'Playfair Display', Georgia, serif", cursor: 'grab' }}>{extraTxt(k) || 'Your text'}</div>)
  const extraTxt = (k: string) => String((el as Record<string, { text?: string }> | undefined)?.[k]?.text ?? '')
  const extraW = (k: string) => { const w = (el as Record<string, { w?: number } | undefined> | undefined)?.[k]?.w; return typeof w === 'number' && Number.isFinite(w) ? Math.min(900, Math.max(14, w)) : undefined }
  textRef.current = { ...Object.fromEntries(extraKeys.map((k) => [k, extraTxt(k)])), title: coverTitle, brand: coverSub, count: countText || `${data.photos.length} photos`, initials: String((el as Record<string, { text?: string }> | undefined)?.initials?.text ?? '') }
  const brandLine = coverSub ? (
    <p data-gk="brand" className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: pal.soft }}>{coverSub}</p>
  ) : null
  const titleEl = (extra: string) => <h1 className={`${headCls} ${extra}`} style={headStyle}>{data.title}</h1>
  const renderItem = (p: (typeof list)[number], i: number, uniform: boolean) => (
    <Fragment key={p.id}>
      {momentHead(p, i)}
      <div data-gk="photos" className={`group relative overflow-hidden ${uniform ? '' : 'break-inside-avoid'}`} style={{ marginBottom: uniform ? 0 : look.gap, borderRadius: look.radius, background: pal.line }}>
        {p.thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.thumb}
            alt={p.filename ?? ''}
            data-pid={p.id}
            loading="lazy"
            onClick={() => setOpenIndex(i)}
            className={uniform ? 'aspect-[5/6] w-full cursor-zoom-in object-cover' : 'w-full cursor-zoom-in'}
            style={{ ...(!uniform && p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : {}), ...(uniform && fpos(p.id) ? { objectPosition: fpos(p.id) } : {}) }}
          />
        )}
        {wmEl}
        <button
          onClick={() => toggleFav(p.id)}
          aria-label="Favorite"
          style={favs.has(p.id) ? { color: heart } : undefined}
          className={`absolute right-2 top-2 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 ${favs.has(p.id) ? '' : 'sm:opacity-0 sm:group-hover:opacity-100'}`}
        >
          <Heart filled={favs.has(p.id)} className="h-4 w-4" />
        </button>
        {coverBtn(p)}
      </div>
    </Fragment>
  )
  const coverBtn = (p: (typeof list)[number]) => isPreview ? (
    <button type="button" data-setcover={p.id} className="absolute bottom-3 left-3 z-10 flex items-center gap-2.5 rounded-full border border-[#D9BE8F]/55 bg-[#2A1F24]/80 px-6 py-3 text-xs font-medium uppercase tracking-[0.16em] text-[#F3E6CC] opacity-0 shadow-[0_14px_30px_-10px_rgba(20,12,8,0.7)] backdrop-blur-md transition hover:bg-[#8C6B3F] hover:text-white group-hover:opacity-100"><svg viewBox="0 0 24 24" className="h-4 w-4 text-[#D9BE8F]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" /></svg>Set as cover</button>
  ) : null
  const heartBtn = (p: (typeof list)[number]) => (
    <button
      onClick={() => toggleFav(p.id)}
      aria-label="Favorite"
      style={favs.has(p.id) ? { color: heart } : undefined}
      className={`absolute right-2 top-2 z-10 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 ${favs.has(p.id) ? '' : 'sm:opacity-0 sm:group-hover:opacity-100'}`}
    >
      <Heart filled={favs.has(p.id)} className="h-4 w-4" />
    </button>
  )
  const tile = (p: (typeof list)[number], i: number, o: { wrap?: string; style?: CSSProperties; fill?: boolean; ratio?: number; head?: boolean } = {}) => {
    const fill = !!o.fill || !!o.ratio
    return (
      <Fragment key={p.id}>
        {o.head === false ? null : momentHead(p, i)}
        <div data-gk="photos" className={`group relative overflow-hidden ${o.wrap ?? ''}`} style={{ borderRadius: look.radius, background: pal.line, ...o.style }}>
          {o.ratio ? <span className="block" style={{ paddingBottom: `${100 / o.ratio}%` }} /> : null}
          {p.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.thumb}
              alt={p.filename ?? ''}
              data-pid={p.id}
              loading="lazy"
              onClick={() => setOpenIndex(i)}
              className={fill ? 'absolute inset-0 h-full w-full cursor-zoom-in object-cover' : 'block w-full cursor-zoom-in'}
              style={{ ...(!fill && p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : {}), ...(fill && fpos(p.id) ? { objectPosition: fpos(p.id) } : {}) }}
            />
          )}
          {wmEl}
          {heartBtn(p)}
          {coverBtn(p)}
        </div>
      </Fragment>
    )
  }
  const arOf = (p: (typeof list)[number]) => (p.width && p.height ? p.width / p.height : 1.5)
  const MOSAIC = ['md:col-span-3 aspect-[4/3]', 'md:col-span-3 aspect-[4/3]', 'md:col-span-2 aspect-square', 'md:col-span-2 aspect-square', 'md:col-span-2 aspect-square', 'col-span-2 md:col-span-6 aspect-[21/9]']
  const gridEl = (() => {
    switch (layout) {
      case 'grid':
        return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: look.gap }}>{list.map((p, i) => renderItem(p, i, true))}</div>
      case 'square':
        return <div className="mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: look.gap, maxWidth: 'min(100%, 1280px)' }}>{list.map((p, i) => tile(p, i, { ratio: 1.14 }))}</div>
      case 'rows': {
        const per = typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 4
        const cl = (p: (typeof list)[number]) => Math.min(1.0, Math.max(0.7, arOf(p)))
        const rowsArr: (typeof list)[] = []
        for (let k = 0; k < list.length; k += per) rowsArr.push(list.slice(k, k + per))
        return (
          <div className="flex flex-col" style={{ gap: look.gap }}>
            {rowsArr.map((row, r) => (
              <div key={r} className="flex" style={{ gap: look.gap }}>
                {row.map((p, j) => tile(p, r * per + j, { ratio: cl(p), head: false, style: { flex: `${cl(p)} 1 0%`, minWidth: 0 } }))}
                {row.length < per && <div style={{ flex: `${(per - row.length) * 0.9} 1 0%` }} />}
              </div>
            ))}
          </div>
        )
      }
      case 'feature': {
        const FEAT = ['col-span-2 row-span-2 aspect-square md:aspect-auto', 'aspect-square md:aspect-auto', 'aspect-square md:aspect-auto', 'aspect-square md:aspect-auto', 'aspect-square md:aspect-auto', 'col-span-2 aspect-[2/1] md:aspect-auto', 'col-span-2 aspect-[2/1] md:aspect-auto', 'row-span-2 aspect-[1/2] md:aspect-auto', 'row-span-2 aspect-[1/2] md:aspect-auto']
        const fg: { head: ReturnType<typeof momentHead>; items: [(typeof list)[number], number][] }[] = []
        list.forEach((p, i) => {
          const h = momentHead(p, i)
          if (h || fg.length === 0) fg.push({ head: h, items: [] })
          fg[fg.length - 1].items.push([p, i])
        })
        return (
          <div style={{ containerType: 'inline-size' }}>
            {fg.map((gp, gi) => (
              <Fragment key={gi}>
                {gp.head}
                <div className="grid grid-cols-2 md:grid-cols-4 md:auto-rows-[calc((100cqw_-_3*var(--g))/4)]" style={{ gap: look.gap, gridAutoFlow: 'dense', ['--g' as string]: `${look.gap}px` }}>
                  {gp.items.map(([p, i]) => tile(p, i, { head: false, fill: true, wrap: FEAT[i % 9] }))}
                </div>
              </Fragment>
            ))}
          </div>
        )
      }
      case 'wide':
        return <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: look.gap }}>{list.map((p, i) => tile(p, i, { ratio: 1.7 }))}</div>
      case 'mosaic': {
        const PAT = [2, 3, 3, 2, 3, 1, 2, 3]
        const HT = [24.3, 23.2, 18.5, 20.4, 20.4, 18.6, 18.6, 18.8]
        const rowsArr: { items: (typeof list); start: number; h: number }[] = []
        for (let k = 0, r = 0; k < list.length; r++) {
          const n = PAT[r % PAT.length]
          rowsArr.push({ items: list.slice(k, k + n), start: k, h: HT[r % HT.length] })
          k += n
        }
        return (
          <div className="flex flex-col" style={{ gap: 2, containerType: 'inline-size' }}>
            {rowsArr.map((row, ri) => (
              <div key={ri} className="flex" style={{ gap: 2, height: `${row.h}cqw` }}>
                {row.items.map((p, j) => tile(p, row.start + j, { fill: true, head: false, wrap: 'min-w-0 flex-1', style: { borderRadius: 2 } }))}
              </div>
            ))}
          </div>
        )
      }
      case 'polaroid': {
        const WIN = [[3.808,1.526,22.361,16.881,-2.64],[27.202,1.934,22.052,17.205,4.4],[51.401,1.835,21.892,16.707,-4.76],[74.403,1.589,22.195,16.876,2.86],[2.749,23.177,22.688,16.88,2.39],[27.27,23.037,20.827,16.559,-2.1],[49.974,23.689,22.082,16.953,1.85],[73.954,22.884,22.799,16.871,-4.18],[3.285,44.205,22.016,14.927,3.98],[27.279,43.691,21.362,15.463,-2.86],[50.368,44.393,21.881,14.694,1.22],[75.206,42.466,21.4,16.398,-2.01],[3.517,63.052,20.825,15.373,-2.49],[26.657,61.997,21.57,15.976,1.77],[51.147,63.044,22.715,15.643,-1.55],[75.567,62.849,20.937,15.291,1.85],[3.017,82.375,20.283,14.145,-3.81],[26.601,81.618,21.427,14.682,-2.05],[51.237,82.592,22.141,14.147,3.07],[75.539,82.235,21.264,14.285,-2.12]]
        const ENDS = [25.2, 46.6, 67.4, 86.6, 100]
        const chunks: (typeof list)[] = []
        for (let k = 0; k < list.length; k += 20) chunks.push(list.slice(k, k + 20))
        return (
          <div className="mx-auto w-full max-w-[1100px]">
            {chunks.map((chunk, ci) => {
              const rowsUsed = Math.ceil(chunk.length / 4)
              const end = ENDS[rowsUsed - 1]
              return (
                <div key={ci} className="relative w-full overflow-hidden" style={{ aspectRatio: `569 / ${(933 * end) / 100}` }}>
                  {WIN.slice(0, rowsUsed * 4).map((w, wi) => {
                    const p = chunk[wi]
                    return (
                      <div key={wi} data-gk={p ? 'photos' : undefined} className="group absolute z-10 overflow-hidden" style={{ left: `${w[0]}%`, top: `${(w[1] / end) * 100}%`, width: `${w[2]}%`, height: `${(w[3] / end) * 100}%`, transform: `rotate(${w[4]}deg)`, background: pal.line }}>
                        {p && p.thumb && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumb} alt={p.filename ?? ''} loading="lazy" onClick={() => setOpenIndex(ci * 20 + wi)} className="absolute inset-0 h-full w-full cursor-zoom-in object-cover" />
                        )}
                        {p && heartBtn(p)}
                      </div>
                    )
                  })}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/gallery-layout/polaroid-art.png" alt="" aria-hidden className="pointer-events-none absolute left-0 top-0 z-20 w-full select-none" style={{ height: `${(100 / end) * 100}%` }} />
                </div>
              )
            })}
          </div>
        )
      }
      case 'story':
        return <div className="mx-auto flex max-w-[920px] flex-col" style={{ gap: look.gap }}>{list.map((p, i) => tile(p, i, { ratio: 2.3 }))}</div>
      case 'stagger':
        return (
          <div className="grid grid-cols-2" style={{ gap: look.gap }}>
            {[0, 1].map((c) => (
              <div key={c} className="flex flex-col" style={{ gap: look.gap }}>
                {list.map((p, i) => (i % 2 === c ? tile(p, i, { head: false, ratio: (c ? [1.67, 1.62, 1.77, 1.89, 2.33] : [1.82, 2.5, 1.29, 1.91, 1.77])[Math.floor(i / 2) % 5] }) : null))}
              </div>
            ))}
          </div>
        )
      case 'filmstrip': {
        const per = typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 5
        const rowsArr: (typeof list)[] = []
        for (let k = 0; k < list.length; k += per) rowsArr.push(list.slice(k, k + per))
        return (
          <div className="flex flex-col" style={{ gap: look.gap }}>
            {rowsArr.map((row, r) => (
              <div key={r} className="flex" style={{ gap: look.gap }}>
                {row.map((p, j) => {
                  const ar = arOf(p)
                  return tile(p, r * per + j, { ratio: 0.4, head: false, style: { flex: '1 1 0%', minWidth: 0 } })
                })}
                {row.length < per && <div style={{ flex: `${(per - row.length) * 0.67} 1 0%` }} />}
              </div>
            ))}
          </div>
        )
      }
      default: {
        const groups: { head: ReturnType<typeof momentHead>; items: [(typeof list)[number], number][] }[] = []
        list.forEach((p, i) => {
          const h = momentHead(p, i)
          if (h || groups.length === 0) groups.push({ head: h, items: [] })
          groups[groups.length - 1].items.push([p, i])
        })
        return (
          <div>
            {groups.map((gp, gi) => (
              <Fragment key={gi}>
                {gp.head}
                <div className="columns-2 md:columns-3 lg:columns-4" style={{ columnGap: look.gap }}>
                  {gp.items.map(([p, i]) => tile(p, i, { head: false, ratio: Math.min(1.2, Math.max(0.75, arOf(p))), wrap: 'break-inside-avoid', style: { marginBottom: look.gap } }))}
                </div>
              </Fragment>
            ))}
          </div>
        )
      }
    }
  })()
  const CAS = "'Libre Caslon Display', Georgia, serif"
  const zOf = (k: string) => {
    const z = (el as Record<string, { z?: number } | undefined> | undefined)?.[k]?.z
    return typeof z === 'number' && Number.isFinite(z) ? Math.min(99, Math.max(1, Math.round(z))) : (({ initials: 2, title: 3, brand: 4, count: 4 } as Record<string, number>)[k] ?? 3)
  }
  const stg = (kids: ReactNode, kk = '') => (
    <Fragment key={'stg-' + coverKind + kk}>
      {((Array.isArray(kids) ? kids : [kids]) as (ReactElement | null)[]).filter((c): c is ReactElement => !!c).map((c, n) => {
        const gk = String((c.props as Record<string, unknown>)['data-gk'] ?? (c.key === 'bt-clip' ? 'title' : 'initials'))
        return <CoverStage key={String(c.key ?? 'i' + n)} z={zOf(gk)}>{c}</CoverStage>
      })}
    </Fragment>
  )
  type BxO = { x: number; y: number; fs: number; text: string; maxW: number; style?: CSSProperties; track?: number; lh?: number; rot?: number; ls?: { r: number; style?: CSSProperties }[]; mirror?: boolean }
  const bx = (k: string, o: BxO) => {
    const w = extraW(k)
    const lh = o.lh ?? 1.1
    return (
      <div key={k + (o.mirror ? '-m' : '')} data-gk={k} data-box="1" data-center="1" data-raw={o.text} {...(o.mirror ? { 'data-mirror': '1' } : {})} style={{ position: 'absolute', left: o.x, top: o.y, transform: 'translate(-50%, -50%)' + (o.rot ? ' rotate(' + o.rot + 'deg)' : ''), width: w ?? 'max-content', maxWidth: w ? undefined : Math.round(o.maxW * 1.15), textAlign: 'center', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: lh, fontSize: o.fs, fontWeight: 400, fontStyle: 'normal', letterSpacing: o.track !== undefined ? o.track + 'em' : undefined, pointerEvents: o.mirror ? 'none' : 'auto', cursor: 'grab', ...o.style }}>
        {o.text.split('\n').map((l, i) => { const L = o.ls ? o.ls[Math.min(i, o.ls.length - 1)] : null; return <div key={i} style={L ? { fontSize: L.r + 'em', lineHeight: lh / L.r, ...L.style } : undefined}>{l || String.fromCharCode(160)}</div> })}
      </div>
    )
  }
  const fit = (t: string, cw: number, cap: number, fs0: number) => Math.min(fs0, cap / (Math.max(...t.split('\n').map((x) => x.length), 1) * cw))
  const tl = (def: string[]) => (String(coverTitle).includes('\n') ? String(coverTitle) : def.join('\n'))
  const sl = (def: string[]) => (String(coverSub).includes('\n') ? String(coverSub) : def.join('\n'))
  const pill = (on: boolean): CSSProperties => (on ? { background: pal.accent, color: pal.onAccent, border: '1px solid transparent' } : { border: `1px solid ${pal.line}`, color: pal.ink })

  return (
    <div className="gal-root min-h-screen" style={{ background: pal.bg, color: pal.ink }}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Bodoni+Moda:wght@400&display=swap" />
      {elRules && <style>{elRules}</style>}
      <div data-cover-wrap style={{ background: coverPal.bg, color: coverPal.ink, position: 'relative' }}>{(coverKind === 'blank' ? [] : extraKeys).map((k, i) => xBox(k, i))}{photoKeys.length > 0 && <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs><clipPath id="camheart" clipPathUnits="objectBoundingBox"><path d="M0.5,0.97 C0.08,0.68 0,0.46 0,0.29 C0,0.11 0.12,0 0.27,0 C0.37,0 0.46,0.06 0.5,0.15 C0.54,0.06 0.63,0 0.73,0 C0.88,0 1,0.11 1,0.29 C1,0.46 0.92,0.68 0.5,0.97 Z" /></clipPath></defs></svg>}{(coverKind === 'blank' ? [] : photoKeys).map((k) => phBox(k))}{(() => { const pal = coverPal; return (coverKind === 'blank' ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1' }}>
          <h1 className="sr-only">{coverTitle}</h1>
          {stg([...extraKeys.map((k, i) => xBox(k, i)), ...photoKeys.map((k) => phBox(k))], 'b')}
          {extraKeys.length + photoKeys.length === 0 && designPreview !== null ? <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm" style={{ color: coverPal.ink, opacity: 0.45, pointerEvents: 'none' }}>Blank canvas. Use Add to place text and photos here.</p> : null}
        </div>
      ) : coverKind === 'ticket' && cover?.web ? (() => {
        const words = String(coverTitle).trim().split(/\s+/).filter(Boolean)
        const one = words.length <= 1
        const l1 = one ? '' : words.slice(0, -1).join(' ')
        const l2 = one ? (words[0] || '') : words[words.length - 1]
        const tt: React.CSSProperties = { ...headStyle, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fill: 'currentColor', color: '#3A1F12', pointerEvents: 'auto' }
        const sub = coverSub ? String(coverSub) : ''
        const big1 = l1.length <= 8
        const f1 = big1 ? 71 : Math.max(24, 270 / (0.62 * l1.length))
        const f2 = big1 ? 105.9 : Math.min(105.9, f1 * 1.41)
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: '#F5DDC2 url(/gallery-cover/ticket.png) center / 100% 100% no-repeat' }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;800&family=DM+Serif+Display&display=swap" />
            <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true"><defs><clipPath id="tkclip" clipPathUnits="objectBoundingBox"><path transform="scale(0.0011111 0.0022222)" d="M24 93 L24 184 L26 184 L27 185 L27 194 L37 204 L37 205 L40 208 L40 209 L44 216 L44 218 L45 219 L45 221 L46 222 L46 225 L47 226 L47 235 L48 236 L47 237 L47 246 L46 247 L46 250 L45 251 L44 256 L43 257 L40 264 L37 267 L37 268 L27 278 L27 285 L26 286 L24 286 L24 356 L55 388 L56 388 L57 389 L537 389 L538 388 L539 388 L545 382 L545 58 L543 56 L542 56 L541 55 L60 55 L59 56 L58 56 L51 63 L51 64 L40 75 L40 76 L29 87 L29 88 Z" /></clipPath><clipPath id="tkart" clipPathUnits="objectBoundingBox"><path transform="scale(0.0011111 0.0022222)" d="M22 92 L22 169 L109 169 L110 170 L110 299 L109 300 L22 300 L22 357 L54 390 L56 390 L57 391 L537 391 L538 390 L540 390 L547 383 L547 57 L544 54 L542 54 L541 53 L60 53 L59 54 L57 54 L49 62 L49 63 L38 74 L38 75 Z M570 83 H873 V202.5 H846 V270 H873 V367 H570 Z" /></clipPath></defs></svg>
            <div className="absolute inset-0" style={{ clipPath: 'url(#tkclip)' }}>
              <div className="absolute overflow-hidden" style={{ left: '2.9cqw', top: '6.2cqw', width: '57.6cqw', height: '37cqw', background: pal.line }}>
                <div className="absolute inset-0">{imgEl}</div>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery-cover/ticket-art.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full" style={{ clipPath: 'url(#tkart)' }} />
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              </svg>{stg([
bx('title', { x: 716, y: one ? 240 - 0.35 * f2 : (181 - 0.35 * f1 + (big1 ? 264.1 : 181 + f2 * 0.84) - 0.35 * f2) / 2, fs: f2 * Math.min(1, 250 / Math.max(l1.length * 0.66 * f1, l2.length * 0.56 * f2, 1)), maxW: 270, text: tl(one ? [l2] : [l1, l2]), lh: one ? 1.05 : ((big1 ? 264.1 : 181 + f2 * 0.84) - 181) / f2, ls: one ? [{ r: 1, style: { fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 } }] : [{ r: f1 / f2, style: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800 } }, { r: 1, style: { fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400 } }], style: { color: '#3A1F12', textTransform: 'uppercase' } }),
sub ? bx('brand', { x: 718, y: 305, fs: 14, maxW: 270, track: 0.41, text: sl([sub]), style: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: '#3A1F12', textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'circle' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: pal.bg }}>
          <div className="absolute overflow-hidden" style={{ left: '30.9cqw', top: '0.8cqw', width: '38.1cqw', height: '38.1cqw', borderRadius: '50%', border: '0.33cqw solid ' + pal.accent, background: pal.line }}>
            <div className="absolute inset-0">{imgEl}</div>
          </div>
          <h1 className="sr-only">{coverTitle}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>{stg([
bx('title', { x: 450, y: 369.9, fs: fit(tl([String(coverTitle)]), 0.48, 450, 87.2), maxW: 408, text: tl([String(coverTitle)]), style: { fontFamily: CAS, color: pal.ink } }),
coverSub ? bx('brand', { x: 450, y: 431, fs: 10.9, maxW: 288, track: 0.81, text: sl([String(coverSub)]), style: { fontFamily: CAS, color: pal.ink, textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
          </svg>
        </div>
      ) : coverKind === 'mosaic' && cover?.web ? (() => {
        const pool = [cover, ...data.photos.filter((p) => p.id !== cover.id)].filter((p) => p.thumb || p.web)
        const tiles = [
          { x: 8, y: 8, w: 198, h: 433 }, { x: 210, y: 7, w: 195, h: 243 }, { x: 409, y: 8, w: 176, h: 242 },
          { x: 210, y: 254, w: 175, h: 187 }, { x: 390, y: 254, w: 195, h: 187 },
        ]
        const raw = String(coverTitle).trim()
        const parts = raw.split(/\s*(?:&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean)
        const words = raw.split(/\s+/).filter(Boolean)
        const l1 = parts.length >= 2 ? parts[0] : words.length > 1 ? words.slice(0, -1).join(' ') : raw
        const l2 = parts.length >= 2 ? '& ' + parts[parts.length - 1] : words.length > 1 ? words[words.length - 1] : ''
        const ts: CSSProperties = { ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: pal.bg }}>
            <h1 className="sr-only">{coverTitle}</h1>
            {tiles.map((t, i) => {
              const ph = slotPh('s' + i, pool[i % pool.length])
              return (
                <div key={i} className="absolute overflow-hidden" style={{ left: (t.x / 9) + 'cqw', top: (t.y / 9) + 'cqw', width: (t.w / 9) + 'cqw', height: (t.h / 9) + 'cqw', background: pal.line }}>
                  {slotImg('s' + i, ph, ph?.thumb || ph?.web || undefined)}
                </div>
              )
            })}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }}>
              </svg>{stg([
bx('title', { x: 745.2, y: l2 ? 196.5 : 190.3 - 0.35 * 91.5, fs: fit(tl(l2 ? [l1, l2] : [l1]), 0.49, 290, 91), maxW: 262, lh: 0.834, text: tl(l2 ? [l1, l2] : [l1]), style: { fontFamily: CAS, color: pal.ink } }),
coverSub ? bx('brand', { x: 745.5, y: 305.2, fs: 11.1, maxW: 233, track: 0.65, text: sl([String(coverSub)]), style: { fontFamily: CAS, color: pal.ink, textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'postcard' && cover?.web ? (() => {
        const words = String(coverTitle).trim().split(/\s+/).filter(Boolean)
        const one = words.length <= 1
        const l1 = one ? (words[0] || '') : words.slice(0, -1).join(' ')
        const l2 = one ? '' : words[words.length - 1]
        const sc: CSSProperties = { fontFamily: "'Hurricane', 'Homemade Apple', cursive", fontWeight: 400, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0, fill: 'currentColor', color: '#3A2A22', pointerEvents: 'auto' }
        const pm: CSSProperties = { ...sc, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: '#2A2018' }
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        const ci = sub.indexOf(',')
        const sw = sub.split(' ')
        const half = Math.ceil(sw.length / 2)
        const pmL: string[] = !sub ? [] : ci > 0 ? [sub.slice(0, ci + 1).trim(), sub.slice(ci + 1).trim()] : sw.length > 1 ? [sw.slice(0, half).join(' '), sw.slice(half).join(' ')] : [sub]
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: '#E8D5BA' }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hurricane&family=Playfair+Display:wght@500&display=swap" />
            <div className="absolute overflow-hidden" style={{ left: '6.92cqw', top: '5.16cqw', width: '46.67cqw', height: '40.67cqw', transform: 'rotate(-3deg)', background: pal.line }}>
              <div className="absolute inset-0">{imgEl}</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery-cover/postcard-art.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              </svg>{stg([
pmL.length ? bx('brand', { x: 631, y: pmL[1] ? 88.5 : 93, fs: 17, maxW: 120, track: -0.07, lh: 1.235, text: sl(pmL), style: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: '#2A2018', textTransform: 'uppercase' } }) : null,
bx('title', { x: 684.3, y: l2 ? 245.6 : 244 - 36, fs: fit(tl(l2 ? [l1, l2] : [l1]), 0.39, 280, 104.1), maxW: 333, rot: -4.5, lh: 0.71, text: tl(l2 ? [l1, l2] : [l1]), ls: [{ r: 1 }, { r: 98 / 104.1 }], style: { fontFamily: "'Hurricane', 'Homemade Apple', cursive", color: '#3A2A22' } }),
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'bigtype' && cover?.web ? (() => {
        const t = String(coverTitle).toUpperCase()
        const n = Math.max(t.length, 1)
        const tsz = Number((el as Record<string, { size?: number }> | undefined)?.title?.size) || 133.3
        const len = Math.min(890, 78.99 * n * (tsz / 133.3))
        const inCol = (el as Record<string, { color?: string }> | undefined)?.titlein?.color || pal.bg
        const ts: CSSProperties = { ...headStyle, fontFamily: "'Bodoni Moda', Georgia, serif", fontWeight: 400, fontStyle: 'normal', letterSpacing: 0, textTransform: 'uppercase' }
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: pal.bg }}>
            <div className="absolute overflow-hidden" style={{ left: '5.9cqw', top: '4.55cqw', width: '88.1cqw', height: '37.8cqw', background: pal.line }}>
              <div className="absolute inset-0">{imgEl}</div>
            </div>
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              <defs><clipPath id="bt-photo"><rect x="53" y="41" width="793" height="340" /></clipPath></defs>
              </svg>{stg([
sub ? bx('brand', { x: 844 - Math.min(206, 11.44 * sub.length) / 2, y: 19.8, fs: 11.5, maxW: 206, track: 0.3, text: sl([String(coverSub)]), style: { fontFamily: "'Bodoni Moda', Georgia, serif", color: pal.ink, textTransform: 'uppercase' } }) : null,
bx('title', { x: 454.5, y: 387.3, fs: fit(tl([String(coverTitle)]), 0.64, 900, 133.3), maxW: 890, text: tl([String(coverTitle)]), style: { fontFamily: "'Bodoni Moda', Georgia, serif", color: pal.ink, textTransform: 'uppercase' } }),
<div key="bt-clip" style={{ position: 'absolute', left: 53.1, top: 40.95, width: 792.9, height: 340.2, overflow: 'hidden', pointerEvents: 'none' }}><div style={{ position: 'absolute', left: -53.1, top: -40.95, width: 900, height: 450, pointerEvents: 'none' }}>{bx('title', { x: 454.5, y: 387.3, fs: fit(tl([String(coverTitle)]), 0.64, 900, 133.3), maxW: 890, text: tl([String(coverTitle)]), mirror: true, style: { fontFamily: "'Bodoni Moda', Georgia, serif", color: inCol, WebkitTextFillColor: inCol, textTransform: 'uppercase' } })}</div></div>,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'strip' && cover?.web ? (() => {
        const pool = [cover, ...data.photos.filter((p) => p.id !== cover.id)].filter((p) => p.thumb || p.web)
        const frames = Array.from({ length: 5 }, (_, i) => slotPh('s' + i, pool[i % pool.length]))
        const FX = [8, 180, 352, 555, 727]
        const FW = [163, 163, 192, 161, 165]
        const ts: CSSProperties = { ...headStyle, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0, fill: 'currentColor', pointerEvents: 'auto' }
        const title = String(coverTitle)
        const tf = Math.min(78.2, (78.2 * 10) / Math.max(title.length, 10))
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: '#271407' }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap" />
            <h1 className="sr-only">{coverTitle}</h1>
            {frames.map((p, i) => (
              <div key={i} className="absolute overflow-hidden" style={{ left: ((FX[i] - 1) / 9) + 'cqw', top: (228 / 9) + 'cqw', width: ((FW[i] + 2) / 9) + 'cqw', height: (162 / 9) + 'cqw', background: pal.line }}>
                {slotImg('s' + i, p, p?.thumb || p?.web || undefined)}
              </div>
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery-cover/strip-art.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              </svg>{stg([
bx('title', { x: 451.5, y: 106.7 - 0.35 * tf, fs: tf, maxW: 429, text: tl([title]), style: { fontFamily: CAS, color: '#FFF6EA' } }),
sub ? bx('brand', { x: 450.5, y: 155.2, fs: 11.4, maxW: 327, track: 0.85, text: sl([String(coverSub)]), style: { fontFamily: CAS, color: 'rgba(255,246,234,0.9)', textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'arch' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: pal.bg }}>
          <div className="absolute overflow-hidden" style={{ left: '4.2cqw', top: '0.8cqw', width: '40.6cqw', height: '48.2cqw', borderTopLeftRadius: '20.3cqw', borderTopRightRadius: '20.3cqw', background: pal.line }}>
            <div className="absolute inset-0">{imgEl}</div>
          </div>
          <h1 className="sr-only">{coverTitle}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>{stg([
bx('title', { x: 655, y: 201, fs: fit(tl([String(coverTitle)]), 0.48, 450, 95.8), maxW: 405, text: tl([String(coverTitle)]), style: { fontFamily: CAS, color: pal.ink } }),
coverSub ? bx('brand', { x: 660.5, y: 269.5, fs: 17.75, maxW: 275, track: 0.53, text: sl([String(coverSub)]), style: { fontFamily: CAS, color: pal.ink, textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
          </svg>
        </div>
      ) : coverKind === 'stack' && cover?.web ? (() => {
        const others = data.photos.filter((p) => p.id !== cover.id && (p.thumb || p.web)).slice(0, 3)
        const sph = (i: number) => slotPh('s' + i, others[i])
        const pic = (i: number) => (sph(i)?.thumb || sph(i)?.web || cover.web || undefined)
        const slots = [
          { cx: 168.5, cy: 191, w: 183.5, h: 171.7, a: -10.8, src: pic(0), ph: sph(0) },
          { cx: 295, cy: 110.5, w: 189.8, h: 161.7, a: -10.6, src: pic(1), ph: sph(1) },
          { cx: 719.8, cy: 196, w: 200.3, h: 175.8, a: 13.7, src: pic(2), ph: sph(2) },
        ]
        const title = String(coverTitle)
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        const sc: CSSProperties = { fontFamily: "'Qwigley', 'Homemade Apple', cursive", fontWeight: 400, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0, fill: 'currentColor', color: '#5A3A28', pointerEvents: 'auto' }
        const ss: CSSProperties = { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, fontStyle: 'normal', textTransform: 'uppercase', letterSpacing: 0, fill: 'currentColor', color: '#6B4F3C', pointerEvents: 'auto' }
        const box = (cx: number, cy: number, w: number, h: number, a: number): CSSProperties => ({ left: ((cx - w / 2) / 9) + 'cqw', top: ((cy - h / 2) / 9) + 'cqw', width: (w / 9) + 'cqw', height: (h / 9) + 'cqw', transform: 'rotate(' + a + 'deg)' })
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: '#F3E4CB' }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Qwigley&family=Playfair+Display:wght@500&display=swap" />
            {slots.map((sl, k) => (
              <div key={k} className="absolute overflow-hidden" style={{ ...box(sl.cx, sl.cy, sl.w + 12, sl.h + 12, sl.a), background: pal.line }}>
                {slotImg('s' + k, sl.ph, sl.src)}
              </div>
            ))}
            <div className="absolute overflow-hidden" style={{ ...box(473, 169.7, 304.7, 262.8, 3.96), background: pal.line }}>
              <div className="absolute inset-0">{imgEl}</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery-cover/stack-art.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              </svg>{stg([
bx('title', { x: 450.5, y: 369.3, fs: fit(tl([title]), 0.34, 500, 70), maxW: 478, text: tl([title]), style: { fontFamily: "'Qwigley', 'Homemade Apple', cursive", color: '#5A3A28' } }),
sub ? bx('brand', { x: 448, y: 425, fs: 14, maxW: 230, track: 0.71, text: sl([String(coverSub)]), style: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: '#6B4F3C', textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'diptych' && cover?.web ? (() => {
        const second = slotPh('s0', data.photos.find((p) => p.id !== cover.id && p.web))
        const lines = String(coverTitle).split(/\s*(&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean).map((x) => (/^(and)$/i.test(x) ? '&' : x === '+' ? '&' : x))
        const ts: CSSProperties = { ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }
        const tBoxW = (el as Record<string, { w?: number } | undefined>).title?.w
        const boxW = typeof tBoxW === 'number' && Number.isFinite(tBoxW) ? Math.min(420, Math.max(14, tBoxW)) : 100
        const tLines = String(coverTitle).includes('\n') ? String(coverTitle).split('\n') : lines
        return (
          <div className="relative grid w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', gridTemplateColumns: '1fr minmax(84px, 13%) 1fr', background: pal.bg }}>
            <div className="relative overflow-hidden" style={{ background: pal.line }}><div className="absolute inset-0">{imgEl}</div></div>
            <div style={{ background: pal.bg }} />
            <div className="relative overflow-hidden" style={{ background: pal.line }}>
              <div className="absolute inset-0">{slotImg('s0', second ?? cover, second?.web || cover.web || undefined, second ? '50% 50%' : '85% 50%')}</div>
            </div>
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              </svg>{stg([
bx('title', { x: 451, y: 205, fs: fit(tLines.join('\n'), 0.48, 150, 38), maxW: 150, lh: 1.12, text: tLines.join('\n'), style: { fontFamily: CAS, color: pal.ink } }),
coverSub ? bx('brand', { x: 450.5, y: 288.5, fs: 6.8, maxW: 89, track: 0.43, text: sl([String(coverSub)]), style: { fontFamily: CAS, color: pal.ink, textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'magazine' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: pal.line }}>
          <div className="absolute inset-0">{imgEl}</div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0) 42%)' }} />
          <h1 className="sr-only">{coverTitle}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>{stg([
bx('title', { x: 451.5, y: 48, fs: fit(tl([String(coverTitle)]), 0.48, 880, 117.3), maxW: 814, text: tl([String(coverTitle)]), style: { fontFamily: CAS, color: '#FCF4E6' } }),
coverSub ? bx('brand', { x: 42.5 + Math.min(199, 13.2 * String(coverSub).length) / 2, y: 129.2, fs: 12.4, maxW: 199, track: 0.4, text: sl([String(coverSub)]), style: { fontFamily: CAS, color: '#FCF4E6', textTransform: 'uppercase' } }) : null,
!(el as Record<string, { hide?: boolean }> | undefined)?.count?.hide ? bx('count', { x: 855 - Math.min(300, 14.27 * (countText || data.photos.length + ' photos').length) / 2, y: 129.2, fs: 12.4, maxW: 300, track: 0.49, text: countText || data.photos.length + ' photos', style: { fontFamily: CAS, color: '#FCF4E6', textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
          </svg>
        </div>
) : coverKind === 'monogram' && cover?.web ? (() => {
        const parts = String(coverTitle).split(/\s*(?:&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean)
        const custom = String((el as Record<string, { text?: string }> | undefined)?.initials?.text ?? '').trim()
        const cch = custom.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        const pair = custom ? cch.length >= 2 : parts.length >= 2
        const L = custom ? (cch[0] || '') : pair ? parts[0][0].toUpperCase() : ''
        const R = custom ? (cch[1] || '') : pair ? parts[1][0].toUpperCase() : ''
        const mono = custom ? custom.toUpperCase() : (parts[0] || '').split(/\s+/).slice(0, 2).map((w) => w[0]).join(' ').toUpperCase()
        const ff = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
        const big = { position: 'absolute' as const, fontFamily: ff, fontWeight: 300, lineHeight: 1, color: 'rgba(255,255,255,0.58)', whiteSpace: 'nowrap' as const }
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: pal.line }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" />
            <div className="absolute inset-0">{imgEl}</div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28))' }} />
            {pair ? (
              stg(
                <div data-gk="initials" data-box="1" data-center="1" data-nowidth="1" style={{ position: 'absolute', left: 448, top: 205.9, width: '1.8em', height: '0.74em', transform: 'translate(-50%, -50%)', fontFamily: "'Libre Caslon Display', Georgia, serif", fontWeight: 400, fontSize: 448.3, color: 'rgba(255,255,255,0.58)', lineHeight: 1, pointerEvents: 'auto', cursor: 'grab' }}>
                  {[
                    { t: L, x: -0.6079, y: -0.1308, r: 1, tf: 'scaleX(0.89)' },
                    { t: '&', x: -0.0022, y: 0.1343, r: 0.644, tf: 'skewX(-8deg) scaleX(0.871)' },
                    { t: R, x: 0.5644, y: -0.1477, r: 1.0243, tf: 'scaleX(0.89)' },
                  ].map((q, i) => <span key={i} style={{ position: 'absolute', left: 'calc(50% + ' + Math.round((q.x / q.r) * 10000) / 10000 + 'em)', top: Math.round((q.y / q.r) * 10000) / 10000 + 'em', fontSize: q.r + 'em', lineHeight: 1, whiteSpace: 'nowrap', transform: 'translateX(-50%) ' + q.tf, transformOrigin: '50% 85.2%' }}>{q.t}</span>)}
                </div>,
                'i'
              )
            ) : (
              <div data-gk="initials" className="absolute inset-0 flex items-center justify-center" style={{ ...big, position: 'absolute', fontSize: '50cqw', paddingBottom: '4cqw' }}>{mono}</div>
            )}
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              </svg>{stg([
bx('title', { x: 454, y: 392.2, fs: 29.73, maxW: 266, track: 0.1, text: tl([String(coverTitle)]), style: { fontFamily: ff, fontWeight: 600, color: '#F9EAD6', fontVariantNumeric: 'lining-nums' } }),
coverSub ? bx('brand', { x: 454.75, y: 422, fs: 10.04, maxW: 220, track: 0.6, text: sl([String(coverSub)]), style: { fontFamily: ff, fontWeight: 600, color: 'rgba(244,230,212,0.95)', textTransform: 'uppercase', fontVariantNumeric: 'lining-nums' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>
          </div>
        )
      })() : coverKind === 'cinema' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: cineBg }}>
          <div className="absolute overflow-hidden" style={{ left: 0, right: 0, top: '4.1cqw', height: '39.1cqw' }}>
            <div className="absolute inset-0">{imgEl}</div>
          </div>
          <h1 className="sr-only">{coverTitle}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            </svg>{stg([
bx('title', { x: 450, y: 409.9, fs: 22, maxW: 304, track: 0.56, text: tl([String(coverTitle)]), style: { fontFamily: CAS, color: cineLight ? '#2A1F24' : '#F1E6D2', textTransform: 'uppercase' } }),
coverSub ? bx('brand', { x: 450.5, y: 433.8, fs: 7.9, maxW: 147, track: 0.77, text: sl([String(coverSub)]), style: { fontFamily: CAS, color: cineLight ? 'rgba(42,31,36,0.75)' : 'rgba(241,230,210,0.8)', textTransform: 'uppercase' } }) : null,
])}<svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
          </svg>
        </div>
) : coverKind === 'text' || !cover?.web ? (
        <div className="px-6 py-20 text-center">
          {brandLine}
          {titleEl('text-4xl sm:text-5xl')}
        </div>
      ) : coverKind === 'split' ? (
        <div className="grid min-h-[60vh] md:grid-cols-2">
          <div className="flex flex-col justify-center px-8 py-14 sm:px-14">
            {brandLine}
            {titleEl('text-4xl sm:text-5xl')}
          </div>
          <div className="relative min-h-[320px] overflow-hidden"><div className="absolute inset-0">{imgEl}</div></div>
        </div>
      ) : coverKind === 'frame' ? (
        <div className="px-6 pb-4 pt-8 text-center sm:px-14">
          <div className="mx-auto max-w-4xl" style={{ border: `1px solid ${pal.line}`, padding: 12, borderRadius: look.radius }}>
            <div className="h-[50vh] min-h-[280px] overflow-hidden" style={{ borderRadius: Math.max(0, look.radius - 4) }}>{imgEl}</div>
          </div>
          <div className="mt-8">
            {brandLine}
            {titleEl('text-3xl sm:text-4xl')}
          </div>
        </div>
      ) : coverKind === 'below' ? (
        <div>
          <div className="h-[50vh] min-h-[280px] w-full overflow-hidden">{imgEl}</div>
          <div className="px-6 py-10 text-center">
            {brandLine}
            {titleEl('text-3xl sm:text-4xl')}
          </div>
        </div>
      ) : (
        <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden" style={{ background: pal.line }}>
          {imgEl}
          <div className={'absolute inset-0 flex p-6 sm:p-10 ' + (coverKind === 'center' ? 'items-center justify-center bg-black/35 text-center' : 'items-end bg-gradient-to-t from-black/65 via-black/10 to-transparent')}>
            <div className="text-white">
              {coverSub && <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/80">{coverSub}</p>}
              <h1 className={`${headCls} text-4xl sm:text-5xl`} style={headStyle}>{coverTitle}</h1>
            </div>
          </div>
        </div>
      )) })()}</div>

      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 backdrop-blur" style={{ background: `${pal.bg}F2`, borderBottom: `1px solid ${pal.line}` }}>
        {!cover?.web ? (
          <h2 data-gk="title" className={`${headCls} text-xl`} style={headStyle}>{coverTitle}</h2>
        ) : (
          <span data-gk="count" className="text-sm" style={{ color: pal.soft }}>{countText || `${data.photos.length} photos`}</span>
        )}
        <div className="flex items-center gap-2 text-sm">
          {data.allowDownloads && list.length > 0 && (
            <button data-gk="download" onClick={downloadAll} disabled={zip.busy} className="rounded-full px-4 py-1.5 transition disabled:opacity-60" style={pill(false)}>
              {zip.busy ? (zip.total ? `Zipping ${zip.done}/${zip.total}` : 'Preparing…') : onlyFavs ? 'Download favorites' : 'Download all'}
            </button>
          )}
          {data.photos.some((p) => p.tags && p.tags.length > 0) && (
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search photos" className="w-36 rounded-full px-4 py-1.5 text-sm outline-none sm:w-48" style={{ ...pill(false), cursor: 'text' }} />
          )}
          <button data-gk="all" onClick={() => setOnlyFavs(false)} className="rounded-full px-4 py-1.5 transition" style={pill(!onlyFavs)}>All</button>
          <button data-gk="favs" onClick={() => setOnlyFavs(true)} className="flex items-center gap-1.5 rounded-full px-4 py-1.5 transition" style={pill(onlyFavs)}>
            <Heart filled={onlyFavs} className="h-4 w-4" /> {favs.size}
          </button>
        </div>
      </div>

      {zip.busy && zip.total > 0 && (
        <p className="px-6 pt-3 text-center text-sm" style={{ color: pal.soft }}>Keep this tab open until your download finishes.</p>
      )}
      {dlPrompt && data && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-full bg-white px-5 py-3 shadow-xl">
            <span className="text-sm text-neutral-800">Download all {data.photos.length} photos?</span>
            <button type="button" onClick={() => { setDlPrompt(false); void downloadAll() }} className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white">Download all</button>
            <button type="button" onClick={() => setDlPrompt(false)} className="text-sm text-neutral-500">Not now</button>
          </div>
        </div>
      )}
      {zip.error && <p className="px-6 pt-3 text-center text-sm text-red-600">{zip.error}</p>}

      <main className="px-3 py-4 sm:px-6">
        {list.length === 0 ? (
          <p className="py-20 text-center text-sm" style={{ color: pal.soft }}>
            {query.trim() ? 'No photos match your search.' : onlyFavs ? 'No favorites yet. Tap the heart on any photo.' : 'No photos in this gallery yet.'}
          </p>
        ) : (
          gridEl
        )}
      </main>
      {data && (
        <div className="px-4">
          <ReviewCard access={data.access} visitorId={visitorId()} studio={brand?.name ?? null} accent={brand?.accent ?? null} />
        </div>
      )}

      <footer data-gk="footer" className="py-10 text-center text-xs" style={{ color: pal.soft }}>{brand?.name ? `${brand.name} · ` : ''}Delivered with Camrhia</footer>

      {current && openIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpenIndex(null)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm opacity-70">{openIndex + 1} / {list.length}</span>
            <div className="flex items-center gap-4">
              <button onClick={() => toggleFav(current.id)} aria-label="Favorite" className="text-white" style={favs.has(current.id) ? { color: heart } : undefined}>
                <Heart filled={favs.has(current.id)} className="h-6 w-6" />
              </button>
              {data.allowDownloads && (
                <button
                  type="button"
                  onClick={() => savePhoto(current)}
                  className="rounded-full border border-white/40 px-4 py-1.5 text-sm hover:bg-white/10"
                >
                  {isTouch ? 'Save photo' : 'Download'}
                </button>
              )}
              <button onClick={() => setOpenIndex(null)} className="text-2xl leading-none">×</button>
            </div>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
            {wmEl}
            {openIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpenIndex(openIndex - 1) }}
                className="absolute left-2 z-10 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
                aria-label="Previous"
              >
                ‹
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.web ?? current.thumb ?? ''}
              alt={current.filename ?? ''}
              onClick={(e) => e.stopPropagation()}
              className="max-h-full max-w-full object-contain"
            />
            {openIndex < list.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setOpenIndex(openIndex + 1) }}
                className="absolute right-2 z-10 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20"
                aria-label="Next"
              >
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
