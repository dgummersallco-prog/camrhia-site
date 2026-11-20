'use client'

import GalleryDesigner from './GalleryDesigner'
import type { GalleryDesign } from '@/lib/galleryDesign'

import { useCallback, useEffect, useRef, useState } from 'react'
import { sendGalleryToClient } from '@/lib/sendGallery'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { makeVersions, isHeic, isRaw } from '@/lib/galleryImages'
import { cullPhotos, type CullLabel } from '@/lib/cull'
import { enhancePhoto } from '@/lib/enhance'
import { storageLimitBytes, formatBytes } from '@/lib/storageLimit'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import DashScenes from '@/app/components/DashScenes'

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
  design?: Record<string, unknown> | null
  session_id: string | null
  moments?: { id: string; name: string; startId: string }[] | null
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

function exifTime(buf: ArrayBuffer): number | null {
  try {
    const v = new DataView(buf)
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return null
    let o = 2
    while (o + 4 < v.byteLength) {
      if (v.getUint8(o) !== 0xff) return null
      const m = v.getUint8(o + 1)
      const len = v.getUint16(o + 2)
      if (m === 0xe1 && v.getUint32(o + 4) === 0x45786966) {
        const t = o + 10
        const le = v.getUint16(t) === 0x4949
        const u16 = (p: number) => v.getUint16(t + p, le)
        const u32 = (p: number) => v.getUint32(t + p, le)
        const find = (ifd: number, tag: number): number | null => {
          const n = u16(ifd)
          for (let i = 0; i < n; i++) { const e = ifd + 2 + i * 12; if (u16(e) === tag) return e }
          return null
        }
        const ex = find(u32(4), 0x8769)
        if (ex == null) return null
        const exIfd = u32(ex + 8)
        const dt = find(exIfd, 0x9003) ?? find(exIfd, 0x9004)
        if (dt == null) return null
        const off = u32(dt + 8)
        let str = ''
        for (let i = 0; i < 19; i++) str += String.fromCharCode(v.getUint8(t + off + i))
        const mm = /^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(str)
        return mm ? new Date(+mm[1], +mm[2] - 1, +mm[3], +mm[4], +mm[5], +mm[6]).getTime() : null
      }
      o += 2 + len
    }
  } catch { /* not readable */ }
  return null
}

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

