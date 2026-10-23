'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { GalleryTabs } from '@/app/components/GalleryTabs'

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
}

export default function GalleriesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Sess[]>([])
  const [sessionPick, setSessionPick] = useState('')
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [q, setQ] = useState('')
  const [colFilter, setColFilter] = useState('')
  const [selecting, setSelecting] = useState(false)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [colName, setColName] = useState('')
  const [saving, setSaving] = useState(false)

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
    const { data: ses } = await sb
      .from('weddings')
      .select('id, names, wedding_date, gallery_url, gallery_sent_at, gallery_opened_at, gallery_downloaded_all_at')
      .order('wedding_date', { ascending: false, nullsFirst: false })
    setSessions((ses ?? []) as Sess[])

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
      if (!data.session) { router.replace('/login?next=/galleries'); return }
      setUserId(data.session.user.id)
      load()
    })
  }, [router, load])

  async function createGallery(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !userId || !title.trim()) return
    setCreating(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('galleries')
      .insert({ owner_id: userId, title: title.trim(), session_id: sessionPick || null })
      .select('id')
      .single()
    setCreating(false)
    if (err || !data) { setError(err?.message ?? 'Could not create the gallery.'); return }
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
      <DashboardHeader active="galleries" />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <GalleryTabs active="galleries" />
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
          <form onSubmit={createGallery} className="mb-8 flex flex-wrap items-center gap-3">
            <select
              value={sessionPick}
              onChange={(e) => {
                const v = e.target.value
                setSessionPick(v)
                const sel = sessions.find((x) => x.id === v)
                if (sel?.names && !title.trim()) setTitle(sel.names)
              }}
              className="w-full rounded-xl border border-line bg-card px-3 py-2.5 text-sm text-ink sm:w-64"
            >
              <option value="">Not linked to a session</option>
              {sessions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.names || 'Untitled'}{x.wedding_date ? ` · ${new Date(`${x.wedding_date}T00:00:00`).toLocaleDateString()}` : ''}
                </option>
              ))}
            </select>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Gallery name, e.g. The Cooks Wedding"
              className="min-w-[200px] flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
            />
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="whitespace-nowrap rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => { setShowNew(false); setTitle('') }} className="rounded-xl border border-line px-4 py-2.5 text-sm text-ink">
              Cancel
            </button>
          </form>
        )}

        {rows && rows.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              {(['all', 'published', 'draft'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 capitalize ${filter === f ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                >
                  {f}
                </button>
              ))}
              {collections.map((c) => (
                <button
                  key={c}
                  onClick={() => setColFilter(colFilter === c ? '' : c)}
                  className={`rounded-full px-4 py-1.5 ${colFilter === c ? 'bg-brass text-white' : 'border border-line text-ink'}`}
                >
                  {c}
                </button>
              ))}
              <button
                onClick={() => { setSelecting((v) => !v); setSel(new Set()) }}
                className={`rounded-full px-4 py-1.5 ${selecting ? 'bg-ink text-white' : 'border border-line text-ink'}`}
              >
                {selecting ? 'Done' : 'Select'}
              </button>
            </div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search galleries"
              className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none sm:w-64"
            />
          </div>
        )}

        {selecting && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card p-4 text-sm">
            <span className="text-ink">{sel.size} selected</span>
            <button onClick={() => setSel(new Set(visible.map((g) => g.id)))} className="text-xs text-twilight underline">
              Select all shown
            </button>
            <input
              list="collection-names"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              placeholder="Collection, e.g. Fall 2026 Seniors"
              className="min-w-[220px] flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none"
            />
            <datalist id="collection-names">
              {collections.map((c) => <option key={c} value={c} />)}
            </datalist>
            <button
              onClick={() => applyCollection(colName.trim())}
              disabled={saving || sel.size === 0 || !colName.trim()}
              className="rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Add to collection'}
            </button>
            <button
              onClick={() => applyCollection(null)}
              disabled={saving || sel.size === 0}
              className="rounded-xl border border-line px-4 py-2 text-sm text-ink disabled:opacity-50"
            >
              Remove from collection
            </button>
          </div>
        )}

        {error && <p className="mb-6 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <p className="font-fraunces text-xl text-ink">No galleries yet</p>
            <p className="mt-1 text-sm text-ink-soft">Create your first gallery to start delivering photos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.length === 0 && <p className="col-span-full text-sm text-ink-soft">No galleries match.</p>}
            {visible.map((g) => {
              const count = g.gallery_photos?.[0]?.count ?? 0
              return (
                <div
                  key={g.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => (selecting ? toggleSel(g.id) : router.push(`/galleries/${g.id}`))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { if (selecting) toggleSel(g.id); else router.push(`/galleries/${g.id}`) } }}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-line bg-card transition hover:-translate-y-0.5 hover:shadow-lg ${sel.has(g.id) ? 'ring-2 ring-twilight' : ''}`}
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
                      {g.session_id && sessById.get(g.session_id)?.names && (
                        <p className="truncate text-xs text-ink-soft">{sessById.get(g.session_id)?.names}</p>
                      )}
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
        )}
      </main>
    </div>
  )
}
