'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { makeVersions, isHeic } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Gallery = {
  id: string
  title: string
  token: string
  pin_hash: string | null
  allow_downloads: boolean
  expires_at: string | null
  status: 'draft' | 'published'
  cover_photo_id: string | null
  cover_path: string | null
}
type Photo = {
  id: string
  filename: string | null
  orig_path: string
  web_path: string | null
  thumb_path: string | null
  size_bytes: number | null
  sort_order: number
}
type UploadItem = { key: string; name: string; status: 'queued' | 'uploading' | 'done' | 'error'; error?: string }

const BUCKET = 'galleries'
const CONCURRENCY = 3
const isAccepted = (f: File) => isHeic(f) || /^image\/(jpeg|png|webp)$/.test(f.type)

function toDateInput(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

// Collects files from a drop, including files inside dropped folders.
async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const direct = Array.from(dt.files)
  const entries = Array.from(dt.items ?? [])
    .map((i) => (i as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry?.() ?? null)
    .filter((e): e is FileSystemEntry => !!e)
  if (entries.length === 0) return direct
  const out: File[] = []
  async function walk(entry: FileSystemEntry): Promise<void> {
    if (entry.isFile) {
      const f = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej))
      out.push(f)
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader()
      while (true) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej))
        if (batch.length === 0) break
        for (const e of batch) await walk(e)
      }
    }
  }
  for (const e of entries) await walk(e)
  return out
}

const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50'
const label = 'mb-1.5 block text-sm font-medium text-ink'

