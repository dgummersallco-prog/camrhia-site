'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SceneSidebar from '@/app/components/SceneSidebar'
import ImportStart from './ImportStart'
import ShootRoom from './ShootRoom'
import { QUESTIONS, STYLE_LOOK, type Signature } from '@/lib/brief'

type Row = { id: string; title: string; status: string; created_at: string; gallery_photos: { count: number }[] }
type Tab = 'edit' | 'styles' | 'brain'
type Correction = {
  photo_id: string
  gallery_id: string
  light: string | null
  signature_id: string | null
  created_at: string
  manual: Record<string, number> | null
}

const PHRASE: Record<string, [string, string]> = {
  exposure: ['Brighten', 'Darken'],
  contrast: ['Add contrast', 'Soften contrast'],
  highlights: ['Boost highlights', 'Pull back highlights'],
  shadows: ['Lift shadows', 'Deepen shadows'],
  whites: ['Brighten whites', 'Tame whites'],
  blacks: ['Lift blacks', 'Deepen blacks'],
  temp: ['Warm up', 'Cool down'],
  tint: ['Add magenta', 'Add green'],
  vibrance: ['Boost vibrance', 'Tone down vibrance'],
  saturation: ['Boost color', 'Mute color'],
  sharpen: ['Sharpen', 'Soften'],
  noise: ['Reduce noise', 'Add grain'],
}

const FIELDS = [
  { key: 'style', label: 'Style' },
  { key: 'setting', label: 'Where' },
  { key: 'light', label: 'Light' },
  { key: 'mood', label: 'Mood' },
  { key: 'skin', label: 'Skin tones' },
]

function optionLabel(key: string, value: unknown): string | null {
  if (typeof value !== 'string' || !value) return null
  const q = QUESTIONS.find((x) => x.key === key)
  return q?.options.find((o) => o.value === value)?.label ?? null
}

function hasFix(c: Correction): boolean {
  if (!c.manual) return false
  return Object.entries(c.manual).some(([k, v]) => !!v && typeof v === 'number' && !!PHRASE[k])
}

function summarize(items: Correction[]) {
  const fixedItems = items.filter(hasFix)
  const tally: Record<string, { up: number; down: number; sum: number }> = {}
  for (const c of fixedItems) {
    for (const [k, v] of Object.entries(c.manual ?? {})) {
      if (!v || typeof v !== 'number' || !PHRASE[k]) continue
      const t = tally[k] ?? (tally[k] = { up: 0, down: 0, sum: 0 })
      t.sum += v
      if (v > 0) t.up++
      else t.down++
    }
  }
  const habits = Object.entries(tally)
    .map(([k, t]) => ({ key: k, n: t.up + t.down, sum: t.sum, phrase: PHRASE[k][t.up >= t.down ? 0 : 1] }))
    .sort((a, b) => b.n - a.n)
  return { checked: items.length, fixed: fixedItems.length, habits }
}

const tileBtn = (on: boolean) =>
  `rounded-2xl border p-5 text-left transition ${on ? 'border-[rgb(var(--scene-b,201_133_136))] bg-[color-mix(in_srgb,rgb(var(--scene-a,201_133_136))_65%,#e6e6e6)] text-white' : 'border-white/70 bg-white/60 text-ink hover:-translate-y-0.5 hover:border-twilight'}`
const primary = 'rounded-full bg-[var(--color-twilight)] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
const quiet = 'rounded-full border border-white/15 px-4 py-2 text-sm text-ink-soft transition hover:border-white/35 hover:text-ink disabled:opacity-40'