const card = 'rounded-2xl border border-line bg-white/60 p-5'
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
  const [designOpen, setDesignOpen] = useState(false)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('design')) setDesignOpen(true)
    if (q.get('share')) setShareOpen(true)
  }, [])
  const [title, setTitle] = useState('')
  const [pin, setPin] = useState('')
  const [expiry, setExpiry] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [origin, setOrigin] = useState('')
  const [sessInfo, setSessInfo] = useState<string | null>(null)
  const [clientName, setClientName] = useState<string | null>(null)
  const [sessType, setSessType] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null)
  const [scanned, setScanned] = useState<Set<string>>(new Set())
  type OrgInfo = Record<string, { scene: string; tags: string[]; score: number; closed: boolean; hash: string; blur: number; lum: number; sat: number; hue: number }>
  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null)
  const [orgOrder, setOrgOrder] = useState<string[]>(['Other'])
  const [orgMode, setOrgMode] = useState<string | null>(null)
  const [wmDraft, setWmDraft] = useState<string | null>(null)
  const [addingSec, setAddingSec] = useState(false)
  const [newSec, setNewSec] = useState<string | null>(null)
  const [check, setCheck] = useState<null | { kind: 'dups' | 'flags' | 'social'; groups?: { ids: string[]; best: string }[]; items?: { id: string; why: string }[]; ids?: string[] }>(null)
  const [feats, setFeats] = useState<Record<string, { t?: number; lum: number; sat: number; hue: number; vec: number[] }> | null>(null)
  const [sessDate, setSessDate] = useState<string | null>(null)
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const [coupleUserId, setCoupleUserId] = useState<string | null>(null)
  const [sentAt, setSentAt] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [filter, setFilter] = useState<'all' | 'fav' | CullLabel>('all')
  const [cullOpen, setCullOpen] = useState(false)
  const [cullTarget, setCullTarget] = useState('')
  const [cull, setCull] = useState<{ busy: boolean; done: number; total: number; phase: 'sharp' | 'eyes' | 'dupes' }>({ busy: false, done: 0, total: 0, phase: 'sharp' })
  const [cullEyes, setCullEyes] = useState(true)
  const [enhOpen, setEnhOpen] = useState(false)
  const [enhPicksOnly, setEnhPicksOnly] = useState(false)
  const [enh, setEnh] = useState<{ busy: boolean; done: number; total: number; phase: 'enhance' | 'revert' }>({ busy: false, done: 0, total: 0, phase: 'enhance' })
  const [showBefore, setShowBefore] = useState(false)
  const [before, setBefore] = useState<{ id: string; url: string } | null>(null)
  const [accessOpen, setAccessOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [slug, setSlug] = useState('')
  const barRef = useRef<HTMLDivElement>(null)
  const [leftHost, setLeftHost] = useState<HTMLDivElement | null>(null)
  const shortened = useRef<string | null>(null)
  const designFlush = useRef<(() => void) | null>(null)
  const [topOff, setTopOff] = useState(0)
  const [shareMsg, setShareMsg] = useState<string | null>(null)
  const [finalBusy, setFinalBusy] = useState(false)
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
      .select('id, title, token, pin_hash, allow_downloads, expires_at, status, cover_photo_id, cover_path, session_id, design, moments')
      .eq('id', galleryId)
      .maybeSingle()
    if (error || !data) { setMessage('Gallery not found.'); return }
    const g = data as Gallery
    setGallery(g)
    setTitle(g.title)
    setExpiry(g.expires_at ? toDateInput(g.expires_at) : '')
    if (g.session_id) {
      const [{ data: w }, { data: st }] = await Promise.all([
        sb.from('weddings').select('names, wedding_date, session_type, gallery_opened_at, couple_user_id, gallery_sent_at').eq('id', g.session_id).maybeSingle(),
        sb.from('session_types').select('key, label'),
      ])
      const wd = w as { names: string | null; wedding_date: string | null; session_type: string | null; gallery_opened_at: string | null; couple_user_id: string | null; gallery_sent_at: string | null } | null
      const label = ((st ?? []) as { key: string; label: string }[]).find((t) => t.key === wd?.session_type)?.label ?? wd?.session_type ?? null
      const date = wd?.wedding_date ? new Date(`${wd.wedding_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null
      const nm = wd?.names && wd.names.trim().toLowerCase() !== g.title.trim().toLowerCase() ? wd.names : null
      setClientName(wd?.names?.trim() || null)
      setSessType(label)
      const { data: sn } = await sb.from('weddings').select('session_number').eq('id', g.session_id).maybeSingle()
      const num = (sn as { session_number?: string | number | null } | null)?.session_number
      setInviteCode(num ? String(num) : null)
      setSessDate(date)
      setOpenedAt(wd?.gallery_opened_at ?? null)
      setCoupleUserId(wd?.couple_user_id ?? null)
      setSentAt(wd?.gallery_sent_at ?? null)
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

  useEffect(() => { if (gallery?.token) setSlug(gallery.token) }, [gallery?.token])

  async function saveSlug() {
    const sb = supabase
    if (!sb || !gallery) return
    if (slug.length < 4) { setMessage('Use at least 4 letters or numbers in the link.'); return }
    const { error } = await sb.from('galleries').update({ token: slug }).eq('id', gallery.id)
    if (error) { setMessage(error.code === '23505' ? 'That link is taken. Try another.' : error.message); return }
    setGallery({ ...gallery, token: slug })
    flash('Link saved')
  }

  async function ensurePublished(): Promise<boolean> {
    if (!gallery) return false
    if (isPublished) return true
    const ok = await saveSettings({ status: 'published' })
    if (ok) await syncCover(gallery.cover_photo_id)
    return ok
  }

  function goStep(n: number) {
    designFlush.current?.()
    if (n === 0) {
      if (!designOpen && !shareOpen) fileInput.current?.click()
      setDesignOpen(false); setShareOpen(false)
    } else if (n === 1) { setShareOpen(false); setDesignOpen(true) }
    else { setDesignOpen(false); setShareOpen(true) }
  }

  // The steps bar stays where it is. The style and publish screens open right below it.
  useEffect(() => {
    if (!designOpen && !shareOpen) return
    const el = barRef.current
    if (el) setTopOff(el.getBoundingClientRect().bottom + 16)
  }, [designOpen, shareOpen])

  const stepsBar = (active: number, nav: { photos: () => void; style: () => void; publish: () => void }) => (
    <div className="grid overflow-hidden rounded-2xl border border-line bg-white/60 sm:grid-cols-3">
      {([
        { label: 'Add photos', hint: 'Client-ready edited photos', done: photos.length > 0, go: nav.photos, off: false },
        { label: 'Style', hint: 'Cover photo and photo layout', done: !!gallery?.design && Object.keys(gallery.design).length > 0, go: nav.style, off: photos.length === 0 },
        { label: 'Publish and send', hint: openedAt ? `Opened by client ${new Date(openedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Set a PIN, then send it to your client', done: !!openedAt || !!sentAt, go: nav.publish, off: photos.length === 0 },
      ] as { label: string; hint: string; done: boolean; off: boolean; go: () => void }[]).map((st, i) => (
        <button
          key={st.label}
          type="button"
          disabled={st.off}
          onClick={st.go}
          className={'relative flex items-center gap-3 border-line px-5 py-4 text-left text-sm text-ink transition disabled:opacity-50 ' + (i > 0 ? 'border-t sm:border-l sm:border-t-0 ' : '') + (i === active ? 'bg-white' : 'hover:bg-white/80')}
        >
          <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ' + (st.done ? 'bg-twilight text-white' : i === active ? 'bg-twilight/15 text-twilight' : 'bg-line text-ink-soft')}>{st.done ? '✓' : i + 1}</span>
          <span className="leading-tight"><span className="font-medium">{st.label}</span><span className="mt-0.5 block text-xs text-ink-soft">{st.hint}</span></span>
          {i === active && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-twilight" />}
        </button>
      ))}
    </div>
  )

  // New galleries get a long random link. Swap it for a short readable one until it has been sent.
  useEffect(() => {
    const sb = supabase
    if (!shareOpen || !sb || !gallery || sentAt || gallery.status === 'published' || !/^[0-9a-f]{20,}$/.test(gallery.token) || shortened.current === gallery.id) return
    shortened.current = gallery.id
    ;(async () => {
      const base = (gallery.title || 'gallery').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24).replace(/-+$/g, '') || 'gallery'
      for (let i = 0; i < 4; i++) {
        const t = `${base}-${Math.random().toString(36).slice(2, 6)}`
        const { error } = await sb.from('galleries').update({ token: t }).eq('id', gallery.id)
        if (!error) { setGallery((g) => (g ? { ...g, token: t } : g)); return }
        if (error.code !== '23505') return
      }
    })()
  }, [shareOpen, gallery?.id, gallery?.token, gallery?.status, sentAt]) // eslint-disable-line react-hooks/exhaustive-deps

  async function publishAndSend() {
    const sb = supabase
    if (!sb || !gallery) return
    const nm = title.trim()
    if (!nm) { setMessage('Give the gallery a name.'); return }
    const p = pin.trim()
    if (!gallery.pin_hash && !p) { setMessage('Add a PIN before sending.'); return }
    if (p && p.length < 4) { setMessage('Use a PIN of at least 4 characters.'); return }
    setFinalBusy(true)
    try {
      if (nm !== gallery.title && !(await saveSettings({ title: nm }))) return
      if (p) await savePin(false)
      const ok = isPublished || await saveSettings({ status: 'published' })
      if (!ok) return
      if (!isPublished) await syncCover(gallery.cover_photo_id)
      let note = 'Published'
      if (gallery.session_id && coupleUserId) {
        const was = !!sentAt
        const err = await sendGalleryToClient(sb, { weddingId: gallery.session_id, coupleUserId, token: gallery.token, expiresAt: gallery.expires_at, pin: '', alreadySent: was })
        if (err) { flash(err); return }
        setSentAt(new Date().toISOString())
        note = was ? 'Update sent to their Camrhia dashboard' : 'Sent to their Camrhia dashboard'
      }
      const onCamrhia = !!(gallery.session_id && coupleUserId)
      const hi = `Hi${clientName ? ` ${clientName}` : ''}, your photos are ready: ${shareUrl}${p ? `\nPIN: ${p}` : ''}${onCamrhia ? '' : `\n\nNew to Camrhia? Create your free account to keep everything in one place: ${origin}${inviteCode ? `/s/${inviteCode}` : '/signup'}`}`
      setShareMsg(onCamrhia ? null : hi)
      if (!onCamrhia) { navigator.clipboard?.writeText(hi); note = 'Published. Message copied' }
      flash(note)
      await loadGallery()
    } finally { setFinalBusy(false) }
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

  async function deletePhoto(p: Photo, quiet = false) {
    const sb = supabase
    if (!sb) return
    if (!quiet && !window.confirm('Delete this photo?')) return
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

  const sceneInfo = (() => {
    const ms = gallery?.moments ?? []
    const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order)
    const start = new Map(ms.map((m) => [m.startId, m]))
    const head: string[] = []
    const blocks: { m: { id: string; name: string; startId: string }; ids: string[] }[] = []
    for (const p of sorted) {
      const m = start.get(p.id)
      if (m) blocks.push({ m, ids: [p.id] })
      else if (blocks.length) blocks[blocks.length - 1].ids.push(p.id)
      else head.push(p.id)
    }
    return { head, blocks }
  })()

  async function saveMoments(ms: { id: string; name: string; startId: string }[]) {
    const sb = supabase
    if (!sb || !gallery) return
    const { error } = await sb.from('galleries').update({ moments: ms }).eq('id', gallery.id)
    if (error) { setMessage(error.message); return }
    setGallery((g) => (g ? { ...g, moments: ms } : g))
  }

  async function moveScene(i: number, d: number) {
    const j = i + d
    const bl = [...sceneInfo.blocks]
    if (j < 0 || j >= bl.length) return
    ;[bl[i], bl[j]] = [bl[j], bl[i]]
    const byId = new Map(photos.map((p) => [p.id, p]))
    await saveOrder([...sceneInfo.head, ...bl.flatMap((b) => b.ids)].map((id) => byId.get(id)!))
  }

  async function sendReminder() {
    const sb = supabase
    if (!sb || !gallery?.session_id || !coupleUserId) return
    const { error } = await sb.from('notifications').insert({ user_id: coupleUserId, type: 'gallery_ready', title: 'Your gallery is waiting', body: 'Your photographer shared your gallery. Tap to view your photos.', wedding_id: gallery.session_id })
    flash(error ? error.message : 'Reminder sent to their dashboard')
  }

  async function addSectionFromPreview(pid: string): Promise<string | null> {
    const rest = (gallery?.moments ?? []).filter((m) => m.startId !== pid)
    const id = crypto.randomUUID()
    await saveMoments([...rest, { id, name: 'New section', startId: pid }])
    return id
  }
  function startSection(pid: string) {
    const rest = (gallery?.moments ?? []).filter((m) => m.startId !== pid)
    const id = crypto.randomUUID()
    void saveMoments([...rest, { id, name: 'New section', startId: pid }])
    setNewSec(id)
    setAddingSec(false)
  }
  async function renameScene(id: string, name: string) {
    const nm = name.trim()
    if (!nm || !gallery?.moments) return
    await saveMoments(gallery.moments.map((m) => (m.id === id ? { ...m, name: nm } : m)))
  }

  async function saveOrder(arr: Photo[]) {
    const sb = supabase
    if (!sb) return
    const next = arr.map((p, i) => ({ ...p, sort_order: i }))
    const before = new Map(photos.map((p) => [p.id, p.sort_order]))
    const changed = next.filter((p) => before.get(p.id) !== p.sort_order)
    setPhotos(next)
    for (let i = 0; i < changed.length; i += 10) {
      await Promise.all(changed.slice(i, i + 10).map((p) => sb.from('gallery_photos').update({ sort_order: p.sort_order }).eq('id', p.id)))
    }
  }

  async function scanPhotos() {
    const sb = supabase
    if (!sb || photos.length < 2 || scan) return
    const list = [...photos]
    setScan({ done: 0, total: list.length })
    setScanned(new Set())
    const out: Record<string, { t?: number; lum: number; sat: number; hue: number; vec: number[] }> = {}
    let idx = 0
    let done = 0
    const worker = async () => {
      while (idx < list.length) {
        const p = list[idx++]
        const f = { lum: 0.5, sat: 0, hue: 0, vec: new Array(192).fill(0.5) } as { t?: number; lum: number; sat: number; hue: number; vec: number[] }
        try {
          const url = p.thumb_path ? thumbs[p.thumb_path] : undefined
          if (url) {
            const im = await new Promise<HTMLImageElement>((res, rej) => { const el = new Image(); el.crossOrigin = 'anonymous'; el.onload = () => res(el); el.onerror = rej; el.src = url + (url.includes('?') ? '&' : '?') + 'scan=1' })
            const cv = document.createElement('canvas')
            cv.width = 8; cv.height = 8
            const ctx = cv.getContext('2d', { willReadFrequently: true })
            if (ctx) {
              ctx.drawImage(im, 0, 0, 8, 8)
              const d = ctx.getImageData(0, 0, 8, 8).data
              let lum = 0, sat = 0, hs = 0, hc = 0
              for (let i = 0; i < 64; i++) {
                const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255
                f.vec[i * 3] = r; f.vec[i * 3 + 1] = g; f.vec[i * 3 + 2] = b
                const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn
                lum += (0.299 * r + 0.587 * g + 0.114 * b) / 64
                sat += (mx ? c / mx : 0) / 64
                if (c > 0.05) {
                  let h = mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4
                  h *= 60
                  hs += Math.sin((h * Math.PI) / 180) * c; hc += Math.cos((h * Math.PI) / 180) * c
                }
              }
              f.lum = lum; f.sat = sat
              f.hue = (Math.atan2(hs, hc) * 180) / Math.PI
              if (f.hue < 0) f.hue += 360
            }
          }
        } catch { /* leave defaults */ }
        try {
          const { data } = await sb.storage.from(BUCKET).createSignedUrl(p.orig_path, 120)
          if (data?.signedUrl) {
            const r = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-131071' } })
            const rd = r.body?.getReader()
            if (rd) {
              const parts: Uint8Array[] = []
              let n = 0
              while (n < 131072) { const { value, done: fin } = await rd.read(); if (fin || !value) break; parts.push(value); n += value.length }
              rd.cancel().catch(() => {})
              const all = new Uint8Array(n)
              let at = 0
              for (const c of parts) { all.set(c, at); at += c.length }
              const t = exifTime(all.buffer)
              if (t) f.t = t
            }
          }
        } catch { /* skip time */ }
        out[p.id] = f
        done++
        setScan({ done, total: list.length })
        setScanned((prev) => new Set(prev).add(p.id))
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker))
    setFeats(out)
    setScan(null)
  }

  async function applyOrg(mode: 'scenes' | 'best' | 'color' | 'name', info: OrgInfo | null = orgInfo, order: string[] = orgOrder) {
    if (!info) return
    const byName = (x: Photo, y: Photo) => (x.filename ?? '').localeCompare(y.filename ?? '', undefined, { numeric: true, sensitivity: 'base' })
    const list = [...photos].sort(byName)
    const gs: { label: string; ids: string[] }[] = []
    const used = new Set<string>()
    const add = (label: string, ids: string[]) => { if (ids.length) { gs.push({ label, ids }); ids.forEach((id) => used.add(id)) } }
    if (mode === 'scenes') {
      if (list.length >= 40) {
        const n = Math.min(30, Math.max(8, Math.round(list.length * 0.08)))
        const top = list.filter((p) => (info[p.id]?.score ?? 0) >= 7).sort((x, y) => info[y.id].score - info[x.id].score).slice(0, n)
        if (top.length >= 6) add('Highlights', top.map((p) => p.id))
      }
      order.forEach((label) => add(label, list.filter((p) => !used.has(p.id) && (info[p.id]?.scene ?? 'Other') === label).map((p) => p.id)))
    } else if (mode === 'color') {
      const names = ['Black and white', 'Dark', 'Bright', 'Warm', 'Green', 'Cool']
      const bucket = (f: { lum: number; sat: number; hue: number }) => (f.sat < 0.08 ? 0 : f.lum < 0.25 ? 1 : f.lum > 0.75 ? 2 : f.hue < 70 || f.hue >= 300 ? 3 : f.hue < 170 ? 4 : 5)
      names.forEach((label, i) => add(label, list.filter((p) => info[p.id] && bucket(info[p.id]) === i).map((p) => p.id)))
    }
    const left = list.filter((p) => !used.has(p.id))
    let arr: Photo[]
    if (gs.length) {
      if (left.length) add('Other', left.map((p) => p.id))
      const byId = new Map(photos.map((p) => [p.id, p]))
      arr = gs.flatMap((g) => g.ids.map((id) => byId.get(id)!))
    } else if (mode === 'best') arr = [...list].sort((x, y) => (info[y.id]?.score ?? 0) - (info[x.id]?.score ?? 0))
    else arr = list
    setOrgMode(mode)
    await saveOrder(arr)
    await saveMoments(gs.map((g) => ({ id: crypto.randomUUID(), name: g.label, startId: g.ids[0] })))
  }

  async function runCheck(kind: 'dups' | 'flags' | 'social') {
    if (scan) return
    const info = orgInfo ?? (await aiScan('none'))
    if (!info) return
    const list = [...photos].sort((x, y) => x.sort_order - y.sort_order).filter((p) => info[p.id])
    if (kind === 'dups') {
      const parent = list.map((_, i) => i)
      const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < Math.min(list.length, i + 7); j++) {
          const a = info[list[i].id]
          const b = info[list[j].id]
          if (!a.hash || !b.hash) continue
          let dist = 0
          for (let k = 0; k < 64; k++) if (a.hash[k] !== b.hash[k]) dist++
          if (dist <= 4 && Math.abs(a.lum - b.lum) < 0.06 && Math.abs(a.sat - b.sat) < 0.08) parent[find(j)] = find(i)
        }
      }
      const by = new Map<number, string[]>()
      list.forEach((p, i) => { const root = find(i); by.set(root, [...(by.get(root) ?? []), p.id]) })
      const groups = [...by.values()].filter((ids) => ids.length > 1).map((ids) => ({ ids, best: [...ids].sort((x, y) => (info[y].score - info[x].score) || (info[y].blur - info[x].blur))[0] }))
      setCheck({ kind, groups })
    } else if (kind === 'flags') {
      const bl = list.map((p) => info[p.id].blur).filter((v) => v > 0).sort((x, y) => x - y)
      const med = bl.length ? bl[Math.floor(bl.length / 2)] : 0
      const items: { id: string; why: string }[] = []
      list.forEach((p) => {
        const f = info[p.id]
        const soft = med > 0 && f.blur > 0 && f.blur < med * 0.3
        if (soft && f.closed) items.push({ id: p.id, why: 'Blurry, eyes closed' })
        else if (soft) items.push({ id: p.id, why: 'Blurry' })
        else if (f.closed) items.push({ id: p.id, why: 'Eyes closed' })
      })
      setCheck({ kind, items })
    } else {
      setCheck({ kind, ids: [...list].sort((x, y) => (info[y.id].score - info[x.id].score) || (info[y.id].blur - info[x.id].blur)).slice(0, 10).map((p) => p.id) })
    }
  }

  async function removeOthers(ids: string[], best: string) {
    const gone = ids.filter((id) => id !== best).map((id) => photos.find((x) => x.id === id)).filter((x): x is Photo => !!x)
    if (!gone.length || !window.confirm(`Delete ${gone.length} duplicate ${gone.length === 1 ? 'photo' : 'photos'} and keep the best one?`)) return
    for (const ph of gone) await deletePhoto(ph, true)
  }

  async function pickOrg(mode: 'scenes' | 'best' | 'color' | 'name') {
    if (scan) return
    if (mode === 'name') { await applyOrg('name', orgInfo ?? ({} as OrgInfo)); return }
    if (orgInfo) { await applyOrg(mode); return }
    await aiScan(mode)
  }

  async function aiScan(mode: 'scenes' | 'best' | 'color' | 'name' | 'none' = 'scenes'): Promise<OrgInfo | null> {
    const sb = supabase
    if (!sb || !gallery || photos.length < 1 || scan) return null
    const { data: ses } = await sb.auth.getSession()
    const token = ses.session?.access_token
    if (!token) { setMessage('Please sign in again.'); return null }
    const list = [...photos].sort((x, y) => x.sort_order - y.sort_order)
    setScan({ done: 0, total: list.length })
    setScanned(new Set())
    let order: string[] = ['Other']
    const info: OrgInfo = {}
    let next = 0
    let done = 0
    let failed: string | null = null
    const thumb = async (p: Photo): Promise<{ b: string; col: { lum: number; sat: number; hue: number; hash: string; blur: number } }> => {
      const col = { lum: 0.5, sat: 0, hue: 0, hash: '', blur: 0 }
      try {
        const url = p.thumb_path ? thumbs[p.thumb_path] : undefined
        if (!url) return { b: '', col }
        const im = await new Promise<HTMLImageElement>((res, rej) => { const el = new Image(); el.crossOrigin = 'anonymous'; el.onload = () => res(el); el.onerror = rej; el.src = url + (url.includes('?') ? '&' : '?') + 'scan=1' })
        const k = 320 / Math.max(im.naturalWidth, im.naturalHeight, 1)
        const cv = document.createElement('canvas')
        cv.width = Math.max(1, Math.round(im.naturalWidth * Math.min(1, k)))
        cv.height = Math.max(1, Math.round(im.naturalHeight * Math.min(1, k)))
        cv.getContext('2d')?.drawImage(im, 0, 0, cv.width, cv.height)
        const sm = document.createElement('canvas')
        sm.width = 8; sm.height = 8
        const sx = sm.getContext('2d', { willReadFrequently: true })
        if (sx) {
          sx.drawImage(cv, 0, 0, 8, 8)
          const d = sx.getImageData(0, 0, 8, 8).data
          let lum = 0, sat = 0, hs = 0, hc = 0
          for (let i = 0; i < 64; i++) {
            const r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b), c = mx - mn
            lum += (0.299 * r + 0.587 * g + 0.114 * b) / 64
            sat += (mx ? c / mx : 0) / 64
            if (c > 0.05) {
              const h = ((mx === r ? ((g - b) / c) % 6 : mx === g ? (b - r) / c + 2 : (r - g) / c + 4) * 60 * Math.PI) / 180
              hs += Math.sin(h) * c; hc += Math.cos(h) * c
            }
          }
          col.lum = lum; col.sat = sat
          col.hue = (Math.atan2(hs, hc) * 180) / Math.PI
          if (col.hue < 0) col.hue += 360
          const ys: number[] = []
          for (let i = 0; i < 64; i++) ys.push(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2])
          const mean = ys.reduce((x, y) => x + y, 0) / 64
          col.hash = ys.map((v) => (v > mean ? '1' : '0')).join('')
        }
        const bw = 200
        const bh = Math.max(8, Math.round((bw * cv.height) / Math.max(1, cv.width)))
        const bc = document.createElement('canvas')
        bc.width = bw; bc.height = bh
        const bx = bc.getContext('2d', { willReadFrequently: true })
        if (bx) {
          bx.drawImage(cv, 0, 0, bw, bh)
          const bd = bx.getImageData(0, 0, bw, bh).data
          const gy = new Float32Array(bw * bh)
          for (let i = 0; i < bw * bh; i++) gy[i] = 0.299 * bd[i * 4] + 0.587 * bd[i * 4 + 1] + 0.114 * bd[i * 4 + 2]
          let sum = 0, sq = 0, cnt = 0
          for (let y = 1; y < bh - 1; y++) {
            for (let x = 1; x < bw - 1; x++) {
              const i = y * bw + x
              const l = gy[i - 1] + gy[i + 1] + gy[i - bw] + gy[i + bw] - 4 * gy[i]
              sum += l; sq += l * l; cnt++
            }
          }
          col.blur = cnt ? sq / cnt - (sum / cnt) * (sum / cnt) : 0
        }
        return { b: cv.toDataURL('image/jpeg', 0.7), col }
      } catch { return { b: '', col } }
    }
    const worker = async () => {
      while (!failed) {
        const start = next
        next += 12
        if (start >= list.length) return
        const batch = list.slice(start, start + 12)
        const imgs = await Promise.all(batch.map(thumb))
        const ok = batch.map((p, i) => ({ p, b: imgs[i].b, col: imgs[i].col })).filter((x) => x.b)
        if (ok.length) {
          const r = await fetch('/api/ai/camri-scenes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ images: ok.map((x) => x.b), galleryId: gallery.id, sessionType: sessType ?? '' }) })
          const j = await r.json().catch(() => ({}))
          if (!r.ok) { failed = j.error ?? 'Camri could not scan right now.'; return }
          if (Array.isArray(j.order)) order = j.order
          ok.forEach((x, i) => {
            const q = (j.photos ?? [])[i]
            info[x.p.id] = { scene: q?.scene ?? 'Other', tags: Array.isArray(q?.tags) ? q.tags : [], score: Number(q?.score) || 5, closed: q?.closed === true, ...x.col }
          })
        }
        done += batch.length
        setScan({ done: Math.min(done, list.length), total: list.length })
        setScanned((prev) => { const n = new Set(prev); batch.forEach((p) => n.add(p.id)); return n })
      }
    }
    await Promise.all(Array.from({ length: 3 }, worker))
    setScan(null)
    if (failed) { setMessage(failed); return null }
    setOrgInfo(info)
    setOrgOrder(order)
    const tagMap: Record<string, string[]> = {}
    for (const p of list) if (info[p.id]?.tags.length) tagMap[p.id] = info[p.id].tags
    const { error } = await sb.from('galleries').update({ photo_tags: tagMap }).eq('id', gallery.id)
    if (error) setMessage(error.message)
    if (mode !== 'none') await applyOrg(mode, info, order)
    return info
  }

  async function groupBy(mode: 'scenes' | 'colors' | 'moments') {
    if (!feats) return
    const byName = (x: Photo, y: Photo) => (x.filename ?? '').localeCompare(y.filename ?? '', undefined, { numeric: true, sensitivity: 'base' })
    const list = [...photos].filter((p) => feats[p.id]).sort((x, y) => x.sort_order - y.sort_order)
    let gs: { label: string; ids: string[] }[] = []
    if (mode === 'moments') {
      const timed = list.filter((p) => feats[p.id].t).sort((x, y) => (feats[x.id].t! - feats[y.id].t!) || byName(x, y))
      let last = 0
      for (const p of timed) {
        const t = feats[p.id].t!
        if (!gs.length || t - last > 30 * 60 * 1000) gs.push({ label: new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }), ids: [] })
        gs[gs.length - 1].ids.push(p.id)
        last = t
      }
      const rest = list.filter((p) => !feats[p.id].t)
      if (rest.length) gs.push({ label: 'No time found', ids: rest.map((p) => p.id) })
    } else if (mode === 'colors') {
      const names = ['Black and white', 'Dark', 'Bright', 'Warm', 'Green', 'Cool']
      const bucket = (f: { lum: number; sat: number; hue: number }) => (f.sat < 0.08 ? 0 : f.lum < 0.25 ? 1 : f.lum > 0.75 ? 2 : f.hue < 70 || f.hue >= 300 ? 3 : f.hue < 170 ? 4 : 5)
      const m: string[][] = names.map(() => [])
      list.forEach((p) => m[bucket(feats[p.id])].push(p.id))
      gs = names.map((label, i) => ({ label, ids: m[i] })).filter((g) => g.ids.length)
    } else {
      const k = Math.max(2, Math.min(8, Math.round(list.length / 15)))
      const V = list.map((p) => feats[p.id].vec)
      const dist = (a: number[], b: number[]) => { let s2 = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s2 += d * d } return s2 }
      const centers: number[][] = [V[0]]
      while (centers.length < k) {
        let best = 0, bd = -1
        V.forEach((v, i) => { const dd = Math.min(...centers.map((c) => dist(v, c))); if (dd > bd) { bd = dd; best = i } })
        centers.push(V[best])
      }
      let asg = new Array(V.length).fill(0)
      for (let it = 0; it < 10; it++) {
        asg = V.map((v) => { let bi = 0, bd = Infinity; centers.forEach((c, i) => { const dd = dist(v, c); if (dd < bd) { bd = dd; bi = i } }); return bi })
        centers.forEach((_, ci) => {
          const mem = V.filter((_v, i) => asg[i] === ci)
          if (mem.length) centers[ci] = mem[0].map((_x, j) => mem.reduce((a2, v) => a2 + v[j], 0) / mem.length)
        })
      }
      const order: number[] = []
      asg.forEach((a2) => { if (!order.includes(a2)) order.push(a2) })
      gs = order.map((ci, n) => ({ label: `Scene ${n + 1}`, ids: list.filter((_p, i) => asg[i] === ci).map((p) => p.id) }))
    }
    const byId = new Map(photos.map((p) => [p.id, p]))
    const used = new Set(gs.flatMap((g) => g.ids))
    const arr = [...gs.flatMap((g) => g.ids.map((id) => byId.get(id)!)), ...photos.filter((p) => !used.has(p.id))]
    await saveOrder(arr)
    await saveMoments(gs.map((g) => ({ id: crypto.randomUUID(), name: g.label, startId: g.ids[0] })))
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

  const wm = ((gallery?.design ?? null) as { watermark?: { on?: boolean; text?: string } } | null)?.watermark
  async function setWm(patch: { on?: boolean; text?: string }) {
    const sb = supabase
    if (!sb || !gallery) return
    const design = { ...(gallery.design ?? {}), watermark: { on: wm?.on ?? false, text: wm?.text ?? '', ...patch } }
    const { error } = await sb.from('galleries').update({ design }).eq('id', gallery.id)
    if (error) { setMessage(error.message); return }
    setGallery({ ...gallery, design })
  }
  const wmTxt = wm?.on ? String(wm.text ?? '').trim() : ''
  const wmStyle = wmTxt ? (() => {
    const t = wmTxt.toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const tw = wmTxt.length * 31
    const w = 2 * (tw + 30)
    const h = Math.max(200, Math.round(1.16 * tw + 56))
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'><g font-family='Arial, Helvetica, sans-serif' font-size='40' font-weight='800' letter-spacing='2' text-anchor='middle' dominant-baseline='middle' fill='white' fill-opacity='0.55' stroke='black' stroke-opacity='0.12' stroke-width='1'><text x='${w / 4}' y='${h / 4}' transform='rotate(-35 ${w / 4} ${h / 4})'>${t}</text><text x='${(w * 3) / 4}' y='${(h * 3) / 4}' transform='rotate(-35 ${(w * 3) / 4} ${(h * 3) / 4})'>${t}</text></g></svg>`
    return { backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, backgroundRepeat: 'repeat', backgroundSize: `min(${Math.round((w / tw) * 300)}px, ${((w / tw) * 40).toFixed(1)}%) auto` } as const
  })() : null
  const secStart = new Map((gallery?.moments ?? []).map((m) => [m.startId, m]))
  const liveIds = (ids: string[]) => ids.filter((id) => photos.some((x) => x.id === id))
  const thumbOf = (id: string) => { const ph = photos.find((x) => x.id === id); return ph?.thumb_path ? thumbs[ph.thumb_path] : undefined }

  return (
    <div className="min-h-screen bg-paper">
      <DashScenes />

      <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row">
        <aside className="flex w-full shrink-0 flex-col overflow-y-auto rounded-2xl border border-line bg-white/50 px-5 pb-8 pt-6 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-[320px]">
          <div ref={setLeftHost} className="flex flex-col" />
          {gallery && !designOpen && !shareOpen && (
            <div>
              <div>
                <label className={label}>Gallery name</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title.trim() && title.trim() !== gallery.title) saveSettings({ title: title.trim() }) }}
                  className={input}
                />
              </div>
              <h2 className="mt-7 font-fraunces text-2xl font-semibold text-ink">Organize your photos</h2>
              <p className="mt-1.5 text-sm leading-snug text-ink-soft">Choose how to sort this gallery.</p>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {([['scenes', 'By scene', 'Groups photos into moments'], ['best', 'Best first', 'Strongest photos on top'], ['color', 'By color', 'Black and white, warm, bright'], ['name', 'By filename', 'Original shot order']] as const).map(([k, l, d]) => (
                  <button key={k} type="button" disabled={!!scan || photos.length === 0} onClick={() => pickOrg(k)} className={`rounded-2xl border p-3.5 text-left transition disabled:opacity-50 ${orgMode === k ? 'border-twilight bg-twilight/10 ring-1 ring-twilight' : 'border-line bg-white/70 hover:border-twilight hover:bg-white'}`}>
                    <span className="block text-sm font-medium text-ink">{l}</span>
                    <span className="mt-1 block text-xs leading-snug text-ink-soft">{d}</span>
                  </button>
                ))}
              </div>
              {scan && (
                <div className="mt-4">
                  <p className="text-xs text-ink-soft">Organizing {scan.done} of {scan.total}</p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-twilight transition-all" style={{ width: `${(scan.done / Math.max(1, scan.total)) * 100}%` }} /></div>
                </div>
              )}
              <button type="button" disabled={!!scan || photos.length === 0} onClick={() => setAddingSec(!addingSec)} className={`mt-3 w-full rounded-xl border border-dashed px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${addingSec ? 'border-twilight bg-twilight/10 text-twilight' : 'border-twilight/60 bg-white/60 text-twilight hover:bg-twilight/10'}`}>{addingSec ? 'Click the photo where it starts' : '+ Add section'}</button>
              <div className="mt-4">
                {sceneInfo.blocks.length > 0 && (
                  <>
                    <ul className="mt-4 space-y-2.5">
                      {sceneInfo.blocks.map((b, i) => (
                        <li key={b.m.id} className="rounded-xl border border-line bg-white/60 p-2.5">
                          <div className="flex items-center gap-1.5">
                            <input key={b.m.name} defaultValue={b.m.name} onBlur={(e) => { if (e.target.value.trim() && e.target.value.trim() !== b.m.name) renameScene(b.m.id, e.target.value) }} className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2 py-1 text-sm text-ink focus:border-twilight focus:outline-none" />
                            <button type="button" disabled={i === 0} onClick={() => moveScene(i, -1)} aria-label="Move up" className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-twilight disabled:opacity-30">↑</button>
                            <button type="button" disabled={i === sceneInfo.blocks.length - 1} onClick={() => moveScene(i, 1)} aria-label="Move down" className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-twilight disabled:opacity-30">↓</button>
                            <button type="button" onClick={() => saveMoments((gallery?.moments ?? []).filter((m) => m.id !== b.m.id))} aria-label="Remove scene" className="rounded-lg border border-line px-2 py-1 text-xs text-ink-soft transition hover:border-twilight">✕</button>
                          </div>
                          <p className="mt-1.5 text-xs text-ink-soft">{b.ids.length} photos</p>
                          <div className="mt-1.5 flex gap-1">
                            {b.ids.slice(0, 5).map((id) => { const ph = photos.find((x) => x.id === id); const u = ph?.thumb_path ? thumbs[ph.thumb_path] : undefined; return u ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={id} src={u} alt="" className="h-9 w-9 rounded object-cover" />
                            ) : null })}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button type="button" onClick={() => saveMoments([])} className="mt-3 text-xs text-ink-soft underline">Remove scene titles</button>
                  </>
                )}
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-medium text-ink">Final check</p>
                <p className="mt-1 text-xs text-ink-soft">A last look before you send it.</p>
                <div className="mt-3 space-y-2">
                  {([['dups', 'Find duplicates', 'Near-identical shots, best one kept'], ['flags', 'Blurry or closed eyes', 'Photos worth a second look'], ['social', 'Top 10 for social', 'Your strongest photos']] as const).map(([k, l, dsc]) => (
                    <button key={k} type="button" disabled={!!scan || photos.length === 0} onClick={() => runCheck(k)} className={`w-full rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-50 ${check?.kind === k ? 'border-twilight bg-twilight/10' : 'border-line bg-white/70 hover:border-twilight hover:bg-white'}`}>
                      <span className="block text-sm font-medium text-ink">{l}</span>
                      <span className="mt-0.5 block text-xs text-ink-soft">{dsc}</span>
                    </button>
                  ))}
                </div>
                {check && !scan && (
                  <div className="mt-4">
                    {check.kind === 'dups' && (() => {
                      const gs = (check.groups ?? []).map((g) => ({ ...g, ids: liveIds(g.ids) })).filter((g) => g.ids.length > 1)
                      return gs.length ? (
                        <ul className="space-y-3">
                          {gs.map((g) => (
                            <li key={g.best} className="rounded-xl border border-line bg-white/60 p-2.5">
                              <div className="flex flex-wrap gap-1.5">
                                {g.ids.map((id) => (
                                  <div key={id} className="relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    {thumbOf(id) && <img src={thumbOf(id)} alt="" className={`h-14 w-14 rounded object-cover ${id === g.best ? 'ring-2 ring-twilight' : ''}`} />}
                                    {id === g.best && <span className="absolute inset-x-0 bottom-0 rounded-b bg-twilight/90 text-center text-[10px] text-white">Keep</span>}
                                  </div>
                                ))}
                              </div>
                              <button type="button" onClick={() => removeOthers(g.ids, g.best)} className="mt-2 text-xs text-red-600 underline">Remove the others</button>
                            </li>
                          ))}
                        </ul>
                      ) : <p className="text-xs text-ink-soft">No duplicates found.</p>
                    })()}
                    {check.kind === 'flags' && (() => {
                      const its = (check.items ?? []).filter((it) => liveIds([it.id]).length)
                      return its.length ? (
                        <div className="grid grid-cols-3 gap-2">
                          {its.map((it) => (
                            <div key={it.id}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {thumbOf(it.id) && <img src={thumbOf(it.id)} alt="" className="aspect-square w-full rounded object-cover" />}
                              <p className="mt-1 text-[11px] leading-tight text-ink-soft">{it.why}</p>
                              <button type="button" onClick={() => { const ph = photos.find((x) => x.id === it.id); if (ph) void deletePhoto(ph) }} className="text-[11px] text-red-600 underline">Delete</button>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-ink-soft">Nothing flagged. Everything looks sharp.</p>
                    })()}
                    {check.kind === 'social' && (
                      <div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {liveIds(check.ids ?? []).map((id) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            thumbOf(id) ? <img key={id} src={thumbOf(id)} alt="" className="aspect-square w-full rounded object-cover" /> : null
                          ))}
                        </div>
                        <button type="button" onClick={() => { navigator.clipboard?.writeText(liveIds(check.ids ?? []).map((id) => photos.find((x) => x.id === id)?.filename ?? '').filter(Boolean).join('\n')); flash('Filenames copied') }} className="mt-2 text-xs text-ink underline">Copy filenames</button>
                      </div>
                    )}
                    <button type="button" onClick={() => setCheck(null)} className="mt-3 block text-xs text-ink-soft underline">Close</button>
                  </div>
                )}
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">Watermark</p>
                    <p className="mt-0.5 text-xs text-ink-soft">Your text across each photo</p>
                  </div>
                  <button type="button" role="switch" aria-checked={!!wm?.on} onClick={() => setWm({ on: !wm?.on })} className={`relative h-6 w-11 shrink-0 rounded-full transition ${wm?.on ? 'bg-twilight' : 'bg-line'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${wm?.on ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {wm?.on && (
                  <>
                    <input value={wmDraft ?? wm?.text ?? ''} onChange={(e) => setWmDraft(e.target.value)} maxLength={40} placeholder="Your name or website" className={`${input} mt-3`} />
                    <button type="button" disabled={wmDraft === null || wmDraft.trim() === (wm?.text ?? '')} onClick={async () => { await setWm({ text: (wmDraft ?? '').trim() }); setWmDraft(null) }} className="mt-2 w-full rounded-xl border border-twilight bg-white/70 px-4 py-2 text-sm font-medium text-twilight transition hover:bg-twilight/10 disabled:opacity-50">{wmDraft === null || wmDraft.trim() === (wm?.text ?? '') ? ((wm?.text ?? '') ? 'Saved' : 'Save') : 'Save'}</button>
                  </>
                )}
              </div>
              <div className="mt-6 border-t border-line pt-5">
                {(sentAt || openedAt) && (
                  <dl className="mt-4 space-y-2 text-sm">
                    {sentAt && <div className="flex justify-between"><dt className="text-ink-soft">Sent to dashboard</dt><dd className="text-ink">{new Date(sentAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</dd></div>}
                    {openedAt && <div className="flex justify-between"><dt className="text-ink-soft">Opened by client</dt><dd className="text-ink">{new Date(openedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</dd></div>}
                  </dl>
                )}
                {isPublished && <button type="button" onClick={() => { navigator.clipboard?.writeText(shareUrl); flash('Link copied') }} className="mt-3 w-full rounded-xl border border-line bg-white/70 px-4 py-2 text-sm text-ink transition hover:border-twilight">Copy link</button>}
                {isPublished && coupleUserId && !openedAt && <button type="button" onClick={sendReminder} className="mt-2 w-full rounded-xl border border-line bg-white/70 px-4 py-2 text-sm text-ink transition hover:border-twilight">Send reminder</button>}
              </div>
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-medium text-ink">Upload and storage</p>
                <p className="mt-2 text-xs text-ink-soft">{photos.length} {photos.length === 1 ? 'photo' : 'photos'} · {(photos.reduce((n, p) => n + (p.size_bytes ?? 0), 0) / (1024 * 1024 * 1024)).toFixed(2)} GB</p>
                {uploads.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-ink-soft">{active ? 'Uploading' : 'Finished'}: {doneCount} of {uploads.length}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-twilight transition-all" style={{ width: `${(doneCount / uploads.length) * 100}%` }} /></div>
                  </div>
                )}
              </div>
            </div>
          )}
          {gallery && shareOpen && (
            <div>
              <div className="mb-6 h-5" />
              <h2 className="font-fraunces text-2xl font-semibold text-ink">Publish and send</h2>
              <p className="mb-6 truncate text-sm text-ink-soft">{title}</p>
              <div className="space-y-6">
                <div>
                  <label className={label}>Gallery name</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title.trim() && title.trim() !== gallery.title) saveSettings({ title: title.trim() }) }} placeholder="Chloe's Graduation" className={input} />
                  <p className="mt-2 text-xs text-ink-soft">This is the name your client sees on their dashboard.</p>
                </div>
                <div className="border-t border-line pt-6">
                  <label className={label}>Gallery link</label>
                  <div className="flex items-center overflow-hidden rounded-xl border border-line bg-paper focus-within:border-twilight">
                    <span className="shrink-0 pl-3 text-xs text-ink-soft">{origin.replace(/^https?:\/\//, '')}/g/</span>
                    <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40))} className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-sm text-ink outline-none" />
                  </div>
                  {slug !== gallery.token && (
                    <div className="mt-2 flex items-center gap-3">
                      <button className={btn} onClick={saveSlug}>Save link</button>
                      <button className="text-xs text-ink-soft underline" onClick={() => setSlug(gallery.token)}>Cancel</button>
                    </div>
                  )}
                  {sentAt && slug !== gallery.token && <p className="mt-2 text-xs text-ink-soft">Links you already sent will stop working.</p>}
                </div>
                <div className="border-t border-line pt-6">
                  <label className={label}>PIN {gallery.pin_hash ? <span className="text-twilight">(on)</span> : <span className="text-ink-soft">(required)</span>}</label>
                  <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder={gallery.pin_hash ? 'Type to change the PIN' : 'Choose a PIN'} className={input} />
                  <p className="mt-2 text-xs text-ink-soft">Anyone opening the link types this first. {clientName ? `${clientName} won't need it` : 'Your client won’t need it'} when signed in to their dashboard.</p>
                </div>
                <div className="border-t border-line pt-6">
                  <label className={label}>Delivery</label>
                  {gallery.session_id && coupleUserId && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-twilight/10 px-3 py-2 text-sm text-ink">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-twilight text-xs text-white">✓</span>
                      Also goes to {clientName ?? 'your client'}&apos;s Camrhia dashboard
                    </div>
                  )}
                  {!(gallery.session_id && coupleUserId) && (
                    <div className="mb-3 rounded-xl bg-paper px-3 py-2 text-sm text-ink-soft">
                      {clientName ?? 'Your client'} isn&apos;t on Camrhia yet. After publishing, send them the message below yourself, with a link to sign up.
                    </div>
                  )}
                  <button className={`${btn} mt-4 w-full py-3`} disabled={finalBusy} onClick={publishAndSend}>
                    {finalBusy ? 'Publishing…' : isPublished ? 'Update gallery' : 'Publish gallery'}
                  </button>
                  {shareMsg && (
                    <div className="mt-4 rounded-xl bg-paper px-3 py-3">
                      <p className="whitespace-pre-wrap text-sm text-ink-soft">{shareMsg}</p>
                      <button type="button" className={`${btnGhost} mt-3 w-full`} onClick={() => { navigator.clipboard?.writeText(shareMsg); flash('Message copied') }}>Copy message</button>
                    </div>
                  )}
                </div>
                {message && <p className="text-sm text-twilight">{message}</p>}
                {isPublished && (
                  <button className="text-xs text-ink-soft underline" onClick={async () => { if (await saveSettings({ status: 'draft' })) flash('Unpublished') }}>Unpublish</button>
                )}
              </div>
            </div>
          )}
        </aside>
        <main className="min-w-0 flex-1">
        {!gallery ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
              <div className="min-w-0 flex-1">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => { if (title.trim() && title.trim() !== gallery.title) saveSettings({ title: title.trim() }) }}
                  className="w-full bg-transparent font-fraunces text-3xl font-semibold text-ink focus:outline-none focus:ring-0"
                  aria-label="Gallery name"
                />
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                  <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${isPublished ? 'bg-twilight/15 text-twilight' : 'bg-line text-ink-soft'}`}>{isPublished ? 'Published' : 'Draft'}</span>
                  {sessInfo && <span>{sessInfo}</span>}
                  <span>· {photos.length} {photos.length === 1 ? 'photo' : 'photos'} · {totalFavs} {totalFavs === 1 ? 'favorite' : 'favorites'}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button className="rounded-xl border border-line bg-white/70 px-6 py-3 text-base text-ink transition hover:border-twilight" onClick={() => (designOpen || shareOpen ? goStep(designOpen ? 0 : 1) : router.push('/galleries'))}>Back</button>
                {!shareOpen && photos.length > 0 && <button className="rounded-xl border border-twilight bg-white/70 px-6 py-3 text-base font-medium text-twilight transition hover:bg-twilight/10" onClick={() => goStep(designOpen ? 2 : 1)}>Next</button>}
              </div>
            </div>

            {gallery && (
              <div ref={barRef}>
                <div className="mb-8">{stepsBar(designOpen ? 1 : shareOpen ? 2 : 0, { photos: () => goStep(0), style: () => goStep(1), publish: () => goStep(2) })}</div>
              </div>
            )}
            {message && !shareOpen && <p className="mb-4 text-sm text-twilight">{message}</p>}

            {designOpen && (
              <GalleryDesigner
                galleryId={gallery.id}
                token={gallery.token}
                title={gallery.title}
                initial={(gallery.design ?? null) as unknown as GalleryDesign | null}
                coverUrl={coverThumb}
                photoChoices={photos.filter((x) => x.thumb_path && thumbs[x.thumb_path]).slice(0, 60).map((x) => ({ id: x.id, url: thumbs[x.thumb_path as string] }))}
                coverPhotoId={gallery.cover_photo_id}
                onPickCover={async (id) => { if (await saveSettings({ cover_photo_id: id })) await syncCover(id) }}
                onClose={() => setDesignOpen(false)}
                onSend={() => setShareOpen(true)}
                topOffset={topOff}
                flushRef={designFlush}
                leftHost={leftHost}
                onAddSection={addSectionFromPreview}
                onRenameSection={(id, t) => void renameScene(id, t)}
                onSaved={(dd) => setGallery((g) => (g ? { ...g, design: dd as Record<string, unknown> } : g))}
              />
            )}

            <div className={designOpen || shareOpen ? 'hidden' : ''}>
              {/* Left: upload + photos */}
              <div className="min-w-0">


                <section
                  className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed px-5 ${photos.length > 0 ? 'py-4' : 'py-10'} transition ${dragging ? 'border-twilight bg-twilight/5' : 'border-line bg-white/60'}`}
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

                {cullOpen && (
                  <div className={`${card} mb-4`}>
                    <p className="font-fraunces text-lg text-ink">Cull this gallery</p>
                    <p className="mt-1 text-xs text-ink-soft">Finds soft shots and groups near-identical frames, keeping the sharpest of each. Nothing is deleted, and you can change any label afterwards.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-ink">How many photos do you want to end up with?</span>
                      <div className="w-24">
                        <input value={cullTarget} onChange={(e) => setCullTarget(e.target.value.replace(/\D/g, ''))} placeholder="any" inputMode="numeric" className={input} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">Optional. Leave it empty and we only flag soft shots and closed eyes. Type a number and we also mark the extras as over your target, keeping your best. Nothing is deleted.</p>
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
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {filter === 'all' && photos.length > 1 && !selecting && (
                      <p className="hidden text-xs text-ink-soft sm:block">Drag photos to reorder</p>
                    )}
                    {!selecting ? (
                      null
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


                {scan && (
                  <div className="mb-3 rounded-xl border border-line bg-white/70 px-4 py-3">
                    <p className="text-sm text-ink">Organizing your photos… {scan.done} of {scan.total}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-twilight transition-all" style={{ width: `${(scan.done / scan.total) * 100}%` }} /></div>
                  </div>
                )}
                {shown.length === 0 ? (
                  <p className="rounded-2xl border border-line bg-white/60 py-16 text-center text-sm text-ink-soft">
                    {filter === 'fav' ? 'No client favorites yet.' : filter !== 'all' ? `No ${filter} photos.` : 'No photos yet. Drop some above.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    {shown.flatMap((p) => [
                      filter === 'all' && secStart.get(p.id) ? (
                        <div key={'sec-' + secStart.get(p.id)!.id} className="col-span-full flex items-center gap-3 pt-3">
                          <input
                            key={secStart.get(p.id)!.name}
                            defaultValue={secStart.get(p.id)!.name}
                            autoFocus={newSec === secStart.get(p.id)!.id}
                            onFocus={(e) => e.target.select()}
                            onBlur={(e) => { const v = e.target.value.trim(); const sec = secStart.get(p.id); if (sec && v && v !== sec.name) void renameScene(sec.id, v) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            placeholder="Section title"
                            className="min-w-0 flex-1 border-b border-line bg-transparent pb-1 font-fraunces text-xl text-ink focus:border-twilight focus:outline-none"
                          />
                          <button type="button" onClick={() => { const sec = secStart.get(p.id); if (sec) void saveMoments((gallery.moments ?? []).filter((m) => m.id !== sec.id)) }} className="text-xs text-ink-soft hover:text-ink">Remove</button>
                        </div>
                      ) : null,
                      (
                      <div
                        key={p.id}
                        draggable={filter === 'all' && !selecting}
                        onClick={() => (addingSec ? startSection(p.id) : selecting ? toggleSel(p.id) : openView(p))}
                        onDragStart={() => { dragId.current = p.id }}
                        onDragOver={(e) => { if (filter === 'all') e.preventDefault() }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropOn(p.id) }}
                        className={`group relative aspect-square cursor-pointer overflow-hidden rounded-xl bg-line transition-opacity duration-300 ${selected.has(p.id) ? 'ring-4 ring-twilight' : ''} ${scan && !scanned.has(p.id) ? 'opacity-30' : ''}`}
                      >
                        {p.thumb_path && thumbs[p.thumb_path] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbs[p.thumb_path]} alt={p.filename ?? ''} loading="lazy" draggable={false} className="h-full w-full object-cover" />
                        )}
                        {wmStyle && <span aria-hidden className="pointer-events-none absolute inset-0" style={wmStyle} />}
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
                        <div className={`absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-black/60 p-1.5 sm:opacity-0 sm:transition sm:group-hover:opacity-100 ${selecting ? 'hidden' : ''}`}>
                          <button className="text-xs text-red-300" onClick={(e) => { e.stopPropagation(); deletePhoto(p) }}>Delete</button>
                        </div>
                      </div>
                    )])}
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
          <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm" style={{ height: 'min(78vh, 760px)' }}>
            <iframe key={gallery.token} src={`/g/${gallery.token}?preview=1`} title="Gallery preview" className="h-full w-full border-0" />
          </div>
        )}
        {gallery && accessOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setAccessOpen(false)}>
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
    </div>
  )
}
