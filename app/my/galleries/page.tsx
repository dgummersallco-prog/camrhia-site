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
type Info = { cover: string | null; count: number; bytes: number; favs: number; sent: string | null }

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', engagement: 'Engagement', proposal: 'Proposal', maternity: 'Maternity', newborn: 'Newborn',
  family: 'Family', senior: 'Senior', headshots: 'Headshots', branding: 'Branding', graduation: 'Graduation',
  sports: 'Sports', team: 'Team', boudoir: 'Boudoir',
}
const label = (t: string) => TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')
const fmt = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date to be set')

const PILL = 'inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/60 px-3.5 py-1.5 text-xs font-medium tracking-wide text-ink shadow-sm backdrop-blur transition hover:bg-white/80'

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
            body: JSON.stringify({ tokens, visitorId: (() => { try { return localStorage.getItem('camrhia_visitor') ?? '' } catch { return '' } })() }),
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
  const studios = useMemo(() => Array.from(new Set(items.map((x) => x.r.studio_name || x.r.display_name || 'Your photographer'))), [items])
  const shown = items.filter((x) => filter === 'all' || x.r.session_type === filter)
  const years = useMemo(() => {
    const map = new Map<string, typeof shown>()
    const when = (x: (typeof shown)[number]) => info[x.g.token]?.sent ?? (x.r.wedding_date ? x.r.wedding_date + 'T12:00:00' : '')
    const sorted = [...shown].sort((a, b) => (when(a) < when(b) ? 1 : -1))
    sorted.forEach((x) => {
      const w = when(x)
      const y = w ? String(new Date(w).getFullYear()) : 'Undated'
      map.set(y, [...(map.get(y) ?? []), x])
    })
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [shown, info])

  return (
    <div className="min-h-screen h-[100dvh] overflow-y-auto overscroll-contain bg-paper xl:pl-60">
      <ClientHeader active="galleries" />
      <main className="mx-auto max-w-[1200px] px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Galleries</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your photos</h1>
        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">Your photos will show up here as soon as your photographer shares them.</p>
        ) : (
          <>
            {years.map(([year, list]) => (
              <section key={year} className="mt-16 first:mt-10">
                <h2 className="font-fraunces text-6xl font-light tracking-tight text-brass md:text-7xl">{year}</h2>
                <div className="mb-10 mt-3 h-[3px] w-full rounded-full bg-gradient-to-r from-brass via-brass/50 to-transparent" />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {list.map(({ g, r }) => {
                    const studio = r.studio_name || r.display_name || 'Your photographer'
                    const meta = info[g.token]
                    const pin = g.has_pin ? mine[r.wedding_id]?.gallery_password : null
                    return (
                      <div key={g.token}>
                        <p className="mb-3 font-fraunces text-2xl font-semibold leading-tight text-ink">{g.title || label(r.session_type)}</p>
                        <div className="relative aspect-[2/1] overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-twilight to-blush shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                          {meta?.cover && <img src={meta.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                          <iframe src={`/g/${g.token}?cover=1`} title="" loading="lazy" scrolling="no" tabIndex={-1} className="pointer-events-none absolute inset-0 h-full w-full border-0" />
                          <a href={`/g/${g.token}`} className="absolute inset-0 z-10" aria-label={`Open ${g.title || 'gallery'}`} />
                        </div>
                        <div className="mt-3 px-1">
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {pin && (
                              <button type="button" onClick={() => setPinFor(pinFor === g.token ? null : g.token)} className={PILL}>
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                                {pinFor === g.token ? <span className="font-mono tracking-[0.25em]">{pin}</span> : 'Show PIN'}
                              </button>
                            )}
                          </div>
                        </div>
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
