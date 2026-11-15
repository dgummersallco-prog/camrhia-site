'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { GallerySidebar } from '@/app/components/GallerySidebar'

type G = { id: string; title: string; count: number }

const card = 'rounded-2xl border border-line bg-card p-5'
const btnGhost = 'rounded-xl border border-line px-3 py-2 text-sm text-ink transition hover:border-twilight'
const btn = 'rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90'

export default function DesignAndSend() {
  const router = useRouter()
  const [rows, setRows] = useState<G[] | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/galleries/send'); return }
    const { data } = await sb.from('galleries').select('id, title, gallery_photos(count)').eq('owner_id', sess.session.user.id).order('created_at', { ascending: false })
    setRows(((data ?? []) as unknown as { id: string; title: string; gallery_photos: { count: number }[] }[]).map((c) => ({ id: c.id, title: c.title, count: c.gallery_photos?.[0]?.count ?? 0 })))
  }, [router])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <GallerySidebar active="send" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Galleries</p>
        <h1 className="mb-2 font-fraunces text-3xl font-semibold text-ink">Design & send</h1>
        <p className="mb-6 text-sm text-ink-soft">Pick a finished gallery to choose how it looks, then send it to your client.</p>

        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <div className={card}><p className="text-sm text-ink-soft">No galleries yet. <Link href="/galleries" className="underline">Create one</Link> to get started.</p></div>
        ) : (
          <div className="space-y-3">
            {rows.map((g) => (
              <div key={g.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
                <div>
                  <p className="font-fraunces text-lg text-ink">{g.title}</p>
                  <p className="text-xs text-ink-soft">{g.count} photo{g.count === 1 ? '' : 's'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/galleries/${g.id}`} className={btnGhost}>Open</Link>
                  <Link href={`/galleries/${g.id}?design=1`} className={btnGhost}>Design</Link>
                  <Link href={`/galleries/${g.id}?share=1`} className={btn}>Send</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
