'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Gallery = { token: string; title: string | null; has_pin: boolean; allow_downloads: boolean; expires_at: string | null }
type Portal = {
  wedding_id: string; session_type: string; names: string | null; wedding_date: string | null
  venue: string | null; city: string | null; state: string | null
  studio_name: string | null; display_name: string | null; galleries: Gallery[] | null
}
type Mine = {
  wedding_id: string; gallery_password: string | null; contract_status: string | null
  questionnaire_answered: number; questionnaire_total: number; payment_status: string | null
  has_contract: boolean; has_questionnaire: boolean
}

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', engagement: 'Engagement', proposal: 'Proposal', maternity: 'Maternity', newborn: 'Newborn',
  family: 'Family', senior: 'Senior', headshots: 'Headshots', branding: 'Branding', graduation: 'Graduation',
  sports: 'Sports', team: 'Team', boudoir: 'Boudoir',
}
const label = (t: string) => TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')
const when = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to be set')

function Chip({ children, tone = 'plain' }: { children: React.ReactNode; tone?: 'plain' | 'ok' | 'due' }) {
  const cls = tone === 'ok' ? 'bg-emerald-100 text-emerald-800' : tone === 'due' ? 'bg-brass/15 text-ink' : 'bg-line text-ink-soft'
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{children}</span>
}

export default function MyPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Portal[]>([])
  const [mine, setMine] = useState<Record<string, Mine>>({})
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/my'); return }
      const [a, b, p] = await Promise.all([
        sb.rpc('client_portal_sessions'),
        sb.rpc('get_my_wedding'),
        sb.from('profiles').select('first_name, display_name, couple_names').eq('id', sess.session.user.id).maybeSingle(),
      ])
      setRows(((a.data ?? []) as Portal[]))
      const m: Record<string, Mine> = {}
      ;((b.data ?? []) as Mine[]).forEach((r) => { m[r.wedding_id] = r })
      setMine(m)
      const pr = p.data as { first_name?: string; display_name?: string; couple_names?: string } | null
      setName(pr?.first_name || pr?.display_name || pr?.couple_names || '')
      setReady(true)
    }
    load()
  }, [router])

  async function signOut() {
    await supabase?.auth.signOut()
    router.replace('/login')
  }

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = rows.filter((r) => r.wedding_date && r.wedding_date >= today).reverse()
  const past = rows.filter((r) => !r.wedding_date || r.wedding_date < today)

  function Card({ r }: { r: Portal }) {
    const m = mine[r.wedding_id]
    const studio = r.studio_name || r.display_name || 'Your photographer'
    const place = [r.venue, [r.city, r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
    return (
      <section className="rounded-2xl border border-line bg-card p-5">
        <p className="font-mono text-xs uppercase tracking-widest text-brass">{label(r.session_type)}</p>
        <h2 className="mt-1 font-fraunces text-xl font-semibold text-ink">{studio}</h2>
        <p className="text-sm text-ink-soft">{when(r.wedding_date)}{place ? ` · ${place}` : ''}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {m?.has_contract && m.contract_status && <Chip tone={m.contract_status === 'signed' ? 'ok' : 'due'}>Contract {m.contract_status}</Chip>}
          {m?.has_questionnaire && m.questionnaire_total > 0 && (
            <Chip tone={m.questionnaire_answered >= m.questionnaire_total ? 'ok' : 'due'}>
              Questionnaire {m.questionnaire_answered}/{m.questionnaire_total}
            </Chip>
          )}
          {m?.payment_status && <Chip tone={m.payment_status === 'paid' ? 'ok' : 'due'}>{m.payment_status === 'paid' ? 'Paid in full' : 'Balance due'}</Chip>}
        </div>

        {(r.galleries ?? []).map((g) => (
          <div key={g.token} className="mt-4 rounded-xl bg-paper-deep p-4">
            <p className="text-sm font-semibold text-ink">{g.title || 'Your photos'}</p>
            {g.has_pin && m?.gallery_password && (
              <p className="mt-1 text-xs text-ink-soft">PIN: <span className="font-mono text-ink">{m.gallery_password}</span></p>
            )}
            <a href={`/g/${g.token}`} className="mt-3 inline-block rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
              View and download photos
            </a>
          </div>
        ))}

        {m?.has_contract && (m.contract_status === 'sent' || m.contract_status === 'signed') && (
          <a href={`/my/contract/${r.wedding_id}`} className="mr-2 mt-4 inline-block rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
            {m.contract_status === 'signed' ? 'View signed contract' : 'Review and sign contract'}
          </a>
        )}
        <a href={`/my/messages/${r.wedding_id}?s=${encodeURIComponent(studio)}`} className="mt-4 inline-block rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-paper-deep">
          Message {studio}
        </a>
        <p className="mt-3 text-xs text-ink-soft">Questionnaires for this session are in the Camrhia app.</p>
      </section>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <a href="/" className="font-fraunces text-xl font-semibold text-ink">Camrhia</a>
          <button onClick={signOut} className="text-sm text-ink-soft underline hover:text-ink">Sign out</button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">{name ? `Hi ${name}` : 'Your sessions'}</h1>
        <p className="mt-2 text-ink-soft">Every session you have booked through Camrhia, all in one place.</p>

        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">No sessions yet. When a photographer adds you to a session, it will show up here.</p>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mt-8 space-y-4">
                <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft">Upcoming</h2>
                {upcoming.map((r) => <Card key={r.wedding_id} r={r} />)}
              </div>
            )}
            {past.length > 0 && (
              <div className="mt-8 space-y-4">
                <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft">Past sessions</h2>
                {past.map((r) => <Card key={r.wedding_id} r={r} />)}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
