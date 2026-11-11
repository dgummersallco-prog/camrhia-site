'use client'

import { Fragment, type CSSProperties } from 'react'
import { resolveDesign, type GalleryDesign } from '@/lib/galleryDesign'

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
  const { look, cover: coverKind, pal, focal } = resolveDesign(designPreview ?? data.design ?? null)
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
    return <h2 className={`mb-4 mt-8 text-2xl first:mt-0 [column-span:all] col-span-full ${headCls}`} style={{ ...headStyle, color: pal.ink }}>{name}</h2>
  }
  const current = openIndex !== null ? list[openIndex] : null
  const heart = brand?.accent || '#fb7185'

  const imgEl = cover?.web ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={cover.web} alt="" className="h-full w-full object-cover" style={{ objectPosition: pos }} />
  ) : null
  const brandLine = brand?.name ? (
    <p className="mb-3 font-mono text-xs uppercase tracking-widest" style={{ color: pal.soft }}>{brand.name}</p>
  ) : null
  const titleEl = (extra: string) => <h1 className={`${headCls} ${extra}`} style={headStyle}>{data.title}</h1>
  const renderItem = (p: (typeof list)[number], i: number, uniform: boolean) => (
    <Fragment key={p.id}>
      {momentHead(p, i)}
      <div className={`group relative overflow-hidden ${uniform ? '' : 'break-inside-avoid'}`} style={{ marginBottom: uniform ? 0 : look.gap, borderRadius: look.radius, background: pal.line }}>
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
  const pill = (on: boolean): CSSProperties => (on ? { background: pal.accent, color: pal.onAccent, border: '1px solid transparent' } : { border: `1px solid ${pal.line}`, color: pal.ink })

  return (
    <div className="min-h-screen" style={{ background: pal.bg, color: pal.ink }}>
      {coverKind === 'text' || !cover?.web ? (
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
              {brand?.name && <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/80">{brand.name}</p>}
              <h1 className={`${headCls} text-4xl sm:text-5xl`} style={headStyle}>{data.title}</h1>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 backdrop-blur" style={{ background: `${pal.bg}F2`, borderBottom: `1px solid ${pal.line}` }}>
        {!cover?.web ? (
          <h2 className={`${headCls} text-xl`} style={headStyle}>{data.title}</h2>
        ) : (
          <span className="text-sm" style={{ color: pal.soft }}>{data.photos.length} photos</span>
        )}
        <div className="flex items-center gap-2 text-sm">
          {data.allowDownloads && list.length > 0 && (
            <button onClick={downloadAll} disabled={zip.busy} className="rounded-full px-4 py-1.5 transition disabled:opacity-60" style={pill(false)}>
              {zip.busy ? (zip.total ? `Zipping ${zip.done}/${zip.total}` : 'Preparing…') : onlyFavs ? 'Download favorites' : 'Download all'}
            </button>
          )}
          <button onClick={() => setOnlyFavs(false)} className="rounded-full px-4 py-1.5 transition" style={pill(!onlyFavs)}>All</button>
          <button onClick={() => setOnlyFavs(true)} className="flex items-center gap-1.5 rounded-full px-4 py-1.5 transition" style={pill(onlyFavs)}>
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
        ) : look.grid === 'masonry' ? (
          <div className="columns-2 md:columns-3 lg:columns-4" style={{ columnGap: look.gap }}>
            {list.map((p, i) => renderItem(p, i, false))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: look.gap }}>
            {list.map((p, i) => renderItem(p, i, true))}
          </div>
        )}
      </main>

      <footer className="py-10 text-center text-xs" style={{ color: pal.soft }}>{brand?.name ? `${brand.name} · ` : ''}Delivered with Camrhia</footer>

      {current && openIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpenIndex(null)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm opacity-70">{openIndex + 1} / {list.length}</span>
            <div className="flex items-center gap-4">
              <button onClick={() => toggleFav(current.id)} aria-label="Favorite" className="text-white" style={favs.has(current.id) ? { color: heart } : undefined}>
                <Heart filled={favs.has(current.id)} className="h-6 w-6" />
              </button>
              {data.allowDownloads && (
                <a
                  href={`/api/gallery/download?access=${encodeURIComponent(data.access)}&photo=${current.id}`}
                  className="rounded-full border border-white/40 px-4 py-1.5 text-sm hover:bg-white/10"
                >
                  Download
                </a>
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
