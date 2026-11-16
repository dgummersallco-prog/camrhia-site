'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Gal = { id: string; title: string; cover_photo_id: string | null; sort_order: number; source_gallery_id: string | null }
type Client = { id: string; title: string; count: number }
type Sec = { id: string; gallery_id: string; title: string; sort_order: number }
type Ph = { id: string; gallery_id: string; section_id: string | null; storage_path: string; sort_order: number }

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-3 py-2 text-sm text-ink transition hover:border-twilight disabled:opacity-40'
const SUGGEST = ['Weddings', 'Engagements', 'Couples', 'Families', 'Seniors', 'Newborn', 'Maternity', 'Portraits', 'Branding']

const MAX_PER_GALLERY = 24

export default function WebsiteGalleries() {
  const router = useRouter()
  const embedded = (usePathname() ?? '').startsWith('/galleries')
  const [uid, setUid] = useState<string | null>(null)
  const [gals, setGals] = useState<Gal[]>([])
  const [secs, setSecs] = useState<Sec[]>([])
  const [photos, setPhotos] = useState<Ph[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [title, setTitle] = useState('')
  const [newSec, setNewSec] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [picker, setPicker] = useState<{ g: Gal; cid: string | null; items: { id: string; web_path: string | null; url: string }[]; sel: string[]; busy: boolean } | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/website/galleries'); return }
    const id = sess.session.user.id
    setUid(id)
    const [g, s, p] = await Promise.all([
      sb.from('website_galleries').select('id, title, cover_photo_id, sort_order, source_gallery_id').eq('photographer_id', id).order('sort_order', { ascending: true }),
      sb.from('website_sections').select('id, gallery_id, title, sort_order').eq('photographer_id', id).order('sort_order', { ascending: true }),
      sb.from('website_photos').select('id, gallery_id, section_id, storage_path, sort_order').eq('photographer_id', id).order('sort_order', { ascending: true }),
    ])
    setGals((g.data ?? []) as Gal[])
    setSecs((s.data ?? []) as Sec[])
    setPhotos((p.data ?? []) as Ph[])
    const { data: cg } = await sb.from('galleries').select('id, title, gallery_photos(count)').eq('owner_id', id).order('created_at', { ascending: false })
    setClients(((cg ?? []) as unknown as { id: string; title: string; gallery_photos: { count: number }[] }[]).map((c) => ({ id: c.id, title: c.title, count: c.gallery_photos?.[0]?.count ?? 0 })))
  }, [router])
  useEffect(() => { load() }, [load])

  function flash(t: string) {
    setMsg(t)
    setTimeout(() => setMsg((m) => (m === t ? null : m)), 1800)
  }

  async function createGallery() {
    const sb = supabase
    if (!sb || !uid || !title.trim()) return
    const { error } = await sb.from('website_galleries').insert({ photographer_id: uid, title: title.trim(), sort_order: gals.length })
    if (error) { setMsg(error.message); return }
    setTitle('')
    await load()
  }

  async function rename(g: Gal, value: string) {
    const sb = supabase
    const t = value.trim()
    if (!sb || !t || t === g.title) return
    const { error } = await sb.from('website_galleries').update({ title: t }).eq('id', g.id)
    if (error) setMsg(error.message)
    else { flash('Saved'); await load() }
  }

  async function removeGallery(g: Gal) {
    const sb = supabase
    if (!sb || !window.confirm(`Delete "${g.title}" and all its photos?`)) return
    const mine = photos.filter((p) => p.gallery_id === g.id)
    const { error } = await sb.from('website_galleries').delete().eq('id', g.id)
    if (error) { setMsg(error.message); return }
    if (mine.length) await sb.storage.from('portfolio').remove(mine.map((p) => p.storage_path))
    await load()
  }

  async function moveGallery(g: Gal, dir: -1 | 1) {
    const sb = supabase
    if (!sb) return
    const arr = [...gals].sort((a, b) => a.sort_order - b.sort_order)
    const i = arr.findIndex((x) => x.id === g.id)
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    await Promise.all(arr.map((x, idx) => sb.from('website_galleries').update({ sort_order: idx }).eq('id', x.id)))
    await load()
  }

  async function addSection(g: Gal) {
    const sb = supabase
    const t = (newSec[g.id] ?? '').trim()
    if (!sb || !uid || !t) return
    const count = secs.filter((s) => s.gallery_id === g.id).length
    const { error } = await sb.from('website_sections').insert({ gallery_id: g.id, photographer_id: uid, title: t, sort_order: count })
    if (error) { setMsg(error.message); return }
    setNewSec((m) => ({ ...m, [g.id]: '' }))
    await load()
  }

  async function renameSection(s: Sec, value: string) {
    const sb = supabase
    const t = value.trim()
    if (!sb || !t || t === s.title) return
    const { error } = await sb.from('website_sections').update({ title: t }).eq('id', s.id)
    if (error) setMsg(error.message)
    else { flash('Saved'); await load() }
  }

  async function removeSection(s: Sec) {
    const sb = supabase
    if (!sb || !window.confirm(`Delete "${s.title}" and its photos?`)) return
    const mine = photos.filter((p) => p.section_id === s.id)
    const { error } = await sb.from('website_sections').delete().eq('id', s.id)
    if (error) { setMsg(error.message); return }
    if (mine.length) await sb.storage.from('portfolio').remove(mine.map((p) => p.storage_path))
    await load()
  }

  async function moveSection(s: Sec, dir: -1 | 1) {
    const sb = supabase
    if (!sb) return
    const arr = secs.filter((x) => x.gallery_id === s.gallery_id).sort((a, b) => a.sort_order - b.sort_order)
    const i = arr.findIndex((x) => x.id === s.id)
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    await Promise.all(arr.map((x, idx) => sb.from('website_sections').update({ sort_order: idx }).eq('id', x.id)))
    await load()
  }

  async function upload(g: Gal, sectionId: string | null, files: FileList | File[] | null) {
    const sb = supabase
    if (!sb || !uid || !files || files.length === 0) return
    const existing = photos.filter((p) => p.gallery_id === g.id && (p.section_id ?? null) === sectionId).length
    const room = MAX_PER_GALLERY - photos.filter((p) => p.gallery_id === g.id).length
    if (room <= 0) { setMsg(`This gallery is full (${MAX_PER_GALLERY} photos). Remove one to add another.`); return }
    const picked = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (picked.length === 0) { setMsg('Please choose image files.'); return }
    const list = picked.slice(0, room)
    if (picked.length > room) setMsg(`Only ${room} more fit in this gallery (limit ${MAX_PER_GALLERY}). Adding the first ${room}.`)
    try {
      let done = 0
      const failed: string[] = []
      let lastErr = ''
      const queue = list.map((file, i) => ({ file, i }))
      setProgress(`Uploading 0 of ${list.length}…`)
      const worker = async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          let ok = false
          for (let attempt = 0; attempt < 3 && !ok; attempt++) {
            try {
              const v = await makeVersions(item.file)
              const path = `${uid}/web_${g.id}_${Date.now()}_${item.i}.jpg`
              const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
              if (up.error) throw up.error
              const { error } = await sb.from('website_photos').insert({ gallery_id: g.id, photographer_id: uid, section_id: sectionId, storage_path: path, sort_order: existing + item.i })
              if (error) { await sb.storage.from('portfolio').remove([path]); throw error }
              ok = true
            } catch (e) {
              lastErr = (e as { message?: string })?.message ?? 'Upload failed.'
              await new Promise((r) => setTimeout(r, 800 * (attempt + 1)))
            }
          }
          if (ok) done++
          else failed.push(item.file.name)
          setProgress(`Uploading ${done} of ${list.length}…`)
        }
      }
      await Promise.all([worker(), worker(), worker()])
      if (failed.length) setMsg(`${failed.length} of ${list.length} did not upload (${failed.join(', ')}): ${lastErr}`)
      else flash('Photos added')
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? 'Upload failed.')
    } finally {
      setProgress(null)
      await load()
    }
  }

  async function connect(g: Gal, sourceId: string | null) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('website_galleries').update({ source_gallery_id: sourceId }).eq('id', g.id)
    if (error) setMsg(error.message)
    else { flash(sourceId ? 'Connected' : 'Disconnected'); await load() }
  }

  async function setCover(g: Gal, p: Ph) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('website_galleries').update({ cover_photo_id: p.id }).eq('id', g.id)
    if (error) setMsg(error.message)
    else { flash('Cover set'); await load() }
  }

  async function removePhoto(g: Gal, p: Ph) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('website_photos').delete().eq('id', p.id)
    if (error) { setMsg(error.message); return }
    await sb.storage.from('portfolio').remove([p.storage_path])
    if (g.cover_photo_id === p.id) await sb.from('website_galleries').update({ cover_photo_id: null }).eq('id', g.id)
    await load()
  }

  async function movePhoto(g: Gal, p: Ph, dir: -1 | 1) {
    const sb = supabase
    if (!sb) return
    const arr = photos.filter((x) => x.gallery_id === g.id && (x.section_id ?? null) === (p.section_id ?? null)).sort((a, b) => a.sort_order - b.sort_order)
    const i = arr.findIndex((x) => x.id === p.id)
    const j = i + dir
    if (j < 0 || j >= arr.length) return
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    await Promise.all(arr.map((x, idx) => sb.from('website_photos').update({ sort_order: idx }).eq('id', x.id)))
    await load()
  }

  function openPicker(g: Gal) {
    const room = MAX_PER_GALLERY - photos.filter((p) => p.gallery_id === g.id).length
    if (room <= 0) { setMsg(`This gallery is full (${MAX_PER_GALLERY} photos). Remove one to add another.`); return }
    setPicker({ g, cid: null, items: [], sel: [], busy: false })
  }

  async function pickClient(cid: string) {
    const sb = supabase
    if (!sb || !picker) return
    setPicker({ ...picker, cid, items: [], sel: [], busy: true })
    const { data } = await sb.from('gallery_photos').select('id, web_path, thumb_path, sort_order').eq('gallery_id', cid).order('sort_order', { ascending: true })
    const rows = (data ?? []) as { id: string; web_path: string | null; thumb_path: string | null }[]
    const paths = rows.map((r) => r.thumb_path ?? r.web_path).filter((x): x is string => !!x)
    const res = paths.length ? await sb.storage.from('galleries').createSignedUrls(paths, 3600) : null
    const urlOf = new Map((res?.data ?? []).map((x) => [x.path ?? '', x.signedUrl] as const))
    const items = rows
      .map((r) => ({ id: r.id, web_path: r.web_path, url: urlOf.get(r.thumb_path ?? r.web_path ?? '') ?? '' }))
      .filter((x) => x.url && x.web_path)
    setPicker((p) => (p ? { ...p, cid, items, sel: [], busy: false } : p))
  }

  async function addPicked() {
    const sb = supabase
    if (!sb || !uid || !picker) return
    const g = picker.g
    const chosen = picker.items.filter((x) => picker.sel.includes(x.id))
    if (chosen.length === 0) return
    const base = photos.filter((p) => p.gallery_id === g.id).length
    setPicker(null)
    let done = 0
    let failed = 0
    const queue = chosen.map((c, i) => ({ c, i }))
    setProgress(`Adding 0 of ${chosen.length}…`)
    const worker = async () => {
      for (let it = queue.shift(); it; it = queue.shift()) {
        try {
          const dl = await sb.storage.from('galleries').download(it.c.web_path as string)
          if (dl.error || !dl.data) throw dl.error
          const path = `${uid}/web_${g.id}_${Date.now()}_${it.i}.jpg`
          const up = await sb.storage.from('portfolio').upload(path, dl.data, { contentType: 'image/jpeg', upsert: true })
          if (up.error) throw up.error
          const { error } = await sb.from('website_photos').insert({ gallery_id: g.id, photographer_id: uid, section_id: null, storage_path: path, sort_order: base + it.i })
          if (error) { await sb.storage.from('portfolio').remove([path]); throw error }
        } catch {
          failed++
        }
        done++
        setProgress(`Adding ${done} of ${chosen.length}…`)
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setProgress(null)
    if (failed) setMsg(`${failed} photo${failed === 1 ? '' : 's'} could not be added.`)
    else flash('Photos added')
    await load()
  }

  const pickerRoom = picker ? MAX_PER_GALLERY - photos.filter((p) => p.gallery_id === picker.g.id).length : 0

  const renderGroup = (g: Gal, sec: Sec | null, coverId: string | null) => {
    const list = photos
      .filter((p) => p.gallery_id === g.id && (p.section_id ?? null) === (sec?.id ?? null))
      .sort((a, b) => a.sort_order - b.sort_order)
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {list.map((p, pi) => (
          <div key={p.id} className={`group relative aspect-square overflow-hidden rounded-lg bg-line/50 ${coverId === p.id ? 'ring-2 ring-twilight' : ''}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BASE + p.storage_path} alt="" className="h-full w-full object-cover" loading="lazy" />
            {coverId === p.id && <span className="absolute left-1 top-1 rounded bg-twilight px-1.5 py-0.5 text-[10px] text-white">Cover</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 px-1 py-1 text-xs text-white opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
              <button disabled={pi === 0} onClick={() => movePhoto(g, p, -1)} className="px-1 disabled:opacity-30" aria-label="Move left">←</button>
              <button onClick={() => setCover(g, p)} className="px-1" aria-label="Make cover">★</button>
              <button onClick={() => removePhoto(g, p)} className="px-1" aria-label="Remove">✕</button>
              <button disabled={pi === list.length - 1} onClick={() => movePhoto(g, p, 1)} className="px-1 disabled:opacity-30" aria-label="Move right">→</button>
            </div>
          </div>
        ))}
        <label
          className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line text-center text-xs text-ink-soft hover:border-twilight"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); upload(g, sec?.id ?? null, e.dataTransfer.files) }}
        >
          <span className="text-xl text-ink">+</span>
          From my computer
          <span className="mt-0.5 opacity-70">or drop them here</span>
          <input type="file" accept="image/*,.heic,.heif" multiple className="hidden"
            onChange={(e) => { upload(g, sec?.id ?? null, e.target.files); e.target.value = '' }} />
        </label>
      </div>
    )
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-paper xl:pl-60'}>
      {!embedded && <DashboardHeader active="website" />}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/website" className="text-sm text-ink-soft hover:text-ink">← Your website</Link>
            <h1 className="mt-2 font-fraunces text-3xl font-semibold text-ink">Website galleries</h1>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              Your website galleries show your best work to visitors. Make one for each kind of session, like Weddings, Seniors, or Families, and add up to 24 of your strongest photos to each. Come back anytime to add, swap, or remove photos. When you design your site, you will choose which gallery shows where. These are separate from your client galleries and your app portfolio.
            </p>
          </div>
          {msg && <span className="text-sm text-twilight">{msg}</span>}
        </div>

        {progress && <p className="mb-4 rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink">{progress}</p>}

        <section className={card + ' mb-6'}>
          <h2 className="mb-3 font-fraunces text-lg font-semibold text-ink">New gallery</h2>
          <div className="flex flex-wrap gap-2">
            <input className={input + ' max-w-sm'} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Gallery name, e.g. Weddings"
              onKeyDown={(e) => { if (e.key === 'Enter') createGallery() }} />
            <button className={btn} onClick={createGallery} disabled={!title.trim()}>Create</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGEST.map((s) => (
              <button key={s} onClick={() => setTitle(s)} className="rounded-full border border-line px-3 py-1 text-xs text-ink-soft hover:border-twilight hover:text-ink">{s}</button>
            ))}
          </div>
        </section>

        {gals.length === 0 && <p className="text-sm text-ink-soft">No galleries yet. Create your first one above.</p>}

        <div className="space-y-6">
          {gals.map((g, gi) => {
            const all = photos.filter((p) => p.gallery_id === g.id).sort((a, b) => a.sort_order - b.sort_order)
            const mySecs = secs.filter((s) => s.gallery_id === g.id).sort((a, b) => a.sort_order - b.sort_order)
            const loose = all.filter((p) => !p.section_id)
            const coverId = g.cover_photo_id ?? all[0]?.id ?? null
            return (
              <section key={g.id} className={card}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <input key={g.id + g.title} className={input + ' max-w-xs font-medium'} defaultValue={g.title} onBlur={(e) => rename(g, e.target.value)} />
                  <span className="text-xs text-ink-soft">{g.source_gallery_id ? `${clients.find((c) => c.id === g.source_gallery_id)?.count ?? 0} photos` : `${all.length} of ${MAX_PER_GALLERY} photos`}</span>
                  <div className="ml-auto flex gap-2">
                    <button className={btnGhost} disabled={gi === 0} onClick={() => moveGallery(g, -1)} aria-label="Move up">↑</button>
                    <button className={btnGhost} disabled={gi === gals.length - 1} onClick={() => moveGallery(g, 1)} aria-label="Move down">↓</button>
                    <button className={btnGhost} onClick={() => removeGallery(g)}>Delete</button>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  {g.source_gallery_id ? (
                    <>
                      <span className="text-xs text-ink-soft">Showing the client gallery {clients.find((c) => c.id === g.source_gallery_id)?.title ?? ''}. Changes there update here.</span>
                      <button className={btnGhost} onClick={() => connect(g, null)}>Stop showing it</button>
                    </>
                  ) : (
                    <button className={btnGhost} onClick={() => openPicker(g)}>Add from a client gallery</button>
                  )}
                </div>

                {!g.source_gallery_id && (loose.length > 0 || mySecs.length === 0) && (
                  <div className="mb-5">
                    {mySecs.length > 0 && <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-soft">Photos</p>}
                    {renderGroup(g, null, coverId)}
                  </div>
                )}

                {!g.source_gallery_id && mySecs.map((s, si) => (
                  <div key={s.id} className="mb-5 rounded-xl border border-line bg-paper p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <input key={s.id + s.title} className={input + ' max-w-xs'} defaultValue={s.title} onBlur={(e) => renameSection(s, e.target.value)} />
                      <div className="ml-auto flex gap-2">
                        <button className={btnGhost} disabled={si === 0} onClick={() => moveSection(s, -1)} aria-label="Move section up">↑</button>
                        <button className={btnGhost} disabled={si === mySecs.length - 1} onClick={() => moveSection(s, 1)} aria-label="Move section down">↓</button>
                        <button className={btnGhost} onClick={() => removeSection(s)}>Delete</button>
                      </div>
                    </div>
                    {renderGroup(g, s, coverId)}
                  </div>
                ))}

                <div className={'mt-2 flex flex-wrap items-center gap-2' + (g.source_gallery_id ? ' hidden' : '')}>
                  <input className={input + ' max-w-xs'} value={newSec[g.id] ?? ''} placeholder="Add a section, e.g. Sarah & Tom"
                    onChange={(e) => setNewSec((m) => ({ ...m, [g.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') addSection(g) }} />
                  <button className={btnGhost} onClick={() => addSection(g)} disabled={!(newSec[g.id] ?? '').trim()}>Add section</button>
                  {mySecs.length === 0 && <span className="text-xs text-ink-soft">Use sections to show several shoots in one gallery.</span>}
                </div>
              </section>
            )
          })}
        </div>
        {picker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPicker(null)}>
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-line bg-card p-5" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-fraunces text-xl text-ink">{picker.cid ? clients.find((c) => c.id === picker.cid)?.title : 'Choose a client gallery'}</p>
                <button className="text-2xl leading-none text-ink-soft" onClick={() => setPicker(null)} aria-label="Close">×</button>
              </div>
              {!picker.cid ? (
                <div className="space-y-2 overflow-y-auto">
                  {clients.length === 0 && <p className="text-sm text-ink-soft">No client galleries yet.</p>}
                  {clients.map((c) => (
                    <button key={c.id} onClick={() => pickClient(c.id)} className="flex w-full items-center justify-between rounded-xl border border-line bg-paper px-4 py-3 text-left text-sm text-ink hover:border-twilight">
                      <span>{c.title}</span>
                      <span className="text-xs text-ink-soft">{c.count} photos</span>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <p className="mb-3 text-xs text-ink-soft">Tap the photos you want on your website. {picker.sel.length} of {pickerRoom} selected.</p>
                  {picker.busy ? (
                    <p className="text-sm text-ink-soft">Loading…</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
                      {picker.items.map((it) => {
                        const on = picker.sel.includes(it.id)
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => setPicker((p) => {
                              if (!p) return p
                              const has = p.sel.includes(it.id)
                              if (!has && p.sel.length >= pickerRoom) return p
                              return { ...p, sel: has ? p.sel.filter((x) => x !== it.id) : [...p.sel, it.id] }
                            })}
                            className={`relative aspect-square overflow-hidden rounded-lg ${on ? 'ring-2 ring-twilight' : ''}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={it.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                            {on && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-twilight text-[11px] text-white">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className="mt-4 flex justify-between gap-2">
                    <button className={btnGhost} onClick={() => setPicker((p) => (p ? { ...p, cid: null, items: [], sel: [] } : p))}>Back</button>
                    <button className={btn} disabled={picker.sel.length === 0} onClick={addPicked}>Add {picker.sel.length} photo{picker.sel.length === 1 ? '' : 's'}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
