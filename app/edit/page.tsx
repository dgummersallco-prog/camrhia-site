'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Row = { id: string; title: string; status: string; created_at: string; gallery_photos: { count: number }[] }

export default function EditingRoom() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login?next=/edit'); return }
      const { data: g, error: e } = await sb
        .from('galleries')
        .select('id, title, status, created_at, gallery_photos(count)')
        .eq('owner_id', data.session.user.id)
        .order('created_at', { ascending: false })
      if (e) { setError(e.message); setRows([]); return }
      setRows((g ?? []) as unknown as Row[])
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#ececf0]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-white/50 transition hover:text-white">← Back to Camrhia</Link>
          <Link href="/galleries" className="text-sm text-white/50 transition hover:text-white">New shoot? Create it in Galleries</Link>
        </div>

        <h1 className="mt-12 font-fraunces text-4xl text-white">The editing room</h1>
        <p className="mt-3 max-w-xl text-white/55">Pick a shoot. We walk it from raw photos to a finished gallery, one step at a time.</p>

        {error && <p className="mt-6 text-sm text-red-300">{error}</p>}
        {rows === null && <p className="mt-10 text-sm text-white/40">Loading…</p>}
        {rows && rows.length === 0 && !error && (
          <p className="mt-10 rounded-2xl border border-white/10 bg-[#151518] p-8 text-white/60">
            No shoots yet. Create a gallery for your shoot first, then come back here to edit it.
          </p>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rows ?? []).map((r) => {
            const count = r.gallery_photos?.[0]?.count ?? 0
            return (
              <Link
                key={r.id}
                href={`/edit/${r.id}`}
                className="group rounded-2xl border border-white/10 bg-[#151518] p-6 transition hover:border-twilight"
              >
                <p className="font-fraunces text-xl text-white">{r.title}</p>
                <p className="mt-2 text-sm text-white/50">
                  {count} {count === 1 ? 'photo' : 'photos'} · {r.status === 'published' ? 'Published' : 'Draft'}
                </p>
                <p className="mt-6 text-sm text-twilight transition group-hover:translate-x-1">{count === 0 ? 'Start' : 'Open'} →</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
