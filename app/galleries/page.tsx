'use client'

import { Select } from '@/app/components/Select'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { GallerySidebar } from '@/app/components/GallerySidebar'

type Row = {
  id: string
  title: string
  token: string
  status: 'draft' | 'published'
  created_at: string
  expires_at: string | null
  pin_hash: string | null
  cover_photo_id: string | null
  cover_path: string | null
  session_id: string | null
  collection: string | null
  gallery_photos: { count: number }[]
}

type Sess = {
  id: string
  names: string | null
  wedding_date: string | null
  gallery_url: string | null
  gallery_sent_at: string | null
  gallery_opened_at: string | null
  gallery_downloaded_all_at: string | null
  session_type: string | null
}

export default function GalleriesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [importFrom, setImportFrom] = useState('')
  const [photoMode, setPhotoMode] = useState<'upload' | 'import'>('upload')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Sess[]>([])
  const [typeLabels, setTypeLabels] = useState<Record<string, string>>({})
  const [sessionPick, setSessionPick] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [q, setQ] = useState('')
  const [colFilter, setColFilter] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [colName, setColName] = useState('')
  const [saving, setSaving] = useState(false)
  const prefilled = useRef(false)
  const startView = useRef(false)
  const backfilled = useRef(false)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data, error: e } = await sb
      .from('galleries')
      .select('id, title, token, status, created_at, expires_at, pin_hash, cover_photo_id, cover_path, session_id, collection, gallery_photos(count)')
      .order('created_at', { ascending: false })
    if (e) { setError(e.message); return }
    const list = (data ?? []) as unknown as Row[]
    setRows(list)
    const missing = list.filter((g) => g.status === 'published' && !g.cover_path)
    if (missing.length > 0 && !backfilled.current) {
      backfilled.current = true
      void (async () => {
        const { data: ss } = await sb.auth.getSession()
        const uid = ss.session?.user.id
        if (!uid) return
        let n = 0
        for (const g of missing) {
          const q = sb.from('gallery_photos').select('web_path, thumb_path').eq('gallery_id', g.id)
          const { data: ph } = g.cover_photo_id ? await q.eq('id', g.cover_photo_id).limit(1) : await q.order('sort_order', { ascending: true }).limit(1)
          const src = ph?.[0]?.web_path ?? ph?.[0]?.thumb_path
          if (!src) continue
          const dl = await sb.storage.from('galleries').download(src)
          if (dl.error || !dl.data) { setError('Cover download: ' + (dl.error?.message ?? 'no data')); continue }
          const path = `${uid}/${g.id}-${Date.now()}.jpg`
          const up = await sb.storage.from('gallery-covers').upload(path, dl.data, { contentType: 'image/jpeg', upsert: true })
          if (up.error) { setError('Cover upload: ' + up.error.message); continue }
          const { error: ue } = await sb.from('galleries').update({ cover_path: path }).eq('id', g.id)
          if (ue) setError('Cover save: ' + ue.message); else n++
        }
        if (n > 0) void load()
      })()
    }
    if (!startView.current) {
      startView.current = true
      if (list.some((g) => g.status !== 'published')) setFilter('draft')
      else if (list.length > 0) setShowNew(true)
    }
    const { data: ses } = await sb
      .from('weddings')
      .select('id, names, wedding_date, gallery_url, gallery_sent_at, gallery_opened_at, gallery_downloaded_all_at, session_type')
      .order('wedding_date', { ascending: false, nullsFirst: false })
    setSessions((ses ?? []) as Sess[])
    const { data: st } = await sb.from('session_types').select('key, label')
    setTypeLabels(Object.fromEntries(((st ?? []) as { key: string; label: string }[]).map((t) => [t.key, t.label])))

    // Find a cover thumbnail for each gallery: chosen cover, else the first photo.
    const pathFor: Record<string, string> = {}
    await Promise.all(
      list.filter((g) => !g.cover_path).map(async (g) => {
        const q = sb.from('gallery_photos').select('thumb_path').eq('gallery_id', g.id)
        const { data: ph } = g.cover_photo_id
          ? await q.eq('id', g.cover_photo_id).limit(1)
          : await q.order('sort_order', { ascending: true }).limit(1)
        const path = ph?.[0]?.thumb_path
        if (path) pathFor[g.id] = path
      }),
    )
    const paths = Object.values(pathFor)
    if (paths.length === 0) return
    const { data: signed } = await sb.storage.from('galleries').createSignedUrls(paths, 3600)
    const urlByPath: Record<string, string> = {}
    signed?.forEach((s) => { if (s.path && s.signedUrl) urlByPath[s.path] = s.signedUrl })
    const out: Record<string, string> = {}
    for (const [gid, path] of Object.entries(pathFor)) if (urlByPath[path]) out[gid] = urlByPath[path]
    setCovers(out)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login?next=' + encodeURIComponent('/galleries' + window.location.search)); return }
      setUserId(data.session.user.id)
      load()
    })
  }, [router, load])

  // Opened from the app's "Create gallery" on a session: open the new-gallery form with that session filled in.
  useEffect(() => {
    if (prefilled.current || sessions.length === 0) return
    prefilled.current = true
    const sid = new URLSearchParams(window.location.search).get('session')
    if (!sid) return
    const x = sessions.find((v) => v.id === sid)
    if (!x) return
    setShowNew(true)
    setSessionPick(sid)
    if (x.names) setTitle(x.names)
  }, [sessions])

  async function importFromShoot(sb: NonNullable<typeof supabase>, srcId: string, newId: string) {
    const uid = userId
    if (!uid) throw new Error('Not signed in.')
    const BUCKET = 'galleries'
    const all: Record<string, unknown>[] = []
    for (let from = 0; ; from += 1000) {
      const { data: ph, error: pe } = await sb.from('gallery_photos').select('*').eq('gallery_id', srcId).order('sort_order', { ascending: true }).range(from, from + 999)
      if (pe) throw pe
      all.push(...((ph ?? []) as Record<string, unknown>[]))
      if (!ph || ph.length < 1000) break
    }
    const keep = all.filter((p) => p.cull_label !== 'reject')
    if (keep.length === 0) throw new Error('That shoot has no photos to import.')
    const bucket = sb.storage.from(BUCKET)
    const idMap = new Map<string, string>()
    const out: Record<string, unknown>[] = []
    const queue = keep.map((p, i) => ({ p, i }))
    let done = 0
    async function worker() {
      for (;;) {
        const job = queue.shift()
        if (!job) return
        const { p, i } = job
        const nid = crypto.randomUUID()
        const dir = `${uid}/${newId}/${nid}`
        const cp = async (src: unknown, name: string): Promise<string | null> => {
          if (typeof src !== 'string' || !src) return null
          const dest = `${dir}/${name}`
          const { error: ce } = await bucket.copy(src, dest)
          if (ce) throw ce
          return dest
        }
        const ext = typeof p.orig_path === 'string' ? (p.orig_path.split('.').pop() ?? 'jpg') : 'jpg'
        const orig = await cp(p.orig_path, `orig.${ext}`)
        const web = await cp(p.web_path, 'web.jpg')
        const thumb = await cp(p.thumb_path, 'thumb.jpg')
        const full = await cp(p.full_path, 'full.jpg')
        out.push({
          id: nid, gallery_id: newId, owner_id: uid, filename: p.filename,
          orig_path: orig, web_path: web, thumb_path: thumb, full_path: full,
          width: p.width, height: p.height, size_bytes: p.size_bytes, extra_bytes: p.extra_bytes, sort_order: i,
          ...(p.taken_at ? { taken_at: p.taken_at } : {}),
          ...(p.enhanced != null ? { enhanced: p.enhanced } : {}),
        })
        idMap.set(String(p.id), nid)
        done++
        setImportMsg(`Importing photos… ${done} of ${keep.length}`)
      }
    }
    await Promise.all(Array.from({ length: 6 }, () => worker()))
    out.sort((x, y) => Number(x.sort_order) - Number(y.sort_order))
    for (let i = 0; i < out.length; i += 100) {
      const { error: ie } = await sb.from('gallery_photos').insert(out.slice(i, i + 100))
      if (ie) throw ie
    }
    const src = (rows ?? []).find((g) => g.id === srcId)
    const newCover = src?.cover_photo_id ? idMap.get(src.cover_photo_id) : undefined
    if (newCover) await sb.from('galleries').update({ cover_photo_id: newCover }).eq('id', newId)
    setImportMsg(null)
  }

  async function createGallery(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !userId || !title.trim()) return
    const sb = supabase
    setCreating(true)
    setError(null)
    const { data, error: err } = await sb
      .from('galleries')
      .insert({ owner_id: userId, title: title.trim(), session_id: sessionPick || null })
      .select('id')
      .single()
    if (err || !data) { setCreating(false); setError(err?.message ?? 'Could not create the gallery.'); return }
    if (importFrom) {
      try {
        await importFromShoot(sb, importFrom, data.id)
      } catch (ex) {
        setCreating(false)
        setImportMsg(null)
        setError((ex as { message?: string })?.message ?? 'The import stopped part-way. Open the new gallery to see what came across.')
        return
      }
    }
    setCreating(false)
    router.push(`/galleries/${data.id}`)
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    router.push('/login')
  }

  const sessById = new Map(sessions.map((x) => [x.id, x]))
  const needle = q.trim().toLowerCase()
  const visible = (rows ?? []).filter((g) => {
    if (filter !== 'all' && g.status !== filter) return false
    if (colFilter && g.collection !== colFilter) return false
    if (needle) {
      const hay = `${g.title} ${sessById.get(g.session_id ?? '')?.names ?? ''}`.toLowerCase()
      if (!hay.includes(needle)) return false
    }
    return true
  })
  const dateOf = (g: Row) => {
    const w = g.session_id ? sessById.get(g.session_id)?.wedding_date : null
    return w ? new Date(`${w}T00:00:00`) : new Date(g.created_at)
  }
  const groups: [string, Row[]][] = []
  ;[...visible].sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime()).forEach((g) => {
    const k = dateOf(g).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    const last = groups[groups.length - 1]
    if (last && last[0] === k) last[1].push(g)
    else groups.push([k, [g]])
  })
  const COVER_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/gallery-covers/`
  function sentState(g: Row): string | null {
    const x = g.session_id ? sessById.get(g.session_id) : undefined
    if (!x || !x.gallery_sent_at || !x.gallery_url || !x.gallery_url.includes(g.token)) return null
    return x.gallery_downloaded_all_at ? 'Downloaded · safe to free space' : x.gallery_opened_at ? 'Client opened' : 'Sent to client'
  }

  const collections = Array.from(new Set((rows ?? []).map((g) => g.collection).filter((x): x is string => !!x))).sort()

  function toggleSel(id: string) {
    setSel((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function applyCollection(name: string | null) {
    const sb = supabase
    if (!sb || sel.size === 0) return
    setSaving(true)
    setError(null)
    const { error: e } = await sb.from('galleries').update({ collection: name }).in('id', Array.from(sel))
    setSaving(false)
    if (e) { setError(e.message); return }
    setSel(new Set())
    setSelecting(false)
    setColName('')
    setColFilter('')
    load()
  }

  function copyLink(g: Row) {
    navigator.clipboard?.writeText(`${window.location.origin}/g/${g.token}`)
    setCopied(g.id)
    setTimeout(() => setCopied((c) => (c === g.id ? null : c)), 1800)
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <GallerySidebar active="galleries" />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Photographer</p>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">Your galleries</h1>
          </div>
          {!showNew && (
            <button
              onClick={() => setShowNew(true)}
              className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              + New gallery
            </button>
          )}
        </div>

        {showNew && (
          <form onSubmit={createGallery} className="mb-8 rounded-2xl border border-line bg-white/60 p-5">
            <p className="mb-4 font-fraunces text-lg font-semibold text-ink">New gallery</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Gallery name</label>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Cooks Wedding"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Session <span className="font-normal text-ink-soft">(optional)</span></label>
                <Select
                  value={sessionPick}
                  onChange={(e) => {
                    const v = e.target.value
                    setSessionPick(v)
                    const picked = sessions.find((x) => x.id === v)
                    if (picked?.names && !title.trim()) setTitle(picked.names)
                  }}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                >
                  <option value="">No session yet</option>
                  {sessions.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.names || 'Untitled'}{x.wedding_date ? ` · ${new Date(`${x.wedding_date}T00:00:00`).toLocaleDateString()}` : ''}
                    </option>
                  ))}
                </Select>
                <p className="mt-1.5 text-xs text-ink-soft">Link this gallery to one of your sessions.</p>
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-ink">Photos</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => { setPhotoMode('upload'); setImportFrom('') }}
                  className={'rounded-xl border p-4 text-left transition ' + (photoMode === 'upload' ? 'border-twilight bg-twilight/5' : 'border-line bg-paper hover:bg-white')}
                >
                  <p className="text-sm font-medium text-ink">Upload from my computer</p>
                  <p className="mt-1 text-xs text-ink-soft">Edited in Lightroom or any editor. You will pick your files on the next screen.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoMode('import')}
                  className={'rounded-xl border p-4 text-left transition ' + (photoMode === 'import' ? 'border-twilight bg-twilight/5' : 'border-line bg-paper hover:bg-white')}
                >
                  <p className="text-sm font-medium text-ink">Use edits from the Editing Room</p>
                  <p className="mt-1 text-xs text-ink-soft">Copies the photos you kept. The original shoot stays in the Editing Room.</p>
                </button>
              </div>
              {photoMode === 'import' && (
                <Select
                  value={importFrom}
                  onChange={(e) => setImportFrom(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                >
                  <option value="">Choose a shoot…</option>
                  {(rows ?? [])
                    .filter((g) => ((g as unknown as { gallery_photos?: { count: number }[] }).gallery_photos?.[0]?.count ?? 0) > 0)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({(g as unknown as { gallery_photos?: { count: number }[] }).gallery_photos?.[0]?.count ?? 0} photos)
                      </option>
                    ))}
                </Select>
              )}
              {importMsg && <p className="mt-2 text-sm text-twilight">{importMsg}</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={creating || !title.trim() || (photoMode === 'import' && !importFrom)}
                className="whitespace-nowrap rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create gallery'}
              </button>
              <button type="button" onClick={() => { setShowNew(false); setTitle(''); setSessionPick('') }} className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink">
                Cancel
              </button>
            </div>
          </form>
        )}

        {rows && rows.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              {(['draft', 'published', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 capitalize ${filter === f ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search galleries"
              className="w-full rounded-xl border border-line bg-white/60 px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none sm:w-64"
            />
          </div>
        )}

        {error && <p className="mb-6 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-16 text-center">
            <p className="font-fraunces text-xl text-ink">No galleries yet</p>
            <p className="mt-1 text-sm text-ink-soft">Create your first gallery to start delivering photos.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {visible.length === 0 && <p className="text-sm text-ink-soft">No galleries match.</p>}
            {groups.map(([label, list]) => (
            <section key={label}>
            <h2 className="mb-4 font-fraunces text-xl text-ink">{label}</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((g) => {
              const count = g.gallery_photos?.[0]?.count ?? 0
              return (
                <div
                  key={g.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => (selecting ? toggleSel(g.id) : router.push(`/galleries/${g.id}`))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { if (selecting) toggleSel(g.id); else router.push(`/galleries/${g.id}`) } }}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-line bg-white/60 transition hover:-translate-y-0.5 hover:shadow-lg ${sel.has(g.id) ? 'ring-2 ring-twilight' : ''}`}
                >
                  {selecting && (
                    <span
                      className={`absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-xs ${sel.has(g.id) ? 'border-twilight bg-twilight text-white' : 'border-white bg-black/30 text-transparent'}`}
                    >
                      ✓
                    </span>
                  )}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-line">
                    {g.cover_path || covers[g.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.cover_path ? `${COVER_BASE}${g.cover_path}` : covers[g.id]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-ink-soft">No photos yet</div>
                    )}
                    <span
                      className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium ${g.status === 'published' ? 'bg-twilight text-white' : 'bg-white/90 text-ink'}`}
                    >
                      {g.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-fraunces text-lg font-semibold text-ink">{g.title}</p>
                      {(() => {
                        const x = g.session_id ? sessById.get(g.session_id) : undefined
                        if (!x) return null
                        const bits = [
                          x.session_type ? (typeLabels[x.session_type] ?? x.session_type) : null,
                          x.wedding_date ? new Date(`${x.wedding_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null,
                          x.names && x.names.trim().toLowerCase() !== g.title.trim().toLowerCase() ? x.names : null,
                        ].filter(Boolean)
                        return bits.length ? <p className="truncate text-xs text-ink-soft">{bits.join(' · ')}</p> : null
                      })()}
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {count} {count === 1 ? 'photo' : 'photos'}
                        {g.collection ? ` · ${g.collection}` : ''}
                        {g.pin_hash ? ' · PIN' : ''}
                        {sentState(g) ? ` · ${sentState(g)}` : ''}
                        {g.expires_at ? ` · expires ${new Date(g.expires_at).toLocaleDateString()}` : ''}
                      </p>
                    </div>
                    {g.status === 'published' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); copyLink(g) }}
                        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs text-ink transition hover:border-twilight"
                      >
                        {copied === g.id ? 'Copied' : 'Copy link'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            </div>
            </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
