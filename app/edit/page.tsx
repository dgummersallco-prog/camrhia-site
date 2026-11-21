'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SceneSidebar from '@/app/components/SceneSidebar'
import ImportStart from './ImportStart'
import ShootRoom from './ShootRoom'
import TeachStyle from './TeachStyle'
import StyleBuilder from './StyleBuilder'
import { exportStyle, parseStyleFile, pushVersion, type StyleSnap } from '@/lib/styleFile'
import StyleNotes, { type StyleUse } from './StyleNotes'
import { QUESTIONS, type Signature } from '@/lib/brief'
import { EXPORT_PRESETS } from '@/lib/exportPreset'
import { TOOLS } from '@/lib/tools'

type Row = { id: string; title: string; status: string; created_at: string; edit_archived?: boolean | null; gallery_photos: { count: number }[] }
type Tab = 'edit' | 'styles' | 'brain' | 'settings' | 'shortcuts'
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

const SHORTCUT_GROUPS: { title: string; items: [string, string][] }[] = [
  { title: 'Culling', items: [['← →', 'Previous or next photo'], ['P', 'Pick'], ['M', 'Maybe'], ['X', 'Cut'], ['Space', 'Rescue a cut photo (in the cuts view)']] },
  { title: 'Editing', items: [['← →', 'Previous or next photo'], ['Enter', 'Next photo'], ['\\', 'Flip between before and after'], ['Esc', 'Leave spot removal or a mask tool'], ['[  ]', 'Make the spot or brush smaller or bigger']] },
  { title: 'Undo and settings', items: [['Cmd or Ctrl + Z', 'Undo'], ['Shift + Cmd or Ctrl + Z', 'Redo'], ['Ctrl + Y', 'Redo (Windows)'], ['Shift + Cmd or Ctrl + C', 'Copy this photo\'s settings'], ['Shift + Cmd or Ctrl + V', 'Paste settings onto this photo']] },
]

