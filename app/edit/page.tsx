'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  `rounded-2xl border p-5 text-left transition ${on ? 'border-twilight bg-twilight text-white' : 'border-white/10 bg-[#151518] text-white hover:-translate-y-0.5 hover:border-twilight'}`
const primary = 'rounded-full bg-[var(--color-twilight)] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
const quiet = 'rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-40'

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

  const titleOf = (gid: string) => rows?.find((r) => r.id === gid)?.title ?? 'A shoot'

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#ececf0]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-white/50 transition hover:text-white">← Back to Camrhia</Link>
          <Link href="/galleries" className="text-sm text-white/50 transition hover:text-white">New shoot? Create it in Galleries</Link>
        </div>

        <h1 className="mt-12 font-fraunces text-4xl text-white">The editing room</h1>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {([['edit', 'Edit', 'Pick a shoot and start'], ['styles', 'My styles', 'Your signature looks'], ['brain', 'Cami', 'Your AI editing assistant']] as [Tab, string, string][]).map(([k, label, sub]) => (
            <button key={k} className={tileBtn(tab === k)} onClick={() => setTab(k)}>
              <p className="font-fraunces text-xl">{label}</p>
              <p className={`mt-1 text-sm ${tab === k ? 'text-white/80' : 'text-white/50'}`}>{sub}</p>
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-sm text-red-300">{error}</p>}

        {tab === 'edit' && (
          <>
            <p className="mt-8 max-w-xl text-white/55">Pick a shoot. We walk it from raw photos to a finished gallery, one step at a time.</p>

            {rows === null && <p className="mt-10 text-sm text-white/40">Loading…</p>}
            {rows && rows.length === 0 && !error && (
              <p className="mt-10 rounded-2xl border border-white/10 bg-[#151518] p-8 text-white/60">
                No shoots yet. Create a gallery for your shoot first, then come back here to edit it.
              </p>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          </>
        )}

        {tab === 'styles' && (
          <div className="mt-8">
            <p className="max-w-xl text-white/55">Your signature styles. Pick one at the start of a shoot and the editing room starts from your look.</p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-[#151518] p-6">
              <p className="font-fraunces text-xl text-white">Create a style</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name it, like Senior girls or Team Flames"
                className="mt-4 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {FIELDS.map((f) => {
                  const q = QUESTIONS.find((x) => x.key === f.key)
                  return (
                    <label key={f.key} className="block text-xs text-white/50">
                      {f.label}
                      <select
                        value={form[f.key] ?? ''}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
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

            {sigs === null && <p className="mt-8 text-sm text-white/40">Loading…</p>}
            {sigs && sigs.length === 0 && (
              <p className="mt-8 rounded-2xl border border-white/10 bg-[#151518] p-8 text-white/60">No signature styles yet. Create your first one above.</p>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {(sigs ?? []).map((s) => {
                const a = s.answers as Record<string, unknown>
                const bits = FIELDS.map((f) => optionLabel(f.key, a[f.key])).filter(Boolean)
                return (
                  <div key={s.id} className="rounded-2xl border border-white/10 bg-[#151518] p-6">
                    {renaming === s.id ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') void saveRename(s.id) }}
                          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-white/30"
                        />
                        <button className={quiet} onClick={() => saveRename(s.id)}>Save</button>
                      </div>
                    ) : (
                      <p className="font-fraunces text-xl text-white">{s.name}</p>
                    )}
                    <p className="mt-2 text-sm text-white/50">{bits.length ? bits.join(' · ') : 'Your custom tweaks'}</p>
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
            <p className="max-w-xl text-white/55">What Cami has noticed from the fixes you make while you review photos.</p>

            {brain === null && <p className="mt-8 text-sm text-white/40">Loading…</p>}
            {brain && brain.checked === 0 && (
              <p className="mt-8 rounded-2xl border border-white/10 bg-[#151518] p-8 text-white/60">
                Nothing yet. Review a few photos in a shoot and fix what you want to change. Cami starts noticing your habits right away.
              </p>
            )}
            {brain && brain.checked > 0 && (
              <>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-[#151518] p-6">
                    <p className="font-fraunces text-3xl text-white">{brain.shoots}</p>
                    <p className="mt-1 text-sm text-white/50">{brain.shoots === 1 ? 'shoot' : 'shoots'} reviewed</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#151518] p-6">
                    <p className="font-fraunces text-3xl text-white">{brain.checked}</p>
                    <p className="mt-1 text-sm text-white/50">photos checked</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#151518] p-6">
                    <p className="font-fraunces text-3xl text-white">{brain.fixed}</p>
                    <p className="mt-1 text-sm text-white/50">photos you fixed by hand</p>
                  </div>
                </div>

                <p className="mt-10 font-fraunces text-xl text-white">How Cami did on each shoot</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {brain.scores.map((sc) => (
                    <div key={sc.gid} className="rounded-2xl border border-white/10 bg-[#151518] p-5">
                      <p className="truncate text-white">{titleOf(sc.gid)}</p>
                      <p className="mt-1 text-sm text-white/50">Cami got {sc.pct}% right · {sc.checked} {sc.checked === 1 ? 'photo' : 'photos'} checked</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-[var(--color-twilight)]" style={{ width: `${sc.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="mt-10 font-fraunces text-xl text-white">Your habits by light</p>
                {brain.situations.length === 0 ? (
                  <p className="mt-3 text-white/55">Not enough fixes yet to see a pattern for each kind of light. Keep reviewing and they show up here.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {brain.situations.map((sit) => (
                      <div key={sit.light} className="rounded-2xl border border-white/10 bg-[#151518] p-5">
                        <p className="text-lg text-white">{optionLabel('light', sit.light) ?? sit.light}</p>
                        <ul className="mt-3 space-y-1 text-sm text-white/70">
                          {sit.top.map((h) => <li key={h.key}>{h.phrase} · {h.n} of {sit.fixed} photos</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-10 font-fraunces text-xl text-white">Your habits overall</p>
                {brain.habits.length === 0 ? (
                  <p className="mt-3 text-white/55">Not enough fixes yet to see a pattern. Keep reviewing and they show up here.</p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {brain.habits.map((h) => (
                      <div key={h.key} className="rounded-2xl border border-white/10 bg-[#151518] p-5">
                        <p className="text-lg text-white">{h.phrase}</p>
                        <p className="mt-1 text-sm text-white/50">{h.n} of {brain.fixed} photos you fixed</p>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.length > 0 && (
                  <>
                    <p className="mt-10 font-fraunces text-xl text-white">Make Cami&apos;s edits yours</p>
                    <p className="mt-2 max-w-xl text-white/55">You keep making the same fixes. Add them to your style and they happen on their own next time.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {suggestions.map(({ sig, fixed, useful, usual }) => (
                        <div key={sig.id} className="rounded-2xl border border-white/10 bg-[#151518] p-5">
                          <p className="font-fraunces text-lg text-white">{sig.name}</p>
                          <ul className="mt-3 space-y-1 text-sm text-white/70">
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
