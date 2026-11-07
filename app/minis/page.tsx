'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { SubTabs } from '@/app/components/SubTabs'
import { MINI_PACKS, type MiniPack } from '@/lib/miniPackages'

type Pkg = { id: string; name: string; price: string | null; covers: string | null; detail: string | null; session_type: string; is_mini: boolean | null; sort_order: number | null }
type SType = { key: string; label: string }
type Draft = { id: string | null; name: string; price: string; covers: string; detail: string; session_type: string }

const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight'
const lab = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink-soft'

export default function MinisPage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [pkgs, setPkgs] = useState<Pkg[] | null>(null)
  const [types, setTypes] = useState<SType[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
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
      sb.from('packages').select('id, name, price, covers, detail, session_type, is_mini, sort_order').eq('owner_id', id).order('sort_order', { ascending: true }),
      sb.from('session_types').select('key, label'),
    ])
    if (p.error) setMsg(p.error.message)
    setPkgs((p.data ?? []) as Pkg[])
    setTypes((t.data ?? []) as SType[])
  }, [router])

  useEffect(() => { load() }, [load])

  const names = new Set(MINI_PACKS.map((m) => m.name))
  const mine = (pkgs ?? []).filter((x) => x.is_mini || names.has(x.name))
  const missing = MINI_PACKS.filter((m) => !(pkgs ?? []).some((x) => x.name === m.name))
  const typeLabel = (k: string) => types.find((t) => t.key === k)?.label ?? k
  const fallbackType = types.find((t) => t.key === 'family')?.key ?? types[0]?.key ?? 'family'

  async function addMini(list: MiniPack[]) {
    const sb = supabase
    if (!sb || !uid || list.length === 0) return
    setBusy(true)
    const base = (pkgs ?? []).reduce((n, x) => Math.max(n, x.sort_order ?? 0), 0)
    const okType = (k: string) => (types.some((t) => t.key === k) ? k : fallbackType)
    const rows = list.map((m, i) => ({
      name: m.name, price: m.price, covers: m.covers, detail: m.detail,
      session_type: okType(m.type), show_public: false, is_mini: true, owner_id: uid, sort_order: base + i + 1,
    }))
    const { error } = await sb.from('packages').insert(rows)
    setMsg(error ? error.message : list.length === 1 ? `${list[0].name} added.` : `${list.length} mini session packages added.`)
    setBusy(false)
    await load()
  }

  async function saveDraft() {
    const sb = supabase
    if (!sb || !uid || !draft) return
    if (!draft.name.trim()) { setMsg('Give the mini package a name.'); return }
    setBusy(true)
    const fields = {
      name: draft.name.trim(),
      price: draft.price.trim() || null,
      covers: draft.covers.trim() || null,
      detail: draft.detail.trim() || null,
      session_type: draft.session_type,
      is_mini: true,
    }
    if (draft.id) {
      const { error } = await sb.from('packages').update(fields).eq('id', draft.id)
      if (error) { setMsg(error.message); setBusy(false); return }
    } else {
      const next = (pkgs ?? []).reduce((n, x) => Math.max(n, x.sort_order ?? 0), 0) + 1
      const { error } = await sb.from('packages').insert({ ...fields, owner_id: uid, show_public: false, sort_order: next })
      if (error) { setMsg(error.message); setBusy(false); return }
    }
    setBusy(false)
    setDraft(null)
    await load()
  }

  async function remove(p: Pkg) {
    if (!window.confirm(`Delete "${p.name}"?`)) return
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('packages').delete().eq('id', p.id)
    if (error) { setMsg(error.message); return }
    await load()
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="packages" />
      <SubTabs group="packages" active="minis" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Work</p>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">Mini-sessions</h1>
            <p className="mt-1 text-sm text-ink-soft">Your mini session packages. They also appear in the Camrhia app. Build time slots for one in Specials.</p>
          </div>
          {!draft && <button className={btn} onClick={() => setDraft({ id: null, name: '', price: '', covers: '', detail: '', session_type: fallbackType })}>+ Create your own</button>}
        </div>

        {msg && <p className="mb-4 rounded-xl bg-blush-wash px-4 py-2 text-sm text-twilight">{msg}</p>}

        {draft && (
          <section className={`${card} mb-6 space-y-4`}>
            <p className="font-fraunces text-xl font-semibold text-ink">{draft.id ? 'Edit mini package' : 'New mini package'}</p>
            <div>
              <label className={lab}>Name</label>
              <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Fall Mini Session" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={lab}>Price</label>
                <input className={input} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="$250" />
              </div>
              <div>
                <label className={lab}>Time and photos</label>
                <input className={input} value={draft.covers} onChange={(e) => setDraft({ ...draft, covers: e.target.value })} placeholder="20 minutes · 10 edited photos" />
              </div>
            </div>
            <div>
              <label className={lab}>What is included</label>
              <textarea rows={5} className={input} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} />
            </div>
            <div>
              <label className={lab}>Session type</label>
              <select className={input} value={draft.session_type} onChange={(e) => setDraft({ ...draft, session_type: e.target.value })}>
                {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex gap-3">
              <button className={btn} disabled={busy} onClick={saveDraft}>{busy ? 'Saving…' : 'Save'}</button>
              <button className={btnGhost} onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </section>
        )}

        {pkgs === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="space-y-6">
            {mine.length > 0 && (
              <section className={card}>
                <p className="font-fraunces text-xl font-semibold text-ink">Your mini packages <span className="text-sm font-normal text-ink-soft">· {mine.length}</span></p>
                <ul className="mt-3 divide-y divide-line">
                  {mine.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{m.name}</p>
                        <p className="text-sm text-ink-soft">{[m.price, m.covers, typeLabel(m.session_type)].filter(Boolean).join(' · ')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className={btnGhost} onClick={() => setDraft({ id: m.id, name: m.name, price: m.price ?? '', covers: m.covers ?? '', detail: m.detail ?? '', session_type: m.session_type })}>Edit</button>
                        <button className={btnGhost} onClick={() => remove(m)}>Delete</button>
                      </div>
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
