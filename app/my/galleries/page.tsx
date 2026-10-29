'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Gallery = { token: string; title: string | null; has_pin: boolean; allow_downloads: boolean; expires_at: string | null }
type Portal = {
  wedding_id: string; session_type: string; wedding_date: string | null
  studio_name: string | null; display_name: string | null; galleries: Gallery[] | null
}
type Mine = { wedding_id: string; gallery_password: string | null }
type Info = { cover: string | null; count: number }

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', engagement: 'Engagement', proposal: 'Proposal', maternity: 'Maternity', newborn: 'Newborn',
  family: 'Family', senior: 'Senior', headshots: 'Headshots', branding: 'Branding', graduation: 'Graduation',
  sports: 'Sports', team: 'Team', boudoir: 'Boudoir',
}
const label = (t: string) => TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')
const fmt = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date to be set')

export default function MyGalleriesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Portal[]>([])
  const [mine, setMine] = useState<Record<string, Mine>>({})
  const [info, setInfo] = useState<Record<string, Info>>({})
  const [ready, setReady] = useState(false)
  const [filter, setFilter] = useState('all')
  const [pinFor, setPinFor] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/my/galleries'); return }
      const [a, b] = await Promise.all([sb.rpc('client_portal_sessions'), sb.rpc('get_my_wedding')])
      const list = (a.data ?? []) as Portal[]
      setRows(list)
      const m: Record<string, Mine> = {}
      ;((b.data ?? []) as Mine[]).forEach((r) => { m[r.wedding_id] = r })
      setMine(m)
      setReady(true)
      const tokens = list.flatMap((r) => (r.galleries ?? []).map((g) => g.token))
      if (tokens.length > 0) {
        try {
          const res = await fetch('/api/gallery/portal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session.access_token}` },
            body: JSON.stringify({ tokens }),
          })
          if (res.ok) {
            const j = (await res.json()) as { galleries?: Record<string, Info> }
            setInfo(j.galleries ?? {})
          }
        } catch { /* cards still show without covers */ }
      }
    }
    load()
  }, [router])

  const items = useMemo(
    () => rows.flatMap((r) => (r.galleries ?? []).map((g) => ({ g, r }))),
    [rows],
  )
  const types = useMemo(() => Array.from(new Set(items.map((x) => x.r.session_type))), [items])
  const shown = items.filter((x) => filter === 'all' || x.r.session_type === filter)
  const years = useMemo(() => {
    const map = new Map<string, typeof shown>()
    shown.forEach((x) => {
      const y = x.r.wedding_date ? x.r.wedding_date.slice(0, 4) : 'Undated'
      map.set(y, [...(map.get(y) ?? []), x])
    })
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [shown])

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <ClientHeader active="galleries" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Galleries</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your photos</h1>
        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">Your photos will show up here as soon as your photographer shares them.</p>
        ) : (
          <>
            {types.length > 1 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {['all', ...types].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilter(t)}
                    className={`rounded-full border px-4 py-1.5 text-sm transition ${filter === t ? 'border-twilight bg-twilight text-white' : 'border-line bg-card text-ink hover:border-twilight'}`}
                  >
                    {t === 'all' ? 'All' : label(t)}
                  </button>
                ))}
              </div>
            )}

            {years.map(([year, list]) => (
              <section key={year} className="mt-10">
                <h2 className="mb-4 font-fraunces text-2xl font-semibold text-ink">{year}</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {list.map(({ g, r }) => {
                    const studio = r.studio_name || r.display_name || 'Your photographer'
                    const meta = info[g.token]
                    const pin = g.has_pin ? mine[r.wedding_id]?.gallery_password : null
                    return (
                      <div key={g.token} className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-twilight to-blush shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                        {meta?.cover && <img src={meta.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
                        <a href={`/g/${g.token}`} className="absolute inset-0 z-10" aria-label={`Open ${g.title || 'gallery'}`} />
                        {g.expires_at && (
                          <span className="absolute right-3 top-3 z-20 rounded-full bg-black/45 px-2.5 py-1 text-[10px] text-white backdrop-blur">
                            Until {new Date(g.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 text-white">
                          {g.title && <p className="font-mono text-[10px] uppercase tracking-widest text-white/80">{g.title}</p>}
                          <p className="mt-1 font-fraunces text-lg font-semibold leading-tight">{label(r.session_type)}</p>
                          <p className="mt-1 text-xs text-white/85">{fmt(r.wedding_date)}</p>
                          <p className="text-xs text-white/85">{studio}</p>
                          {meta && <p className="mt-1 text-xs text-white/70">{meta.count} photo{meta.count === 1 ? '' : 's'}</p>}
                        </div>
                        {pin && (
                          <button
                            type="button"
                            onClick={() => setPinFor(pinFor === g.token ? null : g.token)}
                            className="absolute bottom-3 right-3 z-30 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-ink"
                          >
                            {pinFor === g.token ? `PIN ${pin}` : 'Show PIN'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
