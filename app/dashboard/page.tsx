'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Gal = { id: string; title: string; status: 'draft' | 'published'; gallery_photos: { count: number }[] }
type Activity = { id: string; title: string; when: string; thumb: string | null }

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

const card = 'rounded-2xl border border-line bg-card p-5'

export default function DashboardPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [galleries, setGalleries] = useState<Gal[]>([])
  const [favTotal, setFavTotal] = useState(0)
  const [activity, setActivity] = useState<Activity[]>([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studioName, setStudioName] = useState('')
  const [portCount, setPortCount] = useState(0)
  const [siteShared, setSiteShared] = useState(false)
  const [hideSetup, setHideSetup] = useState(false)
  const [recentFavs, setRecentFavs] = useState(0)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/dashboard'); return }
      const uid = sess.session.user.id

      const [prof, gal, favCount, favRecent, portRes, weekFavs] = await Promise.all([
        sb.from('profiles').select('first_name, studio_name, public_token').eq('id', uid).single(),
        sb.from('galleries').select('id, title, status, gallery_photos(count)').order('created_at', { ascending: false }),
        sb.from('gallery_favorites').select('id', { count: 'exact', head: true }),
        sb.from('gallery_favorites').select('id, gallery_id, photo_id, created_at').order('created_at', { ascending: false }).limit(8),
        sb.from('portfolio_photos').select('id', { count: 'exact', head: true }),
        sb.from('gallery_favorites').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ])

      if (prof.data) {
        setName((prof.data.first_name as string | null) || (prof.data.studio_name as string | null) || '')
        setToken((prof.data.public_token as string | null) ?? null)
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
      try {
        setSiteShared(localStorage.getItem('camrhia_site_shared') === '1')
        setHideSetup(localStorage.getItem('camrhia_hide_setup') === '1')
      } catch { /* ignore */ }
      setReady(true)
    }
    load()
  }, [router])

  const published = galleries.filter((g) => g.status === 'published').length
  const photoTotal = galleries.reduce((n, g) => n + (g.gallery_photos?.[0]?.count ?? 0), 0)

  function copySite() {
    if (!token) return
    navigator.clipboard?.writeText(`${window.location.origin}/p/${token}`)
    setCopied(true)
    setSiteShared(true)
    try { localStorage.setItem('camrhia_site_shared', '1') } catch { /* ignore */ }
    setTimeout(() => setCopied(false), 1800)
  }

  const photoCount = (g: Gal) => g.gallery_photos?.[0]?.count ?? 0
  const readyDrafts = galleries.filter((g) => g.status === 'draft' && photoCount(g) > 0)
  const emptyDrafts = galleries.filter((g) => g.status === 'draft' && photoCount(g) === 0)
  const firstWithPhotos = galleries.find((g) => photoCount(g) > 0)
  const firstGallery = galleries[0]
  const steps: { label: string; hint: string; done: boolean; href?: string }[] = [
    { label: 'Add your studio name', hint: 'Set it in the Camrhia app under Profile', done: !!studioName },
    { label: 'Add photos to your portfolio', hint: 'Show clients your best work', done: portCount > 0, href: '/portfolio' },
    { label: 'Create your first gallery', hint: 'One gallery per session', done: galleries.length > 0, href: '/galleries' },
    { label: 'Upload photos to a gallery', hint: 'Drag and drop works', done: !!firstWithPhotos, href: firstGallery ? `/galleries/${firstGallery.id}` : '/galleries' },
    { label: 'Publish a gallery', hint: 'Clients are notified in the app', done: published > 0, href: (readyDrafts[0] ?? firstGallery) ? `/galleries/${(readyDrafts[0] ?? firstGallery).id}` : '/galleries' },
    { label: 'Share your site link', hint: 'Put it in your Instagram bio', done: siteShared },
  ]
  const doneCount = steps.filter((x) => x.done).length
  const showSetup = !hideSetup && doneCount < steps.length
  const attention: { key: string; text: string; href: string; cta: string }[] = [
    ...readyDrafts.map((g) => ({ key: `d${g.id}`, text: `"${g.title}" has ${photoCount(g)} photos and is still a draft`, href: `/galleries/${g.id}`, cta: 'Review and publish' })),
    ...emptyDrafts.map((g) => ({ key: `e${g.id}`, text: `"${g.title}" has no photos yet`, href: `/galleries/${g.id}`, cta: 'Upload photos' })),
    ...(recentFavs > 0 ? [{ key: 'fav', text: `Clients hearted ${recentFavs} photo${recentFavs === 1 ? '' : 's'} in the last 7 days`, href: '/galleries', cta: 'See galleries' }] : []),
  ]

  const action = 'flex flex-col gap-1 rounded-2xl border border-line bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-twilight hover:shadow-md'

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="dashboard" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        {!ready ? (
          <p className="text-sm text-ink-soft">{error ?? 'Loading…'}</p>
        ) : (
          <>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Dashboard</p>
            <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">
              {greeting()}{name ? `, ${name}` : ''}.
            </h1>
            <p className="mt-2 text-ink-soft">Here is what is happening with your studio.</p>

            {attention.length > 0 && (
              <section className={`${card} mt-8`}>
                <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Needs your attention</p>
                <ul className="divide-y divide-line">
                  {attention.slice(0, 5).map((a) => (
                    <li key={a.key} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-brass" />
                      <p className="min-w-0 flex-1 text-sm text-ink">{a.text}</p>
                      <Link href={a.href} className="shrink-0 text-sm font-medium text-twilight hover:underline">{a.cta} →</Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {showSetup && (
              <section className={`${card} mt-6`}>
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-fraunces text-xl font-semibold text-ink">Get your studio set up</p>
                    <p className="text-xs text-ink-soft">{doneCount} of {steps.length} done</p>
                  </div>
                  <button
                    onClick={() => { setHideSetup(true); try { localStorage.setItem('camrhia_hide_setup', '1') } catch { /* ignore */ } }}
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
                          <Link href={st.href} className="flex gap-3 rounded-xl p-2 hover:bg-paper">{inner}</Link>
                        ) : (
                          <div className="flex gap-3 p-2">{inner}</div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

            {/* Quick actions */}
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Link href="/galleries" className={action}>
                <span className="font-fraunces text-lg font-semibold text-ink">New gallery</span>
                <span className="text-xs text-ink-soft">Upload and deliver photos</span>
              </Link>
              <Link href="/portfolio" className={action}>
                <span className="font-fraunces text-lg font-semibold text-ink">Edit portfolio</span>
                <span className="text-xs text-ink-soft">Update your website</span>
              </Link>
              {token ? (
                <a href={`/p/${token}`} target="_blank" rel="noreferrer" className={action}>
                  <span className="font-fraunces text-lg font-semibold text-ink">View my site</span>
                  <span className="text-xs text-ink-soft">See what clients see</span>
                </a>
              ) : (
                <div className={`${action} opacity-60`}>
                  <span className="font-fraunces text-lg font-semibold text-ink">View my site</span>
                  <span className="text-xs text-ink-soft">Finish setup in the app</span>
                </div>
              )}
              <button onClick={copySite} disabled={!token} className={`${action} disabled:opacity-60`}>
                <span className="font-fraunces text-lg font-semibold text-ink">{copied ? 'Copied!' : 'Copy site link'}</span>
                <span className="text-xs text-ink-soft">For your bio and emails</span>
              </button>
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                ['Galleries', galleries.length],
                ['Published', published],
                ['Photos delivered', photoTotal],
                ['Client favorites', favTotal],
              ].map(([label, value]) => (
                <div key={label as string} className={card}>
                  <p className="text-xs uppercase tracking-wider text-ink-soft">{label}</p>
                  <p className="mt-1 font-fraunces text-3xl font-semibold text-ink">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Activity */}
              <section className={card}>
                <p className="mb-4 font-fraunces text-xl font-semibold text-ink">Recent client activity</p>
                {activity.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    When clients heart photos in your galleries, you will see it here.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {activity.map((a) => (
                      <li key={a.id} className="flex items-center gap-3 py-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-line">
                          {a.thumb && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.thumb} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <p className="flex-1 text-sm text-ink">
                          A client hearted a photo in <span className="font-medium">{a.title}</span>
                        </p>
                        <span className="text-xs text-ink-soft">{a.when}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Everything in one place */}
              <section className={card}>
                <p className="mb-2 font-fraunces text-xl font-semibold text-ink">Everything in one place</p>
                <p className="text-sm text-ink-soft">
                  Your sessions, messages, calendar, galleries and portfolio all live here, and everything stays in sync with the Camrhia app.
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ['Sessions and messages', '/sessions'],
                    ['Calendar', '/calendar'],
                    ['Galleries', '/galleries'],
                    ['Portfolio', '/portfolio'],
                  ].map(([t, href]) => (
                    <li key={href}>
                      <a href={href} className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-ink transition hover:border-twilight">
                        {t}
                        <span className="text-twilight">→</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-ink-soft">Still in the Camrhia app: payments, plus photo layouts.</p>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
