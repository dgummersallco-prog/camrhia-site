'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type PSet = { id: string; title: string; location: string | null; sort_order: number }
type Photo = { id: string; storage_path: string; sort_order: number | null; portfolio_wedding_id: string | null }

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight'

export default function PhotoSetsEditor() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [sets, setSets] = useState<PSet[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [title, setTitle] = useState('')
  const [loc, setLoc] = useState('')
  const [progress, setProgress] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const dragPhoto = useRef<string | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/portfolio/photos'); return }
    const id = sess.session.user.id
    setUid(id)
    const [s, p] = await Promise.all([
      sb.from('portfolio_weddings').select('id, title, location, sort_order').eq('owner_id', id).order('sort_order', { ascending: true }),
      sb.from('portfolio_photos').select('id, storage_path, sort_order, portfolio_wedding_id').eq('owner_id', id).order('sort_order', { ascending: true }),
    ])
    setSets((s.data ?? []) as PSet[])
    setPhotos((p.data ?? []) as Photo[])
  }, [router])

  useEffect(() => { load() }, [load])

  function flash(t: string) {
    setMsg(t)
    setTimeout(() => setMsg((m) => (m === t ? null : m)), 1800)
  }

  async function createSet() {
    const sb = supabase
    if (!sb || !uid || !title.trim()) return
    const { error } = await sb.from('portfolio_weddings').insert({ owner_id: uid, title: title.trim(), location: loc.trim() || null, sort_order: sets.length })
    if (error) { setMsg(error.message); return }
    setTitle(''); setLoc('')
    await load()
  }

  async function saveSet(s: PSet) {
    const sb = supabase
    if (!sb || !s.title.trim()) return
    const { error } = await sb.from('portfolio_weddings').update({ title: s.title.trim(), location: s.location?.trim() || null }).eq('id', s.id)
    if (error) setMsg(error.message)
    else flash('Saved')
  }

  async function uploadTo(set: PSet, files: FileList | File[] | null) {
    const sb = supabase
    if (!sb || !uid || !files || files.length === 0) return
    const existing = photos.filter((p) => p.portfolio_wedding_id === set.id).length
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (list.length === 0) { setMsg('Please choose image files.'); return }
    try {
      let done = 0
      const queue = list.map((file, i) => ({ file, i }))
      setProgress(`Uploading 0 of ${list.length}…`)
      const worker = async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          const v = await makeVersions(item.file)
          const path = `${uid}/set_${set.id}_${Date.now()}_${item.i}.jpg`
          const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
          if (up.error) throw up.error
          const { error } = await sb.from('portfolio_photos').insert({ owner_id: uid, storage_path: path, portfolio_wedding_id: set.id, sort_order: existing + item.i })
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

  async function removePhoto(p: Photo) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('portfolio_photos').delete().eq('id', p.id)
    if (error) { setMsg(error.message); return }
    await sb.storage.from('portfolio').remove([p.storage_path])
    setPhotos((prev) => prev.filter((x) => x.id !== p.id))
  }

  async function removeSet(s: PSet) {
    const sb = supabase
    if (!sb || !window.confirm(`Delete "${s.title}" and all its photos?`)) return
    const mine = photos.filter((p) => p.portfolio_wedding_id === s.id)
    await sb.from('portfolio_photos').delete().eq('portfolio_wedding_id', s.id)
    const { error } = await sb.from('portfolio_weddings').delete().eq('id', s.id)
    if (error) { setMsg(error.message); return }
    if (mine.length) await sb.storage.from('portfolio').remove(mine.map((p) => p.storage_path))
    await load()
  }

  async function moveSet(i: number, dir: -1 | 1) {
    const sb = supabase
    const j = i + dir
    if (!sb || j < 0 || j >= sets.length) return
    const next = [...sets]
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    const re = next.map((x, k) => ({ ...x, sort_order: k }))
    setSets(re)
    await Promise.all(re.map((x) => sb.from('portfolio_weddings').update({ sort_order: x.sort_order }).eq('id', x.id)))
  }

  async function reorder(setId: string, fromId: string, toId: string) {
    const sb = supabase
    if (!sb) return
    const mine = photos.filter((p) => p.portfolio_wedding_id === setId)
    const a = mine.findIndex((p) => p.id === fromId)
    const b = mine.findIndex((p) => p.id === toId)
    if (a < 0 || b < 0 || a === b) return
    const next = [...mine]
    const [moved] = next.splice(a, 1)
    next.splice(b, 0, moved)
    const re = next.map((x, k) => ({ ...x, sort_order: k }))
    setPhotos((prev) =>
      prev.map((x) => re.find((r) => r.id === x.id) ?? x).sort((p, q) => (p.sort_order ?? 0) - (q.sort_order ?? 0)),
    )
    const res = await Promise.all(re.map((x) => sb.from('portfolio_photos').update({ sort_order: x.sort_order }).eq('id', x.id)))
    const bad = res.find((r) => r.error)
    if (bad?.error) setMsg(bad.error.message)
  }

  function editSet(id: string, patch: Partial<PSet>) {
    setSets((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="portfolio" />
      <main className="mx-auto max-w-4xl px-6 py-8">
        <a href="/portfolio" className="text-sm text-ink-soft underline hover:text-ink">Back to portfolio</a>
        <div className="mb-2 mt-3 flex items-center justify-between">
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Featured photos</h1>
          <span className="text-sm text-twilight">{progress ?? msg}</span>
        </div>
        <p className="mb-6 text-sm text-ink-soft">Each set is a group of photos on your portfolio. New sets use the default layout. Change the layout style in the Camrhia app. Drag photos from your computer onto a set to add them, and drag thumbnails to reorder. The first photo is the large one.</p>

        <section className={`${card} space-y-3`}>
          <p className="text-sm font-medium text-ink">New photo set</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Title (for example, Sarah and Tom)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className={input} placeholder="Location (optional)" value={loc} onChange={(e) => setLoc(e.target.value)} />
          </div>
          <button className={btn} disabled={!title.trim()} onClick={createSet}>Create set</button>
        </section>

        <div className="mt-6 space-y-5">
          {sets.length === 0 && <p className="text-sm text-ink-soft">No photo sets yet.</p>}
          {sets.map((s, i) => {
            const mine = photos.filter((p) => p.portfolio_wedding_id === s.id)
            return (
              <section
                key={s.id}
                className={`${card} ${dropId === s.id ? 'border-twilight bg-twilight/5' : ''}`}
                onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); if (dropId !== s.id) setDropId(s.id) } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropId(null) }}
                onDrop={(e) => { if (e.dataTransfer.files.length > 0) { e.preventDefault(); setDropId(null); uploadTo(s, Array.from(e.dataTransfer.files)) } }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex flex-col">
                    <button disabled={i === 0} onClick={() => moveSet(i, -1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move up">▲</button>
                    <button disabled={i === sets.length - 1} onClick={() => moveSet(i, 1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move down">▼</button>
                  </div>
                  <div className="grid flex-1 gap-3 sm:grid-cols-2">
                    <input className={input} value={s.title} onChange={(e) => editSet(s.id, { title: e.target.value })} onBlur={() => saveSet(s)} />
                    <input className={input} value={s.location ?? ''} placeholder="Location" onChange={(e) => editSet(s.id, { location: e.target.value })} onBlur={() => saveSet(s)} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {mine.map((p, idx) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => { dragPhoto.current = p.id }}
                      onDragEnd={() => { dragPhoto.current = null }}
                      onDragOver={(e) => { if (dragPhoto.current) e.preventDefault() }}
                      onDrop={(e) => {
                        if (dragPhoto.current && dragPhoto.current !== p.id) { e.preventDefault(); e.stopPropagation(); reorder(s.id, dragPhoto.current, p.id) }
                        dragPhoto.current = null
                      }}
                      className="group relative aspect-square cursor-grab overflow-hidden rounded-lg bg-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${BASE}${p.storage_path}`} alt="" className="h-full w-full object-cover" />
                      {idx === 0 ? (
                        <span className="absolute left-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">Main photo</span>
                      ) : (
                        <button onClick={() => reorder(s.id, p.id, mine[0].id)} className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white sm:opacity-0 sm:transition sm:group-hover:opacity-100">Make first</button>
                      )}
                      <button onClick={() => removePhoto(p)} className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white sm:opacity-0 sm:transition sm:group-hover:opacity-100" aria-label="Remove photo">×</button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <label className={`${btnGhost} cursor-pointer`}>
                    Add photos
                    <input type="file" multiple accept="image/jpeg,image/png,image/webp,.heic,.heif" className="hidden" onChange={(e) => { uploadTo(s, e.target.files); e.target.value = '' }} />
                  </label>
                  <button className="text-xs text-ink-soft underline hover:text-ink" onClick={() => removeSet(s)}>Delete set</button>
                </div>
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