export default function GalleryManagePage() {
  const router = useRouter()
  const { id: galleryId } = useParams<{ id: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [favCounts, setFavCounts] = useState<Record<string, number>>({})
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [title, setTitle] = useState('')
  const [pin, setPin] = useState('')
  const [expiry, setExpiry] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [dragging, setDragging] = useState(false)
  const [filter, setFilter] = useState<'all' | 'fav'>('all')
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const failedRef = useRef<File[]>([])
  const dragId = useRef<string | null>(null)

  const active = uploads.some((u) => u.status === 'queued' || u.status === 'uploading')
  const doneCount = uploads.filter((u) => u.status === 'done').length
  const failed = uploads.filter((u) => u.status === 'error')
  const totalFavs = Object.values(favCounts).reduce((a, b) => a + b, 0)
  const favPhotoCount = Object.keys(favCounts).length

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 2500)
  }

  const loadGallery = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data, error } = await sb
      .from('galleries')
      .select('id, title, token, pin_hash, allow_downloads, expires_at, status, cover_photo_id, cover_path')
      .eq('id', galleryId)
      .maybeSingle()
    if (error || !data) { setMessage('Gallery not found.'); return }
    const g = data as Gallery
    setGallery(g)
    setTitle(g.title)
    setExpiry(g.expires_at ? toDateInput(g.expires_at) : '')
  }, [galleryId])

  const loadFavs = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const counts: Record<string, number> = {}
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from('gallery_favorites').select('photo_id').eq('gallery_id', galleryId).range(from, from + 999)
      const batch = (data ?? []) as { photo_id: string }[]
      batch.forEach((r) => { counts[r.photo_id] = (counts[r.photo_id] ?? 0) + 1 })
      if (batch.length < 1000) break
    }
    setFavCounts(counts)
  }, [galleryId])

  const loadPhotos = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const all: Photo[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb
        .from('gallery_photos')
        .select('id, filename, orig_path, web_path, thumb_path, size_bytes, sort_order')
        .eq('gallery_id', galleryId)
        .order('sort_order', { ascending: true })
        .range(from, from + 999)
      if (error) { setMessage(error.message); return }
      const batch = (data ?? []) as Photo[]
      all.push(...batch)
      if (batch.length < 1000) break
    }
    setPhotos(all)
    const paths = all.map((p) => p.thumb_path).filter((p): p is string => !!p)
    const map: Record<string, string> = {}
    for (let i = 0; i < paths.length; i += 200) {
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 200), 3600)
      signed?.forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl })
    }
    setThumbs(map)
  }, [galleryId])

  useEffect(() => {
    setOrigin(window.location.origin)
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace(`/login?next=/galleries/${galleryId}`); return }
      setUserId(data.session.user.id)
      loadGallery()
      loadPhotos()
      loadFavs()
    })
  }, [router, galleryId, loadGallery, loadPhotos, loadFavs])

  useEffect(() => {
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])

  async function saveSettings(patch: Partial<Gallery>): Promise<boolean> {
    const sb = supabase
    if (!sb || !gallery) return false
    const { error } = await sb.from('galleries').update(patch).eq('id', gallery.id)
    if (error) { setMessage(error.message); return false }
    setGallery({ ...gallery, ...patch })
    flash('Saved')
    return true
  }

  async function savePin(clear: boolean) {
    const sb = supabase
    if (!sb || !gallery) return
    const value = clear ? '' : pin.trim()
    if (!clear && value.length < 4) { setMessage('Use a PIN of at least 4 characters.'); return }
    const { error } = await sb.rpc('set_gallery_pin', { p_gallery_id: gallery.id, p_pin: value })
    if (error) { setMessage(error.message); return }
    setGallery({ ...gallery, pin_hash: clear ? null : 'set' })
    setPin('')
    flash(clear ? 'PIN removed' : 'PIN saved')
  }

  // Copies the cover photo into the public gallery-covers bucket so the app can show it as a card background.
  async function syncCover(photoId: string | null, pool: Photo[] = photos): Promise<void> {
    const sb = supabase
    if (!sb || !userId || !gallery) return
    const old = gallery.cover_path
    const target = photoId ? pool.find((x) => x.id === photoId) : pool[0]
    const src = target?.web_path ?? target?.thumb_path ?? null
    if (!target || !src) {
      if (old) {
        await sb.storage.from('gallery-covers').remove([old])
        await sb.from('galleries').update({ cover_path: null }).eq('id', gallery.id)
        setGallery((g) => (g ? { ...g, cover_path: null } : g))
      }
      return
    }
    const dl = await sb.storage.from(BUCKET).download(src)
    if (dl.error || !dl.data) { setMessage('Could not update the cover image.'); return }
    const path = `${userId}/${gallery.id}-${Date.now()}.jpg`
    const up = await sb.storage.from('gallery-covers').upload(path, dl.data, { contentType: 'image/jpeg', upsert: true })
    if (up.error) { setMessage(up.error.message); return }
    const { error } = await sb.from('galleries').update({ cover_path: path }).eq('id', gallery.id)
    if (error) { setMessage(error.message); return }
    if (old && old !== path) await sb.storage.from('gallery-covers').remove([old])
    setGallery((g) => (g ? { ...g, cover_path: path } : g))
  }

  async function uploadFiles(list: File[]) {
    const sb = supabase
    if (!sb || !userId || !gallery) return
    if (active) { setMessage('Wait for the current upload to finish.'); return }
    const files = list
      .filter(isAccepted)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    const skipped = list.filter((f) => !isAccepted(f) && !f.name.startsWith('.')).length
    if (skipped > 0) setMessage(`${skipped} file(s) skipped. Supported: JPG, PNG, WebP and HEIC.`)
    if (files.length === 0) return

    const base = photos.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1
    const items: UploadItem[] = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, status: 'queued' }))
    setUploads(items)
    const failedFiles: File[] = []
    const setItem = (key: string, patch: Partial<UploadItem>) =>
      setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)))

    async function uploadOne(file: File, key: string, order: number) {
      if (!sb || !userId || !gallery) return
      setItem(key, { status: 'uploading' })
      const photoId = crypto.randomUUID()
      const heic = isHeic(file)
      const ext = heic ? 'heic' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const origType = heic ? 'image/heic' : file.type
      const dir = `${userId}/${gallery.id}/${photoId}`
      const origPath = `${dir}/orig.${ext}`
      const webPath = `${dir}/web.jpg`
      const thumbPath = `${dir}/thumb.jpg`
      let lastError = 'Upload failed'
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const v = await makeVersions(file)
          const bucket = sb.storage.from(BUCKET)
          const t = await bucket.upload(thumbPath, v.thumb.blob, { contentType: 'image/jpeg', upsert: true })
          if (t.error) throw t.error
          const w = await bucket.upload(webPath, v.web.blob, { contentType: 'image/jpeg', upsert: true })
          if (w.error) throw w.error
          const o = await bucket.upload(origPath, file, { contentType: origType, upsert: true })
          if (o.error) throw o.error
          const { error } = await sb.from('gallery_photos').insert({
            id: photoId, gallery_id: gallery.id, owner_id: userId, filename: file.name,
            orig_path: origPath, web_path: webPath, thumb_path: thumbPath,
            width: v.width, height: v.height, size_bytes: file.size, sort_order: order,
          })
          if (error) throw error
          setItem(key, { status: 'done' })
          return
        } catch (e) {
          lastError = e instanceof Error ? e.message : 'Upload failed'
        }
      }
      failedFiles.push(file)
      setItem(key, { status: 'error', error: lastError })
    }

    let next = 0
    async function worker() {
      while (true) {
        const i = next++
        if (i >= files.length) return
        await uploadOne(files[i], items[i].key, base + i)
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
    failedRef.current = failedFiles
    await loadPhotos()
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const files = await filesFromDrop(e.dataTransfer)
    uploadFiles(files)
  }

  async function deletePhoto(p: Photo) {
    const sb = supabase
    if (!sb) return
    if (!window.confirm('Delete this photo?')) return
    const paths = [p.orig_path, p.web_path, p.thumb_path].filter((x): x is string => !!x)
    await sb.storage.from(BUCKET).remove(paths)
    const { error } = await sb.from('gallery_photos').delete().eq('id', p.id)
    if (error) { setMessage(error.message); return }
    if (gallery?.cover_photo_id === p.id) {
      await saveSettings({ cover_photo_id: null })
      await syncCover(null, photos.filter((x) => x.id !== p.id))
    }
    setPhotos((prev) => prev.filter((x) => x.id !== p.id))
  }

  async function deleteGallery() {
    const sb = supabase
    if (!sb || !gallery) return
    if (!window.confirm('Delete this whole gallery and all of its photos? This cannot be undone.')) return
    const paths = photos.flatMap((p) => [p.orig_path, p.web_path, p.thumb_path]).filter((x): x is string => !!x)
    for (let i = 0; i < paths.length; i += 100) {
      await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    }
    const { error } = await sb.from('galleries').delete().eq('id', gallery.id)
    if (error) { setMessage(error.message); return }
    router.push('/galleries')
  }

  async function dropOn(targetId: string) {
    const sb = supabase
    const from = dragId.current
    dragId.current = null
    if (!sb || !from || from === targetId || filter !== 'all') return
    const arr = [...photos]
    const a = arr.findIndex((p) => p.id === from)
    const b = arr.findIndex((p) => p.id === targetId)
    if (a < 0 || b < 0) return
    const [moved] = arr.splice(a, 1)
    arr.splice(b, 0, moved)
    const next = arr.map((p, i) => ({ ...p, sort_order: i }))
    const before = new Map(photos.map((p) => [p.id, p.sort_order]))
    const changed = next.filter((p) => before.get(p.id) !== p.sort_order)
    setPhotos(next)
    for (let i = 0; i < changed.length; i += 10) {
      await Promise.all(
        changed.slice(i, i + 10).map((p) => sb.from('gallery_photos').update({ sort_order: p.sort_order }).eq('id', p.id)),
      )
    }
  }

  const shareUrl = gallery ? `${origin}/g/${gallery.token}` : ''
  const shown = filter === 'fav' ? photos.filter((p) => favCounts[p.id]) : photos
  const isPublished = gallery?.status === 'published'

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="galleries" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {!gallery ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            {/* Title row */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title.trim() && title.trim() !== gallery.title) saveSettings({ title: title.trim() }) }}
                  className="w-full bg-transparent font-fraunces text-3xl font-semibold text-ink focus:outline-none focus:ring-0"
                  aria-label="Gallery name"
                />
                <p className="mt-1 text-sm text-ink-soft">
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-ink-soft/40'}`} />
                  {isPublished ? 'Published. Clients can open the link.' : 'Draft. Not visible to clients yet.'}
                </p>
              </div>
              <button
                onClick={async () => {
                  const publishing = !isPublished
                  const ok = await saveSettings({ status: publishing ? 'published' : 'draft' })
                  if (ok && publishing) {
                    await syncCover(gallery.cover_photo_id)
                    router.push('/galleries')
                  }
                }}
                className={isPublished ? btnGhost : btn}
              >
                {isPublished ? 'Unpublish' : 'Publish gallery'}
              </button>
            </div>

            {message && <p className="mb-4 text-sm text-twilight">{message}</p>}

            {/* Stats */}
            <div className="mb-8 grid grid-cols-3 gap-4">
              <div className={card}>
                <p className="text-xs uppercase tracking-wider text-ink-soft">Photos</p>
                <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{photos.length}</p>
              </div>
              <div className={card}>
                <p className="text-xs uppercase tracking-wider text-ink-soft">Favorites</p>
                <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{totalFavs}</p>
              </div>
              <div className={card}>
                <p className="text-xs uppercase tracking-wider text-ink-soft">Photos hearted</p>
                <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{favPhotoCount}</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              {/* Left: upload + photos */}
              <div className="min-w-0">
                <section
                  className={`mb-4 rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? 'border-twilight bg-twilight/5' : 'border-line bg-card'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <p className="font-fraunces text-xl text-ink">Drop photos or a whole folder here</p>
                  <p className="mt-1 text-sm text-ink-soft">JPG, PNG, WebP and HEIC. Select hundreds at once. Keep this tab open until they finish.</p>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,.heic,.heif"
                    className="hidden"
                    onChange={(e) => { if (e.target.files) uploadFiles(Array.from(e.target.files)); e.target.value = '' }}
                  />
                  <input
                    ref={folderInput}
                    type="file"
                    multiple
                    className="hidden"
                    {...({ webkitdirectory: '' } as Record<string, string>)}
                    onChange={(e) => { if (e.target.files) uploadFiles(Array.from(e.target.files)); e.target.value = '' }}
                  />
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button className={btn} disabled={active} onClick={() => fileInput.current?.click()}>
                      {active ? 'Uploading…' : 'Choose photos'}
                    </button>
                    <button className={btnGhost} disabled={active} onClick={() => folderInput.current?.click()}>
                      Choose folder
                    </button>
                  </div>
                </section>

                {uploads.length > 0 && (
                  <div className="mb-6">
                    <div className="mb-2 flex justify-between text-sm text-ink-soft">
                      <span>{active ? 'Uploading' : 'Finished'}: {doneCount} of {uploads.length}</span>
                      {failed.length > 0 && <span className="text-red-600">{failed.length} failed</span>}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-twilight transition-all" style={{ width: `${(doneCount / uploads.length) * 100}%` }} />
                    </div>
                    {failed.length > 0 && !active && (
                      <div className="mt-3">
                        <ul className="mb-2 space-y-1 text-xs text-red-600">
                          {failed.slice(0, 5).map((f) => <li key={f.key}>{f.name}: {f.error}</li>)}
                          {failed.length > 5 && <li>…and {failed.length - 5} more</li>}
                        </ul>
                        <button className={btnGhost} onClick={() => uploadFiles(failedRef.current)}>
                          Retry {failed.length} failed
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Photo toolbar */}
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex gap-2 text-sm">
                    <button
                      onClick={() => setFilter('all')}
                      className={`rounded-full px-4 py-1.5 ${filter === 'all' ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                    >
                      All ({photos.length})
                    </button>
                    <button
                      onClick={() => setFilter('fav')}
                      className={`rounded-full px-4 py-1.5 ${filter === 'fav' ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                    >
                      ♥ Client favorites ({favPhotoCount})
                    </button>
                  </div>
                  {filter === 'all' && photos.length > 1 && (
                    <p className="hidden text-xs text-ink-soft sm:block">Drag photos to reorder</p>
                  )}
                </div>

                {shown.length === 0 ? (
                  <p className="rounded-2xl border border-line bg-card py-16 text-center text-sm text-ink-soft">
                    {filter === 'fav' ? 'No client favorites yet.' : 'No photos yet. Drop some above.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {shown.map((p) => (
                      <div
                        key={p.id}
                        draggable={filter === 'all'}
                        onDragStart={() => { dragId.current = p.id }}
                        onDragOver={(e) => { if (filter === 'all') e.preventDefault() }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropOn(p.id) }}
                        className={`group relative aspect-square overflow-hidden rounded-xl bg-line ${filter === 'all' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      >
                        {p.thumb_path && thumbs[p.thumb_path] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbs[p.thumb_path]} alt={p.filename ?? ''} loading="lazy" draggable={false} className="h-full w-full object-cover" />
                        )}
                        {gallery.cover_photo_id === p.id && (
                          <span className="absolute left-2 top-2 rounded-full bg-twilight px-2 py-0.5 text-[10px] text-white">Cover</span>
                        )}
                        {favCounts[p.id] > 0 && (
                          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-rose-300">
                            ♥ {favCounts[p.id]}
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-1.5 opacity-0 transition group-hover:opacity-100">
                          <button className="text-xs text-white" onClick={async () => { if (await saveSettings({ cover_photo_id: p.id })) await syncCover(p.id) }}>Set cover</button>
                          <button className="text-xs text-red-300" onClick={() => deletePhoto(p)}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: share + access */}
              <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                <div className={card}>
                  <p className={label}>Share with your client</p>
                  <input readOnly value={shareUrl} className={input} onFocus={(e) => e.currentTarget.select()} />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(shareUrl); flash('Link copied') }}>
                      Copy link
                    </button>
                    <a
                      className={`${btnGhost} text-center`}
                      href={shareUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>
                  </div>
                  <a
                    className={`${btnGhost} mt-2 block text-center`}
                    href={`mailto:?subject=${encodeURIComponent(`Your photos: ${gallery.title}`)}&body=${encodeURIComponent(`Your photos are ready! View and download them here:\n\n${shareUrl}\n\n${gallery.pin_hash ? "I'll send your PIN separately." : ''}`)}`}
                  >
                    Email the link
                  </a>
                  {!isPublished && (
                    <p className="mt-3 text-xs text-ink-soft">This gallery is a draft. Publish it before sharing the link.</p>
                  )}
                </div>

                <div className={card}>
                  <label className={label}>
                    PIN {gallery.pin_hash ? <span className="text-twilight">(on)</span> : <span className="text-ink-soft">(off)</span>}
                  </label>
                  <div className="flex gap-2">
                    <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Set a new PIN" className={input} />
                    <button className={btnGhost} onClick={() => savePin(false)}>Save</button>
                  </div>
                  {gallery.pin_hash && (
                    <button className="mt-2 text-xs text-ink-soft underline" onClick={() => savePin(true)}>Remove PIN</button>
                  )}
                  <p className="mt-2 text-xs text-ink-soft">Clients enter this to open the gallery. Leave it off for an open link.</p>
                </div>

                <div className={card}>
                  <label className={label}>Expires on</label>
                  <div className="flex gap-2">
                    <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={input} />
                    <button
                      className={btnGhost}
                      onClick={() => saveSettings({ expires_at: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null })}
                    >
                      Save
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">After this date the link stops working. Leave blank for no expiry.</p>
                </div>

                <div className={card}>
                  <label className="flex cursor-pointer items-center justify-between text-sm font-medium text-ink">
                    Allow downloads
                    <input
                      type="checkbox"
                      checked={gallery.allow_downloads}
                      onChange={(e) => saveSettings({ allow_downloads: e.target.checked })}
                      className="h-5 w-5"
                    />
                  </label>
                  <p className="mt-2 text-xs text-ink-soft">When off, clients can view and favorite but not download.</p>
                </div>

                <button onClick={deleteGallery} className="w-full text-center text-sm text-red-600 hover:underline">
                  Delete this gallery
                </button>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
