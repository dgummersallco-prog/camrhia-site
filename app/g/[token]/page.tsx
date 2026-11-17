'use client'

import { Fragment, type CSSProperties } from 'react'
import ReviewCard from './ReviewCard'
import { resolveDesign, type GalleryDesign, elCss } from '@/lib/galleryDesign'
import { FONT_OPTIONS } from '@/lib/siteTheme'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

type Photo = { id: string; filename: string | null; width: number | null; height: number | null; thumb: string | null; web: string | null }
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
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [designPreview, setDesignPreview] = useState<GalleryDesign | null>(null)
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
        body: JSON.stringify({ token, pin: pinValue, access: pinValue ? undefined : stored, visitorId: visitorId(), preview: new URLSearchParams(window.location.search).get('preview') === '1' }),
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
    return onlyFavs ? data.photos.filter((p) => favs.has(p.id)) : data.photos
  }, [data, favs, onlyFavs])

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
    const onMsg = (e: MessageEvent) => { const m = e.data; if (m && m.type === 'camrhia-gallery-design') setDesignPreview((m.design ?? {}) as GalleryDesign) }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'camrhia-gallery-ready' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  // Preview only: hover names and click-to-edit for the gallery lines.
  useEffect(() => {
    if (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('preview') !== '1') return
    const NAMES: Record<string, string> = { title: 'Gallery title', brand: 'Studio name', count: 'Photo count', download: 'Download button', all: 'All button', favs: 'Favorites button', moment: 'Section heading', footer: 'Footer line', photos: 'Photos', initials: 'Cover initials', title2: 'Gallery title line 2' }
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
    const over = (e: MouseEvent) => {
      const h = hit(e.target)
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
    const hide = () => { box.style.display = 'none' }
    const click = (e: MouseEvent) => {
      const h = hit(e.target)
      if (!h) {
        const t = e.target as HTMLElement | null
        const root = document.querySelector('.gal-root')
        if (t && root && (t === root || t.tagName === 'MAIN' || t.parentElement === root || t.parentElement?.parentElement === root || t.parentElement?.tagName === 'MAIN')) {
          e.preventDefault()
          e.stopPropagation()
          window.parent?.postMessage({ type: 'camrhia-gallery-pick', key: 'bg', name: 'Background', size: 16, color: '#000000', bold: false }, '*')
        }
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const cs = getComputedStyle(h.el)
      window.parent?.postMessage({ type: 'camrhia-gallery-pick', key: h.k, name: NAMES[h.k], size: Math.round(parseFloat(cs.fontSize)), color: cs.color, bold: parseInt(cs.fontWeight, 10) >= 600 }, '*')
    }
    document.addEventListener('mouseover', over, true)
    document.addEventListener('scroll', hide, true)
    document.addEventListener('click', click, true)
    return () => {
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
  const { look, cover: coverKind, pal, coverPal, focal, zoom, layout, el } = resolveDesign(designPreview ?? data.design ?? null)
  const elRules = elCss(el, (k) => FONT_OPTIONS[k]?.family)
  const fontHref = (() => {
    const g = Array.from(new Set(Object.values(el).map((x) => FONT_OPTIONS[x?.font ?? '']?.gf).filter(Boolean) as string[]))
    return g.length ? 'https://fonts.googleapis.com/css2?' + g.map((x) => 'family=' + x.replace(/^family=/, '')).join('&') + '&display=swap' : ''
  })()
  const pos = `${focal.x}% ${focal.y}%`
  const headCls = look.font === 'fraunces' ? 'font-fraunces' : ''
  const headStyle: CSSProperties = { ...(look.font === 'fraunces' ? {} : { fontFamily: look.font }), fontWeight: look.weight, letterSpacing: look.track, textTransform: look.upper ? 'uppercase' : 'none', fontStyle: look.italic ? 'italic' : 'normal' }
  const cover = data.photos.find((p) => p.id === data.coverId) ?? data.photos[0]
  const momentMeta = (data as unknown as { moments?: { id: string; name: string }[] }).moments ?? []
  const momentHead = (p: unknown, i: number) => {
    if (momentMeta.length === 0) return null
    const m = (p as { moment?: string | null }).moment ?? null
    const prev = i > 0 ? ((list[i - 1] as unknown as { moment?: string | null }).moment ?? null) : undefined
    if (i > 0 && m === prev) return null
    const name = m ? momentMeta.find((x) => x.id === m)?.name : null
    if (!name) return null
    return <h2 data-gk="moment" className={`mb-4 mt-8 w-full basis-full text-2xl first:mt-0 [column-span:all] col-span-full ${headCls}`} style={{ ...headStyle, color: pal.ink }}>{name}</h2>
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

  const imgEl = cover?.web ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cover.web} alt="" className="h-full w-full object-cover" style={{ objectPosition: pos, transform: zoom > 1 ? `scale(${zoom})` : undefined, transformOrigin: pos }} />
  ) : null
  const coverSub = String((el as Record<string, { text?: string }> | undefined)?.brand?.text ?? '').trim() || (brand?.name ? String(brand.name) : '')
  const brandLine = brand?.name ? (
    <p data-gk="brand" className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: pal.soft }}>{brand.name}</p>
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
            loading="lazy"
            onClick={() => setOpenIndex(i)}
            className={uniform ? 'aspect-[3/4] w-full cursor-zoom-in object-cover' : 'w-full cursor-zoom-in'}
            style={!uniform && p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
          />
        )}
        <button
          onClick={() => toggleFav(p.id)}
          aria-label="Favorite"
          style={favs.has(p.id) ? { color: heart } : undefined}
          className={`absolute right-2 top-2 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 ${favs.has(p.id) ? '' : 'sm:opacity-0 sm:group-hover:opacity-100'}`}
        >
          <Heart filled={favs.has(p.id)} className="h-4 w-4" />
        </button>
      </div>
    </Fragment>
  )
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
              loading="lazy"
              onClick={() => setOpenIndex(i)}
              className={fill ? 'absolute inset-0 h-full w-full cursor-zoom-in object-cover' : 'block w-full cursor-zoom-in'}
              style={!fill && p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
            />
          )}
          {heartBtn(p)}
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
        return <div className="mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: look.gap, maxWidth: 'min(100%, 1280px)' }}>{list.map((p, i) => tile(p, i, { wrap: 'aspect-square', fill: true }))}</div>
      case 'rows':
        return (
          <div className="flex flex-wrap" style={{ gap: look.gap }}>
            {list.map((p, i) => tile(p, i, { ratio: arOf(p), style: { width: `${arOf(p) * 220}px`, flexGrow: arOf(p) * 100, maxWidth: '100%' } }))}
            <div style={{ flexGrow: 100000 }} />
          </div>
        )
      case 'feature':
        return <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: look.gap, gridAutoFlow: 'dense' }}>{list.map((p, i) => tile(p, i, { fill: true, wrap: i % 7 === 0 ? 'col-span-2 row-span-2' : 'aspect-square' }))}</div>
      case 'wide':
        return <div className="columns-1 sm:columns-2" style={{ columnGap: look.gap }}>{list.map((p, i) => renderItem(p, i, false))}</div>
      case 'mosaic':
        return <div className="grid grid-cols-2 md:grid-cols-6" style={{ gap: look.gap }}>{list.map((p, i) => tile(p, i, { fill: true, wrap: MOSAIC[i % 6] }))}</div>
      case 'polaroid':
        return (
          <div className="flex flex-wrap justify-center" style={{ gap: Math.max(look.gap, 24) }}>
            {list.map((p, i) => (
              <Fragment key={p.id}>
                {momentHead(p, i)}
                <div data-gk="photos" className="group relative w-[44%] md:w-[30%] lg:w-[22.5%]" style={{ background: '#fff', padding: '10px 10px 34px', boxShadow: '0 6px 18px rgba(0,0,0,.18)', transform: `rotate(${[-2, 1.5, -1, 2][i % 4]}deg)`, borderRadius: Math.min(look.radius, 4) }}>
                  <div className="relative" style={{ aspectRatio: '4 / 5', background: pal.line }}>
                    {p.thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumb} alt={p.filename ?? ''} loading="lazy" onClick={() => setOpenIndex(i)} className="absolute inset-0 h-full w-full cursor-zoom-in object-cover" />
                    )}
                  </div>
                  {heartBtn(p)}
                </div>
              </Fragment>
            ))}
          </div>
        )
      case 'story':
        return <div className="mx-auto flex max-w-[920px] flex-col" style={{ gap: look.gap }}>{list.map((p, i) => tile(p, i))}</div>
      case 'stagger':
        return (
          <div className="grid grid-cols-2" style={{ gap: look.gap }}>
            {[0, 1].map((c) => (
              <div key={c} className="flex flex-col" style={{ gap: look.gap }}>
                {list.map((p, i) => (i % 2 === c ? tile(p, i, { head: false, ratio: (c ? [1, 0.8, 1.5, 1, 1.33] : [1.5, 1, 0.8, 1.33, 1])[Math.floor(i / 2) % 5] }) : null))}
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
                  return tile(p, r * per + j, { ratio: ar, head: false, style: { flex: `${ar} 1 0%`, minWidth: 0 } })
                })}
                {row.length < per && <div style={{ flex: `${(per - row.length) * 0.67} 1 0%` }} />}
              </div>
            ))}
          </div>
        )
      }
      default:
        return <div className="columns-2 md:columns-3 lg:columns-4" style={{ columnGap: look.gap }}>{list.map((p, i) => renderItem(p, i, false))}</div>
    }
  })()
  const pill = (on: boolean): CSSProperties => (on ? { background: pal.accent, color: pal.onAccent, border: '1px solid transparent' } : { border: `1px solid ${pal.line}`, color: pal.ink })

  return (
    <div className="gal-root min-h-screen" style={{ background: pal.bg, color: pal.ink }}>
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      {elRules && <style>{elRules}</style>}
      <div style={{ background: coverPal.bg, color: coverPal.ink }}>{(() => { const pal = coverPal; return (coverKind === 'ticket' && cover?.web ? (() => {
        const words = String(data.title).trim().split(/\s+/).filter(Boolean)
        const one = words.length <= 1
        const l1 = one ? '' : words.slice(0, -1).join(' ')
        const l2 = one ? (words[0] || '') : words[words.length - 1]
        const tt: React.CSSProperties = { ...headStyle, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 800, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fill: 'currentColor', color: '#3A1F12', pointerEvents: 'auto' }
        const sub = coverSub ? String(coverSub) : ''
        const big1 = l1.length <= 8
        const f1 = big1 ? 71 : Math.max(24, 270 / (0.62 * l1.length))
        const f2 = big1 ? 100 : Math.min(100, f1 * 1.41)
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.bg }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;800&display=swap" />
            <div className="absolute overflow-hidden" style={{ left: '2.9cqw', top: '6.2cqw', width: '57.6cqw', height: '37cqw', background: pal.line }}>
              <div className="absolute inset-0">{imgEl}</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery-cover/ticket-art.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
            <h1 className="sr-only">{data.title}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              {l1 && <text data-gk="title" x="716" y="181" textAnchor="middle" style={{ ...tt, fontSize: f1 }} textLength={big1 ? Math.min(270, 33.6 * l1.length) : undefined} lengthAdjust="spacingAndGlyphs">{l1}</text>}
              {l2 && <text data-gk="title2" x="716" y={one ? 240 : big1 ? 265 : 181 + f2 * 0.84} textAnchor="middle" style={{ ...tt, fontSize: f2 }} textLength={Math.min(250, 0.49 * f2 * l2.length)} lengthAdjust="spacingAndGlyphs">{l2}</text>}
              {sub && <text data-gk="brand" x="718" y="310" textAnchor="middle" style={{ ...tt, fontWeight: 500, fontSize: 14 }} textLength={Math.min(270, 15 * sub.length)} lengthAdjust="spacing">{sub.toUpperCase()}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'circle' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.bg }}>
          <div className="absolute overflow-hidden" style={{ left: '30.9cqw', top: '0.8cqw', width: '38.1cqw', height: '38.1cqw', borderRadius: '50%', border: '0.33cqw solid ' + pal.accent, background: pal.line }}>
            <div className="absolute inset-0">{imgEl}</div>
          </div>
          <h1 className="sr-only">{data.title}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            <text data-gk="title" x="450.5" y="404" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fontSize: 83, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={Math.min(407, 40.7 * Math.max(String(data.title).length, 1))} lengthAdjust="spacingAndGlyphs">{data.title}</text>
            {coverSub && <text data-gk="brand" x="450" y="434" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 11.5, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={Math.min(288, 16 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
          </svg>
        </div>
      ) : coverKind === 'mosaic' && cover?.web ? (() => {
        const pool = [cover, ...data.photos.filter((p) => p.id !== cover.id)].filter((p) => p.thumb || p.web)
        const tiles = [
          { x: 8, y: 8, w: 198, h: 433 }, { x: 210, y: 7, w: 195, h: 243 }, { x: 409, y: 8, w: 176, h: 242 },
          { x: 210, y: 254, w: 175, h: 187 }, { x: 390, y: 254, w: 195, h: 187 },
        ]
        const raw = String(data.title).trim()
        const parts = raw.split(/\s*(?:&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean)
        const words = raw.split(/\s+/).filter(Boolean)
        const l1 = parts.length >= 2 ? parts[0] : words.length > 1 ? words.slice(0, -1).join(' ') : raw
        const l2 = parts.length >= 2 ? '& ' + parts[parts.length - 1] : words.length > 1 ? words[words.length - 1] : ''
        const ts: CSSProperties = { ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.bg }}>
            <h1 className="sr-only">{data.title}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }}>
              {tiles.map((t, i) => {
                const ph = pool[i % pool.length]
                return (
                  <svg key={i} x={t.x} y={t.y} width={t.w} height={t.h} style={{ overflow: 'hidden' }}>
                    <rect width="100%" height="100%" fill={pal.line} />
                    <image href={ph.thumb || ph.web || undefined} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
                  </svg>
                )
              })}
              <text data-gk="title" x="745.5" y="190" textAnchor="middle" style={{ ...ts, fontSize: 94 }} textLength={Math.min(261, 43.5 * Math.max(l1.length, 1))} lengthAdjust="spacingAndGlyphs">{l1}</text>
              {l2 && <text data-gk="title" x="745.5" y="267" textAnchor="middle" style={{ ...ts, fontSize: 94 }} textLength={Math.min(221, 36.8 * l2.length)} lengthAdjust="spacingAndGlyphs">{l2}</text>}
              {sub && <text data-gk="brand" x="745.5" y="308.5" textAnchor="middle" style={{ ...ts, textTransform: 'uppercase', fontSize: 11.5 }} textLength={Math.min(233, 14.6 * sub.length)} lengthAdjust="spacing">{sub}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'postcard' && cover?.web ? (() => {
        const words = String(data.title).trim().split(/\s+/).filter(Boolean)
        const one = words.length <= 1
        const l1 = one ? (words[0] || '') : words.slice(0, -1).join(' ')
        const l2 = one ? '' : words[words.length - 1]
        const sc: CSSProperties = { fontFamily: "'Mrs Saint Delafield', 'Homemade Apple', cursive", fontWeight: 400, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0, fill: 'currentColor', color: '#3A2A22', pointerEvents: 'auto' }
        const pm: CSSProperties = { ...sc, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: '#2A2018' }
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        const ci = sub.indexOf(',')
        const sw = sub.split(' ')
        const half = Math.ceil(sw.length / 2)
        const pmL: string[] = !sub ? [] : ci > 0 ? [sub.slice(0, ci + 1).trim(), sub.slice(ci + 1).trim()] : sw.length > 1 ? [sw.slice(0, half).join(' '), sw.slice(half).join(' ')] : [sub]
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: '#E8D5BA' }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mrs+Saint+Delafield&family=Playfair+Display:wght@500&display=swap" />
            <div className="absolute overflow-hidden" style={{ left: '6.92cqw', top: '5.16cqw', width: '46.67cqw', height: '40.67cqw', transform: 'rotate(-3deg)', background: pal.line }}>
              <div className="absolute inset-0">{imgEl}</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery-cover/postcard-art.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
            <h1 className="sr-only">{data.title}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              {pmL[0] && <text data-gk="brand" x="631" y={pmL[1] ? 84 : 99} textAnchor="middle" style={{ ...pm, fontSize: 17 }} textLength={Math.min(80, 10 * pmL[0].length)} lengthAdjust="spacing">{pmL[0]}</text>}
              {pmL[1] && <text data-gk="brand" x="631" y="105" textAnchor="middle" style={{ ...pm, fontSize: 17 }} textLength={Math.min(80, 10.8 * pmL[1].length)} lengthAdjust="spacing">{pmL[1]}</text>}
              {l1 && <text data-gk="title" x="682" y="238" textAnchor="middle" transform="rotate(-4 682 238)" style={{ ...sc, fontSize: 125 }} textLength={Math.min(340, 30.5 * l1.length)} lengthAdjust="spacingAndGlyphs">{l1}</text>}
              {l2 && <text data-gk="title2" x="705" y="318" textAnchor="middle" transform="rotate(-4 705 318)" style={{ ...sc, fontSize: 125 }} textLength={Math.min(330, 36 * l2.length)} lengthAdjust="spacingAndGlyphs">{l2}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'bigtype' && cover?.web ? (() => {
        const t = String(data.title).toUpperCase()
        const n = Math.max(t.length, 1)
        const len = Math.min(868, 78.9 * n)
        const ts: CSSProperties = { ...headStyle, fontWeight: 300, fontStyle: 'normal', letterSpacing: 0, textTransform: 'uppercase' }
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.bg }}>
            <div className="absolute overflow-hidden" style={{ left: '5.9cqw', top: '4.55cqw', width: '88.1cqw', height: '37.8cqw', background: pal.line }}>
              <div className="absolute inset-0">{imgEl}</div>
            </div>
            <h1 className="sr-only">{data.title}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              <defs><clipPath id="bt-photo"><rect x="53" y="41" width="793" height="340" /></clipPath></defs>
              {sub && <text data-gk="brand" x="840" y="22.5" textAnchor="end" style={{ ...ts, fontWeight: 400, fontSize: 9, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={Math.min(202, 11.2 * sub.length)} lengthAdjust="spacing">{sub}</text>}
              <text data-gk="title" x="454" y="434" textAnchor="middle" style={{ ...ts, fontSize: 144, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={len} lengthAdjust="spacingAndGlyphs">{t}</text>
              <text x="454" y="434" textAnchor="middle" clipPath="url(#bt-photo)" style={{ ...ts, fontSize: 144, fill: pal.bg }} textLength={len} lengthAdjust="spacingAndGlyphs">{t}</text>
            </svg>
          </div>
        )
      })() : coverKind === 'strip' && cover?.web ? (() => {
        const pool = [cover, ...data.photos.filter((p) => p.id !== cover.id)].filter((p) => p.thumb || p.web)
        const frames = Array.from({ length: 5 }, (_, i) => pool[i % pool.length])
        const FX = [8, 180, 352, 555, 727]
        const FW = [163, 163, 192, 161, 165]
        const ts: CSSProperties = { ...headStyle, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 400, fontStyle: 'normal', textTransform: 'none', letterSpacing: 0, fill: 'currentColor', pointerEvents: 'auto' }
        const title = String(data.title)
        const tf = Math.min(94, (94 * 10) / Math.max(title.length, 10))
        const sub = coverSub ? String(coverSub).toUpperCase() : ''
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: '#271407' }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap" />
            <h1 className="sr-only">{data.title}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }}>
              {frames.map((p, i) => (
                <svg key={i} x={FX[i] - 1} y="228" width={FW[i] + 2} height="162" style={{ overflow: 'hidden' }}>
                  <rect width="100%" height="100%" fill={pal.line} />
                  <image href={p.thumb || p.web || undefined} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
                </svg>
              ))}
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gallery-cover/strip-art.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              <text data-gk="title" x="450.5" y="116" textAnchor="middle" style={{ ...ts, color: '#FFF6EA', fontSize: tf }} textLength={Math.min(433, 0.51 * tf * Math.max(title.length, 1))} lengthAdjust="spacingAndGlyphs">{title}</text>
              {sub && <text data-gk="brand" x="450" y="159.5" textAnchor="middle" style={{ ...ts, color: 'rgba(255,246,234,0.9)', textTransform: 'uppercase', fontSize: 11.5 }} textLength={Math.min(326, 17.2 * sub.length)} lengthAdjust="spacing">{sub}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'arch' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.bg }}>
          <div className="absolute overflow-hidden" style={{ left: '4.2cqw', top: '0.8cqw', width: '40.6cqw', height: '48.2cqw', borderTopLeftRadius: '20.3cqw', borderTopRightRadius: '20.3cqw', background: pal.line }}>
            <div className="absolute inset-0">{imgEl}</div>
          </div>
          <h1 className="sr-only">{data.title}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            <text data-gk="title" x="654.5" y="229" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fontSize: 87, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={Math.min(409, 34.1 * Math.max(String(data.title).length, 1))} lengthAdjust="spacingAndGlyphs">{data.title}</text>
            {coverSub && <text data-gk="brand" x="660.5" y="275" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 17, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }} textLength={Math.min(275, 21.2 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
          </svg>
        </div>
      ) : coverKind === 'stack' && cover?.web ? (() => {
        const others = data.photos.filter((p) => p.id !== cover.id && (p.thumb || p.web)).slice(0, 3)
        const pic = (i: number) => (others[i]?.thumb || others[i]?.web || cover.web || undefined)
        const fs = Math.min(6.4, 53 / (0.38 * Math.max(String(data.title).length, 6)))
        const print = (src: string | undefined, st: CSSProperties, ar: string) => (
          <div className="absolute" style={{ background: '#FBF9F4', padding: '1.35cqw 1.35cqw 4.7cqw', boxShadow: '0 1.2cqw 3cqw rgba(60,40,20,0.22)', ...st }}>
            <div style={{ aspectRatio: ar, overflow: 'hidden', background: pal.line }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          </div>
        )
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.bg }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pinyon+Script&display=swap" />
            {print(pic(0), { left: '18.5cqw', top: '3.7cqw', width: '23cqw', transform: 'rotate(-6deg)', zIndex: 0 }, '1.1 / 1')}
            {print(pic(1), { left: '7.9cqw', top: '10.4cqw', width: '22.3cqw', transform: 'rotate(-11deg)', zIndex: 1 }, '1.1 / 1')}
            {print(pic(2), { left: '68.5cqw', top: '11.4cqw', width: '22.3cqw', transform: 'rotate(14deg)', zIndex: 1 }, '1.09 / 1')}
            {print(cover.web || undefined, { left: '34.2cqw', top: '3.4cqw', width: '35.5cqw', transform: 'rotate(3deg)', zIndex: 2 }, '1.18 / 1')}
            <div className="absolute inset-x-0 text-center" style={{ bottom: '1.6cqw', zIndex: 3 }}>
              <h1 style={{ fontFamily: "'Pinyon Script', 'Snell Roundhand', cursive", color: pal.ink, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', fontSize: 'max(20px, ' + fs + 'cqw)', lineHeight: 1.1, margin: 0 }}>{data.title}</h1>
              {coverSub && <p style={{ color: pal.soft, textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: 'max(8px, 1.15cqw)', margin: '0.6cqw 0 0' }}>{coverSub}</p>}
            </div>
          </div>
        )
      })() : coverKind === 'diptych' && cover?.web ? (() => {
        const second = data.photos.find((p) => p.id !== cover.id && p.web)
        const lines = String(data.title).split(/\s*(&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean).map((x) => (/^(and)$/i.test(x) ? '&' : x === '+' ? '&' : x))
        const ts: CSSProperties = { ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fill: 'currentColor', color: pal.ink, pointerEvents: 'auto' }
        return (
          <div className="relative grid w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', gridTemplateColumns: '1fr minmax(84px, 13%) 1fr', background: pal.bg }}>
            <div className="relative overflow-hidden" style={{ background: pal.line }}><div className="absolute inset-0">{imgEl}</div></div>
            <div style={{ background: pal.bg }} />
            <div className="relative overflow-hidden" style={{ background: pal.line }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={second?.web || cover.web || undefined} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: second ? '50% 50%' : '85% 50%' }} />
            </div>
            <h1 className="sr-only">{data.title}</h1>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
              {lines.map((l, i) => (
                <text key={i} data-gk="title" x="450" y={202 + (i - (lines.length - 1) / 2) * 51} textAnchor="middle" style={{ ...ts, fontSize: 38 }} textLength={l === '&' ? 25 : Math.min(104, 20.5 * l.length)} lengthAdjust="spacingAndGlyphs">{l}</text>
              ))}
              {coverSub && <text data-gk="brand" x="450" y="292" textAnchor="middle" style={{ ...ts, textTransform: 'uppercase', fontWeight: 500, fontSize: 9 }} textLength={Math.min(104, 7.25 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
            </svg>
          </div>
        )
      })() : coverKind === 'magazine' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.line }}>
          <div className="absolute inset-0">{imgEl}</div>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0) 42%)' }} />
          <h1 className="sr-only">{data.title}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            <text data-gk="title" x="451.5" y="103" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'none', fontStyle: 'normal', letterSpacing: 0, fontSize: 136, fill: 'currentColor', color: '#FCF4E6', pointerEvents: 'auto' }} textLength={Math.min(811, 62.4 * Math.max(String(data.title).length, 1))} lengthAdjust="spacingAndGlyphs">{data.title}</text>
            {coverSub && <text data-gk="brand" x="44" y="133" textAnchor="start" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 13, fill: 'currentColor', color: '#FCF4E6', pointerEvents: 'auto' }} textLength={Math.min(160, 10.7 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
            <text x="857" y="133" textAnchor="end" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 13, fill: '#FCF4E6' }} textLength={14.6 * (String(data.photos.length).length + 7)} lengthAdjust="spacing">{data.photos.length + ' PHOTOS'}</text>
          </svg>
        </div>
) : coverKind === 'monogram' && cover?.web ? (() => {
        const parts = String(data.title).split(/\s*(?:&|\band\b|\+)\s*/i).map((x) => x.trim()).filter(Boolean)
        const custom = String((el as Record<string, { text?: string }> | undefined)?.initials?.text ?? '').trim()
        const cch = custom.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        const pair = custom ? cch.length >= 2 : parts.length >= 2
        const L = custom ? (cch[0] || '') : pair ? parts[0][0].toUpperCase() : ''
        const R = custom ? (cch[1] || '') : pair ? parts[1][0].toUpperCase() : ''
        const mono = custom ? custom.toUpperCase() : (parts[0] || '').split(/\s+/).slice(0, 2).map((w) => w[0]).join(' ').toUpperCase()
        const ff = "'Cormorant Garamond', 'Playfair Display', Georgia, serif"
        const big = { position: 'absolute' as const, fontFamily: ff, fontWeight: 300, lineHeight: 1, color: 'rgba(255,255,255,0.58)', whiteSpace: 'nowrap' as const }
        return (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: pal.line }}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&display=swap" />
            <div className="absolute inset-0">{imgEl}</div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28))' }} />
            {pair ? (
              <div data-gk="initials" className="absolute inset-0" style={{ fontFamily: ff, fontWeight: 300, fontSize: '57cqw', lineHeight: 1, color: 'rgba(255,255,255,0.58)', pointerEvents: 'none' }}>
                <span style={{ position: 'absolute', fontFamily: 'inherit', fontWeight: 'inherit', color: 'inherit', lineHeight: 1, whiteSpace: 'nowrap', left: '6.5cqw', top: '-6.4cqw', pointerEvents: 'auto' }}>{L}</span>
                <span style={{ position: 'absolute', fontFamily: 'inherit', fontWeight: 'inherit', color: 'inherit', lineHeight: 1, whiteSpace: 'nowrap', fontStyle: 'italic', fontSize: '0.7em', left: '50%', transform: 'translateX(-50%)', top: '8.5cqw', pointerEvents: 'auto' }}>&amp;</span>
                <span style={{ position: 'absolute', fontFamily: 'inherit', fontWeight: 'inherit', color: 'inherit', lineHeight: 1, whiteSpace: 'nowrap', right: '4.5cqw', top: '-6.4cqw', pointerEvents: 'auto' }}>{R}</span>
              </div>
            ) : (
              <div data-gk="initials" className="absolute inset-0 flex items-center justify-center" style={{ ...big, position: 'absolute', fontSize: '50cqw', paddingBottom: '4cqw' }}>{mono}</div>
            )}
            <div className="absolute inset-x-0 text-center text-white" style={{ top: '41.6cqw' }}>
              <h1 style={{ fontFamily: ff, color: '#fff', fontWeight: 500, textTransform: 'none', fontStyle: 'normal', letterSpacing: '0.16em', fontSize: 'max(14px, 3.5cqw)', lineHeight: 1.1, margin: 0 }}>{data.title}</h1>
              {coverSub && <p style={{ fontFamily: ff, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.4em', fontSize: 'max(7px, 1.3cqw)', margin: '1.3cqw 0 0' }}>{coverSub}</p>}
            </div>
          </div>
        )
      })() : coverKind === 'cinema' && cover?.web ? (
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2 / 1', minHeight: 300, containerType: 'inline-size', background: '#000' }}>
          <div className="absolute overflow-hidden" style={{ left: 0, right: 0, top: '4.1cqw', height: '39.1cqw' }}>
            <div className="absolute inset-0">{imgEl}</div>
          </div>
          <h1 className="sr-only">{data.title}</h1>
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 450" style={{ pointerEvents: 'none' }} aria-hidden="true">
            <text data-gk="title" x="450" y="417" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 21.5, fill: 'currentColor', color: '#F1E6D2', pointerEvents: 'auto' }} textLength={Math.min(304, 27.6 * Math.max(String(data.title).length, 1))} lengthAdjust="spacing">{String(data.title).toUpperCase()}</text>
            {coverSub && <text data-gk="brand" x="450" y="438" textAnchor="middle" style={{ ...headStyle, fontWeight: 400, textTransform: 'uppercase', fontStyle: 'normal', letterSpacing: 0, fontSize: 10, fill: 'currentColor', color: 'rgba(241,230,210,0.8)', pointerEvents: 'auto' }} textLength={Math.min(152, 11.7 * String(coverSub).length)} lengthAdjust="spacing">{String(coverSub).toUpperCase()}</text>}
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
              <h1 className={`${headCls} text-4xl sm:text-5xl`} style={headStyle}>{data.title}</h1>
            </div>
          </div>
        </div>
      )) })()}</div>

      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 backdrop-blur" style={{ background: `${pal.bg}F2`, borderBottom: `1px solid ${pal.line}` }}>
        {!cover?.web ? (
          <h2 data-gk="title" className={`${headCls} text-xl`} style={headStyle}>{data.title}</h2>
        ) : (
          <span data-gk="count" className="text-sm" style={{ color: pal.soft }}>{data.photos.length} photos</span>
        )}
        <div className="flex items-center gap-2 text-sm">
          {data.allowDownloads && list.length > 0 && (
            <button data-gk="download" onClick={downloadAll} disabled={zip.busy} className="rounded-full px-4 py-1.5 transition disabled:opacity-60" style={pill(false)}>
              {zip.busy ? (zip.total ? `Zipping ${zip.done}/${zip.total}` : 'Preparing…') : onlyFavs ? 'Download favorites' : 'Download all'}
            </button>
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
      {zip.error && <p className="px-6 pt-3 text-center text-sm text-red-600">{zip.error}</p>}

      <main className="px-3 py-4 sm:px-6">
        {list.length === 0 ? (
          <p className="py-20 text-center text-sm" style={{ color: pal.soft }}>
            {onlyFavs ? 'No favorites yet. Tap the heart on any photo.' : 'No photos in this gallery yet.'}
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
