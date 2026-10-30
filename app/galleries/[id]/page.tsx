'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { makeVersions, isHeic } from '@/lib/galleryImages'
import { storageLimitBytes, formatBytes } from '@/lib/storageLimit'
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
  session_id: string | null
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
const CONCURRENCY = 5
const MAX_BYTES = 50 * 1024 * 1024 // per-file limit on the current Supabase plan
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
  const [sessInfo, setSessInfo] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [filter, setFilter] = useState<'all' | 'fav'>('all')
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const failedRef = useRef<File[]>([])
  const dragId = useRef<string | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [view, setView] = useState<{ id: string; url: string | null } | null>(null)

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
      .select('id, title, token, pin_hash, allow_downloads, expires_at, status, cover_photo_id, cover_path, session_id')
      .eq('id', galleryId)
      .maybeSingle()
    if (error || !data) { setMessage('Gallery not found.'); return }
    const g = data as Gallery
    setGallery(g)
    setTitle(g.title)
    setExpiry(g.expires_at ? toDateInput(g.expires_at) : '')
    if (g.session_id) {
      const [{ data: w }, { data: st }] = await Promise.all([
        sb.from('weddings').select('names, wedding_date, session_type').eq('id', g.session_id).maybeSingle(),
        sb.from('session_types').select('key, label'),
      ])
      const wd = w as { names: string | null; wedding_date: string | null; session_type: string | null } | null
      const label = ((st ?? []) as { key: string; label: string }[]).find((t) => t.key === wd?.session_type)?.label ?? wd?.session_type ?? null
      const date = wd?.wedding_date ? new Date(`${wd.wedding_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null
      const nm = wd?.names && wd.names.trim().toLowerCase() !== g.title.trim().toLowerCase() ? wd.names : null
      setSessInfo([label, date, nm].filter(Boolean).join(' · ') || null)
    }
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
    const have = new Set(photos.map((p) => `${p.filename}|${p.size_bytes}`))
    const files = list
      .filter((f) => !have.has(`${f.name}|${f.size}`))
      .filter((f) => f.size <= MAX_BYTES)
      .filter(isAccepted)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    const skipped = list.filter((f) => !isAccepted(f) && !f.name.startsWith('.')).length
    const dupes = list.filter((f) => isAccepted(f) && have.has(`${f.name}|${f.size}`)).length
    if (dupes > 0) flash(`${dupes} already in this gallery, skipped.`)
    const tooBig = list.filter((f) => isAccepted(f) && f.size > MAX_BYTES)
    if (tooBig.length > 0) {
      setMessage(`${tooBig.length} file${tooBig.length === 1 ? '' : 's'} over 50 MB skipped: ${tooBig.slice(0, 3).map((f) => f.name).join(', ')}${tooBig.length > 3 ? '…' : ''}`)
    }
    if (skipped > 0) setMessage(`${skipped} file(s) skipped. Supported: JPG, PNG, WebP and HEIC.`)
    if (files.length === 0) return

    const incoming = files.reduce((n, f) => n + f.size, 0)
    const [usageRes, profRes] = await Promise.all([
      sb.rpc('storage_usage'),
      sb.from('profiles').select('plan_tier, storage_addon_packs').eq('id', userId).single(),
    ])
    const used = ((usageRes.data ?? []) as { bytes: number }[]).reduce((n, r) => n + Number(r.bytes), 0)
    const limit = storageLimitBytes(profRes.data?.plan_tier as string | null, (profRes.data?.storage_addon_packs as number | null) ?? 0)
    if (used + incoming > limit) {
      setMessage(`Not enough storage. You are using ${formatBytes(used)} of ${formatBytes(limit)}. Delete old galleries or add storage on the Storage page.`)
      return
    }
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
          const bucket = sb.storage.from(BUCKET)
          const [v, o] = await Promise.all([
            makeVersions(file),
            bucket.upload(origPath, file, { contentType: origType, upsert: true }),
          ])
          if (o.error) throw o.error
          const [t, w] = await Promise.all([
            bucket.upload(thumbPath, v.thumb.blob, { contentType: 'image/jpeg', upsert: true }),
            bucket.upload(webPath, v.web.blob, { contentType: 'image/jpeg', upsert: true }),
          ])
          if (t.error) throw t.error
          if (w.error) throw w.error
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
    const { error } = await sb.from('gallery_photos').delete().eq('id', p.id)
    if (error) { setMessage(error.message); return }
    await sb.storage.from(BUCKET).remove(paths)
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
  const coverId = gallery?.cover_photo_id ?? null
  const coverPhoto = coverId ? photos.find((p) => p.id === coverId) : undefined
  const coverThumb = coverPhoto?.thumb_path ? thumbs[coverPhoto.thumb_path] : undefined

  function toggleSel(id: string) {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function bulkDelete() {
    const sb = supabase
    if (!sb || selected.size === 0) return
    if (!window.confirm(`Delete ${selected.size} photo${selected.size === 1 ? '' : 's'}? This cannot be undone.`)) return
    const ids = [...selected]
    const doomed = photos.filter((p) => selected.has(p.id))
    setMessage(`Deleting ${ids.length}…`)
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await sb.from('gallery_photos').delete().in('id', ids.slice(i, i + 100))
      if (error) { setMessage(error.message); return }
    }
    const paths = doomed.flatMap((p) => [p.orig_path, p.web_path, p.thumb_path]).filter((x): x is string => !!x)
    for (let i = 0; i < paths.length; i += 100) {
      await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    }
    const remaining = photos.filter((p) => !selected.has(p.id))
    const hadCover = !!gallery?.cover_photo_id && selected.has(gallery.cover_photo_id)
    setPhotos(remaining)
    setSelected(new Set())
    setSelecting(false)
    if (hadCover) {
      await saveSettings({ cover_photo_id: null })
      await syncCover(null, remaining)
    }
    flash(`${ids.length} deleted`)
  }

  function copyFavNames() {
    const names = shown.map((p) => p.filename).filter((n): n is string => !!n)
    if (names.length === 0) return
    navigator.clipboard?.writeText(names.join('\n'))
    flash(`${names.length} filenames copied`)
  }

  async function openView(p: Photo) {
    const sb = supabase
    if (!sb) return
    setView({ id: p.id, url: null })
    const src = p.web_path ?? p.thumb_path ?? p.orig_path
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(src, 3600)
    setView((v) => (v && v.id === p.id ? { id: p.id, url: data?.signedUrl ?? null } : v))
  }

  function stepView(dir: -1 | 1) {
    if (!view) return
    const i = shown.findIndex((p) => p.id === view.id)
    const nxt = shown[i + dir]
    if (nxt) openView(nxt)
  }

  useEffect(() => {
    if (!view) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setView(null)
      if (e.key === 'ArrowRight') stepView(1)
      if (e.key === 'ArrowLeft') stepView(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="galleries" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {!gallery ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-start gap-4">
              {coverThumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverThumb} alt="Cover" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title.trim() && title.trim() !== gallery.title) saveSettings({ title: title.trim() }) }}
                  className="w-full bg-transparent font-fraunces text-3xl font-semibold text-ink focus:outline-none focus:ring-0"
                  aria-label="Gallery name"
                />
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-line text-ink-soft'}`}>{isPublished ? 'Published' : 'Draft'}</span>
                  {sessInfo && <span>{sessInfo}</span>}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  {photos.length} {photos.length === 1 ? 'photo' : 'photos'} · {totalFavs} {totalFavs === 1 ? 'favorite' : 'favorites'}
                  {!isPublished ? (photos.length === 0 ? ' · Add photos, then publish when you are ready to share.' : ' · Publish when you are ready to share.') : ''}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {isPublished && (
                  <>
                    <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(shareUrl); flash('Link copied') }}>Copy link</button>
                    <a className={btnGhost} href={shareUrl} target="_blank" rel="noreferrer">Preview</a>
                  </>
                )}
                <button
                  onClick={async () => {
                    const publishing = !isPublished
                    const ok = await saveSettings({ status: publishing ? 'published' : 'draft' })
                    if (ok && publishing) {
                      await syncCover(gallery.cover_photo_id)
                      router.push('/galleries')
                    }
                  }}
                  disabled={!isPublished && photos.length === 0}
                  className={isPublished ? btnGhost : btn}
                >
                  {isPublished ? 'Unpublish' : 'Publish gallery'}
                </button>
              </div>
            </div>

            {message && <p className="mb-4 text-sm text-twilight">{message}</p>}

            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              {/* Left: upload + photos */}
              <div className="min-w-0">
                <section
                  className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed px-5 ${photos.length > 0 ? 'py-4' : 'py-10'} transition ${dragging ? 'border-twilight bg-twilight/5' : 'border-line bg-card'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <div className="min-w-0">
                    <p className="font-fraunces text-lg text-ink">Add photos</p>
                    <p className="text-xs text-ink-soft">Drop photos or a whole folder here. JPG, PNG, WebP and HEIC, up to 50 MB each. Keep this tab open until they finish.</p>
                  </div>
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
                  <div className="flex gap-2">
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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
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
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {filter === 'all' && photos.length > 1 && !selecting && (
                      <p className="hidden text-xs text-ink-soft sm:block">Drag photos to reorder</p>
                    )}
                    {!selecting ? (
                      <button className={btnGhost} disabled={photos.length === 0} onClick={() => { setSelecting(true); setSelected(new Set()) }}>
                        Select
                      </button>
                    ) : (
                      <>
                        <button className={btnGhost} onClick={() => setSelected(new Set(shown.map((p) => p.id)))}>Select all ({shown.length})</button>
                        <button className={`${btnGhost} text-red-600`} disabled={selected.size === 0} onClick={bulkDelete}>Delete{selected.size ? ` (${selected.size})` : ''}</button>
                        <button className={btnGhost} onClick={() => { setSelecting(false); setSelected(new Set()) }}>Cancel</button>
                      </>
                    )}
                    {filter === 'fav' && shown.length > 0 && (
                      <button className={btnGhost} onClick={copyFavNames}>Copy favorite filenames</button>
                    )}
                  </div>
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
                        draggable={filter === 'all' && !selecting}
                        onClick={() => (selecting ? toggleSel(p.id) : openView(p))}
                        onDragStart={() => { dragId.current = p.id }}
                        onDragOver={(e) => { if (filter === 'all') e.preventDefault() }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropOn(p.id) }}
                        className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-line ${selected.has(p.id) ? 'ring-4 ring-twilight' : ''}`}
                      >
                        {p.thumb_path && thumbs[p.thumb_path] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbs[p.thumb_path]} alt={p.filename ?? ''} loading="lazy" draggable={false} className="h-full w-full object-cover" />
                        )}
                        {selecting && (
                          <span className={`absolute bottom-2 left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs ${selected.has(p.id) ? 'bg-twilight text-white' : 'bg-black/30 text-transparent'}`}>✓</span>
                        )}
                        {gallery.cover_photo_id === p.id && (
                          <span className="absolute left-2 top-2 rounded-full bg-twilight px-2 py-0.5 text-[10px] text-white">Cover</span>
                        )}
                        {favCounts[p.id] > 0 && (
                          <span style={{ color: 'color-mix(in srgb, var(--color-twilight) 55%, white)' }} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs">
                            ♥ {favCounts[p.id]}
                          </span>
                        )}
                        <div className={`absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/60 p-1.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 ${selecting ? 'hidden' : ''}`}>
                          <button className="text-xs text-white" onClick={async (e) => { e.stopPropagation(); if (await saveSettings({ cover_photo_id: p.id })) await syncCover(p.id) }}>Set cover</button>
                          <button className="text-xs text-red-300" onClick={(e) => { e.stopPropagation(); deletePhoto(p) }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: share + access */}
              <aside className="lg:sticky lg:top-6 lg:self-start">
                <div className={card}>
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft">Share with your client</p>
                  <input readOnly value={shareUrl} className={input} onFocus={(e) => e.currentTarget.select()} />
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(shareUrl); flash('Link copied') }}>
                      Copy link
                    </button>
                    <a className={`${btnGhost} text-center`} href={shareUrl} target="_blank" rel="noreferrer">
                      Preview
                    </a>
                    <a
                    className={`${btnGhost} text-center`}
                    href={`mailto:?subject=${encodeURIComponent(`Your photos: ${gallery.title}`)}&body=${encodeURIComponent(`Your photos are ready! View and download them here:\n\n${shareUrl}\n\n${gallery.pin_hash ? "I'll send your PIN separately." : ''}`)}`}
                  >
                    Email the link
                  </a>
                  </div>
                  {!isPublished && (
                    <p className="mt-3 text-xs text-ink-soft">This gallery is a draft. Publish it before sharing the link.</p>
                  )}

                  <div className="mt-5 border-t border-line pt-5">
                    <p className="mb-4 text-xs font-medium uppercase tracking-wider text-ink-soft">Access</p>
                    

                  <div>
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

                  <div className="mt-5 border-t border-line pt-5">
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

                  <div className="mt-5 border-t border-line pt-5">
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
                
                  </div>

                  <div className="mt-5 border-t border-line pt-4">
                    <button onClick={deleteGallery} className="text-sm text-red-600 hover:underline">Delete gallery</button>
                    <p className="mt-1 text-xs text-ink-soft">Removes the gallery and every photo in it. This cannot be undone.</p>
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
        {view && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setView(null)}>
            <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
              <span className="text-sm opacity-70">{shown.findIndex((x) => x.id === view.id) + 1} / {shown.length}</span>
              <div className="flex items-center gap-5">
                <button className="text-sm" onClick={async () => { if (await saveSettings({ cover_photo_id: view.id })) await syncCover(view.id) }}>
                  Set as cover
                </button>
                <button className="text-2xl leading-none" onClick={() => setView(null)} aria-label="Close">×</button>
              </div>
            </div>
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-4">
              {shown.findIndex((x) => x.id === view.id) > 0 && (
                <button onClick={(e) => { e.stopPropagation(); stepView(-1) }} className="absolute left-2 z-10 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20" aria-label="Previous">‹</button>
              )}
              {view.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={view.url} alt="" onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="text-sm text-white/70">Loading…</p>
              )}
              {shown.findIndex((x) => x.id === view.id) < shown.length - 1 && (
                <button onClick={(e) => { e.stopPropagation(); stepView(1) }} className="absolute right-2 z-10 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/20" aria-label="Next">›</button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
