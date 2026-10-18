'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type Photo = { id: string; filename: string | null; width: number | null; height: number | null; thumb: string | null; web: string | null }
type Data = { title: string; allowDownloads: boolean; coverId: string | null; access: string; favorites: string[]; photos: Photo[] }
type Phase = 'loading' | 'pin' | 'ready' | 'missing' | 'expired'
type ZipFile = { id: string; name: string; size: number | null; url: string }

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
  const [zip, setZip] = useState<{ busy: boolean; done: number; total: number; error: string | null }>({ busy: false, done: 0, total: 0, error: null })

  const load = useCallback(async (pinValue?: string) => {
    let stored: string | null = null
    try { stored = sessionStorage.getItem(`g_access_${token}`) } catch {}
    setBusy(true)
    try {
      const res = await fetch('/api/gallery/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, pin: pinValue, access: pinValue ? undefined : stored, visitorId: visitorId() }),
      })
      const j = await res.json().catch(() => ({}))
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
        if (pinValue) setPinError('That PIN is not right. Please try again.')
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
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">Private gallery</p>
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
  const cover = data.photos.find((p) => p.id === data.coverId) ?? data.photos[0]
  const current = openIndex !== null ? list[openIndex] : null

  return (
    <div className="min-h-screen bg-paper">
      {cover?.web && (
        <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden bg-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover.web} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/65 via-black/10 to-transparent p-6 sm:p-10">
            <h1 className="font-fraunces text-4xl font-semibold text-white sm:text-5xl">{data.title}</h1>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-6 py-3 backdrop-blur">
        {!cover?.web ? (
          <h1 className="font-fraunces text-xl font-semibold text-ink">{data.title}</h1>
        ) : (
          <span className="text-sm text-ink-soft">{data.photos.length} photos</span>
        )}
        <div className="flex items-center gap-2 text-sm">
          {data.allowDownloads && list.length > 0 && (
            <button
              onClick={downloadAll}
              disabled={zip.busy}
              className="rounded-full border border-line px-4 py-1.5 text-ink transition hover:border-twilight disabled:opacity-60"
            >
              {zip.busy ? (zip.total ? `Zipping ${zip.done}/${zip.total}` : 'Preparing…') : onlyFavs ? 'Download favorites' : 'Download all'}
            </button>
          )}
          <button
            onClick={() => setOnlyFavs(false)}
            className={`rounded-full px-4 py-1.5 transition ${!onlyFavs ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
          >
            All
          </button>
          <button
            onClick={() => setOnlyFavs(true)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${onlyFavs ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
          >
            <Heart filled={onlyFavs} className="h-4 w-4" /> {favs.size}
          </button>
        </div>
      </div>

      {zip.busy && zip.total > 0 && (
        <p className="px-6 pt-3 text-center text-sm text-ink-soft">Keep this tab open until your download finishes.</p>
      )}
      {zip.error && <p className="px-6 pt-3 text-center text-sm text-red-600">{zip.error}</p>}

      <main className="px-3 py-4 sm:px-6">
        {list.length === 0 ? (
          <p className="py-20 text-center text-sm text-ink-soft">
            {onlyFavs ? 'No favorites yet. Tap the heart on any photo.' : 'No photos in this gallery yet.'}
          </p>
        ) : (
          <div className="columns-2 gap-3 md:columns-3 lg:columns-4">
            {list.map((p, i) => (
              <div key={p.id} className="group relative mb-3 break-inside-avoid overflow-hidden rounded-lg bg-line">
                {p.thumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumb}
                    alt={p.filename ?? ''}
                    loading="lazy"
                    onClick={() => setOpenIndex(i)}
                    className="w-full cursor-zoom-in"
                    style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
                  />
                )}
                <button
                  onClick={() => toggleFav(p.id)}
                  aria-label="Favorite"
                  className={`absolute right-2 top-2 rounded-full bg-black/40 p-2 text-white transition hover:bg-black/60 ${favs.has(p.id) ? 'text-rose-400' : 'sm:opacity-0 sm:group-hover:opacity-100'}`}
                >
                  <Heart filled={favs.has(p.id)} className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="py-10 text-center text-xs text-ink-soft">Delivered with Camrhia</footer>

      {current && openIndex !== null && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setOpenIndex(null)}>
          <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-sm opacity-70">{openIndex + 1} / {list.length}</span>
            <div className="flex items-center gap-4">
              <button onClick={() => toggleFav(current.id)} aria-label="Favorite" className={favs.has(current.id) ? 'text-rose-400' : 'text-white'}>
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
