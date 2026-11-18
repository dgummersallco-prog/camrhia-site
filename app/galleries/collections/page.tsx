'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GallerySidebar } from '@/app/components/GallerySidebar'

type Row = { id: string; title: string; status: string; collection: string | null; created_at: string; gallery_photos: { count: number }[] | null }

export default function CollectionsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [extra, setExtra] = useState<string[]>([])
  const [active, setActive] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/galleries/collections'); return }
    const { data, error: e } = await sb
      .from('galleries')
      .select('id, title, status, collection, created_at, gallery_photos(count)')
      .order('created_at', { ascending: false })
    if (e) { setError(e.message); return }
    setRows((data ?? []) as unknown as Row[])
  }, [router])
  useEffect(() => { load() }, [load])

  const names = Array.from(new Set([...(rows ?? []).map((g) => g.collection).filter((x): x is string => !!x), ...extra])).sort()
  const countOf = (c: string) => (rows ?? []).filter((g) => g.collection === c).length

  function addCollection(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    if (!names.includes(n)) setExtra((x) => [...x, n])
    setActive(n)
    setName('')
  }

  async function toggle(g: Row) {
    const sb = supabase
    if (!sb || !active) return
    const next = g.collection === active ? null : active
    setRows((list) => (list ?? []).map((x) => (x.id === g.id ? { ...x, collection: next } : x)))
    const { error: e } = await sb.from('galleries').update({ collection: next }).eq('id', g.id)
    if (e) { setError(e.message); load() }
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <GallerySidebar active="collections" />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Collections</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">Group galleries together, like Fall 2026 Seniors or Weddings. A gallery can be in one collection.</p>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div>
              <form onSubmit={addCollection} className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New collection"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-white/60 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none"
                />
                <button type="submit" disabled={!name.trim()} className="rounded-xl bg-twilight px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
              </form>
              <div className="mt-4 space-y-2">
                {names.length === 0 && <p className="text-sm text-ink-soft">No collections yet. Make one above.</p>}
                {names.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActive(c)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm transition ${active === c ? 'border-twilight bg-white text-ink' : 'border-line bg-white/60 text-ink hover:bg-white'}`}
                  >
                    <span className="truncate">{c}</span>
                    <span className="ml-2 text-xs text-ink-soft">{countOf(c)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              {!active ? (
                <p className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center text-sm text-ink-soft">Pick or make a collection, then tick the galleries that belong in it.</p>
              ) : (
                <>
                  <p className="mb-3 font-fraunces text-xl text-ink">{active}</p>
                  <div className="space-y-2">
                    {rows.map((g) => {
                      const inIt = g.collection === active
                      const n = g.gallery_photos?.[0]?.count ?? 0
                      return (
                        <button
                          key={g.id}
                          onClick={() => void toggle(g)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${inIt ? 'border-twilight bg-white' : 'border-line bg-white/60 hover:bg-white'}`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${inIt ? 'border-twilight bg-twilight text-white' : 'border-line text-transparent'}`}>✓</span>
                          <span className="min-w-0 flex-1 truncate text-ink">{g.title}</span>
                          <span className="text-xs text-ink-soft">{g.status === 'published' ? 'Published' : 'Draft'} · {n} {n === 1 ? 'photo' : 'photos'}</span>
                          {g.collection && !inIt && <span className="text-xs text-ink-soft">In {g.collection}</span>}
                        </button>
                      )
                    })}
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
