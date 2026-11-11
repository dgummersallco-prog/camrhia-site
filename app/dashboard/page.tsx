'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { storageLimitBytes, formatBytes } from '@/lib/storageLimit'
import { fetchUnreadCount } from '@/lib/unreadMessages'

type Gal = { id: string; title: string; status: 'draft' | 'published'; gallery_photos: { count: number }[] }
type Sess = { id: string; names: string | null; wedding_date: string | null; session_type: string | null; gallery_due_date: string | null; gallery_url: string | null; balance: string | null; paid_in_full: boolean | null }
type Notif = { id: string; title: string | null; body: string | null; wedding_id: string | null; type: string | null }
type Unsigned = { wedding_id: string; sent_at: string | null }
type Activity = { id: string; title: string; when: string; thumb: string | null }
type PayRow = { amount: number | string | null; wedding_id: string | null; status: string | null; due_date: string | null; paid_at: string | null }

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function ago(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

const card = 'rounded-3xl border border-[#EBD9D1] bg-[linear-gradient(160deg,#FFFCF9_0%,#F8EAE4_100%)] p-6 shadow-[0_1px_2px_rgba(60,30,30,0.04),0_14px_34px_-18px_rgba(120,60,60,0.22)]'
const btn = 'rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90'
const btnGhost = 'rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-deep'
const tile = 'flex flex-col gap-1 rounded-3xl border border-[#EBD9D1] bg-[linear-gradient(160deg,#FFFCF9_0%,#F8EAE4_100%)] p-6 text-left shadow-[0_1px_2px_rgba(60,30,30,0.04),0_14px_34px_-18px_rgba(120,60,60,0.22)] transition hover:-translate-y-0.5 hover:border-twilight hover:shadow-lg'

import InfoTip from '@/app/components/InfoTip'

export default function DashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [galleries, setGalleries] = useState<Gal[]>([])
  const [favTotal, setFavTotal] = useState(0)
  const [activity, setActivity] = useState<Activity[]>([])
  const [error, setError] = useState<string | null>(null)
  const [studioName, setStudioName] = useState('')
  const [portCount, setPortCount] = useState(0)
  const [siteShared, setSiteShared] = useState(false)
  const [hideSetup, setHideSetup] = useState(false)
  const [recentFavs, setRecentFavs] = useState(0)
  const [sessions, setSessions] = useState<Sess[]>([])
  const [usedBytes, setUsedBytes] = useState(0)
  const [limitBytes, setLimitBytes] = useState(0)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [unreadMsgs, setUnreadMsgs] = useState(0)
  const [unsigned, setUnsigned] = useState<Unsigned[]>([])
  const [payRows, setPayRows] = useState<PayRow[]>([])
  const [inq, setInq] = useState({ waiting: 0, total: 0, booked: 0 })
  const [bellOpen, setBellOpen] = useState(false)
  const [todoAll, setTodoAll] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!bellOpen) return
    const down = (e: MouseEvent) => { if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false) }
    document.addEventListener('mousedown', down)
    return () => document.removeEventListener('mousedown', down)
  }, [bellOpen])

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/dashboard'); return }
      const { data: me } = await sb.from('profiles').select('account_type').eq('id', sess.session.user.id).maybeSingle()
      if ((me as { account_type?: string } | null)?.account_type === 'couple') { router.replace('/my'); return }
      const uid = sess.session.user.id

      const [prof, gal, favCount, favRecent, portRes, weekFavs, wed, su] = await Promise.all([
        sb.from('profiles').select('first_name, studio_name, public_token, plan_tier, storage_addon_packs').eq('id', uid).single(),
        sb.from('galleries').select('id, title, status, gallery_photos(count)').order('created_at', { ascending: false }),
        sb.from('gallery_favorites').select('id', { count: 'exact', head: true }),
        sb.from('gallery_favorites').select('id, gallery_id, photo_id, created_at').order('created_at', { ascending: false }).limit(8),
        sb.from('portfolio_photos').select('id', { count: 'exact', head: true }),
        sb.from('gallery_favorites').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        sb.from('weddings').select('id, names, wedding_date, session_type, gallery_due_date, gallery_url, balance, paid_in_full').eq('owner_id', uid),
        sb.rpc('storage_usage'),
      ])

      if (prof.data) {
        setName((prof.data.first_name as string | null) || (prof.data.studio_name as string | null) || '')
        setStudioName((prof.data.studio_name as string | null) ?? '')
      }
      const gals = (gal.data ?? []) as unknown as Gal[]
      setGalleries(gals)
      setFavTotal(favCount.count ?? 0)
      if (gal.error) setError(gal.error.message)

      const favs = (favRecent.data ?? []) as { id: string; gallery_id: string; photo_id: string; created_at: string }[]
      if (favs.length > 0) {
        const photoIds = [...new Set(favs.map((f) => f.photo_id))]
        const { data: photos } = await sb.from('gallery_photos').select('id, thumb_path').in('id', photoIds)
        const pathById: Record<string, string> = {}
        ;(photos ?? []).forEach((p: { id: string; thumb_path: string | null }) => { if (p.thumb_path) pathById[p.id] = p.thumb_path })
        const paths = Object.values(pathById)
        const urlByPath: Record<string, string> = {}
        if (paths.length > 0) {
          const { data: signed } = await sb.storage.from('galleries').createSignedUrls(paths, 3600)
          signed?.forEach((s) => { if (s.path && s.signedUrl) urlByPath[s.path] = s.signedUrl })
        }
        const titleById: Record<string, string> = {}
        gals.forEach((g) => { titleById[g.id] = g.title })
        setActivity(
          favs.map((f) => ({
            id: f.id,
            title: titleById[f.gallery_id] ?? 'a gallery',
            when: ago(f.created_at),
            thumb: pathById[f.photo_id] ? urlByPath[pathById[f.photo_id]] ?? null : null,
          })),
        )
      }
      setPortCount(portRes.count ?? 0)
      setRecentFavs(weekFavs.count ?? 0)
      setSessions((wed.data ?? []) as unknown as Sess[])
      setUsedBytes(((su.data ?? []) as { bytes: number | string }[]).reduce((n, r) => n + Number(r.bytes), 0))
      setLimitBytes(storageLimitBytes((prof.data?.plan_tier as string | null) ?? null, (prof.data?.storage_addon_packs as number | null) ?? 0))
      setUnreadMsgs(await fetchUnreadCount(sb, uid))
      const { data: nrows } = await sb
        .from('notifications')
        .select('id, title, body, wedding_id, type')
        .eq('user_id', uid)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(10)
      setNotifs((nrows ?? []) as Notif[])
      const { data: crows } = await sb.from('contracts').select('wedding_id, sent_at').eq('owner_id', uid).eq('status', 'sent')
      setUnsigned((crows ?? []) as Unsigned[])
      const { data: prows } = await sb.from('payment_schedule').select('amount, wedding_id, status, due_date, paid_at').eq('owner_id', uid)
      setPayRows((prows ?? []) as PayRow[])

      const [irows, hrows] = await Promise.all([
        sb.from('inquiries').select('id, converted_wedding_id, created_at').eq('photographer_id', uid),
        sb.from('hidden_threads').select('inquiry_id').eq('user_id', uid),
      ])
      const hidden = new Set(((hrows.data ?? []) as { inquiry_id: string | null }[]).map((h) => h.inquiry_id).filter(Boolean) as string[])
      const inqs = ((irows.data ?? []) as { id: string; converted_wedding_id: string | null; created_at: string }[]).filter((i) => !hidden.has(i.id))
      let waiting = 0
      if (inqs.length > 0) {
        const { data: imsgs } = await sb.from('inquiry_messages').select('inquiry_id, sender_id').in('inquiry_id', inqs.map((i) => i.id)).is('deleted_at', null).limit(5000)
        const replied = new Set(((imsgs ?? []) as { inquiry_id: string; sender_id: string }[]).filter((m) => m.sender_id === uid).map((m) => m.inquiry_id))
        waiting = inqs.filter((i) => !i.converted_wedding_id && !replied.has(i.id)).length
      }
      const yearAgo = Date.now() - 365 * 86400000
      const recentInq = inqs.filter((i) => new Date(i.created_at).getTime() >= yearAgo)
      setInq({ waiting, total: recentInq.length, booked: recentInq.filter((i) => i.converted_wedding_id).length })

      try {
        setSiteShared(localStorage.getItem('camrhia_site_shared') === '1')
        const lsHide = localStorage.getItem('camrhia_hide_setup') === '1'
        const { data: hp } = await sb.from('profiles').select('dashboard_setup_hidden').eq('id', uid).maybeSingle()
        const dbHide = (hp as { dashboard_setup_hidden?: boolean | null } | null)?.dashboard_setup_hidden === true
        setHideSetup(lsHide || dbHide)
        if (lsHide && !dbHide) await sb.from('profiles').update({ dashboard_setup_hidden: true }).eq('id', uid)
      } catch { /* ignore */ }
      setReady(true)
    }
    load()
  }, [router])

  const published = galleries.filter((g) => g.status === 'published').length
  const photoTotal = galleries.reduce((n, g) => n + (g.gallery_photos?.[0]?.count ?? 0), 0)

  const photoCount = (g: Gal) => g.gallery_photos?.[0]?.count ?? 0
  const readyDrafts = galleries.filter((g) => g.status === 'draft' && photoCount(g) > 0)
  const emptyDrafts = galleries.filter((g) => g.status === 'draft' && photoCount(g) === 0)
  const firstWithPhotos = galleries.find((g) => photoCount(g) > 0)
  const firstGallery = galleries[0]
  const steps: { label: string; hint: string; done: boolean; href?: string }[] = [
    { label: 'Add your studio name', hint: 'Set it in the Camrhia app under Profile', done: !!studioName },
    { label: 'Create your first gallery', hint: 'One gallery per session', done: galleries.length > 0, href: '/galleries' },
    { label: 'Upload photos to a gallery', hint: 'Drag and drop works', done: !!firstWithPhotos, href: firstGallery ? `/galleries/${firstGallery.id}` : '/galleries' },
    { label: 'Publish a gallery', hint: 'Clients are notified in the app', done: published > 0, href: (readyDrafts[0] ?? firstGallery) ? `/galleries/${(readyDrafts[0] ?? firstGallery).id}` : '/galleries' },
    { label: 'Share your site link', hint: 'Put it in your Instagram bio', done: siteShared, href: '/website' },
  ]
  const doneCount = steps.filter((x) => x.done).length
  const showSetup = !hideSetup && doneCount < steps.length
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const todayStr = ymd(new Date())
  const soonStr = ymd(new Date(Date.now() + 7 * 86400000))
  const in30Str = ymd(new Date(Date.now() + 30 * 86400000))
  const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const typeLabel = (t: string | null) => (t ? t.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Session')
  const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const daysUntil = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${todayStr}T00:00:00`).getTime()) / 86400000)
  const countdown = (n: number) => (n <= 0 ? 'Today' : n === 1 ? 'Tomorrow' : `in ${n} days`)

  const now = new Date()
  const yr = now.getFullYear()
  const mo = now.getMonth()
  const amt = (r: PayRow) => Number(r.amount ?? 0)
  const paidRows = payRows.filter((r) => r.status === 'paid')
  const unpaidRows = payRows.filter((r) => r.status !== 'paid')
  const collectedYear = paidRows.filter((r) => r.paid_at && new Date(r.paid_at).getFullYear() === yr).reduce((n, r) => n + amt(r), 0)
  const collectedMonth = paidRows.filter((r) => r.paid_at && new Date(r.paid_at).getFullYear() === yr && new Date(r.paid_at).getMonth() === mo).reduce((n, r) => n + amt(r), 0)
  const collectedAll = paidRows.reduce((n, r) => n + amt(r), 0)
  const paidSessions = new Set(paidRows.map((r) => r.wedding_id).filter(Boolean)).size
  const outstanding = unpaidRows.reduce((n, r) => n + amt(r), 0)
  const overdueAmt = unpaidRows.filter((r) => r.due_date && r.due_date < todayStr).reduce((n, r) => n + amt(r), 0)
  const comingIn = unpaidRows.filter((r) => r.due_date && r.due_date >= todayStr && r.due_date <= in30Str).reduce((n, r) => n + amt(r), 0)

  const dueGalleries = sessions
    .filter((x) => x.gallery_due_date && !x.gallery_url && x.wedding_date && x.wedding_date <= todayStr && x.gallery_due_date <= soonStr)
    .sort((a, b) => (a.gallery_due_date! < b.gallery_due_date! ? -1 : 1))
  const upcoming = sessions
    .filter((x) => x.wedding_date && x.wedding_date >= todayStr)
    .sort((a, b) => (a.wedding_date! < b.wedding_date! ? -1 : 1))
    .slice(0, 6)
  const next = upcoming[0] ?? null
  const sessionsThisYear = sessions.filter((x) => x.wedding_date && x.wedding_date.startsWith(String(yr))).length
  const bookingRate = inq.total > 0 ? Math.round((inq.booked / inq.total) * 100) : null

  async function markRead(id: string) {
    setNotifs((n) => n.filter((x) => x.id !== id))
    if (supabase) await supabase.from('notifications').update({ read: true }).eq('id', id)
  }
  async function markAllRead() {
    const ids = updates.filter((u) => u.notifId).map((u) => u.notifId as string)
    if (ids.length === 0) return
    setNotifs((n) => n.filter((x) => !ids.includes(x.id)))
    if (supabase) await supabase.from('notifications').update({ read: true }).in('id', ids)
  }
  const owed = sessions.filter((x) => {
    if (x.paid_in_full || !x.wedding_date || x.wedding_date >= todayStr || !x.balance) return false
    return parseFloat(String(x.balance).replace(/[^0-9.]/g, '')) > 0
  })
  const isPriorityNotif = (n: Notif) => n.type === 'inquiry' || n.type === 'timeline_edited' || n.title === 'Payment disputed'
  type Item = { key: string; text: string; href: string; cta: string; notifId?: string }
  const notifItem = (n: Notif): Item => ({
    key: `n${n.id}`,
    text: [n.title, n.body].filter(Boolean).join(': '),
    href: n.wedding_id ? `/sessions/${n.wedding_id}` : '/dashboard',
    cta: n.wedding_id ? 'Open session' : 'Got it',
    notifId: n.id,
  })
  const attention: Item[] = [
    ...(unreadMsgs > 0 ? [{ key: 'msgs', text: `${unreadMsgs} unread conversation${unreadMsgs === 1 ? '' : 's'}`, href: '/messages', cta: 'Open messages' }] : []),
    ...notifs.filter(isPriorityNotif).map(notifItem),
    ...unsigned.map((u) => {
      const sx = sessions.find((x) => x.id === u.wedding_id)
      return { key: `c${u.wedding_id}`, text: `${sx?.names || 'A session'}: contract sent, waiting for a signature`, href: `/sessions/${u.wedding_id}`, cta: 'Open contract' }
    }),
    ...owed.map((x) => ({ key: `b${x.id}`, text: `${x.names || 'A session'}: balance of ${x.balance} still outstanding`, href: `/sessions/${x.id}`, cta: 'Open session' })),
    ...dueGalleries.map((x) => ({
      key: `due${x.id}`,
      text: `${x.names || 'A session'}: gallery ${x.gallery_due_date! < todayStr ? 'was due' : 'is due'} ${fmtDay(x.gallery_due_date!)}`,
      href: '/galleries',
      cta: 'Open galleries',
    })),
    ...readyDrafts.map((g) => ({ key: `d${g.id}`, text: `"${g.title}" has ${photoCount(g)} photos and is still a draft`, href: `/galleries/${g.id}`, cta: 'Review and publish' })),
  ]
  const updates: Item[] = [
    ...notifs.filter((n) => !isPriorityNotif(n)).map(notifItem),
    ...emptyDrafts.map((g) => ({ key: `e${g.id}`, text: `"${g.title}" has no photos yet`, href: `/galleries/${g.id}`, cta: 'Upload photos' })),
    ...(recentFavs > 0 ? [{ key: 'fav', text: `Clients hearted ${recentFavs} photo${recentFavs === 1 ? '' : 's'} in the last 7 days`, href: '/galleries', cta: 'See galleries' }] : []),
  ]

  return (
    <div className="min-h-screen bg-paper bg-[radial-gradient(1100px_480px_at_75%_-8%,#F8EAE4_0%,transparent_65%)] xl:pl-60">
      <DashboardHeader active="dashboard" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        {!ready ? (
          <p className="text-sm text-ink-soft">{error ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Home</p>
                <h1 className="font-fraunces text-4xl font-semibold tracking-tight text-ink md:text-5xl">
                  {greeting()}{name ? `, ${name}` : ''}.
                </h1>
                <p className="mt-2 text-ink-soft">Here is what is happening with your studio.</p>
                <div className="mt-4 h-px w-16 bg-brass/60" />
              </div>
              <div className="flex items-center gap-3">
                <div ref={bellRef} className="relative">
                  <button
                    type="button"
                    aria-label="Updates"
                    onClick={() => setBellOpen((o) => !o)}
                    className="relative flex h-11 w-11 items-center justify-center rounded-full border border-line bg-card text-ink transition hover:border-twilight"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                    {updates.length > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brass px-1 text-[10px] font-semibold text-white">
                        {updates.length > 9 ? '9+' : updates.length}
                      </span>
                    )}
                  </button>
                  {bellOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-[min(380px,calc(100vw-3rem))] rounded-2xl border border-line bg-card p-4 shadow-lg">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-fraunces text-lg font-semibold text-ink">Updates</p>
                        {updates.some((u) => u.notifId) && (
                          <button type="button" onClick={markAllRead} className="text-xs text-ink-soft hover:text-ink">Mark all as read</button>
                        )}
                      </div>
                      {updates.length === 0 ? (
                        <p className="py-3 text-sm text-ink-soft">You are all caught up.</p>
                      ) : (
                        <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
                          {updates.slice(0, 8).map((a) => (
                            <li key={a.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                              <p className="min-w-0 flex-1 text-sm text-ink-soft">{a.text}</p>
                              <Link
                                href={a.href}
                                onClick={() => { setBellOpen(false); if (a.notifId) markRead(a.notifId) }}
                                className="shrink-0 text-sm font-medium text-twilight hover:underline"
                              >{a.cta} →</Link>
                              {a.notifId && (
                                <button type="button" onClick={() => markRead(a.notifId!)} className="shrink-0 text-xs text-ink-soft hover:text-ink">Dismiss</button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <Link href="/galleries" className={btn}>New gallery</Link>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
            {next && (
              <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-white/10 bg-twilight bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(0,0,0,0.14))] p-6 text-white shadow-[0_18px_40px_-18px_rgba(120,60,60,0.55)]">
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/95 text-twilight shadow-md">
                  <span className="text-[11px] font-semibold uppercase tracking-wider">{new Date(`${next.wedding_date}T00:00:00`).toLocaleDateString(undefined, { month: 'short' })}</span>
                  <span className="font-fraunces text-2xl font-semibold leading-none">{new Date(`${next.wedding_date}T00:00:00`).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-widest text-white/75">Next shoot · {countdown(daysUntil(next.wedding_date!))}</p>
                  <p className="truncate font-fraunces text-2xl font-semibold text-white">{next.names || 'Untitled session'}</p>
                  <p className="text-sm text-white/80">{typeLabel(next.session_type)} · {fmtDay(next.wedding_date!)}</p>
                </div>
                <Link href={`/sessions/${next.id}`} className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-twilight transition hover:opacity-90">Open session →</Link>
              </section>
            )}

              {/* Coming up */}
              <section className={card}>
                <p className="mb-3 font-fraunces text-2xl font-semibold text-ink">Coming up</p>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-ink-soft">No upcoming sessions. New bookings show up here.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {upcoming.map((x) => (
                      <li key={x.id}>
                        <Link href={`/sessions/${x.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink">{x.names || 'Untitled session'}</span>
                            <span className="block text-xs text-ink-soft">{typeLabel(x.session_type)}</span>
                          </span>
                          <span className="shrink-0 text-xs text-ink-soft">{fmtDay(x.wedding_date!)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link href="/calendar" className="mt-3 block text-sm font-medium text-twilight hover:underline">Open calendar →</Link>
              </section>

              </div>
              <div>
                <section className={card}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-fraunces text-2xl font-semibold text-ink">To do</p>
                    {attention.length > 3 && (
                      <button type="button" onClick={() => setTodoAll((o) => !o)} className="text-xs text-ink-soft hover:text-ink">
                        {todoAll ? 'Show less' : `See all (${attention.length})`}
                      </button>
                    )}
                  </div>
                  {attention.length === 0 ? (
                    <p className="text-sm text-ink-soft">You are all caught up.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {(todoAll ? attention.slice(0, 12) : attention.slice(0, 3)).map((a) => (
                        <li key={a.key} className="py-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brass" />
                            <p className="min-w-0 flex-1 text-sm text-ink">{a.text}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-3 pl-4">
                            <Link
                              href={a.href}
                              onClick={() => { if (a.notifId) markRead(a.notifId) }}
                              className="text-sm font-medium text-twilight hover:underline"
                            >{a.cta} →</Link>
                            {a.notifId && (
                              <button type="button" onClick={() => markRead(a.notifId!)} className="text-xs text-ink-soft hover:text-ink">Dismiss</button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>

            {showSetup && (
              <section className={`${card} mt-6`}>
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-fraunces text-2xl font-semibold text-ink">Get your studio set up</p>
                    <p className="text-xs text-ink-soft">{doneCount} of {steps.length} done</p>
                  </div>
                  <button
                    onClick={() => {
                      setHideSetup(true)
                      try { localStorage.setItem('camrhia_hide_setup', '1') } catch { /* ignore */ }
                      void (async () => {
                        const sb = supabase
                        if (!sb) return
                        const { data } = await sb.auth.getSession()
                        const id = data.session?.user.id
                        if (id) await sb.from('profiles').update({ dashboard_setup_hidden: true }).eq('id', id)
                      })()
                    }}
                    className="text-xs text-ink-soft hover:text-ink"
                  >
                    Dismiss
                  </button>
                </div>
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-twilight transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
                </div>
                <ul className="grid gap-2 md:grid-cols-2">
                  {steps.map((st) => {
                    const inner = (
                      <>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${st.done ? 'border-twilight bg-twilight text-white' : 'border-line text-transparent'}`}>✓</span>
                        <span>
                          <span className={`block text-sm ${st.done ? 'text-ink-soft line-through' : 'font-medium text-ink'}`}>{st.label}</span>
                          {!st.done && <span className="block text-xs text-ink-soft">{st.hint}</span>}
                        </span>
                      </>
                    )
                    return (
                      <li key={st.label}>
                        {st.href && !st.done ? (
                          <Link href={st.href} className="flex gap-3 rounded-xl p-2 transition hover:bg-white/70">{inner}</Link>
                        ) : (
                          <div className="flex gap-3 p-2">{inner}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

          </>
        )}
      </main>
    </div>
  )
}
