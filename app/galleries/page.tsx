'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'

type Row = {
  id: string
  title: string
  token: string
  status: 'draft' | 'published'
  created_at: string
  expires_at: string | null
  pin_hash: string | null
  cover_photo_id: string | null
  gallery_photos: { count: number }[]
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

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data, error: e } = await sb
      .from('galleries')
      .select('id, title, token, status, created_at, expires_at, pin_hash, cover_photo_id, gallery_photos(count)')
      .order('created_at', { ascending: false })
    if (e) { setError(e.message); return }
    const list = (data ?? []) as unknown as Row[]
    setRows(list)

    // Find a cover thumbnail for each gallery: chosen cover, else the first photo.
    const pathFor: Record<string, string> = {}
    await Promise.all(
      list.map(async (g) => {
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
      .insert({ owner_id: userId, title: title.trim() })
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

  function copyLink(g: Row) {
    navigator.clipboard?.writeText(`${window.location.origin}/g/${g.token}`)
    setCopied(g.id)
    setTimeout(() => setCopied((c) => (c === g.id ? null : c)), 1800)
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-paper px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/"><Wordmark className="text-3xl" /></Link>
          <nav className="hidden gap-6 text-sm sm:flex">
            <Link href="/galleries" className="font-medium text-ink">Galleries</Link>
            <Link href="/billing" className="text-ink-soft hover:text-ink">Billing</Link>
          </nav>
        </div>
        <button onClick={signOut} className="text-sm text-ink-soft hover:text-ink">Sign out</button>
      </header>

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
          <form onSubmit={createGallery} className="mb-8 flex gap-3">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Gallery name, e.g. The Cooks Wedding"
              className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
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
            {rows.map((g) => {
              const count = g.gallery_photos?.[0]?.count ?? 0
              return (
                <div
                  key={g.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/galleries/${g.id}`)}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/galleries/${g.id}`) }}
                  className="group cursor-pointer overflow-hidden rounded-2xl border border-line bg-card transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-line">
                    {covers[g.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={covers[g.id]} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
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
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {count} {count === 1 ? 'photo' : 'photos'}
                        {g.pin_hash ? ' · PIN' : ''}
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
