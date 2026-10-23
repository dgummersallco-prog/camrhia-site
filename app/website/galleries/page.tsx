'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Gal = { id: string; title: string; cover_photo_id: string | null; sort_order: number }
type Sec = { id: string; gallery_id: string; title: string; sort_order: number }
type Ph = { id: string; gallery_id: string; section_id: string | null; storage_path: string; sort_order: number }

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-3 py-2 text-sm text-ink transition hover:border-twilight disabled:opacity-40'
const SUGGEST = ['Weddings', 'Engagements', 'Couples', 'Families', 'Seniors', 'Newborn', 'Maternity', 'Portraits', 'Branding']

export default function WebsiteGalleries() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [gals, setGals] = useState<Gal[]>([])
  const [secs, setSecs] = useState<Sec[]>([])
  const [photos, setPhotos] = useState<Ph[]>([])
  const [title, setTitle] = useState('')
  const [newSec, setNewSec] = useState<Record<string, string>>({})
  const [progress, setProgress] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/website/galleries'); return }
    const id = sess.session.user.id
    setUid(id)
    const [g, s, p] = await Promise.all([
      sb.from('website_galleries').select('id, title, cover_photo_id, sort_order').eq('photographer_id', id).order('sort_order', { ascending: true }),
      sb.from('website_sections').select('id, gallery_id, title, sort_order').eq('photographer_id', id).order('sort_order', { ascending: true }),
      sb.from('website_photos').select('id, gallery_id, section_id, storage_path, sort_order').eq('photographer_id', id).order('sort_order', { ascending: true }),
    ])
    setGals((g.data ?? []) as Gal[])
    setSecs((s.data ?? []) as Sec[])
    setPhotos((p.data ?? []) as Ph[])
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
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (list.length === 0) { setMsg('Please choose image files.'); return }
    try {
      let done = 0
      const queue = list.map((file, i) => ({ file, i }))
      setProgress(`Uploading 0 of ${list.length}…`)
      const worker = async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          const v = await makeVersions(item.file)
          const path = `${uid}/web_${g.id}_${Date.now()}_${item.i}.jpg`
          const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
          if (up.error) throw up.error
          const { error } = await sb.from('website_photos').insert({ gallery_id: g.id, photographer_id: uid, section_id: sectionId, storage_path: path, sort_order: existing + item.i })
          if (error) throw error
          done++
          setProgress(`Uploading ${done} of ${list.length}…`)
        }
      }
      await Promise.all([worker(), worker(), worker()])
      flash('Photos added')
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? 'Upload failed.')
    } finally {
      setProgress(null)
      await load()
    }
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
          Add photos
          <span className="mt-0.5 opacity-70">or drop them here</span>
          <input type="file" accept="image/*,.heic,.heif" multiple className="hidden"
            onChange={(e) => { upload(g, sec?.id ?? null, e.target.files); e.target.value = '' }} />
        </label>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="website" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/website" className="text-sm text-ink-soft hover:text-ink">← Your website</Link>
            <h1 className="mt-2 font-fraunces text-3xl font-semibold text-ink">Website galleries</h1>
            <p className="mt-1 max-w-xl text-sm text-ink-soft">
              Make a gallery for each kind of work, like Weddings, Seniors or Families. Inside a gallery you can add sections, for example a few photos from each wedding. These are separate from your app portfolio.
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
                  <span className="text-xs text-ink-soft">{all.length} photos</span>
                  <div className="ml-auto flex gap-2">
                    <button className={btnGhost} disabled={gi === 0} onClick={() => moveGallery(g, -1)} aria-label="Move up">↑</button>
                    <button className={btnGhost} disabled={gi === gals.length - 1} onClick={() => moveGallery(g, 1)} aria-label="Move down">↓</button>
                    <button className={btnGhost} onClick={() => removeGallery(g)}>Delete</button>
                  </div>
                </div>

                {(loose.length > 0 || mySecs.length === 0) && (
                  <div className="mb-5">
                    {mySecs.length > 0 && <p className="mb-2 text-xs font-medium uppercase tracking-widest text-ink-soft">Photos</p>}
                    {renderGroup(g, null, coverId)}
                  </div>
                )}

                {mySecs.map((s, si) => (
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

                <div className="mt-2 flex flex-wrap items-center gap-2">
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
      </main>
    </div>
  )
}
