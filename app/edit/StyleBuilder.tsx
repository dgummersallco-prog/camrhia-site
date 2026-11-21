'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LOOKS, renderPreview, originalPreview, type Adjust } from '@/lib/enhance'
import { cleanAdj, addAdj } from '@/lib/tools'
import { QUESTIONS, type Signature } from '@/lib/brief'
import { pushVersion } from '@/lib/styleFile'
import Dials from '@/app/edit/Dials'
import { CurveEditor } from '@/app/edit/ReviewStep'
import { curveIsFlat, type CurvePt } from '@/lib/localEdit'

const field = 'rounded-xl border border-white/20 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-twilight'
const pill = (on: boolean) => `rounded-full border px-3.5 py-2 text-[13px] font-medium transition ${on ? 'border-twilight bg-twilight text-white' : 'border-white/20 text-white/75 hover:border-twilight'}`

export default function StyleBuilder({ userId, target, onSaved, onClose }: { userId: string; target?: Signature | null; onSaved: (s: Signature) => void; onClose: () => void }) {
  const a0 = (target?.answers ?? {}) as unknown as Record<string, unknown>
  const [name, setName] = useState(target?.name ?? '')
  const [lookId, setLookId] = useState(typeof a0.look === 'string' ? a0.look : 'natural')
  const [strength, setStrength] = useState(target ? Number(target.strength) || 0.8 : 0.8)
  const [adjust, setAdjust] = useState<Adjust>((a0.tweak ?? {}) as Adjust)
  const [curve, setCurve] = useState<CurvePt[]>(Array.isArray(a0.curve) && (a0.curve as CurvePt[]).length >= 2 ? (a0.curve as CurvePt[]) : [[0, 0], [1, 1]])
  const [variants, setVariants] = useState<Record<string, Adjust>>((a0.variants ?? {}) as Record<string, Adjust>)
  const [tab, setTab] = useState<string>('base')
  const [autoTypes, setAutoTypes] = useState<string[]>(Array.isArray((a0.auto as { types?: string[] } | undefined)?.types) ? ((a0.auto as { types: string[] }).types) : [])
  const [bmp, setBmp] = useState<ImageBitmap | null>(null)
  const [before, setBefore] = useState<string | null>(null)
  const [after, setAfter] = useState<string | null>(null)
  const [view, setView] = useState<'split' | 'after' | 'before'>('split')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const urls = useRef<{ before: string | null; after: string | null }>({ before: null, after: null })

  useEffect(() => () => {
    if (urls.current.before) URL.revokeObjectURL(urls.current.before)
    if (urls.current.after) URL.revokeObjectURL(urls.current.after)
  }, [])

  useEffect(() => {
    if (!bmp) return
    let dead = false
    originalPreview(bmp, 900).then((u) => {
      if (dead) { URL.revokeObjectURL(u); return }
      if (urls.current.before) URL.revokeObjectURL(urls.current.before)
      urls.current.before = u
      setBefore(u)
    }).catch(() => {})
    return () => { dead = true }
  }, [bmp])

  useEffect(() => {
    if (!bmp) return
    let dead = false
    const t = setTimeout(() => {
      renderPreview(bmp, lookId, strength, 900, tab === 'base' ? adjust : addAdj(adjust, variants[tab]), true, undefined, curveIsFlat(curve) ? undefined : { masks: [], heals: [], curve }).then((u) => {
        if (dead) { URL.revokeObjectURL(u); return }
        if (urls.current.after) URL.revokeObjectURL(urls.current.after)
        urls.current.after = u
        setAfter(u)
      }).catch(() => {})
    }, 100)
    return () => { dead = true; clearTimeout(t) }
  }, [bmp, lookId, strength, adjust, curve, variants, tab])

  async function pick(f: File | undefined) {
    if (!f) return
    setErr(null)
    try {
      const b = await createImageBitmap(f, { imageOrientation: 'from-image' })
      setBmp((old) => { old?.close(); return b })
    } catch {
      setErr('That photo type cannot be previewed here. Try a JPEG or PNG.')
    }
  }

  async function save() {
    const sb = supabase
    const n = name.trim()
    if (!sb) return
    if (!n) { setErr('Give your style a name.'); return }
    setBusy(true)
    setErr(null)
    const answers: Record<string, unknown> = { ...a0, skin: a0.skin ?? 'yes', look: lookId, tweak: cleanAdj(adjust), built: true }
    const vClean: Record<string, Adjust> = {}
    for (const [k, v] of Object.entries(variants)) { const c = cleanAdj(v); if (Object.keys(c).length) vClean[k] = c }
    if (Object.keys(vClean).length) answers.variants = vClean
    else delete answers.variants
    if (autoTypes.length) answers.auto = { types: autoTypes }
    else delete answers.auto
    if (curveIsFlat(curve)) delete answers.curve
    else answers.curve = curve
    if (target) {
      answers.versions = pushVersion(target)
      const { error } = await sb.from('edit_signatures').update({ name: n, answers, strength }).eq('id', target.id)
      setBusy(false)
      if (error) { setErr(error.message); return }
      onSaved({ ...target, name: n, answers: answers as unknown as Signature['answers'], strength })
    } else {
      const { data: row, error } = await sb.from('edit_signatures').insert({ owner_id: userId, name: n, answers, strength }).select('id, name, answers, strength').maybeSingle()
      setBusy(false)
      if (error || !row) { setErr(error?.message ?? 'Could not save this style.'); return }
      onSaved({ ...(row as Signature), strength: Number((row as Signature).strength) })
    }
  }

  const pane = (label: string, url: string | null) => (
    <div className="relative min-h-0 overflow-hidden rounded-2xl bg-black/40">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="absolute inset-0 h-full w-full object-contain" />
      )}
      <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/80">{label}</span>
    </div>
  )

  return (
    <div>
      <button className="text-sm text-white/55 transition hover:text-white" onClick={onClose}>← All styles</button>
      <p className="mt-3 font-fraunces text-3xl text-white">{target ? 'Edit this style' : 'Build a style'}</p>
      <p className="mt-1 max-w-2xl text-white/55">Set the look, then fine-tune every dial. Add one of your own photos to see it as you go. The photo stays on your computer.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#151518] p-4">
            <label className="text-xs uppercase tracking-[0.18em] text-white/50">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="For example: Golden hour couples" className={`${field} mt-2 w-full`} />
            <p className="mt-5 text-xs uppercase tracking-[0.18em] text-white/50">Starting look</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LOOKS.map((l) => (
                <button key={l.id} className={pill(lookId === l.id)} onClick={() => setLookId(l.id)} title={l.blurb}>{l.label}</button>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 text-sm">
              <span className="text-white/70">Intensity</span>
              <input type="range" min={0} max={100} value={Math.round(strength * 100)} onChange={(e) => setStrength(Number(e.target.value) / 100)} className="w-full max-w-xs accent-[var(--color-twilight)]" />
              <span className="w-10 text-white/50">{Math.round(strength * 100)}%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151518] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-white/50">Use this style automatically</p>
            <p className="mt-1 text-sm text-white/45">Pick the kinds of shoot this style is for. When you start one of those shoots, this style is selected for you.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(QUESTIONS.find((q) => q.key === 'type')?.options ?? []).map((o) => (
                <button key={o.value} className={pill(autoTypes.includes(o.value))} onClick={() => setAutoTypes((p) => (p.includes(o.value) ? p.filter((x) => x !== o.value) : [...p, o.value]))}>{o.label}</button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151518] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button className={pill(false)} onClick={() => fileRef.current?.click()}>{bmp ? 'Change sample photo' : 'Choose a sample photo'}</button>
              {bmp && (
                <>
                  <button className={pill(view === 'split')} onClick={() => setView('split')}>Side by side</button>
                  <button className={pill(view === 'after')} onClick={() => setView('after')}>After</button>
                  <button className={pill(view === 'before')} onClick={() => setView('before')}>Before</button>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; void pick(f) }} />
            </div>
            {bmp ? (
              <div className={`mt-3 grid h-[55vh] gap-3 ${view === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {view !== 'after' && pane('Before', before)}
                {view !== 'before' && pane('After', after)}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-white/20 px-4 py-10 text-center text-sm text-white/50">Choose a photo to see your style on it.</p>
            )}
          </div>
        </div>

        <div className="lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:pr-1">
          <div className="mb-3 rounded-2xl border border-white/10 bg-[#151518] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">Adjusting</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button className={pill(tab === 'base')} onClick={() => setTab('base')}>Every photo</button>
              {(QUESTIONS.find((q) => q.key === 'light')?.options ?? []).filter((o) => o.value !== 'mixed').map((o) => (
                <button key={o.value} className={pill(tab === o.value)} onClick={() => setTab(o.value)}>
                  {o.label}{Object.keys(cleanAdj(variants[o.value] ?? {})).length > 0 ? ' •' : ''}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-white/40">
              {tab === 'base' ? 'These dials apply to every photo in a shoot.' : 'These dials are added on top, only for photos set to this light.'}
            </p>
          </div>
          <Dials
            key={tab}
            value={tab === 'base' ? adjust : variants[tab] ?? {}}
            onChange={(v) => { if (tab === 'base') setAdjust(v); else setVariants((p) => ({ ...p, [tab]: v })) }}
          />
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#151518] p-5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">Tone curve</span>
              {!curveIsFlat(curve) && <button className="text-[11px] text-white/45 transition hover:text-white/80" onClick={() => setCurve([[0, 0], [1, 1]])}>Reset</button>}
            </div>
            <p className="mb-3 mt-1 text-[11px] text-white/35">Drag the line to bend it. Tap to add a point, double-tap a point to remove it.</p>
            <CurveEditor pts={curve} onChange={setCurve} />
          </div>
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-red-300">{err}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button className="rounded-xl bg-twilight px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : target ? 'Save changes' : 'Save style'}</button>
        <button className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/80 transition hover:border-white/35" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}
