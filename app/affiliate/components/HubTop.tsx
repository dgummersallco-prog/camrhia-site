'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar, fetchAvatars } from './Avatar'

type Top = { id: string; author_id: string; author_name: string; body: string; link_url: string | null; platform: string | null; views: number | null; signed: number | null }

const ROSE = 'var(--aff-fill)'
const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString())

export default function HubTop({ client }: { client: SupabaseClient | null }) {
  const [items, setItems] = useState<Top[]>([])
  const [avatars, setAvatars] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!client) return
    let cancelled = false
    const run = async () => {
      const { data } = await client.from('hub_posts').select('id, author_id, author_name, body, link_url, platform, views, signed').gt('signed', 0).order('signed', { ascending: false }).limit(3)
      const list = (data ?? []) as Top[]
      if (cancelled) return
      setItems(list)
      const av = await fetchAvatars(client, Array.from(new Set(list.map((x) => x.author_id))))
      if (!cancelled) setAvatars(av)
    }
    run()
    const t = setInterval(run, 30000)
    return () => { cancelled = true; clearInterval(t) }
  }, [client])

  if (items.length === 0) return null

  return (
    <section>
      <h2 className="mb-4 font-fraunces text-2xl font-semibold text-ink">Top performing posts</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((p, i) => (
          <article key={p.id} className="rounded-3xl border border-[#D5DCEA] bg-[linear-gradient(160deg,#FCFDFE_0%,#E9EEF7_100%)] p-5 shadow-[0_1px_2px_rgba(60,30,30,0.04),0_14px_34px_-18px_rgba(120,60,60,0.22)]">
            <div className="flex items-center justify-between">
              <span className="font-fraunces text-4xl font-semibold leading-none" style={{ color: ROSE, opacity: 0.3 }}>{i + 1}</span>
              {p.platform && <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">{p.platform}</span>}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Avatar url={avatars[p.author_id]} name={p.author_name} size={28} />
              <p className="text-sm font-semibold text-ink">{p.author_name}</p>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="font-fraunces text-3xl font-semibold" style={{ color: ROSE }}>{fmt(p.signed)}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Subs</p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold text-ink">{fmt(p.views)}</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-soft">Views</p>
              </div>
            </div>
            {p.link_url && <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 block truncate text-sm underline" style={{ color: ROSE }}>View post</a>}
          </article>
        ))}
      </div>
    </section>
  )
}
