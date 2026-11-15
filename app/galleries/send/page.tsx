'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { GallerySidebar } from '@/app/components/GallerySidebar'

type G = { id: string; title: string; status: 'draft' | 'published'; created_at: string; expires_at: string | null; cover_photo_id: string | null; session_id: string | null; count: number; edited: number }
type S = { id: string; names: string | null; wedding_date: string | null; gallery_sent_at: string | null; gallery_opened_at: string | null }

const card = 'rounded-2xl border border-line bg-card p-4'
const btnGhost = 'rounded-xl border border-line px-3 py-2 text-sm text-ink transition hover:border-twilight'
const btn = 'rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90'
const pill = 'rounded-full border border-line bg-paper px-2.5 py-0.5 text-[11px] text-ink-soft'
const day = (v: string | null) => (v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '')

export default function DesignAndSend() {
  const router = useRouter()
  const [rows, setRows] = useState<G[] | null>(null)
  const [sess, setSess] = useState<Record<string, S>>({})
  const [covers, setCovers] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<'ready' | 'sent'>('ready')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: s } = await sb.auth.getSession()
    if (!s.session) { router.replace('/login?next=/galleries/send'); return }
    const { data } = await sb.from('galleries').select('id, title, status, created_at, expires_at, cover_photo_id, session_id, gallery_photos(count)').order('created_at', { ascending: false })
    const list: G[] = ((data ?? []) as unknown as (Omit<G, 'count' | 'edited'> & { gallery_photos: { count: number }[] })[]).map((c) => ({
      id: c.id, title: c.title, status: c.status, created_at: c.created_at, expires_at: c.expires_at, cover_photo_id: c.cover_photo_id, session_id: c.session_id,
      count: c.gallery_photos?.[0]?.count ?? 0, edited: 0,
    }))
    const sids = Array.from(new Set(list.map((g) => g.session_id).filter((x): x is string => !!x)))
    if (sids.length) {
      const { data: ws } = await sb.from('weddings').select('id, names, wedding_date, gallery_sent_at, gallery_opened_at').in('id', sids)
      setSess(Object.fromEntries(((ws ?? []) as S[]).map((w) => [w.id, w])))
    }
    const pathFor: Record<string, string> = {}
    await Promise.all(list.filter((g) => g.count > 0).map(async (g) => {
      const base = sb.from('gallery_photos').select('thumb_path')
      const pq = g.cover_photo_id ? base.eq('id', g.cover_photo_id).limit(1) : base.eq('gallery_id', g.id).order('sort_order', { ascending: true }).limit(1)
      const [c, p] = await Promise.all([
        sb.from('gallery_photos').select('id', { count: 'exact', head: true }).eq('gallery_id', g.id).eq('enhanced', true),
        pq,
      ])
      g.edited = c.count ?? 0
      const path = p.data?.[0]?.thumb_path
      if (path) pathFor[g.id] = path
    }))
    setRows(list)
    const paths = Object.values(pathFor)
    if (paths.length === 0) return
    const { data: signed } = await sb.storage.from('galleries').createSignedUrls(paths, 3600)
    const urlByPath: Record<string, string> = {}
    signed?.forEach((x) => { if (x.path && x.signedUrl) urlByPath[x.path] = x.signedUrl })
    const out: Record<string, string> = {}
    for (const [gid, path] of Object.entries(pathFor)) if (urlByPath[path]) out[gid] = urlByPath[path]
    setCovers(out)
  }, [router])

  useEffect(() => { load() }, [load])

  const ready = (rows ?? []).filter((g) => g.status === 'draft' && g.count > 0)
  const sent = (rows ?? []).filter((g) => g.status === 'published')
  const shown = tab === 'ready' ? ready : sent

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <GallerySidebar active="send" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Galleries</p>
        <h1 className="mb-2 font-fraunces text-3xl font-semibold text-ink">Design & send</h1>
        <p className="mb-6 text-sm text-ink-soft">Pick a finished gallery to choose how it looks, then send it to your client.</p>

        <div className="mb-5 flex gap-2">
          {([['ready', 'Ready to design', ready.length], ['sent', 'Sent', sent.length]] as const).map(([k, label, n]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm transition ${tab === k ? 'border-twilight bg-twilight text-white' : 'border-line bg-card text-ink'}`}>{label} ({n})</button>
          ))}
        </div>

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : shown.length === 0 ? (
          <div className={card}><p className="text-sm text-ink-soft">{tab === 'ready' ? 'Nothing waiting. Galleries with photos that are not published yet show up here.' : 'No galleries sent yet.'} <Link href="/galleries" className="underline">All galleries</Link></p></div>
        ) : (
          <div className="space-y-3">
            {shown.map((g) => {
              const s = g.session_id ? sess[g.session_id] : undefined
              const name = s?.names?.trim() || g.title
              const shoot = s?.wedding_date || g.created_at
              return (
                <div key={g.id} className={`${card} flex flex-wrap items-center gap-4`}>
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-[#EFE7DC]">
                    {covers[g.id] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={covers[g.id]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-fraunces text-lg text-ink">{name}</p>
                    {name !== g.title && <p className="truncate text-xs text-ink-soft">{g.title}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={pill}>{g.edited > 0 ? 'Edited in Camrhia' : 'Edited elsewhere'}</span>
                      <span className={pill}>{g.count} photo{g.count === 1 ? '' : 's'}</span>
                      <span className={pill}>{day(shoot)}</span>
                      {g.status === 'published' && <span className={pill}>{s?.gallery_opened_at ? 'Opened ' + day(s.gallery_opened_at) : 'Not opened yet'}</span>}
                      {g.expires_at && <span className={pill}>Expires {day(g.expires_at)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/galleries/${g.id}`} className={btnGhost}>Open</Link>
                    <Link href={`/galleries/${g.id}?design=1`} className={btnGhost}>Design</Link>
                    <Link href={`/galleries/${g.id}?share=1`} className={btn}>{g.status === 'published' ? 'Share' : 'Send'}</Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