export default function EditingRoom() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('edit')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [sigs, setSigs] = useState<Signature[] | null>(null)
  const [corr, setCorr] = useState<Correction[] | null>(null)
  const [name, setName] = useState('')
  const [form, setForm] = useState<Record<string, string>>({})
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [shootId, setShootId] = useState<string | null>(null)

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login?next=/edit'); return }
      const uid = data.session.user.id
      setUserId(uid)
      const [g, sg, co] = await Promise.all([
        sb.from('galleries').select('id, title, status, created_at, gallery_photos(count)').eq('owner_id', uid).order('created_at', { ascending: false }),
        sb.from('edit_signatures').select('id, name, answers, strength').eq('owner_id', uid).order('created_at', { ascending: true }),
        sb.from('edit_corrections').select('photo_id, gallery_id, light, signature_id, created_at, manual:final->manual').eq('owner_id', uid).order('created_at', { ascending: false }).limit(5000),
      ])
      if (g.error) { setError(g.error.message); setRows([]) } else setRows((g.data ?? []) as unknown as Row[])
      setSigs(((sg.data ?? []) as Signature[]).map((s) => ({ ...s, strength: Number(s.strength) })))
      setCorr((co.data ?? []) as unknown as Correction[])
    })
  }, [router])

  const latest = useMemo(() => {
    if (!corr) return null
    const seen = new Set<string>()
    const out: Correction[] = []
    for (const c of corr) {
      if (seen.has(c.photo_id)) continue
      seen.add(c.photo_id)
      out.push(c)
    }
    return out
  }, [corr])

  const brain = useMemo(() => {
    if (!latest) return null
    const all = summarize(latest)
    const shoots = new Set(latest.map((c) => c.gallery_id)).size
    const habits = all.habits.filter((h) => h.n >= 3).slice(0, 8)

    const byGallery = new Map<string, Correction[]>()
    for (const c of latest) {
      const list = byGallery.get(c.gallery_id) ?? []
      list.push(c)
      byGallery.set(c.gallery_id, list)
    }
    const scores = [...byGallery.entries()].slice(0, 8).map(([gid, items]) => {
      const s = summarize(items)
      return { gid, checked: s.checked, pct: Math.round((100 * (s.checked - s.fixed)) / s.checked) }
    })

    const byLight = new Map<string, Correction[]>()
    for (const c of latest) {
      if (!c.light) continue
      const list = byLight.get(c.light) ?? []
      list.push(c)
      byLight.set(c.light, list)
    }
    const situations = [...byLight.entries()]
      .map(([light, items]) => {
        const s = summarize(items)
        const top = s.habits.filter((h) => s.fixed >= 3 && h.n / s.fixed >= 0.4).slice(0, 3)
        return { light, fixed: s.fixed, top }
      })
      .filter((x) => x.top.length > 0)
      .sort((a, b) => b.fixed - a.fixed)

    return { checked: all.checked, fixed: all.fixed, shoots, habits, scores, situations }
  }, [latest])

  const suggestions = useMemo(() => {
    if (!latest || !sigs) return []
    const out: { sig: Signature; fixed: number; useful: { key: string; n: number; phrase: string }[]; usual: Record<string, number> }[] = []
    for (const sig of sigs) {
      const learnedRaw = (sig.answers as Record<string, unknown>).learnedAt
      const learned = typeof learnedRaw === 'string' ? new Date(learnedRaw).getTime() : 0
      const items = latest.filter((c) => c.signature_id === sig.id && new Date(c.created_at).getTime() > learned)
      const s = summarize(items)
      if (s.fixed < 5) continue
      const useful = s.habits.filter((h) => h.n / s.fixed >= 0.4)
      if (useful.length === 0) continue
      const usual: Record<string, number> = {}
      for (const h of useful) usual[h.key] = Math.round((h.sum / s.fixed) * 1000) / 1000
      out.push({ sig, fixed: s.fixed, useful, usual })
    }
    return out
  }, [latest, sigs])

  async function addToStyle(sig: Signature, usual: Record<string, number>) {
    const sb = supabase
    if (!sb) return
    setAdding(sig.id)
    const a = sig.answers as Record<string, unknown>
    const tweak: Record<string, number> = { ...((a.tweak ?? {}) as Record<string, number>) }
    for (const [k, v] of Object.entries(usual)) tweak[k] = Math.round(((tweak[k] ?? 0) + v) * 1000) / 1000
    for (const k of Object.keys(tweak)) if (!tweak[k]) delete tweak[k]
    const answers = { ...a, tweak, learnedAt: new Date().toISOString() }
    const { error: e } = await sb.from('edit_signatures').update({ answers }).eq('id', sig.id)
    setAdding(null)
    if (e) { setError(e.message); return }
    setSigs((prev) => (prev ?? []).map((s) => (s.id === sig.id ? { ...s, answers: answers as unknown as Signature['answers'] } : s)))
  }

  async function createStyle() {
    const sb = supabase
    const n = name.trim()
    if (!sb || !userId || !n || !form.style || creating) return
    setCreating(true)
    const answers: Record<string, string> = {}
    for (const f of FIELDS) if (form[f.key]) answers[f.key] = form[f.key]
    const look = STYLE_LOOK[form.style]
    if (look) answers.look = look
    const { data: row } = await sb
      .from('edit_signatures')
      .insert({ owner_id: userId, name: n, answers, strength: 0.8 })
      .select('id, name, answers, strength')
      .maybeSingle()
    setCreating(false)
    if (row) {
      setSigs((prev) => [...(prev ?? []), { ...(row as Signature), strength: Number((row as Signature).strength) }])
      setName('')
      setForm({})
    }
  }

  async function saveRename(id: string) {
    const sb = supabase
    const n = renameVal.trim()
    if (!sb || !n) { setRenaming(null); return }
    await sb.from('edit_signatures').update({ name: n }).eq('id', id)
    setSigs((prev) => (prev ?? []).map((s) => (s.id === id ? { ...s, name: n } : s)))
    setRenaming(null)
  }

  async function removeStyle(s: Signature) {
    const sb = supabase
    if (!sb) return
    if (!window.confirm(`Delete the signature style "${s.name}"?`)) return
    await sb.from('edit_signatures').delete().eq('id', s.id)
    setSigs((prev) => (prev ?? []).filter((x) => x.id !== s.id))
  }

  async function backToStart() {
    setShootId(null)
    const sb = supabase
    if (!sb || !userId) return
    const g = await sb.from('galleries').select('id, title, status, created_at, gallery_photos(count)').eq('owner_id', userId).order('created_at', { ascending: false })
    if (!g.error) setRows((g.data ?? []) as unknown as Row[])
  }

  const titleOf = (gid: string) => rows?.find((r) => r.id === gid)?.title ?? 'A shoot'

  return (
    <div className="min-h-screen bg-paper text-ink xl:pl-60">
      <SceneSidebar
        groups={[
          { items: [{ href: '/dashboard', label: '← Back to dashboard' }] },
          { label: 'The Editing Room', items: [
            { href: '/edit', label: 'Edit a shoot', onClick: () => setTab('edit') },
            { href: '/edit?tab=styles', label: 'My styles', onClick: () => setTab('styles') },
            { href: '/edit?tab=brain', label: 'Cami', onClick: () => setTab('brain') },
          ] },
        ]}
        activeHref={tab === 'edit' ? '/edit' : tab === 'styles' ? '/edit?tab=styles' : '/edit?tab=brain'}
        homeHref="/edit"
        onSignOut={async () => { if (supabase) await supabase.auth.signOut(); window.location.href = '/login' }}
      />
      <div className={`mx-auto px-6 py-10 ${shootId ? 'max-w-7xl' : 'max-w-5xl'}`}>
        {!shootId && <h1 className="mt-2 font-fraunces text-4xl text-ink">The editing room</h1>}

        {error && <p className="mt-6 text-sm text-red-700">{error}</p>}

        {tab === 'edit' && (
          <>
            {shootId ? <div className="room-light mt-2"><ShootRoom galleryId={shootId} onBack={backToStart} /></div> : <ImportStart rows={rows} userId={userId} onOpen={setShootId} />}
          </>
        )}

        {tab === 'styles' && (
          <div className="mt-8">
            <p className="max-w-xl text-ink-soft">Your signature styles. Pick one at the start of a shoot and the editing room starts from your look.</p>

            <div className="mt-8 rounded-2xl border border-white/70 bg-white/60 p-6">
              <p className="font-fraunces text-xl text-ink">Create a style</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name it, like Senior girls or Team Flames"
                className="mt-4 w-full rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-twilight"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS.map((f) => {
                  const q = QUESTIONS.find((x) => x.key === f.key)
                  return (
                    <label key={f.key} className="block text-xs text-ink-soft">
                      {f.label}
                      <select
                        value={form[f.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-twilight"
                      >
                        <option value="">{f.key === 'style' ? 'Choose…' : 'Any'}</option>
                        {q?.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </label>
                  )
                })}
              </div>
              <button className={`${primary} mt-5`} disabled={!name.trim() || !form.style || creating} onClick={createStyle}>
                {creating ? 'Saving…' : 'Save style'}
              </button>
            </div>

            {sigs === null && <p className="mt-8 text-sm text-ink-soft">Loading…</p>}
            {sigs && sigs.length === 0 && (
              <p className="mt-8 rounded-2xl border border-white/70 bg-white/60 p-8 text-ink-soft">No signature styles yet. Create your first one above.</p>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(sigs ?? []).map((s) => {
                const a = s.answers as Record<string, unknown>
                const bits = FIELDS.map((f) => optionLabel(f.key, a[f.key])).filter(Boolean)
                return (
                  <div key={s.id} className="rounded-2xl border border-white/70 bg-white/60 p-6">
                    {renaming === s.id ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void saveRename(s.id) }}
                          className="w-full rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-twilight"
                        />
                        <button className={quiet} onClick={() => saveRename(s.id)}>Save</button>
                      </div>
                    ) : (
                      <p className="font-fraunces text-xl text-ink">{s.name}</p>
                    )}
                    <p className="mt-2 text-sm text-ink-soft">{bits.length ? bits.join(' · ') : 'Your custom tweaks'}</p>
                    <div className="mt-5 flex gap-2">
                      <button className={quiet} onClick={() => { setRenaming(s.id); setRenameVal(s.name) }}>Rename</button>
                      <button className={quiet} onClick={() => removeStyle(s)}>Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === 'brain' && (
          <div className="mt-8">
            <p className="max-w-xl text-ink-soft">What Cami has noticed from the fixes you make while you review photos.</p>

            {brain === null && <p className="mt-8 text-sm text-ink-soft">Loading…</p>}
            {brain && brain.checked === 0 && (
              <p className="mt-8 rounded-2xl border border-white/70 bg-white/60 p-8 text-ink-soft">
                Nothing yet. Review a few photos in a shoot and fix what you want to change. Cami starts noticing your habits right away.
              </p>
            )}
            {brain && brain.checked > 0 && (
              <>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/70 bg-white/60 p-6">
                    <p className="font-fraunces text-3xl text-ink">{brain.shoots}</p>
                    <p className="mt-1 text-sm text-ink-soft">{brain.shoots === 1 ? 'shoot' : 'shoots'} reviewed</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/60 p-6">
                    <p className="font-fraunces text-3xl text-ink">{brain.checked}</p>
                    <p className="mt-1 text-sm text-ink-soft">photos checked</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/60 p-6">
                    <p className="font-fraunces text-3xl text-ink">{brain.fixed}</p>
                    <p className="mt-1 text-sm text-ink-soft">photos you fixed by hand</p>
                  </div>
                </div>

                <p className="mt-10 font-fraunces text-xl text-ink">How Cami did on each shoot</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {brain.scores.map((sc) => (
                    <div key={sc.gid} className="rounded-2xl border border-white/70 bg-white/60 p-5">
                      <p className="truncate text-ink">{titleOf(sc.gid)}</p>
                      <p className="mt-1 text-sm text-ink-soft">Cami got {sc.pct}% right · {sc.checked} {sc.checked === 1 ? 'photo' : 'photos'} checked</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/50">
                        <div className="h-full rounded-full bg-[var(--color-twilight)]" style={{ width: `${sc.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-10 font-fraunces text-xl text-ink">Your habits by light</p>
                {brain.situations.length === 0 ? (
                  <p className="mt-3 text-ink-soft">Not enough fixes yet to see a pattern for each kind of light. Keep reviewing and they show up here.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {brain.situations.map((sit) => (
                      <div key={sit.light} className="rounded-2xl border border-white/70 bg-white/60 p-5">
                        <p className="text-lg text-ink">{optionLabel('light', sit.light) ?? sit.light}</p>
                        <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                          {sit.top.map((h) => <li key={h.key}>{h.phrase} · {h.n} of {sit.fixed} photos</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-10 font-fraunces text-xl text-ink">Your habits overall</p>
                {brain.habits.length === 0 ? (
                  <p className="mt-3 text-ink-soft">Not enough fixes yet to see a pattern. Keep reviewing and they show up here.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {brain.habits.map((h) => (
                      <div key={h.key} className="rounded-2xl border border-white/70 bg-white/60 p-5">
                        <p className="text-lg text-ink">{h.phrase}</p>
                        <p className="mt-1 text-sm text-ink-soft">{h.n} of {brain.fixed} photos you fixed</p>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.length > 0 && (
                  <>
                    <p className="mt-10 font-fraunces text-xl text-ink">Make Cami&apos;s edits yours</p>
                    <p className="mt-2 max-w-xl text-ink-soft">You keep making the same fixes. Add them to your style and they happen on their own next time.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {suggestions.map(({ sig, fixed, useful, usual }) => (
                        <div key={sig.id} className="rounded-2xl border border-white/70 bg-white/60 p-5">
                          <p className="font-fraunces text-lg text-ink">{sig.name}</p>
                          <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                            {useful.map((h) => <li key={h.key}>{h.phrase} · {h.n} of {fixed} photos</li>)}
                          </ul>
                          <button className={`${primary} mt-4`} disabled={adding === sig.id} onClick={() => addToStyle(sig, usual)}>
                            {adding === sig.id ? 'Adding…' : 'Add these to this style'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
