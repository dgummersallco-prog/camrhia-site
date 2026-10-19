'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Pkg = {
  id: string
  name: string
  detail: string | null
  price: string | null
  covers: string | null
  session_type: string
  show_public: boolean
  category: string | null
  delivery_days: number | null
  sort_order: number | null
}
type SType = { key: string; label: string }
type Draft = { id: string | null; name: string; price: string; covers: string; detail: string; session_type: string; delivery_days: string; show_public: boolean }

const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight'
const lab = 'mb-1 block text-xs font-medium uppercase tracking-wider text-ink-soft'

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-twilight' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function Row({ pkg, typeLabel, onEdit, onDelete, onToggle }: { pkg: Pkg; typeLabel: string; onEdit: () => void; onDelete: () => void; onToggle: (v: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: pkg.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }
  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3">
      <button type="button" {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab touch-none px-1 text-lg leading-none text-ink-soft">⋮⋮</button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{pkg.name}</p>
        <p className="truncate text-xs text-ink-soft">
          {[pkg.price, pkg.covers, typeLabel].filter(Boolean).join(' · ')}
        </p>
      </div>
      <Switch on={pkg.show_public} onChange={onToggle} label="Show on my website" />
      <button type="button" onClick={onEdit} className="text-sm text-twilight hover:underline">Edit</button>
      <button type="button" onClick={onDelete} className="text-sm text-ink-soft hover:text-red-600">Delete</button>
    </li>
  )
}

