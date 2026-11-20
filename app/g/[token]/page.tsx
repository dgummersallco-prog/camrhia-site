'use client'

import { Fragment, type CSSProperties } from 'react'
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
    const imgAt = (x: number, y: number) => {
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
    const sendZoom = (z: number) => {
      const v = Math.round(Math.min(3, Math.max(1, z)) * 100) / 100
      zl = v
      zt = Date.now()
      window.parent?.postMessage({ type: 'camrhia-gallery-zoom', zoom: v }, '*')
    }
    const baseZoom = (img: HTMLImageElement) => (zl !== null && Date.now() - zt < 400 ? zl : curZoom(img))
    const MOVABLE = ['title', 'title2', 'brand', 'count', 'initials']
    let tdrag: { key: string; x: number; y: number; k: number; moved: boolean } | null = null
    const down = (e: MouseEvent) => {
      if (e.button !== 0) return
      const tg = (e.target as Element | null)?.closest?.('[data-gk]') as Element | null
      const gk = tg?.getAttribute('data-gk') ?? ''
      if (tg && (MOVABLE.includes(gk) || /^x\d+$/.test(gk))) {
        const svg = (tg as SVGElement).ownerSVGElement
        const k = svg ? svg.getBoundingClientRect().width / (svg.viewBox.baseVal?.width || 900) || 1 : 1
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
      const img = coverImg()
      if (!img || !inside(img, e.clientX, e.clientY)) return
      e.preventDefault()
      sendZoom(baseZoom(img) * Math.exp(-e.deltaY * 0.01))
    }
    const gStart = (e: Event) => {
      const img = coverImg()
      if (!img) return
      e.preventDefault()
      gBase = curZoom(img)
    }
    const gChange = (e: Event) => {
      const ge = e as Event & { scale?: number; clientX?: number; clientY?: number }
      const img = coverImg()
      if (!img || !ge.scale) return
      if (typeof ge.clientX === 'number' && typeof ge.clientY === 'number' && !inside(img, ge.clientX, ge.clientY)) return
      e.preventDefault()
      sendZoom(gBase * ge.scale)
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
    st.textContent = '.gal-root [data-gk="moment"]{cursor:grab}'
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

  // Preview only: hover names and click-to-edit for the gallery lines.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const NAMES: Record<string, string> = { title: 'Gallery title', brand: 'Studio name', count: 'Photo count', download: 'Download button', all: 'All button', favs: 'Favorites button', moment: 'Section heading', footer: 'Footer line', photos: 'Photos', initials: 'Cover initials', title2: 'Gallery title line 2', ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => ['x' + (i + 1), 'Text'])) }
    const box = document.createElement('div')
    box.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:1.5px dashed #d9a21b;border-radius:3px;display:none'
    const tag = document.createElement('div')
    tag.style.cssText = 'position:absolute;left:-1.5px;bottom:100%;margin-bottom:3px;background:#1f1a14;color:#fff;font:600 11px/1 system-ui,sans-serif;padding:4px 7px;border-radius:4px;white-space:nowrap'
    box.appendChild(tag)
    document.body.appendChild(box)
    const hit = (t: EventTarget | null) => {
      const el = (t as HTMLElement | null)?.closest?.('[data-gk],h1') as HTMLElement | null
      if (!el) return null
      const k = el.getAttribute('data-gk') ?? 'title'
      return NAMES[k] ? { el, k } : null
    }
    let curEl: HTMLElement | null = null
    let rafId = 0
    const follow = () => {
      if (curEl && box.style.display === 'block') {
        if (!curEl.isConnected) { box.style.display = 'none'; curEl = null }
        else {
          const rr = curEl.getBoundingClientRect()
          box.style.left = rr.left + 'px'
          box.style.top = rr.top + 'px'
          box.style.width = rr.width + 'px'
          box.style.height = rr.height + 'px'
        }
      }
      rafId = requestAnimationFrame(follow)
    }
    rafId = requestAnimationFrame(follow)
    const over = (e: MouseEvent) => {
      const h = hit(e.target)
      curEl = h ? h.el : null
      if (!h) { box.style.display = 'none'; return }
      const r = h.el.getBoundingClientRect()
      box.style.display = 'block'
      box.style.left = r.left + 'px'
      box.style.top = r.top + 'px'
      box.style.width = r.width + 'px'
      box.style.height = r.height + 'px'
      tag.textContent = NAMES[h.k] + ' · click to edit'
      const flip = r.top < 28
      tag.style.bottom = flip ? 'auto' : '100%'
      tag.style.top = flip ? '100%' : 'auto'
    }
    const hide = () => { box.style.display = 'none'; curEl = null }
    let editor: HTMLInputElement | null = null
    let hidden: HTMLElement | null = null
    let secOn = false
    const closeEditor = () => { if (editor) { editor.remove(); editor = null } if (hidden) { hidden.style.visibility = ''; hidden = null } }
    const openEditor = (target: HTMLElement, k: string) => {
      if (!['title', 'title2', 'brand', 'count', 'initials', 'moment'].includes(k) && !/^x\d+$/.test(k)) return
      const key = k === 'title2' ? 'title' : k
      const orig = k === 'moment' ? (target.textContent ?? '') : textRef.current[key] ?? ''
      closeEditor()
      const r = target.getBoundingClientRect()
      const cs = getComputedStyle(target)
      const isSvg = target instanceof SVGElement
      const sc = isSvg ? ((target as unknown as SVGGraphicsElement).getScreenCTM?.()?.a ?? 1) : 1
      const fs = (parseFloat(cs.fontSize) || 16) * sc
      const colr = isSvg && cs.fill && cs.fill !== 'none' ? cs.fill : cs.color
      const w = Math.min(Math.max(r.width + 24, 60), window.innerWidth - 12)
      const hgt = Math.max(r.height + 6, fs * 1.3)
      const inp = document.createElement('input')
      inp.type = 'text'
      inp.maxLength = key === 'brand' ? 40 : key === 'initials' ? 4 : 60
      inp.value = orig
      const shownTxt = cs.textTransform === 'uppercase' ? orig.toUpperCase() : orig
      const mc = document.createElement('canvas').getContext('2d')
      let ls = 0
      if (mc && shownTxt.length > 1) {
        mc.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`
        ls = Math.min(40, Math.max(-2, (r.width - mc.measureText(shownTxt).width) / shownTxt.length))
      }
      inp.style.cssText = 'position:fixed;z-index:2147483646;box-sizing:border-box;padding:0;margin:0;border:0;border-radius:0;background:transparent;outline:none;box-shadow:none;text-align:center'
      inp.style.fontFamily = cs.fontFamily
      inp.style.fontSize = fs + 'px'
      inp.style.fontWeight = cs.fontWeight
      inp.style.fontStyle = cs.fontStyle
      inp.style.textTransform = cs.textTransform
      inp.style.letterSpacing = ls.toFixed(2) + 'px'
      inp.style.color = colr
      inp.style.caretColor = colr
      inp.style.width = w + 'px'
      inp.style.height = hgt + 'px'
      inp.style.left = r.left + r.width / 2 - w / 2 + 'px'
      inp.style.top = r.top + r.height / 2 - hgt / 2 + 'px'
      target.style.visibility = 'hidden'
      hidden = target
      let finished = false
      const mid = k === 'moment' ? target.getAttribute('data-mid') : null
      const send = (t: string) => {
        if (mid) { setMomentText((p) => ({ ...p, [mid]: t })); window.parent?.postMessage({ type: 'camrhia-gallery-moment-text', id: mid, text: t }, '*') }
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
      openEditor(h.el, h.k)
      const cs = getComputedStyle(h.el)
      const rr = h.el.getBoundingClientRect()
      window.parent?.postMessage({ type: 'camrhia-gallery-pick', key: h.k, top: rr.top, bottom: rr.bottom, name: NAMES[h.k], mid: h.el.getAttribute('data-mid'), line: h.el.getAttribute('data-line'), size: Math.round(parseFloat(cs.fontSize)), color: cs.color, bold: parseInt(cs.fontWeight, 10) >= 600 }, '*')
    }
    document.addEventListener('mouseover', over, true)
    document.addEventListener('scroll', hide, true)
    document.addEventListener('click', click, true)
    const secSt = document.createElement('style')
    document.head.appendChild(secSt)
    const onCtl = (e: MessageEvent) => {
      const m = e.data
      if (!m) return
      if (m.type === 'camrhia-gallery-section-mode') { secOn = !!m.on; secSt.textContent = secOn ? '.gal-root img[data-pid]{cursor:copy!important}' : '' }
      if (m.type === 'camrhia-gallery-edit') {
        const go = (n: number) => {
          const el = (m.key === 'moment' ? document.querySelector(`[data-mid="${String(m.id)}"]`) : document.querySelector(`[data-gk="${String(m.key)}"]`)) as HTMLElement | null
          if (el) { el.scrollIntoView({ block: 'center' }); setTimeout(() => openEditor(el, String(m.key)), 250) }
          else if (n < 12) setTimeout(() => go(n + 1), 120)
        }
        go(0)
      }
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
  const { look, cover: coverKind, pal, coverPal, focal, focals, zoom, layout, el, slots } = resolveDesign(designPreview ?? data.design ?? null)
  const elRules = elCss(el, (k) => FONT_OPTIONS[k]?.family)
  const fontHref = (() => {
    const g = Array.from(new Set(Object.values(el).map((x) => FONT_OPTIONS[x?.font ?? '']?.gf).filter(Boolean) as string[]))
    return g.length ? 'https://fonts.googleapis.com/css2?' + g.map((x) => 'family=' + x.replace(/^family=/, '')).join('&') + '&display=swap' : ''
  })()
  const pos = `${focal.x}% ${focal.y}%`
  const fpos = (id: string) => (focals[id] ? `${focals[id].x}% ${focals[id].y}%` : undefined)
  const headCls = look.font === 'fraunces' ? 'font-fraunces' : ''
  const headStyle: CSSProperties = { ...(look.font === 'fraunces' ? {} : { fontFamily: look.font }), fontWeight: look.weight, letterSpacing: look.track, textTransform: look.upper ? 'uppercase' : 'none', fontStyle: look.italic ? 'italic' : 'normal' }
  const cover = data.photos.find((p) => p.id === (coverOverride ?? data.coverId)) ?? data.photos[0]
  const slotPh = (key: string, fb: (typeof data.photos)[number] | undefined) => (slots[key] ? data.photos.find((p) => p.id === slots[key]) : undefined) ?? fb
  const slotImg = (key: string, ph: (typeof data.photos)[number] | undefined, src: string | undefined, fallbackPos?: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" data-pid={ph?.id} data-slot={key} className="h-full w-full object-cover" style={{ objectPosition: fpos('slot:' + key) || fallbackPos }} />
  )
  const momentMeta: { id: string; name: string; line?: boolean }[] = liveMoments ?? (data as unknown as { moments?: { id: string; name: string; line?: boolean }[] }).moments ?? []
  const momentHead = (p: unknown, i: number) => {
    if (momentMeta.length === 0) return null
    const m = (p as { moment?: string | null }).moment ?? null
    const prev = i > 0 ? ((list[i - 1] as unknown as { moment?: string | null }).moment ?? null) : undefined
    if (i > 0 && m === prev) return null
    const name = m ? (m in momentText ? momentText[m] : momentMeta.find((x) => x.id === m)?.name) : null
    if (name === null || name === undefined) return null
    if (m && momentMeta.find((x) => x.id === m)?.line) {
      return (
        <div className="mb-4 mt-8 flex w-full basis-full items-center gap-4 first:mt-0 [column-span:all] col-span-full">
          <h2 data-gk="moment" data-mid={m} data-line="1" className={`shrink-0 text-2xl ${headCls}`} style={{ ...headStyle, color: pal.ink }}>{name}</h2>
          <span aria-hidden className="h-px min-w-0 flex-1" style={{ background: pal.accent, opacity: 0.55 }} />
        </div>
      )
    }
    return <h2 data-gk="moment" data-mid={m ?? undefined} data-line="0" className={`mb-4 mt-8 w-full basis-full text-2xl first:mt-0 [column-span:all] col-span-full ${headCls}`} style={{ ...headStyle, color: pal.ink }}>{name}</h2>
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
  const extraTxt = (k: string) => String((el as Record<string, { text?: string }> | undefined)?.[k]?.text ?? '')
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
    <button type="button" data-setcover={p.id} className="absolute bottom-2 left-2 z-10 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100">Set as cover</button>
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
        return (
          <div style={{ containerType: 'inline-size' }}>
            <div className="grid grid-cols-2 md:grid-cols-4 md:auto-rows-[calc((100cqw_-_3*var(--g))/4)]" style={{ gap: look.gap, gridAutoFlow: 'dense', ['--g' as string]: `${look.gap}px` }}>
              {list.map((p, i) => tile(p, i, { fill: true, wrap: FEAT[i % 9] }))}
            </div>
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
      default:
        return <div className="columns-2 md:columns-3 lg:columns-4" style={{ columnGap: look.gap }}>{list.map((p, i) => tile(p, i, { ratio: Math.min(1.2, Math.max(0.75, arOf(p))), wrap: 'break-inside-avoid', style: { marginBottom: look.gap } }))}</div>
    }
  })()
  const pill = (on: boolean): CSSProperties => (on ? { background: pal.accent, color: pal.onAccent, border: '1px solid transparent' } : { border: `1px solid ${pal.line}`, color: pal.ink })

  return (
    <div className="gal-root min-h-screen" style={{ background: pal.bg, color: pal.ink }}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Display&family=Bodoni+Moda:wght@400&display=swap" />
      {elRules && <style>{elRules}</style>}
      <div data-cover-wrap style={{ background: coverPal.bg, color: coverPal.ink, position: 'relative' }}>{extraKeys.map((k, i) => <div key={k} data-gk={k} style={{ position: 'absolute', left: '50%', top: 24 + i * 56, transform: 'translateX(-50%)', zIndex: 6, fontSize: 28, lineHeight: 1.2, whiteSpace: 'nowrap', color: coverPal.ink, fontFamily: "'Playfair Display', Georgia, serif", cursor: 'grab' }}>{extraTxt(k) || 'Your text'}</div>)}{(() => { const pal = coverPal; return (coverKind === 'ticket' && cover?.web ? (() => {
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
              {l1 && <text data-gk="title" x="716" y="181" textAnchor="middle" style={{ ...tt, fontSize: f1 }} textLength={big1 ? Math.min(270, 33.6 * l1.length) : undefined} lengthAdjust="spacingAndGlyphs">{l1}</text>}
              {l2 && <text data-gk="title2" x="716" y={one ? 240 : big1 ? 264.1 : 181 + f2 * 0.84} textAnchor="middle" style={{ ...tt, fontFamily: "'DM Serif Display', Georgia, serif", fontWeight: 400, fontSize: f2 }} textLength={Math.min(250, 0.4694 * f2 * l2.length)} lengthAdjust="spacingAndGlyphs">{l2}</text>}
              {sub && <text data-gk="brand" x="718" y="310" textAnchor="middle" style={{ ...tt, fontWeight: 500, fontSize: 14 }} textLength={Math.min(270, 15 * sub.length)} lengthAdjust="spacing">{sub.toUpperCase()}</text>}
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
            <text data-gk="title" x="450" y="400.4" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fontSize: 87.2, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(408, 40.8 * Math.max(String(coverTitle).length, 1))} lengthAdjust="spacingAndGlyphs">{coverTitle}</text>
            {coverSub && <text data-gk="brand" x="450" y="434.8" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 10.9, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(288, 16.0 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
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
              <text data-gk="title" x="745" y="190.3" textAnchor="middle" style={{ ...ts, fontSize: 91.5, fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(262, 43.68 * Math.max(l1.length, 1))} lengthAdjust="spacingAndGlyphs">{l1}</text>
              {l2 && <text data-gk="title" x="745.5" y="266.2" textAnchor="middle" style={{ ...ts, fontSize: 89.9, fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(221, 36.84 * l2.length)} lengthAdjust="spacingAndGlyphs">{l2}</text>}
              {sub && <text data-gk="brand" x="745.5" y="309.1" textAnchor="middle" style={{ ...ts, textTransform: 'uppercase', fontSize: 11.1, fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(233, 14.56 * sub.length)} lengthAdjust="spacing">{sub}</text>}
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
              {pmL[0] && <text data-gk="brand" x="631" y={pmL[1] ? 84 : 99} textAnchor="middle" style={{ ...pm, fontSize: 17 }} textLength={Math.min(80, 10 * pmL[0].length)} lengthAdjust="spacing">{pmL[0]}</text>}
              {pmL[1] && <text data-gk="brand" x="631" y="105" textAnchor="middle" style={{ ...pm, fontSize: 17 }} textLength={Math.min(80, 10.8 * pmL[1].length)} lengthAdjust="spacing">{pmL[1]}</text>}
              {l1 && <text data-gk="title" x="682.5" y="244.0" textAnchor="middle" transform="rotate(-4.5 682.5 244.0)" style={{ ...sc, fontSize: 104.1 }} textLength={Math.min(333, 30.25 * l1.length)} lengthAdjust="spacingAndGlyphs">{l1}</text>}
              {l2 && <text data-gk="title2" x="686.0" y="318.0" textAnchor="middle" transform="rotate(-4.5 686.0 318.0)" style={{ ...sc, fontSize: 98 }} textLength={Math.min(205, 34.17 * l2.length)} lengthAdjust="spacingAndGlyphs">{l2}</text>}
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
              {sub && <text data-gk="brand" x="844" y="23.8" textAnchor="end" style={{ ...ts, fontWeight: 400, fontSize: 11.5, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={Math.min(206, 11.44 * sub.length)} lengthAdjust="spacing">{sub}</text>}
              <text data-gk="title" x="454.5" y="434" textAnchor="middle" style={{ ...ts, fontSize: tsz, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={len} lengthAdjust="spacingAndGlyphs">{t}</text>
              <g clipPath="url(#bt-photo)"><text data-gk="title" x="454.5" y="434" textAnchor="middle" style={{ ...ts, fontSize: tsz, fill: inCol, pointerEvents: 'auto' }} textLength={len} lengthAdjust="spacingAndGlyphs">{t}</text></g>
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
              <text data-gk="title" x="451.5" y="106.7" textAnchor="middle" style={{ ...ts, color: '#FFF6EA', fontSize: tf, fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(429, 0.611 * tf * Math.max(title.length, 1))} lengthAdjust="spacingAndGlyphs">{title}</text>
              {sub && <text data-gk="brand" x="450.5" y="159.2" textAnchor="middle" style={{ ...ts, color: 'rgba(255,246,234,0.9)', textTransform: 'uppercase', fontSize: 11.4, fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(327, 17.21 * sub.length)} lengthAdjust="spacing">{sub}</text>}
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
            <text data-gk="title" x="655.0" y="234.5" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fontSize: 95.8, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(405, 33.74 * Math.max(String(coverTitle).length, 1))} lengthAdjust="spacingAndGlyphs">{coverTitle}</text>
            {coverSub && <text data-gk="brand" x="660.5" y="275.7" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 17.75, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(275, 21.15 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
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
              <text data-gk="title" x="450.5" y="393.8" textAnchor="middle" style={{ ...sc, fontSize: 70 }} textLength={Math.min(478, 23.85 * Math.max(title.length, 1))} lengthAdjust="spacingAndGlyphs">{title}</text>
              {sub && <text data-gk="brand" x="448" y="430" textAnchor="middle" style={{ ...ss, fontSize: 14 }} textLength={Math.min(230, 19.2 * sub.length)} lengthAdjust="spacing">{sub}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'diptych' && cover?.web ? (() => {
        const second = slotPh('s0', data.photos.find((p) => p.id !== cover.id && p.web))
        const lines = String(coverTitle).split(/\s*(&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean).map((x) => (/^(and)$/i.test(x) ? '&' : x === '+' ? '&' : x))
        const ts: CSSProperties = { ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }
        return (
          <div className="relative grid w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', gridTemplateColumns: '1fr minmax(84px, 13%) 1fr', background: pal.bg }}>
            <div className="relative overflow-hidden" style={{ background: pal.line }}><div className="absolute inset-0">{imgEl}</div></div>
            <div style={{ background: pal.bg }} />
            <div className="relative overflow-hidden" style={{ background: pal.line }}>
              <div className="absolute inset-0">{slotImg('s0', second ?? cover, second?.web || cover.web || undefined, second ? '50% 50%' : '85% 50%')}</div>
            </div>
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              {lines.map((l, i) => (
                <text key={i} data-gk="title" x="451" y={[155.3, 206.2, 252.6][i] ?? 202 + (i - (lines.length - 1) / 2) * 51} textAnchor="middle" style={{ ...ts, fontSize: [35.1, 39.9, 39.5][i] ?? 38, fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={l === '&' ? 26 : Math.min(86, 20.7 * l.length)} lengthAdjust="spacingAndGlyphs">{l}</text>
              ))}
              {coverSub && <text data-gk="brand" x="450.5" y="290.9" textAnchor="middle" style={{ ...ts, textTransform: 'uppercase', fontWeight: 400, fontSize: 6.8, fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(89, 7.42 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'magazine' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: pal.line }}>
          <div className="absolute inset-0">{imgEl}</div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0) 42%)' }} />
          <h1 className="sr-only">{coverTitle}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            <text data-gk="title" x="451.5" y="89.0" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fontSize: 117.3, fill: 'currentColor', color: '#FCF4E6', pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(814, 62.55 * Math.max(String(coverTitle).length, 1))} lengthAdjust="spacingAndGlyphs">{coverTitle}</text>
            {coverSub && <text data-gk="brand" x="42.5" y="133.5" textAnchor="start" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 12.4, fill: 'currentColor', color: '#FCF4E6', pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(199, 13.2 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
            <text x="855" y="133.5" textAnchor="end" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 12.4, fill: '#FCF4E6', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={14.27 * (String(data.photos.length).length + 7)} lengthAdjust="spacing">{data.photos.length + ' PHOTOS'}</text>
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
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
                <g data-gk="initials" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif", fontWeight: 400, fill: 'currentColor', color: 'rgba(255,255,255,0.58)' }}>
                  <text transform="translate(175.5 363.3) scale(0.89 1)" textAnchor="middle" style={{ fontSize: 448.3, pointerEvents: 'auto' }}>{L}</text>
                  <text transform="translate(447 346.2) skewX(-8) scale(0.871 1)" textAnchor="middle" style={{ fontSize: 288.7, pointerEvents: 'auto' }}>&amp;</text>
                  <text transform="translate(701 365) scale(0.89 1)" textAnchor="middle" style={{ fontSize: 459.2, pointerEvents: 'auto' }}>{R}</text>
                </g>
              </svg>
            ) : (
              <div data-gk="initials" className="absolute inset-0 flex items-center justify-center" style={{ ...big, position: 'absolute', fontSize: '50cqw', paddingBottom: '4cqw' }}>{mono}</div>
            )}
            <h1 className="sr-only">{coverTitle}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              <text data-gk="title" x="454.0" y="402.6" textAnchor="middle" style={{ fontFamily: ff, fontWeight: 600, fontSize: 29.73, fill: '#F9EAD6', textTransform: 'none', fontVariantNumeric: 'lining-nums', pointerEvents: 'auto' }} textLength={Math.min(266, 19 * Math.max(String(coverTitle).length, 1))} lengthAdjust="spacing">{coverTitle}</text>
              {coverSub && <text data-gk="brand" x="454.75" y="425.55" textAnchor="middle" style={{ fontFamily: ff, fontWeight: 600, fontSize: 10.04, fill: 'rgba(244,230,212,0.95)', textTransform: 'uppercase', fontVariantNumeric: 'lining-nums', pointerEvents: 'auto' }} textLength={Math.min(220.5, 12.25 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'cinema' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', containerType: 'inline-size', background: '#000' }}>
          <div className="absolute overflow-hidden" style={{ left: 0, right: 0, top: '4.1cqw', height: '39.1cqw' }}>
            <div className="absolute inset-0">{imgEl}</div>
          </div>
          <h1 className="sr-only">{coverTitle}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            <text data-gk="title" x="450" y="417.6" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 22, fill: 'currentColor', color: '#F1E6D2', pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(304, 27.64 * Math.max(String(coverTitle).length, 1))} lengthAdjust="spacing">{String(coverTitle).toUpperCase()}</text>
            {coverSub && <text data-gk="brand" x="450.5" y="436.6" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 7.9, fill: 'currentColor', color: 'rgba(241,230,210,0.8)', pointerEvents: 'auto', fontFamily: "'Libre Caslon Display', Georgia, serif" }} textLength={Math.min(147, 11.28 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
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
