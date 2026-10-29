'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Gallery = { token: string; title: string | null; has_pin: boolean; allow_downloads: boolean; expires_at: string | null }
type Portal = {
  wedding_id: string; session_type: string; names: string | null; wedding_date: string | null
  venue: string | null; city: string | null; state: string | null
  studio_name: string | null; display_name: string | null; galleries: Gallery[] | null
}
type Mine = {
  wedding_id: string; gallery_password: string | null; contract_status: string | null
  questionnaire_answered: number; questionnaire_total: number; payment_status: string | null
  has_contract: boolean; has_questionnaire: boolean; has_timeline: boolean
  timeline_approved: boolean | null; timeline_shared_at: string | null
}
type Convo = { id: string; photographer_id: string; status: string; session_type: string | null; created_at: string; studio: string }

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', engagement: 'Engagement', proposal: 'Proposal', maternity: 'Maternity', newborn: 'Newborn',
  family: 'Family', senior: 'Senior', headshots: 'Headshots', branding: 'Branding', graduation: 'Graduation',
  sports: 'Sports', team: 'Team', boudoir: 'Boudoir',
}
const label = (t: string) => TYPE_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ')
const when = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date to be set')
const card = 'rounded-2xl border border-line bg-card p-5'

export default function MyPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Portal[]>([])
  const [mine, setMine] = useState<Record<string, Mine>>({})
  const [ready, setReady] = useState(false)
  const [convos, setConvos] = useState<Convo[]>([])
  const [name, setName] = useState('')
  const [signedAt, setSignedAt] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/my'); return }
      const [a, b, p] = await Promise.all([
        sb.rpc('client_portal_sessions'),
        sb.rpc('get_my_wedding'),
        sb.from('profiles').select('first_name, display_name, couple_names, account_type').eq('id', sess.session.user.id).maybeSingle(),
      ])
      const myType = (p.data as { account_type?: string } | null)?.account_type
      if (myType === 'photographer' && ((a.data ?? []) as Portal[]).length === 0) { router.replace('/dashboard'); return }
      setRows(((a.data ?? []) as Portal[]))
      const m: Record<string, Mine> = {}
      ;((b.data ?? []) as Mine[]).forEach((r) => { m[r.wedding_id] = r })
      setMine(m)
      const { data: cs } = await sb.from('contracts').select('wedding_id, signed_at').eq('status', 'signed')
      const sm: Record<string, string> = {}
      ;((cs ?? []) as { wedding_id: string; signed_at: string | null }[]).forEach((c) => { if (c.signed_at) sm[c.wedding_id] = c.signed_at })
      setSignedAt(sm)
      const pr = p.data as { first_name?: string; display_name?: string; couple_names?: string } | null
      setName(pr?.first_name || pr?.display_name || pr?.couple_names || '')
      const { data: inq } = await sb
        .from('inquiries')
        .select('id, photographer_id, status, session_type, created_at')
        .eq('couple_id', sess.session.user.id)
        .neq('status', 'booked')
        .order('created_at', { ascending: false })
      const list = (inq ?? []) as Omit<Convo, 'studio'>[]
      const studios: Record<string, string> = {}
      await Promise.all(
        Array.from(new Set(list.map((i) => i.photographer_id))).map(async (pid) => {
          const { data } = await sb.rpc('get_photographer_public_info', { p_id: pid })
          const d = (Array.isArray(data) ? data[0] : data) as { studio_name?: string; display_name?: string } | null
          studios[pid] = d?.studio_name || d?.display_name || 'Photographer'
        }),
      )
      setConvos(list.map((i) => ({ ...i, studio: studios[i.photographer_id] })))
      setReady(true)
    }
    load()
  }, [router])

  const today = new Date().toISOString().slice(0, 10)
  const dated = rows.filter((r) => r.wedding_date && r.wedding_date >= today).reverse()
  const undated = rows.filter((r) => !r.wedding_date)
  const upcoming = [...dated, ...undated]
  const past = rows.filter((r) => r.wedding_date && r.wedding_date < today)
  const spot = dated[0] ?? undated[0]
  const placeOf = (r: Portal) => [r.venue, [r.city, r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
  const studioOf = (r: Portal) => r.studio_name || r.display_name || 'Your photographer'

  const attention: { key: string; text: string; href: string; cta: string }[] = []
  rows.forEach((r) => {
    const m = mine[r.wedding_id]
    if (!m) return
    const s = studioOf(r)
    if (m.has_contract && m.contract_status === 'sent') attention.push({ key: `c${r.wedding_id}`, text: `${s}: your contract is ready to sign`, href: `/my/contract/${r.wedding_id}`, cta: 'Review and sign' })
    if (m.contract_status === 'signed' && signedAt[r.wedding_id] && Date.now() - new Date(signedAt[r.wedding_id]).getTime() < 14 * 86400000)
      attention.push({ key: `cs${r.wedding_id}`, text: `${s}: your contract is signed and saved`, href: `/my/contract/${r.wedding_id}`, cta: 'View your copy' })
    if (m.has_questionnaire && m.questionnaire_total > 0 && m.questionnaire_answered < m.questionnaire_total)
      attention.push({ key: `q${r.wedding_id}`, text: `${s}: questionnaire ${m.questionnaire_answered} of ${m.questionnaire_total} answered`, href: `/my/questionnaire/${r.wedding_id}`, cta: 'Continue' })
    if (m.payment_status === 'due') attention.push({ key: `p${r.wedding_id}`, text: `${s}: you have a balance due`, href: `/my/session/${r.wedding_id}`, cta: 'See payments' })
    if (m.has_timeline && m.timeline_shared_at && !m.timeline_approved)
      attention.push({ key: `t${r.wedding_id}`, text: `${s}: your timeline is ready to review`, href: `/my/session/${r.wedding_id}`, cta: 'Review timeline' })
  })

  const signedRows = rows.filter((r) => mine[r.wedding_id]?.contract_status === 'signed')

  const photos = rows
    .flatMap((r) => (r.galleries ?? []).map((g) => ({ g, r })))
    .sort((a, b) => (b.r.wedding_date ?? '').localeCompare(a.r.wedding_date ?? ''))

  function SessionRow({ r }: { r: Portal }) {
    const place = [r.venue, [r.city, r.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
    return (
      <Link href={`/my/session/${r.wedding_id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-4 transition hover:-translate-y-0.5 hover:border-twilight hover:shadow-md">
        <span className="min-w-0">
          <span className="block font-mono text-xs uppercase tracking-widest text-brass">{label(r.session_type)}</span>
          <span className="block truncate font-fraunces text-lg font-semibold text-ink">{studioOf(r)}</span>
          <span className="block truncate text-sm text-ink-soft">{when(r.wedding_date)}{place ? ` · ${place}` : ''}</span>
        </span>
        <span className="shrink-0 text-sm text-twilight">Open →</span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <ClientHeader active="home" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        {!ready ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Home</p>
            <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">{name ? `Hi ${name}.` : 'Welcome.'}</h1>
            <p className="mt-2 text-ink-soft">Everything for your sessions, in one place.</p>

            {attention.length > 0 && (
              <section className={`${card} mt-8`}>
                <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Needs your attention</p>
                <ul className="divide-y divide-line">
                  {attention.map((a) => (
                    <li key={a.key} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brass" />
                      <p className="min-w-0 flex-1 text-sm text-ink">{a.text}</p>
                      <Link href={a.href} className="shrink-0 text-sm font-medium text-twilight hover:underline">{a.cta} →</Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {spot && (
              <section className={`${card} mt-6`}>
                <p className="font-mono text-xs uppercase tracking-widest text-brass">{spot.wedding_date ? 'Next session' : 'Coming up'}</p>
                <p className="mt-2 font-fraunces text-2xl font-semibold text-ink">{label(spot.session_type)} with {studioOf(spot)}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {spot.wedding_date ? when(spot.wedding_date) : 'Your photographer will confirm a date.'}
                  {placeOf(spot) ? ` · ${placeOf(spot)}` : ''}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href={`/my/session/${spot.wedding_id}`} className="rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white hover:opacity-90">Open session</Link>
                  <Link href="/my/messages" className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:border-twilight">Message</Link>
                </div>
              </section>
            )}

            {signedRows.length > 0 && (
              <section className={`${card} mt-6`}>
                <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Your signed contracts</p>
                <ul className="divide-y divide-line">
                  {signedRows.map((r) => (
                    <li key={r.wedding_id} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{studioOf(r)} · {label(r.session_type)}</p>
                        <p className="text-xs text-ink-soft">{signedAt[r.wedding_id] ? 'Signed ' + new Date(signedAt[r.wedding_id]).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Signed'}</p>
                      </div>
                      <Link href={`/my/contract/${r.wedding_id}`} className="shrink-0 text-sm font-medium text-twilight hover:underline">View or print →</Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {photos.length > 0 && (
              <section className={`${card} mt-6`}>
                <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Your photos</p>
                <div className="space-y-3">
                  {photos.map(({ g, r }) => (
                    <div key={g.token} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper-deep p-4">
                      <div>
                        <p className="text-sm font-semibold text-ink">{label(r.session_type)}{r.wedding_date ? ` · ${when(r.wedding_date)}` : ''}</p>
                        <p className="text-xs text-ink-soft">{studioOf(r)}{g.has_pin && mine[r.wedding_id]?.gallery_password ? ` · PIN ${mine[r.wedding_id].gallery_password}` : ''}</p>
                      </div>
                      <a href={`/g/${g.token}`} className="rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white hover:opacity-90">View and download</a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {convos.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-soft">Conversations</h2>
                <div className="space-y-3">
                  {convos.map((c) => (
                    <Link key={c.id} href={`/my/inquiry/${c.id}?s=${encodeURIComponent(c.studio)}`} className="flex items-center justify-between rounded-2xl border border-line bg-card px-5 py-4 transition hover:border-twilight">
                      <span>
                        <span className="block font-fraunces text-lg font-semibold text-ink">{c.studio}</span>
                        <span className="text-xs text-ink-soft">{label(c.session_type ?? 'other')} inquiry · {new Date(c.created_at).toLocaleDateString()}</span>
                      </span>
                      <span className="text-sm text-twilight">Open</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {rows.length === 0 ? (
              <p className={`${card} mt-8 text-ink-soft`}>Your photographer will add your session here. Once they do, your contract, questionnaire, payments and photos will all be in one place.</p>
            ) : (
              <>
                {upcoming.length > 0 && (
                  <section className="mt-8">
                    <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-soft">Upcoming</h2>
                    <div className="space-y-3">{upcoming.map((r) => <SessionRow key={r.wedding_id} r={r} />)}</div>
                  </section>
                )}
                {past.length > 0 && (
                  <section className="mt-8">
                    <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-soft">Past sessions</h2>
                    <div className="space-y-3">{past.map((r) => <SessionRow key={r.wedding_id} r={r} />)}</div>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