const HABIT_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Light and tone', keys: ['exposure', 'highlights', 'shadows', 'whites', 'blacks', 'contrast'] },
  { title: 'Color', keys: ['temp', 'tint', 'vibrance', 'saturation'] },
  { title: 'Detail', keys: ['sharpen', 'noise'] },
]

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
  const [dPreset, setDPreset] = useState('original')
  const [dMark, setDMark] = useState('')
  const [dSaved, setDSaved] = useState(false)
  const [habitMsg, setHabitMsg] = useState('')
  const [localUse, setLocalUse] = useState<{ photos: number; masks: number; heals: number; curves: number } | null>(null)
  const [lightMsg, setLightMsg] = useState('')
  useEffect(() => {
    try {
      const pr = window.localStorage.getItem('camrhia:exportPreset')
      if (pr && EXPORT_PRESETS.some((x) => x.id === pr)) setDPreset(pr)
      setDMark(window.localStorage.getItem('camrhia:exportMark') ?? '')
    } catch { /* ignore */ }
  }, [])
  function saveDefaults() {
    try {
      window.localStorage.setItem('camrhia:exportPreset', dPreset)
      window.localStorage.setItem('camrhia:exportMark', dMark.trim())
    } catch { /* ignore */ }
    setDSaved(true)
    setTimeout(() => setDSaved(false), 2500)
  }
  async function saveHabitsStyle() {
    const sb = supabase
    if (!sb || !userId || !brain) return
    const usual: Record<string, number> = {}
    for (const h of brain.habits) if (h.n / brain.fixed >= 0.4) usual[h.key] = Math.round((h.sum / brain.fixed) * 1000) / 1000
    if (Object.keys(usual).length === 0) { setHabitMsg('Keep reviewing. A few more fixes and a pattern shows up.'); return }
    const answers = { skin: 'yes', look: 'natural', tweak: usual, learnedAt: new Date().toISOString() }
    const { data: row, error: e } = await sb.from('edit_signatures').insert({ owner_id: userId, name: 'My usual edit', answers, strength: 0.8 }).select('id, name, answers, strength').maybeSingle()
    if (e || !row) { setHabitMsg(e?.message ?? 'Could not save the style.'); return }
    setSigs((prev) => [...(prev ?? []), { ...(row as Signature), strength: Number((row as Signature).strength) }])
    setHabitMsg('Saved as "My usual edit" in My styles.')
  }
  async function saveLightStyle(light: string, usual: Record<string, number>) {
    const sb = supabase
    if (!sb || !userId) return
    const label = optionLabel('light', light) ?? light
    const answers = { skin: 'yes', look: 'natural', light, tweak: usual, learnedAt: new Date().toISOString() }
    const { data: row, error: e } = await sb.from('edit_signatures').insert({ owner_id: userId, name: `My ${label.toLowerCase()} edit`, answers, strength: 0.8 }).select('id, name, answers, strength').maybeSingle()
    if (e || !row) { setLightMsg(e?.message ?? 'Could not save the style.'); return }
    setSigs((prev) => [...(prev ?? []), { ...(row as Signature), strength: Number((row as Signature).strength) }])
    setLightMsg(`Saved as "My ${label.toLowerCase()} edit" in My styles.`)
  }
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [sigs, setSigs] = useState<Signature[] | null>(null)
  const [corr, setCorr] = useState<Correction[] | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const [shootId, setShootId] = useState<string | null>(null)
  const [teachFor, setTeachFor] = useState<string | null>(null)
  const [histFor, setHistFor] = useState<string | null>(null)
  const [importMsg, setImportMsg] = useState('')
  const [styleMode, setStyleMode] = useState<null | 'build' | 'teach'>(null)
  const [buildFor, setBuildFor] = useState<Signature | null>(null)
  const [stages, setStages] = useState<Record<string, { culled: number; edited: number }> | null>(null)

  async function loadStages(ids: string[]) {
    const sb = supabase
    if (!sb || ids.length === 0) { setStages({}); return }
    const out: Record<string, { culled: number; edited: number }> = {}
    for (let from = 0; from < 20000; from += 1000) {
      const { data, error: e } = await sb.from('gallery_photos').select('gallery_id, cull_label, enhanced').in('gallery_id', ids).range(from, from + 999)
      if (e) return
      for (const r of (data ?? []) as { gallery_id: string; cull_label: string | null; enhanced: boolean | null }[]) {
        const o = out[r.gallery_id] ?? (out[r.gallery_id] = { culled: 0, edited: 0 })
        if (r.cull_label) o.culled++
        if (r.enhanced) o.edited++
      }
      if (!data || data.length < 1000) break
    }
    setStages(out)
  }

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login?next=/edit'); return }
      const uid = data.session.user.id
      setUserId(uid)
      const [g, sg, co] = await Promise.all([
        sb.from('galleries').select('id, title, status, created_at, edit_archived, gallery_photos(count)').eq('owner_id', uid).order('created_at', { ascending: false }),
        sb.from('edit_signatures').select('id, name, answers, strength').eq('owner_id', uid).order('created_at', { ascending: true }),
        sb.from('edit_corrections').select('photo_id, gallery_id, light, signature_id, created_at, manual:final->manual').eq('owner_id', uid).order('created_at', { ascending: false }).limit(5000),
      ])
      if (g.error) { setError(g.error.message); setRows([]) } else { setRows((g.data ?? []) as unknown as Row[]); void loadStages(((g.data ?? []) as unknown as Row[]).map((x) => x.id)) }
      setSigs(((sg.data ?? []) as Signature[]).map((s) => ({ ...s, strength: Number(s.strength) })))
      setCorr((co.data ?? []) as unknown as Correction[])
      const le = await sb.from('gallery_photos').select('local_edits').not('local_edits', 'is', null).limit(3000)
      if (!le.error) {
        const out = { photos: 0, masks: 0, heals: 0, curves: 0 }
        for (const r of (le.data ?? []) as { local_edits: { masks?: unknown[]; heals?: unknown[]; curve?: unknown[] } | null }[]) {
          const l = r.local_edits
          if (!l) continue
          const m = l.masks?.length ?? 0
          const h = l.heals?.length ?? 0
          const c = l.curve && l.curve.length > 0 ? 1 : 0
          if (m + h + c === 0) continue
          out.photos++
          out.masks += m
          out.heals += h
          out.curves += c
        }
        setLocalUse(out)
      }
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
    const habits = all.habits.filter((h) => h.n >= 3)

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
        const usual: Record<string, number> = {}
        for (const h of s.habits) if (s.fixed >= 3 && h.n / s.fixed >= 0.4) usual[h.key] = Math.round((h.sum / s.fixed) * 1000) / 1000
        return { light, fixed: s.fixed, top, usual }
      })
      .filter((x) => x.fixed > 0)
      .sort((a, b) => b.fixed - a.fixed)

    return { checked: all.checked, fixed: all.fixed, shoots, habits, scores, situations }
  }, [latest])

  const styleUse = useMemo(() => {
    const out: Record<string, StyleUse> = {}
    if (!corr) return out
    const shootSets = new Map<string, Set<string>>()
    for (const c of latest ?? []) {
      if (!c.signature_id) continue
      const o = out[c.signature_id] ?? (out[c.signature_id] = { shoots: 0, checked: 0, fixed: 0 })
      o.checked++
      if (hasFix(c)) o.fixed++
      const set = shootSets.get(c.signature_id) ?? new Set<string>()
      set.add(c.gallery_id)
      shootSets.set(c.signature_id, set)
    }
    for (const [id, set] of shootSets) out[id].shoots = set.size
    return out
  }, [corr, latest])

  const glance = useMemo(() => {
    const list = rows ?? []
    const photos = list.reduce((n, r) => n + (r.gallery_photos?.[0]?.count ?? 0), 0)
    let culled = 0
    let edited = 0
    for (const v of Object.values(stages ?? {})) { culled += v.culled; edited += v.edited }
    return { shoots: list.length, photos, culled, edited, sent: list.filter((r) => r.status === 'published').length }
  }, [rows, stages])

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
    const answers = { ...a, tweak, learnedAt: new Date().toISOString(), versions: pushVersion(sig) }
    const { error: e } = await sb.from('edit_signatures').update({ answers }).eq('id', sig.id)
    setAdding(null)
    if (e) { setError(e.message); return }
    setSigs((prev) => (prev ?? []).map((s) => (s.id === sig.id ? { ...s, answers: answers as unknown as Signature['answers'] } : s)))
  }

  async function importStyleFile(f: File | undefined) {
    const sb = supabase
    if (!sb || !userId || !f) return
    const r = parseStyleFile(await f.text(), f.name)
    if ('error' in r) { setImportMsg(r.error); return }
    const { data: row, error: e } = await sb.from('edit_signatures').insert({ owner_id: userId, name: r.name, answers: r.answers, strength: r.strength }).select('id, name, answers, strength').maybeSingle()
    if (e || !row) { setImportMsg(e?.message ?? 'Could not import that style.'); return }
    setSigs((prev) => [...(prev ?? []), { ...(row as Signature), strength: Number((row as Signature).strength) }])
    setImportMsg(`Imported "${r.name}".`)
  }

  async function restoreVersion(s: Signature, v: StyleSnap) {
    const sb = supabase
    if (!sb) return
    const answers = { ...v.answers, versions: pushVersion(s) }
    const { error: e } = await sb.from('edit_signatures').update({ name: v.name, answers, strength: v.strength }).eq('id', s.id)
    if (e) { setError(e.message); return }
    setSigs((prev) => (prev ?? []).map((x) => (x.id === s.id ? { ...x, name: v.name, answers: answers as unknown as Signature['answers'], strength: v.strength } : x)))
    setHistFor(null)
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
    const g = await sb.from('galleries').select('id, title, status, created_at, edit_archived, gallery_photos(count)').eq('owner_id', userId).order('created_at', { ascending: false })
    if (!g.error) { setRows((g.data ?? []) as unknown as Row[]); void loadStages(((g.data ?? []) as unknown as Row[]).map((x) => x.id)) }
  }

  const inProgress = (rows ?? []).filter((r) => (r.gallery_photos?.[0]?.count ?? 0) > 0 && r.status !== 'published').length

  const titleOf = (gid: string) => rows?.find((r) => r.id === gid)?.title ?? 'A shoot'

  return (
    <div className="min-h-screen bg-paper text-ink xl:pl-60">
      <SceneSidebar
        groups={[
          { items: [{ href: '/dashboard', label: '← Back to dashboard' }] },
          { label: 'The Editing Room', items: [
            { href: '/edit', label: 'Shoots', badge: inProgress, onClick: () => { setTab('edit'); if (shootId) void backToStart() } },
            { href: '/edit?tab=styles', label: 'My styles', onClick: () => setTab('styles') },
            { href: '/edit?tab=brain', label: 'My habits', onClick: () => setTab('brain') },
            { href: '/edit?tab=settings', label: 'Settings', onClick: () => setTab('settings') },
            { href: '/edit?tab=shortcuts', label: 'Shortcuts', onClick: () => setTab('shortcuts') },
          ] },
        ]}
        activeHref={tab === 'edit' ? '/edit' : `/edit?tab=${tab}`}
        homeHref="/edit"
        onSignOut={async () => { if (supabase) await supabase.auth.signOut(); window.location.href = '/login' }}
      />
      <div className={`mx-auto px-6 py-10 ${shootId ? 'max-w-none' : 'max-w-5xl'}`}>
        {!shootId && <h1 className="mt-2 font-fraunces text-4xl text-ink">The editing room</h1>}

        {error && <p className="mt-6 text-sm text-red-700">{error}</p>}

        {tab === 'edit' && (
          <>
            {shootId ? <div className="room-light mt-2"><ShootRoom galleryId={shootId} onBack={backToStart} /></div> : <ImportStart rows={rows} stages={stages} userId={userId} onOpen={setShootId} onRows={(f) => setRows((p) => f(p ?? []))} />}
          </>
        )}

        {tab === 'styles' && (
          <div className="mt-8">
            <p className="font-fraunces text-3xl text-ink">My styles</p>
            <p className="mt-1 max-w-xl text-ink-soft">Your looks. Pick one at the start of a shoot and the editing room starts from it.</p>

            {styleMode === 'build' && userId && (
              <div className="room-light mt-8">
                <StyleBuilder
                  key={buildFor?.id ?? 'new'}
                  userId={userId}
                  target={buildFor}
                  onClose={() => { setStyleMode(null); setBuildFor(null) }}
                  onSaved={(sg) => {
                    setSigs((prev) => (buildFor ? (prev ?? []).map((x) => (x.id === sg.id ? sg : x)) : [...(prev ?? []), sg]))
                    setStyleMode(null)
                    setBuildFor(null)
                  }}
                />
              </div>
            )}

            {styleMode === 'teach' && userId && (
              <div className="mt-8">
                <button className="text-sm text-ink-soft transition hover:text-ink" onClick={() => setStyleMode(null)}>← All styles</button>
                <div className="mt-4">
                  <TeachStyle userId={userId} onCreated={(sg) => setSigs((prev) => [...(prev ?? []), sg])} />
                </div>
              </div>
            )}

            {styleMode === null && (
              <>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/70 bg-white/60 p-6">
                    <p className="font-fraunces text-2xl text-ink">Build a style</p>
                    <p className="mt-2 text-sm text-ink-soft">Set every dial yourself and see it on one of your own photos. For when you know exactly the look you want.</p>
                    <button className={`${primary} mt-5`} onClick={() => { setBuildFor(null); setStyleMode('build') }}>Build a style</button>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/60 p-6">
                    <p className="font-fraunces text-2xl text-ink">Teach Camri from photos</p>
                    <p className="mt-2 text-sm text-ink-soft">Drop in photos you have already edited and Camri learns the look from them.</p>
                    <button className={`${quiet} mt-5`} onClick={() => setStyleMode('teach')}>Teach from photos</button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label className={`${quiet} cursor-pointer`}>
                    Import a style file
                    <input type="file" accept=".json,.xmp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void importStyleFile(f) }} />
                  </label>
                  <span className="text-xs text-ink-soft">A Camrhia style file, or a Lightroom preset (.xmp).</span>
                  {importMsg && <span className="text-sm text-ink-soft">{importMsg}</span>}
                </div>

                {sigs === null && <p className="mt-8 text-sm text-ink-soft">Loading…</p>}
                {sigs && sigs.length === 0 && (
                  <p className="mt-8 rounded-2xl border border-white/70 bg-white/60 p-8 text-ink-soft">No styles yet. Build one, or teach Camri from photos.</p>
                )}

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {(sigs ?? []).map((s) => {
                    const a = s.answers as unknown as Record<string, unknown>
                    const bits = FIELDS.map((f) => optionLabel(f.key, a[f.key])).filter(Boolean)
                    const learnedN = (a.learned as { fp?: { n?: number } } | undefined)?.fp?.n
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
                        <p className="mt-2 text-sm text-ink-soft">{typeof a.about === 'string' && a.about ? a.about : bits.length ? bits.join(' · ') : 'Your custom tweaks'}</p>
                        <p className="mt-1 text-xs text-ink-soft">{learnedN ? `Learned from ${learnedN} photos` : a.built ? 'Built by you' : 'Your settings'}</p>
                        <div className="mt-5 flex flex-wrap gap-2">
                          <button className={quiet} onClick={() => { setBuildFor(s); setStyleMode('build') }}>Edit</button>
                          <button className={quiet} onClick={() => setTeachFor(teachFor === s.id ? null : s.id)}>Teach more</button>
                          <button className={quiet} onClick={() => { setRenaming(s.id); setRenameVal(s.name) }}>Rename</button>
                          <button className={quiet} onClick={() => exportStyle(s)}>Export</button>
                          {Array.isArray(a.versions) && (a.versions as unknown[]).length > 0 && (
                            <button className={quiet} onClick={() => setHistFor(histFor === s.id ? null : s.id)}>History</button>
                          )}
                          <button className={quiet} onClick={() => removeStyle(s)}>Delete</button>
                        </div>
                        {histFor === s.id && Array.isArray(a.versions) && (
                          <div className="mt-4 border-t border-white/60 pt-4">
                            <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Earlier versions</p>
                            <ul className="mt-2 space-y-2">
                              {(a.versions as StyleSnap[]).map((v, i) => (
                                <li key={`${v.at}-${i}`} className="flex items-center justify-between gap-3 text-sm text-ink-soft">
                                  <span>{new Date(v.at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {v.name}</span>
                                  <button className={quiet} onClick={() => void restoreVersion(s, v)}>Restore</button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {teachFor === s.id && userId && (
                          <TeachStyle
                            userId={userId}
                            target={s}
                            onUpdated={(u) => setSigs((prev) => (prev ?? []).map((x) => (x.id === u.id ? u : x)))}
                            onClose={() => setTeachFor(null)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'settings' && (
          <div className="mt-8 max-w-2xl">
            <p className="font-fraunces text-3xl text-ink">Settings</p>
            <p className="mt-1 text-ink-soft">What the editing room starts with every time. You can still change them on any shoot.</p>
            <div className="mt-8 rounded-2xl border border-white/70 bg-white/60 p-6">
              <p className="font-fraunces text-xl text-ink">Saving your edited photos</p>
              <p className="mt-1 text-sm text-ink-soft">The size and quality you start with when you save a finished shoot.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {EXPORT_PRESETS.map((x) => (
                  <button
                    key={x.id}
                    onClick={() => setDPreset(x.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${dPreset === x.id ? 'border-twilight bg-twilight text-white' : 'border-white/70 bg-white/40 text-ink-soft hover:border-twilight'}`}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-sm text-ink-soft">{EXPORT_PRESETS.find((x) => x.id === dPreset)?.note}</p>
              <p className="mt-6 text-sm text-ink">Watermark text</p>
              <input
                value={dMark}
                onChange={(e) => setDMark(e.target.value)}
                placeholder="Your name or studio (leave empty for none)"
                className="mt-2 w-full rounded-xl border border-white/70 bg-white/70 px-4 py-3 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-twilight"
              />
              <div className="mt-6 flex items-center gap-4">
                <button className="rounded-full bg-[var(--color-twilight)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90" onClick={saveDefaults}>Save settings</button>
                {dSaved && <span className="text-sm text-ink-soft">Saved.</span>}
              </div>
            </div>
          </div>
        )}

        {tab === 'shortcuts' && (
          <div className="mt-8">
            <p className="font-fraunces text-3xl text-ink">Shortcuts</p>
            <p className="mt-1 max-w-xl text-ink-soft">Keys that work while you cull and edit. On a Mac use Cmd, on Windows use Ctrl.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {SHORTCUT_GROUPS.map((g) => (
                <div key={g.title} className="rounded-2xl border border-white/70 bg-white/60 p-6">
                  <p className="font-fraunces text-xl text-ink">{g.title}</p>
                  <ul className="mt-4 space-y-3">
                    {g.items.map(([k, d]) => (
                      <li key={k + d} className="flex items-center justify-between gap-4 text-sm">
                        <span className="text-ink-soft">{d}</span>
                        <kbd className="shrink-0 rounded-lg border border-white/80 bg-white/80 px-2.5 py-1 text-xs text-ink">{k}</kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'brain' && (
          <div className="mt-8">
            <p className="font-fraunces text-3xl text-ink">My habits</p>
            <p className="mt-1 max-w-xl text-ink-soft">The fixes you make most while reviewing photos.</p>

            {brain === null && <p className="mt-8 text-sm text-ink-soft">Loading…</p>}
            {brain && brain.checked === 0 && (
              <p className="mt-8 rounded-2xl border border-white/70 bg-white/60 p-8 text-ink-soft">
                Nothing yet. Review a few photos in a shoot and fix what you want to change. Your habits show up here.
              </p>
            )}
            {brain && brain.checked > 0 && (() => {
              const often = brain.habits.filter((h) => h.n / brain.fixed >= 0.4).slice(0, 4).map((h) => h.phrase.toLowerCase())
              const typical = often.length === 0 ? '' : often.length === 1 ? often[0] : `${often.slice(0, -1).join(', ')} and ${often[often.length - 1]}`
              return (
                <>
                  <p className="mt-6 text-sm text-ink-soft">
                    {brain.checked} photos reviewed across {brain.shoots} {brain.shoots === 1 ? 'shoot' : 'shoots'}. You fixed {brain.fixed} of them.
                  </p>

                  {typical && (
                    <div className="mt-6 rounded-2xl border border-white/70 bg-white/60 p-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-ink-soft">Your typical edit</p>
                      <p className="mt-2 font-fraunces text-2xl text-ink">On a typical photo you {typical}.</p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button className={primary} onClick={() => void saveHabitsStyle()}>Save this as a style</button>
                        {habitMsg && <span className="text-sm text-ink-soft">{habitMsg}</span>}
                      </div>
                    </div>
                  )}

                  {brain.habits.length === 0 ? (
                    <p className="mt-8 text-ink-soft">Not enough fixes yet to see a pattern. Keep reviewing and they show up here.</p>
                  ) : (
                    HABIT_GROUPS.map((g) => {
                      const list = brain.habits.filter((h) => g.keys.includes(h.key))
                      if (list.length === 0) return null
                      return (
                        <div key={g.title}>
                          <p className="mt-10 font-fraunces text-xl text-ink">{g.title}</p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            {list.map((h) => {
                              const share = h.n / brain.fixed
                              const t = TOOLS.find((x) => (x.key as string) === h.key)
                              const ui = t ? Math.round((h.sum / h.n / t.scale) * 100) : 0
                              const label = share >= 0.7 ? 'Almost always' : share >= 0.4 ? 'Often' : 'Sometimes'
                              return (
                                <div key={h.key} className="rounded-2xl border border-white/70 bg-white/60 p-5">
                                  <div className="flex items-baseline justify-between gap-3">
                                    <p className="text-lg text-ink">{h.phrase}</p>
                                    {ui !== 0 && <p className="text-sm text-ink-soft">typically {ui > 0 ? '+' : ''}{ui}</p>}
                                  </div>
                                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10">
                                    <div className="h-full rounded-full bg-[var(--color-twilight)]" style={{ width: `${Math.round(share * 100)}%` }} />
                                  </div>
                                  <p className="mt-2 text-sm text-ink-soft">{label} · {h.n} of {brain.fixed} fixed photos</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })
                  )}

                  <p className="mt-10 font-fraunces text-xl text-ink">By kind of light</p>
                  {brain.situations.length === 0 ? (
                    <p className="mt-3 max-w-xl text-ink-soft">Set the light for each scene when you split a shoot, and your habits for each kind of light show up here.</p>
                  ) : (
                    <>
                      <p className="mt-2 max-w-xl text-sm text-ink-soft">What you fix most under each kind of light. Three fixes in the same light and a pattern shows up.</p>
                      {lightMsg && <p className="mt-2 text-sm text-ink-soft">{lightMsg}</p>}
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {brain.situations.map((sit) => {
                          const name = optionLabel('light', sit.light) ?? sit.light
                          return (
                            <div key={sit.light} className="rounded-2xl border border-white/70 bg-white/60 p-5">
                              <p className="text-lg text-ink">{name}</p>
                              {sit.top.length === 0 ? (
                                <p className="mt-3 text-sm text-ink-soft">{sit.fixed} {sit.fixed === 1 ? 'fix' : 'fixes'} so far. {Math.max(1, 3 - sit.fixed)} more and a pattern shows up.</p>
                              ) : (
                                <>
                                  <ul className="mt-3 space-y-1 text-sm text-ink-soft">
                                    {sit.top.map((h) => <li key={h.key}>{h.phrase} · {h.n} of {sit.fixed} photos</li>)}
                                  </ul>
                                  <button className={`${primary} mt-4`} onClick={() => void saveLightStyle(sit.light, sit.usual)}>Make this my {name.toLowerCase()} style</button>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {localUse && localUse.photos > 0 && (
                    <>
                      <p className="mt-10 font-fraunces text-xl text-ink">Local edits</p>
                      <p className="mt-2 max-w-xl text-ink-soft">
                        You touched up {localUse.photos} {localUse.photos === 1 ? 'photo' : 'photos'} by hand:
                        {localUse.masks > 0 ? ` ${localUse.masks} ${localUse.masks === 1 ? 'mask' : 'masks'}` : ''}
                        {localUse.heals > 0 ? `${localUse.masks > 0 ? ',' : ''} ${localUse.heals} spot ${localUse.heals === 1 ? 'fix' : 'fixes'}` : ''}
                        {localUse.curves > 0 ? `${localUse.masks + localUse.heals > 0 ? ',' : ''} ${localUse.curves} tone ${localUse.curves === 1 ? 'curve' : 'curves'}` : ''}.
                      </p>
                    </>
                  )}

                  {suggestions.length > 0 && (
                    <>
                      <p className="mt-10 font-fraunces text-xl text-ink">Add your habits to a style</p>
                      <p className="mt-2 max-w-xl text-ink-soft">You keep making the same fixes. Add them to a style and they happen on their own next time.</p>
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
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}
