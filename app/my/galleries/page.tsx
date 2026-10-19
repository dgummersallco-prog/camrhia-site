'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Gallery = { token: string; title: string | null; has_pin: boolean; allow_downloads: boolean; expires_at: string | null }
type Portal = {
  wedding_id: string; names: string | null; wedding_date: string | null
  studio_name: string | null; display_name: string | null; galleries: Gallery[] | null
}
type Mine = { wedding_id: string; gallery_password: string | null }

export default function MyGalleriesPage() {
  const router = useRouter()
  const [rows, setRows] = useState<Portal[]>([])
  const [mine, setMine] = useState<Record<string, Mine>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/my/galleries'); return }
      const [a, b] = await Promise.all([sb.rpc('client_portal_sessions'), sb.rpc('get_my_wedding')])
      setRows((a.data ?? []) as Portal[])
      const m: Record<string, Mine> = {}
      ;((b.data ?? []) as Mine[]).forEach((r) => { m[r.wedding_id] = r })
      setMine(m)
      setReady(true)
    }
    load()
  }, [router])

  const items = rows.flatMap((r) => (r.galleries ?? []).map((g) => ({ g, r })))

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <ClientHeader active="galleries" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Galleries</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your photos</h1>
        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : items.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-ink-soft">Your photos will show up here as soon as your photographer shares them.</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {items.map(({ g, r }) => {
              const studio = r.studio_name || r.display_name || 'Your photographer'
              const pin = g.has_pin ? mine[r.wedding_id]?.gallery_password : null
              return (
                <div key={g.token} className="rounded-2xl border border-line bg-card p-5">
                  <p className="font-fraunces text-xl font-semibold text-ink">{g.title || 'Your photos'}</p>
                  <p className="mt-1 text-sm text-ink-soft">{studio}</p>
                  {pin && <p className="mt-2 text-xs text-ink-soft">PIN: <span className="font-mono text-ink">{pin}</span></p>}
                  {g.expires_at && <p className="mt-1 text-xs text-ink-soft">Available until {new Date(g.expires_at).toLocaleDateString()}</p>}
                  <a href={`/g/${g.token}`} className="mt-4 inline-block rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
                    {g.allow_downloads ? 'View and download' : 'View photos'}
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
