'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'

type Pkg = { id: string; name: string; price: string | null; covers: string | null; show_public: boolean }
type SType = { key: string; label: string }

const card = 'rounded-2xl border border-line bg-card p-5'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight'

type MiniPack = { name: string; price: string; covers: string; detail: string; type: string }
const MINI_PACKS: MiniPack[] = [
  { name: 'Holiday Mini Session', price: '$250', covers: '20 minutes · 10 edited photos', type: 'family', detail: "20 minute session for your family\n10 edited photos in an online gallery\nA cozy holiday set with warm lights\nExtra photos and prints available" },
  { name: 'Fall Family Mini Session', price: '$250', covers: '20 minutes · 10 edited photos', type: 'family', detail: "20 minute outdoor session\n10 edited photos in an online gallery\nKids and pets welcome\nPrints and albums available" },
  { name: 'Spring Blossom Mini Session', price: '$250', covers: '15 minutes · 7 edited photos', type: 'family', detail: "15 minute session among the blossoms\n7 edited photos in an online gallery\nGreat for families, couples and moms\nExtra photos available" },
  { name: 'Back to School Mini Session', price: '$65', covers: '15 minutes · 5 edited photos', type: 'family', detail: "15 minute portrait session per child\n5 edited photos in an online gallery\nSiblings can share one slot\nPrints ready for grandparents" },
  { name: 'Valentine Couples Mini Session', price: '$225', covers: '20 minutes · 5 edited photos', type: 'engagement', detail: "20 minute couples session\n5 edited photos in an online gallery\nPosing help, so no experience needed\nPrints available" },
  { name: 'Pumpkin Patch Mini Session', price: '$200', covers: '20 minutes · 10 edited photos', type: 'family', detail: "20 minute session at the patch\n10 edited photos in an online gallery\nCostumes welcome\nPrints available" },
  { name: 'Summer Beach Mini Session', price: '$250', covers: '15 minutes · 10 edited photos', type: 'family', detail: "15 minute sunset session\n10 edited photos in an online gallery\nFamilies and couples welcome\nPrints available" },
  { name: 'Branding Mini Session', price: '$200', covers: '30 minutes · 10 edited photos', type: 'branding', detail: "30 minute session with two outfit changes\n10 edited photos for web and social\nPlanning call before the session\nFull usage for your business" },
]

export default function MinisPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [pkgs, setPkgs] = useState<Pkg[] | null>(null)
  const [types, setTypes] = useState<SType[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/minis'); return }
    const id = sess.session.user.id
    setUid(id)
    const [p, t] = await Promise.all([
      sb.from('packages').select('id, name, price, covers, show_public, sort_order').eq('owner_id', id).order('sort_order', { ascending: true }),
      sb.from('session_types').select('key, label'),
    ])
    if (p.error) setMsg(p.error.message)
    setPkgs((p.data ?? []) as Pkg[])
    setTypes((t.data ?? []) as SType[])
  }, [router])

  useEffect(() => { load() }, [load])

  async function addMini(list: MiniPack[]) {
    const sb = supabase
    if (!sb || !uid || list.length === 0) return
    setBusy(true)
    const { data: last } = await sb.from('packages').select('sort_order').eq('owner_id', uid).order('sort_order', { ascending: false }).limit(1)
    const base = Number(last?.[0]?.sort_order ?? 0)
    const fallback = types.find((t) => t.key === 'family')?.key ?? types[0]?.key ?? 'family'
    const okType = (k: string) => (types.some((t) => t.key === k) ? k : fallback)
    const rows = list.map((m, i) => ({
      name: m.name,
      price: m.price,
      covers: m.covers,
      detail: m.detail,
      session_type: okType(m.type),
      show_public: false,
      owner_id: uid,
      sort_order: base + i + 1,
    }))
    const { error } = await sb.from('packages').insert(rows)
    if (error) setMsg(error.message)
    else setMsg(list.length === 1 ? `${list[0].name} added.` : `${list.length} mini session packages added.`)
    setBusy(false)
    await load()
  }

  const names = new Set(MINI_PACKS.map((m) => m.name))
  const mine = (pkgs ?? []).filter((x) => names.has(x.name))
  const have = new Set((pkgs ?? []).map((x) => x.name))
  const missing = MINI_PACKS.filter((m) => !have.has(m.name))

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="packages" />
      <SubTabs group="packages" active="minis" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Work</p>
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Mini-sessions</h1>
          <p className="mt-1 text-sm text-ink-soft">Ready-made mini session packages with real market prices. Add one, change anything, then build its time slots in Specials.</p>
        </div>

        {msg && <p className="mb-4 rounded-xl bg-blush-wash px-4 py-2 text-sm text-twilight">{msg}</p>}

        {pkgs === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="space-y-6">
            {mine.length > 0 && (
              <section className={card}>
                <p className="font-fraunces text-xl font-semibold text-ink">Your mini session packages</p>
                <ul className="mt-3 divide-y divide-line">
                  {mine.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{m.name}</p>
                        <p className="text-sm text-ink-soft">{m.price} · {m.covers}</p>
                      </div>
                      <Link href="/portfolio/packages" className={btnGhost}>Edit</Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {missing.length > 0 && (
              <section className={card}>
                <p className="font-fraunces text-xl font-semibold text-ink">Ready to add <span className="text-sm font-normal text-ink-soft">· {missing.length}</span></p>
                <ul className="mt-3 divide-y divide-line">
                  {missing.map((m) => (
                    <li key={m.name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{m.name}</p>
                        <p className="text-sm text-ink-soft">{m.price} · {m.covers}</p>
                      </div>
                      <button className={btnGhost} disabled={busy} onClick={() => addMini([m])}>Add</button>
                    </li>
                  ))}
                </ul>
                <button className={`${btn} mt-4`} disabled={busy} onClick={() => addMini(missing)}>Add all {missing.length}</button>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
