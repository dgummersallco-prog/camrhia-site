'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'
import { CLIENT_STORAGE_GB, formatBytes } from '@/lib/storageLimit'

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
  const usedBytes = Object.values(info).reduce((a, x) => a + (x.bytes || 0), 0)
  const pct = (usedBytes / (CLIENT_STORAGE_GB * 1000 * 1000 * 1000)) * 100
  const shown = items.filter((x) => filter === 'all' || x.r.session_type === filter)
  const years = useMemo(() => {
    const map = new Map<string, typeof shown>()
    shown.forEach((x) => {
      const y = 'all'
      map.set(y, [...(map.get(y) ?? []), x])
    })
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [shown])

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
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
              <section key={year} className="mt-10">
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
                          <p className="text-sm text-ink-soft">{label(r.session_type)} · by {studio}{meta ? ` · ${meta.count} photo${meta.count === 1 ? '' : 's'}` : ''}</p>
                          {meta?.sent && (
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-soft">
                              Delivered {new Date(meta.sent).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              {Date.now() - new Date(meta.sent).getTime() < 7 * 86400000 && <span className="rounded-full bg-twilight px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">New</span>}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <a href={`/g/${g.token}?download=1`} className={PILL}>Download all</a>
                            {meta && meta.favs > 0 && <a href={`/g/${g.token}?favs=1`} className={PILL}>♥ {meta.favs} favorite{meta.favs === 1 ? '' : 's'}</a>}
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
            {Object.keys(info).length > 0 && (
              <div className="mt-12 rounded-2xl border border-white/60 bg-white/50 p-5 backdrop-blur">
                <div className="flex items-baseline justify-between text-sm text-ink">
                  <span className="font-medium">Storage</span>
                  <span className="text-ink-soft">{formatBytes(usedBytes)} of {CLIENT_STORAGE_GB} GB used</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                  <div className="h-full rounded-full bg-twilight transition-all" style={{ width: Math.min(100, pct) + '%' }} />
                </div>
                {pct >= 80 && <p className="mt-3 text-sm text-ink-soft">{pct >= 100 ? 'Your storage is full.' : 'Running low on storage.'} Download your photos and clear some space.</p>}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
