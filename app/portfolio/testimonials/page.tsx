'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type T = { id: string; storage_path: string | null; quote: string | null; client_name: string | null; sort_order: number; card_scale?: number | null }

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50'

export default function TestimonialsEditor() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [items, setItems] = useState<T[]>([])
  const [name, setName] = useState('')
  const [quote, setQuote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(
    () => (file && !/\.(heic|heif)$/i.test(file.name) ? URL.createObjectURL(file) : null),
    [file],
  )
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/portfolio/testimonials'); return }
    setUid(sess.session.user.id)
    const { data } = await sb
      .from('testimonials')
      .select('id, storage_path, quote, client_name, sort_order, card_scale')
      .eq('owner_id', sess.session.user.id)
      .order('sort_order', { ascending: true })
    setItems((data ?? []) as T[])
  }, [router])

  useEffect(() => { load() }, [load])

  function flash(t: string) {
    setMsg(t)
    setTimeout(() => setMsg((m) => (m === t ? null : m)), 1800)
  }

  async function add() {
    const sb = supabase
    if (!sb || !uid || !quote.trim() || busy) return
    setBusy(true)
    setMsg(null)
    try {
      let path: string | null = null
      if (file) {
        const v = await makeVersions(file)
        path = `${uid}/testimonial_${Date.now()}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
      }
      const { error } = await sb.from('testimonials').insert({
        owner_id: uid, quote: quote.trim(), client_name: name.trim() || null, storage_path: path, sort_order: items.length,
      })
      if (error) throw error
      setName(''); setQuote(''); setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await load()
      flash('Testimonial added')
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? 'Could not add the testimonial.')
    } finally {
      setBusy(false)
    }
  }

  async function saveField(t: T, patch: Partial<T>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('testimonials').update(patch).eq('id', t.id)
    if (error) setMsg(error.message)
    else flash('Saved')
  }

  async function remove(t: T) {
    const sb = supabase
    if (!sb || !window.confirm('Remove this testimonial?')) return
    const { error } = await sb.from('testimonials').delete().eq('id', t.id)
    if (error) { setMsg(error.message); return }
    if (t.storage_path) await sb.storage.from('portfolio').remove([t.storage_path])
    setItems((prev) => prev.filter((x) => x.id !== t.id))
  }

  async function move(i: number, dir: -1 | 1) {
    const sb = supabase
    const j = i + dir
    if (!sb || j < 0 || j >= items.length) return
    const next = [...items]
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
    const re = next.map((x, k) => ({ ...x, sort_order: k }))
    setItems(re)
    await Promise.all(re.map((x) => sb.from('testimonials').update({ sort_order: x.sort_order }).eq('id', x.id)))
  }

  async function replacePhoto(t: T, f: File) {
    const sb = supabase
    if (!sb || !uid) return
    setMsg('Uploading photo…')
    try {
      const v = await makeVersions(f)
      const path = `${uid}/testimonial_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const { error } = await sb.from('testimonials').update({ storage_path: path }).eq('id', t.id)
      if (error) throw error
      if (t.storage_path) await sb.storage.from('portfolio').remove([t.storage_path])
      edit(t.id, { storage_path: path })
      flash('Photo updated')
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? 'Could not upload that photo.')
    }
  }

  function edit(id: string, patch: Partial<T>) {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="portfolio" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <a href="/portfolio" className="text-sm text-ink-soft underline hover:text-ink">Back to portfolio</a>
        <div className="mb-6 mt-3 flex items-center justify-between">
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Testimonials</h1>
          {msg && <span className="text-sm text-twilight">{msg}</span>}
        </div>

        <section className={`${card} space-y-3`}>
          <p className="text-sm font-medium text-ink">Add a testimonial</p>
          <input className={input} placeholder="Client name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea rows={3} className={input} placeholder="What they said" value={quote} onChange={(e) => setQuote(e.target.value)} />
          <div className="flex items-center gap-3">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-16 w-14 shrink-0 rounded-lg object-cover" />
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs text-ink-soft" />
          </div>
          <button className={btn} disabled={busy || !quote.trim()} onClick={add}>{busy ? 'Adding…' : 'Add testimonial'}</button>
        </section>

        <div className="mt-6 space-y-4">
          {items.length === 0 && <p className="text-sm text-ink-soft">No testimonials yet.</p>}
          {items.map((t, i) => (
            <section key={t.id} className={`${card} flex gap-4`}>
              <div className="flex flex-col">
                <button disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move up">▲</button>
                <button disabled={i === items.length - 1} onClick={() => move(i, 1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move down">▼</button>
              </div>
              {t.storage_path && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${BASE}${t.storage_path}`} alt="" className="h-24 w-20 shrink-0 rounded-lg object-cover" />
              )}
              <div className="flex-1 space-y-2">
                <input className={input} value={t.client_name ?? ''} placeholder="Client name" onChange={(e) => edit(t.id, { client_name: e.target.value })} onBlur={(e) => saveField(t, { client_name: e.target.value.trim() || null })} />
                <textarea rows={3} className={input} value={t.quote ?? ''} placeholder="Quote" onChange={(e) => edit(t.id, { quote: e.target.value })} onBlur={(e) => { if (e.target.value.trim()) saveField(t, { quote: e.target.value }); else { setMsg('A testimonial needs a quote.'); load() } }} />
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wider text-ink-soft">Card size · {Math.round((t.card_scale ?? 0.8) * 100)}%</p>
                  <input
                    type="range" min={0.5} max={1} step={0.05}
                    value={t.card_scale ?? 0.8}
                    className="w-full accent-twilight"
                    onChange={(e) => edit(t.id, { card_scale: Number(e.target.value) })}
                    onPointerUp={(e) => saveField(t, { card_scale: Number((e.target as HTMLInputElement).value) })}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer text-xs text-ink-soft underline hover:text-ink">
                    {t.storage_path ? 'Change photo' : 'Add photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) replacePhoto(t, f); e.target.value = '' }} />
                  </label>
                  <button className="text-xs text-ink-soft underline hover:text-ink" onClick={() => remove(t)}>Remove</button>
                </div>
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
