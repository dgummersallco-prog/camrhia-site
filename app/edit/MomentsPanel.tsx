'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const BUCKET = 'galleries'

type Moment = { id: string; name: string; startId: string }
type P = { id: string; thumb_path: string | null; sort_order: number; taken_at: string | null; cull_label: string | null }

const COMMON = ['Highlights', 'Black & White']
const PRESETS: [string, string[]][] = [
  ['wedding', ['Getting ready', 'First look', 'Ceremony', 'Family formals', 'Couple portraits', 'Details', 'Cocktail hour', 'Reception', 'Send-off']],
  ['engagement', ['Location 1', 'Location 2', 'Location 3', 'Outfit change', 'Candids']],
  ['proposal', ['The proposal', 'Celebration', 'Couple portraits', 'Candids']],
  ['maternity', ['Solo', 'Couple', 'Family', 'Details', 'Outfit change']],
  ['newborn', ['Family and parents', 'Diaper-only sets', 'Bucket and props', 'Outfits', 'Wrapped', 'Close-ups', 'Details']],
  ['family', ['Whole family', 'Parents', 'Kids', 'Individuals', 'Candids']],
  ['senior', ['Outfit 1', 'Outfit 2', 'Outfit 3', 'Location 1', 'Location 2', 'Cap and gown', 'Friends']],
  ['graduat', ['Cap and gown', 'Outfit 1', 'Outfit 2', 'Location 1', 'Location 2', 'Family', 'Friends']],
  ['headshot', ['Main look', 'Alternate look', 'Full-length', 'Candid']],
  ['brand', ['Hero', 'Lifestyle', 'Details', 'Headshots', 'Behind the scenes']],
  ['sport', ['Team photo', 'Individuals', 'Action', 'Candids']],
  ['team', ['Team photo', 'Individuals', 'Action', 'Candids']],
  ['boudoir', ['Outfit 1', 'Outfit 2', 'Outfit 3', 'Details']],
]
const GENERIC = ['Location 1', 'Location 2', 'Outfit 1', 'Outfit 2', 'Candids']

function presetsFor(t: string | null): string[] {
  const k = (t ?? '').toLowerCase()
  const hit = PRESETS.find(([key]) => k.includes(key))
  return [...(hit ? hit[1] : GENERIC), ...COMMON]
}

const nid = () => Math.random().toString(36).slice(2, 9)

