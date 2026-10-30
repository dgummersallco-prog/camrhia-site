'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { makeVersions, isHeic, isRaw } from '@/lib/galleryImages'
import { cullPhotos, type CullLabel } from '@/lib/cull'
import { enhancePhoto } from '@/lib/enhance'
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
  full_path?: string | null
  cull_label?: CullLabel | null
  cull_score?: number | null
  cull_group?: string | null
  cull_reason?: string | null
  enhanced?: boolean | null
  pre_web_path?: string | null
  pre_thumb_path?: string | null
  pre_full_path?: string | null
  size_bytes: number | null
  sort_order: number
}
type UploadItem = { key: string; name: string; status: 'queued' | 'uploading' | 'done' | 'error'; error?: string }

const BUCKET = 'galleries'
const CONCURRENCY = 5
const MAX_BYTES = 250 * 1024 * 1024 // per-file limit (matches the Supabase storage limit)
const isAccepted = (f: File) => isHeic(f) || isRaw(f) || /^image\/(jpeg|png|webp)$/.test(f.type)

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
  const [filter, setFilter] = useState<'all' | 'fav' | CullLabel>('all')
  const [cullOpen, setCullOpen] = useState(false)
  const [cullTarget, setCullTarget] = useState('')
  const [cull, setCull] = useState<{ busy: boolean; done: number; total: number; phase: 'sharp' | 'eyes' }>({ busy: false, done: 0, total: 0, phase: 'sharp' })
  const [cullEyes, setCullEyes] = useState(true)
  const [enhOpen, setEnhOpen] = useState(false)
  const [enhPicksOnly, setEnhPicksOnly] = useState(false)
  const [enh, setEnh] = useState<{ busy: boolean; done: number; total: number; phase: 'enhance' | 'revert' }>({ busy: false, done: 0, total: 0, phase: 'enhance' })
  const [showBefore, setShowBefore] = useState(false)
  const [before, setBefore] = useState<{ id: string; url: string } | null>(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
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
        .select('id, filename, orig_path, web_path, thumb_path, full_path, size_bytes, sort_order, cull_label, cull_score, cull_group, cull_reason, enhanced, pre_web_path, pre_thumb_path, pre_full_path')
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

  useEffect(() => {
    if (!shareOpen && !accessOpen) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShareOpen(false); setAccessOpen(false) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [shareOpen, accessOpen])

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
      setMessage(`${tooBig.length} file${tooBig.length === 1 ? '' : 's'} over 250 MB skipped: ${tooBig.slice(0, 3).map((f) => f.name).join(', ')}${tooBig.length > 3 ? '…' : ''}`)
    }
    if (skipped > 0) setMessage(`${skipped} file(s) skipped. Supported: JPG, PNG, WebP, HEIC and RAW.`)
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
      const raw = isRaw(file)
      const ext = raw ? ((file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'raw') : heic ? 'heic' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
      const origType = raw ? 'application/octet-stream' : heic ? 'image/heic' : file.type
      const dir = `${userId}/${gallery.id}/${photoId}`
      const origPath = `${dir}/orig.${ext}`
      const webPath = `${dir}/web.jpg`
      const thumbPath = `${dir}/thumb.jpg`
      const fullPath = `${dir}/full.jpg`
      let lastError = 'Upload failed'
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const bucket = sb.storage.from(BUCKET)
          const [v, o] = await Promise.all([
            makeVersions(file),
            bucket.upload(origPath, file, { contentType: origType, upsert: true }),
          ])
          if (o.error) throw o.error
          const [t, w, f] = await Promise.all([
            bucket.upload(thumbPath, v.thumb.blob, { contentType: 'image/jpeg', upsert: true }),
            bucket.upload(webPath, v.web.blob, { contentType: 'image/jpeg', upsert: true }),
            v.full ? bucket.upload(fullPath, v.full, { contentType: 'image/jpeg', upsert: true }) : Promise.resolve(null),
          ])
          if (t.error) throw t.error
          if (w.error) throw w.error
          if (f && f.error) throw f.error
          const { error } = await sb.from('gallery_photos').insert({
            id: photoId, gallery_id: gallery.id, owner_id: userId, filename: file.name,
            orig_path: origPath, web_path: webPath, thumb_path: thumbPath, full_path: v.full ? fullPath : null,
            width: v.width, height: v.height, size_bytes: file.size, extra_bytes: v.web.blob.size + v.thumb.blob.size + (v.full ? v.full.size : 0), sort_order: order,
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
    const paths = [p.orig_path, p.web_path, p.thumb_path, p.full_path, p.pre_web_path, p.pre_thumb_path, p.pre_full_path].filter((x): x is string => !!x)
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
    const paths = photos.flatMap((p) => [p.orig_path, p.web_path, p.thumb_path, p.full_path, p.pre_web_path, p.pre_thumb_path, p.pre_full_path]).filter((x): x is string => !!x)
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
  async function toggleBefore() {
    const sb = supabase
    if (!sb || !view) return
    if (showBefore) { setShowBefore(false); return }
    const p = photos.find((x) => x.id === view.id)
    const src = p?.pre_web_path ?? p?.pre_thumb_path
    if (!src) return
    if (!before || before.id !== view.id) {
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(src, 3600)
      if (!data?.signedUrl) return
      setBefore({ id: view.id, url: data.signedUrl })
    }
    setShowBefore(true)
  }

  async function runEnhance() {
    const sb = supabase
    if (!sb || enh.busy) return
    const todo = photos.filter((p) => !p.enhanced && (!enhPicksOnly || p.cull_label === 'pick'))
    if (todo.length === 0) { setMessage('Nothing to enhance.'); return }
    setEnh({ busy: true, done: 0, total: todo.length, phase: 'enhance' })
    let done = 0
    let failed = 0
    let next = 0
    async function worker() {
      if (!sb) return
      while (true) {
        const i = next++
        if (i >= todo.length) return
        const p = todo[i]
        try {
          const srcPath = p.full_path ?? p.orig_path
          const dl = await sb.storage.from(BUCKET).download(srcPath)
          if (dl.error || !dl.data) throw dl.error ?? new Error('Could not load the photo.')
          const out = await enhancePhoto(dl.data, srcPath)
          const dir = p.orig_path.slice(0, p.orig_path.lastIndexOf('/'))
          const eFull = `${dir}/enh-full.jpg`
          const eWeb = `${dir}/enh-web.jpg`
          const eThumb = `${dir}/enh-thumb.jpg`
          const ups = await Promise.all([
            sb.storage.from(BUCKET).upload(eFull, out.full, { contentType: 'image/jpeg', upsert: true }),
            sb.storage.from(BUCKET).upload(eWeb, out.web.blob, { contentType: 'image/jpeg', upsert: true }),
            sb.storage.from(BUCKET).upload(eThumb, out.thumb.blob, { contentType: 'image/jpeg', upsert: true }),
          ])
          const bad = ups.find((u) => u.error)
          if (bad?.error) throw bad.error
          const { error } = await sb
            .from('gallery_photos')
            .update({
              enhanced: true,
              pre_web_path: p.web_path,
              pre_thumb_path: p.thumb_path,
              pre_full_path: p.full_path ?? null,
              web_path: eWeb,
              thumb_path: eThumb,
              full_path: eFull,
              enh_bytes: out.full.size + out.web.blob.size + out.thumb.blob.size,
            })
            .eq('id', p.id)
          if (error) throw error
        } catch {
          failed++
        }
        done++
        setEnh({ busy: true, done, total: todo.length, phase: 'enhance' })
      }
    }
    await Promise.all(Array.from({ length: 2 }, () => worker()))
    await loadPhotos()
    setEnh({ busy: false, done: 0, total: 0, phase: 'enhance' })
    flash(failed ? `Enhanced ${todo.length - failed}. ${failed} could not be processed.` : `Enhanced ${todo.length} photos.`)
  }

  async function revertPhotos(ids: string[]) {
    const sb = supabase
    if (!sb || enh.busy) return
    const idSet = new Set(ids)
    const list = photos.filter((p) => idSet.has(p.id) && p.enhanced)
    if (list.length === 0) return
    setView(null)
    setShowBefore(false)
    setEnh({ busy: true, done: 0, total: list.length, phase: 'revert' })
    const doomed: string[] = []
    let done = 0
    for (let i = 0; i < list.length; i += 10) {
      const chunk = list.slice(i, i + 10)
      const rs = await Promise.all(
        chunk.map((p) =>
          sb
            .from('gallery_photos')
            .update({
              enhanced: false,
              enh_bytes: 0,
              web_path: p.pre_web_path ?? null,
              thumb_path: p.pre_thumb_path ?? null,
              full_path: p.pre_full_path ?? null,
              pre_web_path: null,
              pre_thumb_path: null,
              pre_full_path: null,
            })
            .eq('id', p.id),
        ),
      )
      chunk.forEach((p, k) => {
        if (!rs[k].error) [p.web_path, p.thumb_path, p.full_path].forEach((x) => { if (x) doomed.push(x) })
      })
      done += chunk.length
      setEnh({ busy: true, done, total: list.length, phase: 'revert' })
    }
    for (let i = 0; i < doomed.length; i += 100) {
      await sb.storage.from(BUCKET).remove(doomed.slice(i, i + 100))
    }
    await loadPhotos()
    setEnh({ busy: false, done: 0, total: 0, phase: 'enhance' })
    flash(`Reverted ${list.length} photo${list.length === 1 ? '' : 's'} to the original.`)
  }

  async function setLabel(ids: string[], label: CullLabel | null) {
    const sb = supabase
    if (!sb || ids.length === 0) return
    for (let i = 0; i < ids.length; i += 100) {
      const { error } = await sb.from('gallery_photos').update({ cull_label: label, cull_reason: null }).in('id', ids.slice(i, i + 100))
      if (error) { setMessage(error.message); return }
    }
    const set = new Set(ids)
    setPhotos((prev) => prev.map((p) => (set.has(p.id) ? { ...p, cull_label: label, cull_reason: null } : p)))
  }

  async function runCull() {
    const sb = supabase
    if (!sb || cull.busy) return
    const webMap: Record<string, string> = {}
    if (cullEyes) {
      const wp = photos.map((p) => p.web_path).filter((x): x is string => !!x)
      for (let i = 0; i < wp.length; i += 200) {
        const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(wp.slice(i, i + 200), 3600)
        signed?.forEach((s) => { if (s.path && s.signedUrl) webMap[s.path] = s.signedUrl })
      }
    }
    const items = photos
      .filter((p) => p.thumb_path && thumbs[p.thumb_path])
      .map((p) => ({ id: p.id, url: thumbs[p.thumb_path as string], webUrl: p.web_path ? webMap[p.web_path] : undefined }))
    if (items.length === 0) { setMessage('Photos are still loading. Try again in a moment.'); return }
    setCull({ busy: true, done: 0, total: items.length, phase: 'sharp' })
    try {
      const t = parseInt(cullTarget, 10)
      const { results, eyesOk } = await cullPhotos(items, {
        target: t > 0 ? t : undefined,
        eyes: cullEyes,
        onProgress: (done, total, phase) => setCull({ busy: true, done, total, phase }),
      })
      for (let i = 0; i < results.length; i += 10) {
        const rs = await Promise.all(
          results.slice(i, i + 10).map((r) =>
            sb.from('gallery_photos').update({ cull_label: r.label, cull_score: r.score, cull_group: r.group, cull_reason: r.reason }).eq('id', r.id),
          ),
        )
        const bad = rs.find((x) => x.error)
        if (bad?.error) throw bad.error
      }
      const byId = new Map(results.map((r) => [r.id, r]))
      setPhotos((prev) =>
        prev.map((p) => {
          const r = byId.get(p.id)
          return r ? { ...p, cull_label: r.label, cull_score: r.score, cull_group: r.group, cull_reason: r.reason } : p
        }),
      )
      const n = (l: CullLabel) => results.filter((r) => r.label === l).length
      flash(`Done: ${n('pick')} picks, ${n('maybe')} maybe, ${n('reject')} rejects.${cullEyes && !eyesOk ? ' Eye check was not available.' : ''}`)
      setCullOpen(false)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Culling failed. Please try again.')
    }
    setCull({ busy: false, done: 0, total: 0, phase: 'sharp' })
  }

  const shown =
    filter === 'fav'
      ? photos.filter((p) => favCounts[p.id])
      : filter === 'all'
        ? photos
        : photos.filter((p) => p.cull_label === filter)
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
    const paths = doomed.flatMap((p) => [p.orig_path, p.web_path, p.thumb_path, p.full_path, p.pre_web_path, p.pre_thumb_path, p.pre_full_path]).filter((x): x is string => !!x)
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
    setShowBefore(false)
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
                <button className={btnGhost} onClick={() => setShareOpen(true)}>Share</button>
                <button className={btnGhost} onClick={() => setAccessOpen(true)}>Access</button>
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

            <div>
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
                    <p className="text-xs text-ink-soft">Drop photos or a whole folder here. JPG, PNG, WebP, HEIC and RAW, up to 250 MB each. Keep this tab open until they finish.</p>
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,.heic,.heif,.cr2,.cr3,.crw,.nef,.nrw,.arw,.srf,.sr2,.dng,.orf,.rw2,.raf,.pef,.3fr,.erf,.kdc,.mrw,.raw,.rwl,.iiq"
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

                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <button className={btnGhost} disabled={photos.length === 0 || cull.busy} onClick={() => setCullOpen((o) => !o)}>
                    Cull{photos.some((p) => p.cull_label) ? ` · ${photos.filter((p) => p.cull_label === 'pick').length} picks` : ''}
                  </button>
                  <button className={btnGhost} disabled={photos.length === 0 || enh.busy} onClick={() => setEnhOpen((o) => !o)}>
                    Enhance{photos.some((p) => p.enhanced) ? ` · ${photos.filter((p) => p.enhanced).length} of ${photos.length}` : ''}
                  </button>
                </div>

                {cullOpen && (
                  <div className={`${card} mb-4`}>
                    <p className="font-fraunces text-lg text-ink">Cull this gallery</p>
                    <p className="mt-1 text-xs text-ink-soft">Finds soft shots and groups near-identical frames, keeping the sharpest of each. Nothing is deleted, and you can change any label afterwards.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-ink">Keep about</span>
                      <div className="w-24">
                        <input value={cullTarget} onChange={(e) => setCullTarget(e.target.value.replace(/\D/g, ''))} placeholder="all" inputMode="numeric" className={input} />
                      </div>
                      <span className="text-sm text-ink-soft">photos (optional)</span>
                    </div>
                    <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink">
                      <input type="checkbox" checked={cullEyes} onChange={(e) => setCullEyes(e.target.checked)} className="h-4 w-4" />
                      Also check for closed eyes (slower)
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button className={btn} disabled={cull.busy} onClick={runCull}>
                        {cull.busy ? `${cull.phase === 'eyes' ? 'Checking eyes' : 'Checking sharpness'} ${cull.done} of ${cull.total}…` : 'Start'}
                      </button>
                      <button className={btnGhost} disabled={cull.busy} onClick={() => setCullOpen(false)}>Cancel</button>
                    </div>
                  </div>
                )}

                {enhOpen && (
                  <div className={`${card} mb-4`}>
                    <p className="font-fraunces text-lg text-ink">Enhance this gallery</p>
                    <p className="mt-1 text-xs text-ink-soft">Fixes exposure, color balance and contrast. Your original files are kept, and you can revert any photo or the whole gallery at any time.</p>
                    {isPublished && (
                      <p className="mt-2 text-xs text-amber-700">This gallery is published. Your client will see the enhanced photos as soon as they finish.</p>
                    )}
                    {photos.some((p) => p.cull_label === 'pick') && (
                      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <input type="checkbox" checked={enhPicksOnly} onChange={(e) => setEnhPicksOnly(e.target.checked)} className="h-4 w-4" />
                        Only photos marked Pick
                      </label>
                    )}
                    <p className="mt-3 text-xs text-ink-soft">{photos.filter((p) => p.enhanced).length} of {photos.length} enhanced</p>
                    {enh.busy && <p className="mt-1 text-xs text-ink-soft">Keep this tab open until it finishes.</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className={btn} disabled={enh.busy} onClick={runEnhance}>
                        {enh.busy && enh.phase === 'enhance' ? `Enhancing ${enh.done} of ${enh.total}…` : isPublished ? 'Enhance and update live gallery' : 'Start'}
                      </button>
                      {photos.some((p) => p.enhanced) && (
                        <button className={btnGhost} disabled={enh.busy} onClick={() => revertPhotos(photos.filter((p) => p.enhanced).map((p) => p.id))}>
                          {enh.busy && enh.phase === 'revert' ? `Reverting ${enh.done} of ${enh.total}…` : 'Revert all'}
                        </button>
                      )}
                      <button className={btnGhost} disabled={enh.busy} onClick={() => setEnhOpen(false)}>Close</button>
                    </div>
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
                    {(['pick', 'maybe', 'reject'] as const).map((l) => {
                      const n = photos.filter((p) => p.cull_label === l).length
                      return n > 0 ? (
                        <button
                          key={l}
                          onClick={() => setFilter(l)}
                          className={`rounded-full px-4 py-1.5 capitalize ${filter === l ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                        >
                          {l} ({n})
                        </button>
                      ) : null
                    })}
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
                        {(['pick', 'maybe', 'reject'] as const).map((l) => (
                          <button key={l} className={`${btnGhost} capitalize`} disabled={selected.size === 0} onClick={() => setLabel(Array.from(selected), l)}>Mark {l}</button>
                        ))}
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
                    {filter === 'fav' ? 'No client favorites yet.' : filter !== 'all' ? `No ${filter} photos.` : 'No photos yet. Drop some above.'}
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
                        {p.cull_label && (
                          <span title={p.cull_reason ?? undefined} className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] capitalize text-white ${p.cull_label === 'pick' ? 'bg-emerald-600' : p.cull_label === 'maybe' ? 'bg-amber-500' : 'bg-red-600'}`}>
                            {p.cull_label}
                          </span>
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

              <div className="mt-10 border-t border-line pt-5">
                <button onClick={deleteGallery} className="text-sm text-red-600 hover:underline">Delete gallery</button>
                <p className="mt-1 text-xs text-ink-soft">Removes the gallery and every photo in it. This cannot be undone.</p>
              </div>
            </div>
          </>
        )}
        {gallery && shareOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setShareOpen(false)}>
            <div className={`${card} max-h-[90vh] w-full max-w-lg overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-fraunces text-xl text-ink">Share with your client</p>
                <button className="text-2xl leading-none text-ink-soft" onClick={() => setShareOpen(false)} aria-label="Close">×</button>
              </div>
              <input readOnly value={shareUrl} className={input} onFocus={(e) => e.currentTarget.select()} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(shareUrl); flash('Link copied') }}>
                  Copy link
                </button>
                <a className={`${btnGhost} text-center`} href={shareUrl} target="_blank" rel="noreferrer">
                  Preview
                </a>
              </div>
              {!isPublished && (
                <p className="mt-3 text-xs text-ink-soft">This gallery is a draft. Publish it before sharing the link.</p>
              )}
            </div>
          </div>
        )}
        {gallery && accessOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setAccessOpen(false)}>
            <div className={`${card} max-h-[90vh] w-full max-w-lg overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <p className="font-fraunces text-xl text-ink">Access settings</p>
                <button className="text-2xl leading-none text-ink-soft" onClick={() => setAccessOpen(false)} aria-label="Close">×</button>
              </div>
              <div className="space-y-6">
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

                <div className="border-t border-line pt-6">
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

                <div className="border-t border-line pt-6">
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
            </div>
          </div>
        )}
        {view && (
          <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={() => setView(null)}>
            <div className="flex items-center justify-between p-4 text-white" onClick={(e) => e.stopPropagation()}>
              <span className="text-sm opacity-70">{shown.findIndex((x) => x.id === view.id) + 1} / {shown.length}</span>
              <div className="flex items-center gap-5">
                {(() => {
                  const cp = photos.find((x) => x.id === view.id)
                  return cp?.enhanced ? (
                    <>
                      <button className="text-sm" onClick={toggleBefore}>{showBefore ? 'Viewing: Before' : 'Before / After'}</button>
                      <button className="text-sm" onClick={() => revertPhotos([cp.id])}>Revert</button>
                    </>
                  ) : null
                })()}
                {(['pick', 'maybe', 'reject'] as const).map((l) => {
                  const cur = photos.find((x) => x.id === view.id)?.cull_label
                  return (
                    <button key={l} className={`text-sm capitalize ${cur === l ? 'font-semibold underline' : 'opacity-70'}`} onClick={() => setLabel([view.id], cur === l ? null : l)}>{l}</button>
                  )
                })}
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
                <img src={showBefore && before && before.id === view.id ? before.url : view.url} alt="" onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full object-contain" />
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
