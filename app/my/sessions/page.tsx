'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Portal = {
  wedding_id: string; session_type: string; names: string | null; wedding_date: string | null
  venue: string | null; city: string | null; state: string | null
  studio_name: string | null; display_name: string | null
}

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', engagement: 'Engagement', proposal: 'Proposal', maternity: 'Maternity', newborn: 'Newborn',
  family: 'Family', senior: 'Senior', headshots: 'Headshots', branding: 'Branding', graduation: 'Graduation',
  sports: 'Sports', team: 'Team', boudoir: 'Boudoir',
}
const label = (t: string) => TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')
const when = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to be set')

export default function MySessionsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Portal[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/my/sessions'); return }
      const { data } = await sb.rpc('client_portal_sessions')
      setRows((data ?? []) as Portal[])
      setReady(true)
    }
    load()
  }, [router])

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = rows.filter((r) => r.wedding_date && r.wedding_date >= today).reverse()
  const past = rows.filter((r) => !r.wedding_date || r.wedding_date < today)

  function Item({ r }: { r: Portal }) {
    const studio = r.studio_name || r.display_name || 'Your photographer'
    const place = [r.venue, [r.city, r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
    return (
      <Link href={`/my/session/${r.wedding_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-4 transition hover:-translate-y-0.5 hover:border-twilight hover:shadow-md">
        <span className="min-w-0">
          <span className="block font-mono text-xs uppercase tracking-widest text-brass">{label(r.session_type)}</span>
          <span className="block truncate font-fraunces text-lg font-semibold text-ink">{studio}</span>
          <span className="block truncate text-sm text-ink-soft">{when(r.wedding_date)}{place ? ` · ${place}` : ''}</span>
        </span>
        <span className="shrink-0 text-sm text-twilight">Open →</span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <ClientHeader active="sessions" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">My sessions</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your sessions</h1>
        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">No sessions yet. When a photographer adds you to a session, it will show up here.</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-soft">Upcoming</h2>
                <div className="space-y-3">{upcoming.map((r) => <Item key={r.wedding_id} r={r} />)}</div>
              </section>
            )}
            {past.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-soft">Past sessions</h2>
                <div className="space-y-3">{past.map((r) => <Item key={r.wedding_id} r={r} />)}</div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
