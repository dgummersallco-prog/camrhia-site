'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Wordmark from '@/app/components/Wordmark'

type Row = {
  id: string
  title: string
  status: 'draft' | 'published'
  created_at: string
  expires_at: string | null
  pin_hash: string | null
  gallery_photos: { count: number }[]
}

export default function GalleriesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error: e } = await supabase
      .from('galleries')
      .select('id, title, status, created_at, expires_at, pin_hash, gallery_photos(count)')
      .order('created_at', { ascending: false })
    if (e) { setError(e.message); return }
    setRows((data ?? []) as unknown as Row[])
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

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-paper px-6 py-4">
        <Link href="/"><Wordmark className="text-3xl" /></Link>
        <button onClick={signOut} className="text-sm text-ink-soft hover:text-ink">Sign out</button>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-brass">Photographer</p>
        <h1 className="mb-8 font-fraunces text-3xl font-semibold text-ink">Galleries</h1>

        <form onSubmit={createGallery} className="mb-10 flex gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New gallery name, e.g. Smith Wedding"
            className="w-full rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
          />
          <button
            type="submit"
            disabled={creating || !title.trim()}
            className="whitespace-nowrap rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create gallery'}
          </button>
        </form>

        {error && <p className="mb-6 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-soft">No galleries yet. Create your first one above.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/galleries/${g.id}`}
                  className="flex items-center justify-between rounded-2xl border border-line bg-card px-5 py-4 transition hover:border-twilight"
                >
                  <div>
                    <p className="font-medium text-ink">{g.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">
                      {(g.gallery_photos?.[0]?.count ?? 0)} photos
                      {g.pin_hash ? ' · PIN' : ''}
                      {g.expires_at ? ` · expires ${new Date(g.expires_at).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs ${g.status === 'published' ? 'bg-twilight/10 text-twilight' : 'bg-line text-ink-soft'}`}>
                    {g.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
