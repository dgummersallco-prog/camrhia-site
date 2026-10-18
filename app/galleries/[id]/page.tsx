'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import Wordmark from '@/app/components/Wordmark'

type Gallery = {
  id: string
  title: string
  token: string
  pin_hash: string | null
  allow_downloads: boolean
  expires_at: string | null
  status: 'draft' | 'published'
  cover_photo_id: string | null
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
const ACCEPTED = /^image\/(jpeg|png|webp)$/
const CONCURRENCY = 3

function toDateInput(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight'

export default function GalleryManagePage() {
  const router = useRouter()
  const { id: galleryId } = useParams<{ id: string }>()
  const [userId, setUserId] = useState<string | null>(null)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [uploads, setUploads] = useState<UploadItem[]>([])
  const [title, setTitle] = useState('')
  const [pin, setPin] = useState('')
  const [expiry, setExpiry] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const active = uploads.some((u) => u.status === 'queued' || u.status === 'uploading')
  const doneCount = uploads.filter((u) => u.status === 'done').length
  const failed = uploads.filter((u) => u.status === 'error')

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 2500)
  }

  const loadGallery = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('galleries')
      .select('id, title, token, pin_hash, allow_downloads, expires_at, status, cover_photo_id')
      .eq('id', galleryId)
      .maybeSingle()
    if (error || !data) { setMessage('Gallery not found.'); return }
    const g = data as Gallery
    setGallery(g)
    setTitle(g.title)
    setExpiry(g.expires_at ? toDateInput(g.expires_at) : '')
  }, [galleryId])

  const loadPhotos = useCallback(async () => {
    if (!supabase) return
    // The API returns at most 1000 rows per request, so page through them.
    const all: Photo[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
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
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths.slice(i, i + 200), 3600)
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
    })
  }, [router, galleryId, loadGallery, loadPhotos])

  // Warn before leaving the page while photos are still uploading.
  useEffect(() => {
    if (!active) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])

  async function saveSettings(patch: Partial<Gallery>) {
    if (!supabase || !gallery) return
    const { error } = await supabase.from('galleries').update(patch).eq('id', gallery.id)
    if (error) { setMessage(error.message); return }
    setGallery({ ...gallery, ...patch })
    flash('Saved')
  }

  async function savePin(clear: boolean) {
    if (!supabase || !gallery) return
    const value = clear ? '' : pin.trim()
    if (!clear && value.length < 4) { setMessage('Use a PIN of at least 4 characters.'); return }
    const { error } = await supabase.rpc('set_gallery_pin', { p_gallery_id: gallery.id, p_pin: value })
    if (error) { setMessage(error.message); return }
    setGallery({ ...gallery, pin_hash: clear ? null : 'set' })
    setPin('')
    flash(clear ? 'PIN removed' : 'PIN saved')
  }

  async function uploadFiles(list: FileList | File[]) {
    const sb = supabase
    if (!sb || !userId || !gallery) return
    if (active) { setMessage('Wait for the current upload to finish.'); return }
    const all = Array.from(list)
    const files = all
      .filter((f) => ACCEPTED.test(f.type))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    if (all.length > files.length) {
      setMessage(`${all.length - files.length} file(s) skipped. Only JPG, PNG and WebP photos are supported right now.`)
    }
    if (files.length === 0) return

    const base = photos.reduce((m, p) => Math.max(m, p.sort_order), -1) + 1
    const items: UploadItem[] = files.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, status: 'queued' }))
    setUploads(items)
    const setItem = (key: string, patch: Partial<UploadItem>) =>
      setUploads((prev) => prev.map((u) => (u.key === key ? { ...u, ...patch } : u)))

    async function uploadOne(file: File, key: string, order: number) {
      if (!sb || !userId || !gallery) return
      setItem(key, { status: 'uploading' })
      const photoId = crypto.randomUUID()
      const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
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
          const o = await bucket.upload(origPath, file, { contentType: file.type, upsert: true })
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
    await loadPhotos()
  }

  async function deletePhoto(p: Photo) {
    if (!supabase) return
    if (!window.confirm('Delete this photo?')) return
    const paths = [p.orig_path, p.web_path, p.thumb_path].filter((x): x is string => !!x)
    await supabase.storage.from(BUCKET).remove(paths)
    const { error } = await supabase.from('gallery_photos').delete().eq('id', p.id)
    if (error) { setMessage(error.message); return }
    if (gallery?.cover_photo_id === p.id) await saveSettings({ cover_photo_id: null })
    setPhotos((prev) => prev.filter((x) => x.id !== p.id))
  }

  async function deleteGallery() {
    if (!supabase || !gallery) return
    if (!window.confirm('Delete this whole gallery and all of its photos? This cannot be undone.')) return
    const paths = photos.flatMap((p) => [p.orig_path, p.web_path, p.thumb_path]).filter((x): x is string => !!x)
    for (let i = 0; i < paths.length; i += 100) {
      await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100))
    }
    const { error } = await supabase.from('galleries').delete().eq('id', gallery.id)
    if (error) { setMessage(error.message); return }
    router.push('/galleries')
  }

  const shareUrl = gallery ? `${origin}/g/${gallery.token}` : ''

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-paper px-6 py-4">
        <Link href="/"><Wordmark className="text-3xl" /></Link>
        <Link href="/galleries" className="text-sm text-ink-soft hover:text-ink">All galleries</Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {!gallery ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h1 className="font-fraunces text-3xl font-semibold text-ink">{gallery.title}</h1>
              <button
                onClick={() => saveSettings({ status: gallery.status === 'published' ? 'draft' : 'published' })}
                className={gallery.status === 'published' ? btnGhost : btn}
              >
                {gallery.status === 'published' ? 'Unpublish' : 'Publish gallery'}
              </button>
            </div>

            {message && <p className="mb-6 text-sm text-twilight">{message}</p>}

            {/* Settings */}
            <section className="mb-8 grid gap-4 md:grid-cols-2">
              <div className={card}>
                <label className="mb-1.5 block text-sm font-medium text-ink">Gallery name</label>
                <div className="flex gap-2">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
                  <button className={btnGhost} onClick={() => title.trim() && saveSettings({ title: title.trim() })}>Save</button>
                </div>
              </div>

              <div className={card}>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  PIN {gallery.pin_hash ? <span className="text-twilight">(on)</span> : <span className="text-ink-soft">(off)</span>}
                </label>
                <div className="flex gap-2">
                  <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Set a new PIN" className={input} />
                  <button className={btnGhost} onClick={() => savePin(false)}>Save</button>
                  {gallery.pin_hash && <button className={btnGhost} onClick={() => savePin(true)}>Remove</button>}
                </div>
                <p className="mt-2 text-xs text-ink-soft">Clients enter this PIN to open the gallery. Leave it off for an open link.</p>
              </div>

              <div className={card}>
                <label className="mb-1.5 block text-sm font-medium text-ink">Expires on</label>
                <div className="flex gap-2">
                  <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={input} />
                  <button
                    className={btnGhost}
                    onClick={() => saveSettings({ expires_at: expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null })}
                  >
                    Save
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink-soft">After this date the gallery link stops working. Leave blank for no expiry.</p>
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
            </section>

            {/* Share link */}
            <section className={`${card} mb-8`}>
              <p className="mb-1.5 text-sm font-medium text-ink">Share link</p>
              <div className="flex gap-2">
                <input readOnly value={shareUrl} className={input} onFocus={(e) => e.currentTarget.select()} />
                <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(shareUrl); flash('Link copied') }}>Copy</button>
              </div>
              {gallery.status !== 'published' && (
                <p className="mt-2 text-xs text-ink-soft">This gallery is a draft. Publish it before sharing the link.</p>
              )}
            </section>

            {/* Upload */}
            <section
              className={`mb-4 rounded-2xl border-2 border-dashed p-10 text-center transition ${dragging ? 'border-twilight bg-twilight/5' : 'border-line bg-card'}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); uploadFiles(e.dataTransfer.files) }}
            >
              <p className="font-fraunces text-xl text-ink">Drop photos here</p>
              <p className="mt-1 text-sm text-ink-soft">JPG, PNG or WebP. Select hundreds at once. Keep this tab open until they finish.</p>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = '' }}
              />
              <button className={`${btn} mt-5`} disabled={active} onClick={() => fileInput.current?.click()}>
                {active ? 'Uploading…' : 'Choose photos'}
              </button>
            </section>

            {uploads.length > 0 && (
              <div className="mb-8">
                <div className="mb-2 flex justify-between text-sm text-ink-soft">
                  <span>{active ? 'Uploading' : 'Finished'}: {doneCount} of {uploads.length}</span>
                  {failed.length > 0 && <span className="text-red-600">{failed.length} failed</span>}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-twilight transition-all" style={{ width: `${(doneCount / uploads.length) * 100}%` }} />
                </div>
                {failed.length > 0 && (
                  <ul className="mt-3 space-y-1 text-xs text-red-600">
                    {failed.slice(0, 10).map((f) => <li key={f.key}>{f.name}: {f.error}</li>)}
                    {failed.length > 10 && <li>…and {failed.length - 10} more</li>}
                  </ul>
                )}
              </div>
            )}

            {/* Photos */}
            <h2 className="mb-4 font-fraunces text-xl font-semibold text-ink">{photos.length} photos</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-line">
                  {p.thumb_path && thumbs[p.thumb_path] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbs[p.thumb_path]} alt={p.filename ?? ''} loading="lazy" className="h-full w-full object-cover" />
                  )}
                  {gallery.cover_photo_id === p.id && (
                    <span className="absolute left-2 top-2 rounded-full bg-twilight px-2 py-0.5 text-[10px] text-white">Cover</span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/55 p-1.5 opacity-0 transition group-hover:opacity-100">
                    <button className="text-xs text-white" onClick={() => saveSettings({ cover_photo_id: p.id })}>Set cover</button>
                    <button className="text-xs text-red-300" onClick={() => deletePhoto(p)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 border-t border-line pt-6">
              <button onClick={deleteGallery} className="text-sm text-red-600 hover:underline">Delete this gallery</button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
