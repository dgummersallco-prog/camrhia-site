'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type SType = { key: string; label: string }
type Pkg = { id: string; name: string; price: string | null; session_type: string; delivery_days: number | null }

const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const lab = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink-soft'

function dueFrom(ds: string, n: number): string {
  const d = new Date(`${ds}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parsePrice(p: string | null): number {
  if (!p) return 0
  const n = parseFloat(p.replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export default function NewSessionPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [types, setTypes] = useState<SType[]>([])
  const [pkgs, setPkgs] = useState<Pkg[]>([])
  const [names, setNames] = useState('')
  const [type, setType] = useState('wedding')
  const [date, setDate] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [venue, setVenue] = useState('')
  const [pkgId, setPkgId] = useState('')
  const [booked, setBooked] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/sessions/new'); return }
      const me = sess.session.user.id
      setUid(me)
      const [t, p, pr] = await Promise.all([
        sb.from('session_types').select('key, label'),
        sb.from('packages').select('id, name, price, session_type, delivery_days').eq('owner_id', me).order('sort_order', { ascending: true }),
        sb.from('profiles').select('enabled_session_types').eq('id', me).maybeSingle(),
      ])
      const all = (t.data ?? []) as SType[]
      const enabled = (pr.data as { enabled_session_types?: string[] | null } | null)?.enabled_session_types
      const list = Array.isArray(enabled) ? all.filter((x) => enabled.includes(x.key)) : all
      setTypes(list.length ? list : all)
      setPkgs((p.data ?? []) as Pkg[])
      if (list.length && !list.find((x) => x.key === 'wedding')) setType(list[0].key)
    }
    load()
  }, [router])

  const typePkgs = pkgs.filter((p) => p.session_type === type)
  const pkg = pkgs.find((p) => p.id === pkgId) ?? null

  async function create() {
    const sb = supabase
    if (!sb || !uid) return
    if (!names.trim()) { setError('Add a session name to get started.'); return }
    setBusy(true)
    setError(null)
    if (date) {
      const { data: clash } = await sb.from('weddings').select('id, names').eq('owner_id', uid).eq('wedding_date', date)
      if (clash && clash.length > 0) {
        const label = clash.map((c: { names: string | null }) => c.names || 'a session').join(', ')
        if (!window.confirm(`You already have ${label} on this date. Add this session anyway?`)) { setBusy(false); return }
      }
    }
    const payload: Record<string, unknown> = {
      owner_id: uid,
      status: booked ? 'booked' : 'not_booked',
      delivered: false,
      session_type: type,
      names: names.trim(),
      wedding_date: date || null,
      city: city.trim() || null,
      state: state.trim() || null,
      venue: venue.trim() || null,
    }
    if (pkg) {
      payload.package_name = pkg.name
      payload.package_note = pkg.price ?? null
      if ((pkg.delivery_days ?? 0) > 0) {
        payload.delivery_days = pkg.delivery_days
        if (date) payload.gallery_due_date = dueFrom(date, pkg.delivery_days as number)
      }
      if (parsePrice(pkg.price) > 0) payload.total_price = parsePrice(pkg.price)
    }
    const { data, error: e } = await sb.from('weddings').insert(payload).select('id').single()
    setBusy(false)
    if (e || !data) { setError(e?.message ?? 'Something went wrong. Please try again.'); return }
    router.push(`/sessions/${(data as { id: string }).id}`)
  }

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="sessions" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/sessions" className="text-sm text-ink-soft hover:text-ink">← All sessions</Link>
        <h1 className="mb-6 mt-4 font-fraunces text-3xl font-semibold text-ink">New session</h1>
        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        <section className={`${card} space-y-4`}>
          <div>
            <label className={lab}>Session name</label>
            <input className={input} value={names} onChange={(e) => setNames(e.target.value)} placeholder="e.g. Emma & Jack, or The Miller Family" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={lab}>Session type</label>
              <select className={input} value={type} onChange={(e) => { setType(e.target.value); setPkgId('') }}>
                {types.length === 0 && <option value={type}>{type.replace(/_/g, ' ')}</option>}
                {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lab}>Date</label>
              <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={lab}>City</label><input className={input} value={city} onChange={(e) => setCity(e.target.value)} /></div>
            <div><label className={lab}>State</label><input className={input} value={state} onChange={(e) => setState(e.target.value)} /></div>
            <div><label className={lab}>Venue</label><input className={input} value={venue} onChange={(e) => setVenue(e.target.value)} /></div>
          </div>
          <div>
            <label className={lab}>Package</label>
            <select className={input} value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
              <option value="">No package</option>
              {typePkgs.map((p) => <option key={p.id} value={p.id}>{p.name}{p.price ? ` · ${p.price}` : ''}</option>)}
            </select>
            {pkg && (pkg.delivery_days ?? 0) > 0 && (
              <p className="mt-1 text-xs text-ink-soft">
                Gallery delivered {pkg.delivery_days} days after the session{date ? `, by ${new Date(`${dueFrom(date, pkg.delivery_days as number)}T00:00:00`).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={booked} onChange={(e) => setBooked(e.target.checked)} />
            This session is booked
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" disabled={busy} onClick={create} className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {busy ? 'Creating…' : 'Create session'}
            </button>
            <Link href="/sessions" className="rounded-xl border border-line px-5 py-2.5 text-sm text-ink hover:border-twilight">Cancel</Link>
          </div>
        </section>
      </main>
    </div>
  )
}