export default function PackagesEditor() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [pkgs, setPkgs] = useState<Pkg[] | null>(null)
  const [types, setTypes] = useState<SType[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/portfolio/packages'); return }
    const id = sess.session.user.id
    setUid(id)
    const [p, t] = await Promise.all([
      sb.from('packages').select('id, name, detail, price, covers, session_type, show_public, category, delivery_days, sort_order').eq('owner_id', id).order('sort_order', { ascending: true }),
      sb.from('session_types').select('key, label'),
    ])
    if (p.error) setMsg(p.error.message)
    setPkgs((p.data ?? []) as Pkg[])
    setTypes((t.data ?? []) as SType[])
  }, [router])

  useEffect(() => { load() }, [load])

  function flash(t: string) {
    setMsg(t)
    setTimeout(() => setMsg((m) => (m === t ? null : m)), 2000)
  }

  const typeLabel = (k: string) => types.find((x) => x.key === k)?.label ?? k.replace(/_/g, ' ')

  function startNew() {
    setDraft({ id: null, name: '', price: '', covers: '', detail: '', session_type: types.find((x) => x.key === 'wedding')?.key ?? types[0]?.key ?? 'wedding', delivery_days: '', show_public: true })
  }
  function startEdit(p: Pkg) {
    setDraft({ id: p.id, name: p.name, price: p.price ?? '', covers: p.covers ?? '', detail: p.detail ?? '', session_type: p.session_type, delivery_days: p.delivery_days ? String(p.delivery_days) : '', show_public: p.show_public })
  }

  async function saveDraft() {
    const sb = supabase
    if (!sb || !uid || !draft) return
    if (!draft.name.trim()) { setMsg('Give the package a name.'); return }
    setBusy(true)
    const days = parseInt(draft.delivery_days, 10)
    const fields = {
      name: draft.name.trim(),
      price: draft.price.trim() || null,
      covers: draft.covers.trim() || null,
      detail: draft.detail.trim() || null,
      session_type: draft.session_type,
      delivery_days: Number.isFinite(days) && days > 0 ? days : null,
      show_public: draft.show_public,
    }
    if (draft.id) {
      const { error } = await sb.from('packages').update(fields).eq('id', draft.id)
      if (error) { setMsg(error.message); setBusy(false); return }
    } else {
      const next = (pkgs ?? []).reduce((n, x) => Math.max(n, x.sort_order ?? 0), 0) + 1
      const { error } = await sb.from('packages').insert({ ...fields, owner_id: uid, sort_order: next })
      if (error) { setMsg(error.message); setBusy(false); return }
    }
    setBusy(false)
    setDraft(null)
    await load()
    flash('Saved')
  }

  async function remove(p: Pkg) {
    const sb = supabase
    if (!sb) return
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    const { error } = await sb.from('packages').delete().eq('id', p.id)
    if (error) { setMsg(error.message); return }
    setPkgs((l) => (l ?? []).filter((x) => x.id !== p.id))
    flash('Deleted')
  }

  async function toggle(p: Pkg, v: boolean) {
    const sb = supabase
    if (!sb) return
    setPkgs((l) => (l ?? []).map((x) => (x.id === p.id ? { ...x, show_public: v } : x)))
    const { error } = await sb.from('packages').update({ show_public: v }).eq('id', p.id)
    if (error) setMsg(error.message)
  }

  async function onDragEnd(e: DragEndEvent) {
    const sb = supabase
    const { active, over } = e
    if (!sb || !over || active.id === over.id || !pkgs) return
    const from = pkgs.findIndex((x) => x.id === active.id)
    const to = pkgs.findIndex((x) => x.id === over.id)
    if (from < 0 || to < 0) return
    const next = arrayMove(pkgs, from, to).map((x, i) => ({ ...x, sort_order: i + 1 }))
    setPkgs(next)
    await Promise.all(next.map((x) => sb.from('packages').update({ sort_order: x.sort_order }).eq('id', x.id)))
  }

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="portfolio" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/portfolio" className="mb-4 inline-block text-sm text-ink-soft hover:text-twilight">← Your website</Link>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Your website</p>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">Packages</h1>
            <p className="mt-1 text-sm text-ink-soft">Use the switch to show or hide a package on your site. Drag the dots to change the order. Changes also appear in the Camrhia app.</p>
          </div>
          {!draft && <button className={btn} onClick={startNew}>+ New package</button>}
        </div>

        {msg && <p className="mb-4 rounded-xl bg-blush-wash px-4 py-2 text-sm text-twilight">{msg}</p>}

        {draft && (
          <section className={`${card} mb-6 space-y-4`}>
            <p className="font-fraunces text-xl font-semibold text-ink">{draft.id ? 'Edit package' : 'New package'}</p>
            <div>
              <label className={lab}>Package name</label>
              <input className={input} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Signature collection" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={lab}>Price</label>
                <input className={input} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="$3,500" />
              </div>
              <div>
                <label className={lab}>Coverage</label>
                <input className={input} value={draft.covers} onChange={(e) => setDraft({ ...draft, covers: e.target.value })} placeholder="8 hours of coverage" />
              </div>
            </div>
            <div>
              <label className={lab}>What is included</label>
              <textarea rows={5} className={input} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} placeholder="Online gallery, 500+ edited images, second shooter…" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={lab}>Session type</label>
                <select className={input} value={draft.session_type} onChange={(e) => setDraft({ ...draft, session_type: e.target.value })}>
                  {types.length === 0 && <option value={draft.session_type}>{typeLabel(draft.session_type)}</option>}
                  {types.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lab}>Gallery delivery (days after the session)</label>
                <input className={input} inputMode="numeric" value={draft.delivery_days} onChange={(e) => setDraft({ ...draft, delivery_days: e.target.value.replace(/[^0-9]/g, '') })} placeholder="e.g. 14" />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm text-ink">
              <Switch on={draft.show_public} onChange={(v) => setDraft({ ...draft, show_public: v })} label="Show on my website" />
              Show this package on my website
            </label>
            <div className="flex gap-3">
              <button className={btn} disabled={busy} onClick={saveDraft}>{busy ? 'Saving…' : 'Save package'}</button>
              <button className={btnGhost} onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </section>
        )}

        {pkgs === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : pkgs.length === 0 ? (
          <p className="text-sm text-ink-soft">No packages yet. Add your first one.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={pkgs.map((x) => x.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {pkgs.map((p) => (
                  <Row key={p.id} pkg={p} typeLabel={typeLabel(p.session_type)} onEdit={() => startEdit(p)} onDelete={() => remove(p)} onToggle={(v) => toggle(p, v)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </main>
    </div>
  )
}