export default function MomentsPanel({ galleryId }: { galleryId: string }) {
  const [photos, setPhotos] = useState<P[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [moments, setMoments] = useState<Moment[]>([])
  const [type, setType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let off = false
    ;(async () => {
      const sb = supabase
      if (!sb) return
      const { data: g } = await sb.from('galleries').select('session_id, moments').eq('id', galleryId).maybeSingle()
      let t: string | null = null
      if (g?.session_id) {
        const { data: w } = await sb.from('weddings').select('session_type').eq('id', g.session_id).maybeSingle()
        t = (w?.session_type as string | null) ?? null
      }
      const all: P[] = []
      for (let from = 0; ; from += 1000) {
        const { data } = await sb
          .from('gallery_photos')
          .select('id, thumb_path, sort_order, taken_at, cull_label')
          .eq('gallery_id', galleryId)
          .order('sort_order', { ascending: true })
          .range(from, from + 999)
        const b = (data ?? []) as P[]
        all.push(...b)
        if (b.length < 1000) break
      }
      const map: Record<string, string> = {}
      const withThumb = all.filter((p) => p.thumb_path)
      for (let i = 0; i < withThumb.length; i += 200) {
        const slice = withThumb.slice(i, i + 200)
        const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(slice.map((p) => p.thumb_path as string), 3600)
        signed?.forEach((s, n) => { if (s.signedUrl) map[slice[n].id] = s.signedUrl })
      }
      if (off) return
      setType(t)
      setPhotos(all)
      setThumbs(map)
      setMoments(Array.isArray(g?.moments) ? (g?.moments as Moment[]) : [])
      setLoading(false)
    })()
    return () => { off = true }
  }, [galleryId])

  const idx = useMemo(() => {
    const m = new Map<string, number>()
    photos.forEach((p, i) => m.set(p.id, i))
    return m
  }, [photos])

  const startMap = useMemo(() => new Map(moments.map((m, n) => [m.startId, n + 1])), [moments])

  function normalize(list: Moment[]): Moment[] {
    const seen = new Set<string>()
    const out = list
      .filter((m) => idx.has(m.startId) && !seen.has(m.startId) && !!seen.add(m.startId))
      .sort((a, b) => (idx.get(a.startId) ?? 0) - (idx.get(b.startId) ?? 0))
    if (out.length > 0 && photos.length > 0 && out[0].startId !== photos[0].id) out[0] = { ...out[0], startId: photos[0].id }
    return out
  }

  async function saveNow(list: Moment[]) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('galleries').update({ moments: list.length > 0 ? list : null }).eq('id', galleryId)
    setNote(error ? 'Could not save your moments. Please try again.' : null)
  }
  function persist(list: Moment[]) {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void saveNow(list) }, 500)
  }
  function setList(next: Moment[]) {
    const n = normalize(next)
    setMoments(n)
    persist(n)
  }

  function toggleBreak(pid: string) {
    const i = idx.get(pid) ?? 0
    if (i === 0) return
    const has = moments.find((m) => m.startId === pid)
    if (has) setList(moments.filter((m) => m.id !== has.id))
    else {
      const base = moments.length === 0 ? [{ id: nid(), name: '', startId: photos[0].id }] : moments
      setList([...base, { id: nid(), name: '', startId: pid }])
    }
  }

  function rename(id: string, name: string) {
    setList(moments.map((m) => (m.id === id ? { ...m, name } : m)))
  }

  function suggest() {
    const times = photos.map((p) => (p.taken_at ? new Date(p.taken_at).getTime() : NaN))
    if (times.filter((t) => !isNaN(t)).length < photos.length * 0.8) {
      setNote('Not enough capture times on these photos to suggest moments. Tap photos to start moments yourself.')
      return
    }
    const gaps: { i: number; g: number }[] = []
    for (let i = 1; i < photos.length; i++) {
      if (!isNaN(times[i]) && !isNaN(times[i - 1])) gaps.push({ i, g: times[i] - times[i - 1] })
    }
    const sorted = gaps.map((x) => x.g).filter((g) => g >= 0).sort((a, b) => a - b)
    const medianGap = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0
    const threshold = Math.max(medianGap * 10, 120000)
    const picks = gaps.filter((x) => x.g > threshold).sort((a, b) => b.g - a.g).slice(0, 11).map((x) => x.i).sort((a, b) => a - b)
    if (picks.length === 0) {
      setNote('Cami could not find clear breaks in the timing. Tap photos to start moments yourself.')
      return
    }
    const keep = new Map(moments.map((m) => [m.startId, m.name]))
    const starts = [0, ...picks]
    setList(starts.map((i) => ({ id: nid(), name: keep.get(photos[i].id) ?? '', startId: photos[i].id })))
    setNote(null)
  }

  async function move(k: number, dir: -1 | 1) {
    const sb = supabase
    const j = k + dir
    if (!sb || busy || j < 0 || j >= moments.length) return
    setBusy(true)
    const starts = moments.map((m) => idx.get(m.startId) ?? 0)
    const blocks = moments.map((_, n) => photos.slice(starts[n], n + 1 < moments.length ? starts[n + 1] : photos.length))
    ;[blocks[k], blocks[j]] = [blocks[j], blocks[k]]
    const order = [...moments]
    ;[order[k], order[j]] = [order[j], order[k]]
    const next = blocks.flat().map((p, i) => ({ ...p, sort_order: i }))
    const before = new Map(photos.map((p) => [p.id, p.sort_order]))
    const changed = next.filter((p) => before.get(p.id) !== p.sort_order)
    let failed = false
    for (let i = 0; i < changed.length; i += 10) {
      const rs = await Promise.all(changed.slice(i, i + 10).map((p) => sb.from('gallery_photos').update({ sort_order: p.sort_order }).eq('id', p.id)))
      if (rs.some((r) => r.error)) failed = true
    }
    setPhotos(next)
    setMoments(order)
    await saveNow(order)
    if (failed) setNote('Some photos could not be reordered. Please try again.')
    setBusy(false)
  }

  const names = presetsFor(type)
  const ends = moments.map((_, n) => (n + 1 < moments.length ? idx.get(moments[n + 1].startId) ?? photos.length : photos.length))
  const inputCls = 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/30'

  if (loading) return null
  if (photos.length === 0) return null

  return (
    <div className="mt-10 rounded-2xl border border-white/10 bg-[#151518] p-5">
      <p className="text-sm text-white/80">Moments (optional)</p>
      <p className="mt-1 max-w-2xl text-sm text-white/50">
        Break the gallery into sections your client sees in order, like {names.slice(0, 3).join(', ')}. Tap a photo below to start a new moment there, or let Cami suggest breaks from when the photos were taken.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/30" onClick={suggest}>Suggest from capture times</button>
        {moments.length > 0 && (
          <button className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:border-white/30" onClick={() => setList([])}>Clear moments</button>
        )}
      </div>
      {note && <p className="mt-3 text-sm text-red-300">{note}</p>}

      <datalist id="moment-names">{names.map((n) => <option key={n} value={n} />)}</datalist>

      <div className="mt-4 grid max-h-56 grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1 overflow-y-auto">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => toggleBreak(p.id)}
            title={startMap.has(p.id) ? 'Tap to remove this break' : 'Tap to start a new moment here'}
            className={`relative aspect-square overflow-hidden rounded bg-white/5 ${startMap.has(p.id) ? 'ring-2 ring-[var(--color-twilight)]' : ''} ${p.cull_label === 'reject' ? 'opacity-40' : ''}`}
          >
            {thumbs[p.id] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbs[p.id]} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
            {startMap.has(p.id) && <span className="absolute left-0 top-0 rounded-br bg-[var(--color-twilight)] px-1 text-[10px] text-white">{startMap.get(p.id)}</span>}
          </button>
        ))}
      </div>

      {moments.length > 0 && (
        <div className="mt-5 space-y-3">
          {moments.map((m, n) => {
            const s = idx.get(m.startId) ?? 0
            const count = ends[n] - s
            return (
              <div key={m.id} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs text-white/40">{n + 1}</span>
                  <input list="moment-names" value={m.name} onChange={(e) => rename(m.id, e.target.value)} placeholder={'Name this moment, like ' + (names[n] ?? names[0])} className={inputCls} />
                  <button className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60 disabled:opacity-30" disabled={busy || n === 0} onClick={() => move(n, -1)} aria-label="Move up">↑</button>
                  <button className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/60 disabled:opacity-30" disabled={busy || n === moments.length - 1} onClick={() => move(n, 1)} aria-label="Move down">↓</button>
                </div>
                <div className="mt-2 flex items-center gap-1 pl-7">
                  {photos.slice(s, Math.min(ends[n], s + 6)).map((p) => (
                    <div key={p.id} className="h-10 w-10 overflow-hidden rounded bg-white/5">
                      {thumbs[p.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbs[p.id]} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                  <span className="ml-2 text-xs text-white/40">{count} {count === 1 ? 'photo' : 'photos'}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
