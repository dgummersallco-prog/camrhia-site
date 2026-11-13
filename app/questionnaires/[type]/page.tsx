'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { DEFAULTS_BY_TYPE } from '@/lib/questionnaireDefaults'

type Q = { id: string; section: string; prompt: string; hint: string | null; sort_order: number }
type Draft = { id: string | null; section: string; prompt: string; hint: string }

const inp = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const lab = 'mb-1 block text-xs uppercase tracking-wider text-ink-soft'

type Op = { op: 'add'; section: string; prompt: string; hint: string | null } | { op: 'edit'; id: string; prompt: string | null; hint: string | null; section: string | null } | { op: 'remove'; id: string } | { op: 'move'; id: string; after_id: string | null }
type CMsg = { from: 'you' | 'cami'; text: string }

function applyOps(prev: Q[], ops: Op[]): Q[] {
  let next = [...prev]
  for (const o of ops) {
    if (o.op === 'add') next.push({ id: `local-${Date.now()}-${next.length}`, section: o.section, prompt: o.prompt, hint: o.hint, sort_order: next.length })
    else if (o.op === 'edit') next = next.map((x) => (x.id === o.id ? { ...x, prompt: o.prompt ?? x.prompt, hint: o.hint ?? x.hint, section: o.section ?? x.section } : x))
    else if (o.op === 'remove') next = next.filter((x) => x.id !== o.id)
    else if (o.op === 'move') {
      const item = next.find((x) => x.id === o.id)
      if (!item) continue
      const rest = next.filter((x) => x.id !== o.id)
      const idx = o.after_id === null ? 0 : rest.findIndex((x) => x.id === o.after_id) + 1
      rest.splice(idx, 0, item)
      next = rest
    }
  }
  return next
}

export default function QuestionnaireEditorPage() {
  const router = useRouter()
  const { type } = useParams<{ type: string }>()
  const [uid, setUid] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [questions, setQuestions] = useState<Q[]>([])
  const [saved, setSaved] = useState<Q[]>([])
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [cMsgs, setCMsgs] = useState<CMsg[]>([])
  const [cInput, setCInput] = useState('')
  const [cBusy, setCBusy] = useState(false)
  const [cUndo, setCUndo] = useState<Q[] | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace(`/login?next=/questionnaires/${type}`); return }
      const me = sess.session.user.id
      setUid(me)
      const [st, qs] = await Promise.all([
        sb.from('session_types').select('label').eq('key', type).maybeSingle(),
        sb.from('questionnaire_questions').select('id, section, prompt, hint, sort_order').eq('owner_id', me).eq('session_type', type).order('sort_order', { ascending: true }),
      ])
      setLabel((st.data as { label?: string } | null)?.label ?? type.replace(/_/g, ' '))
      const real = (qs.data ?? []) as Q[]
      setSaved(real)
      if (real.length === 0) {
        const defs = DEFAULTS_BY_TYPE[type] ?? DEFAULTS_BY_TYPE.wedding
        setQuestions(defs.map((d, i) => ({ id: `local-${i}`, section: d.section, prompt: d.prompt, hint: d.hint, sort_order: d.sort_order })))
        setDirty(true)
      } else {
        setQuestions(real)
      }
      setLoading(false)
    }
    load()
  }, [router, type])

  useEffect(() => {
    if (!dirty) return
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirty])

  const sectionOrder: string[] = []
  const bySection = new Map<string, Q[]>()
  questions.forEach((q) => {
    if (!bySection.has(q.section)) { bySection.set(q.section, []); sectionOrder.push(q.section) }
    bySection.get(q.section)!.push(q)
  })

  function move(q: Q, dir: -1 | 1) {
    setQuestions((prev) => {
      const idx = prev.findIndex((x) => x.id === q.id)
      let j = idx + dir
      while (j >= 0 && j < prev.length && prev[j].section !== q.section) j += dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[j]] = [next[j], next[idx]]
      return next
    })
    setDirty(true)
  }

  function remove(q: Q) {
    setQuestions((prev) => prev.filter((x) => x.id !== q.id))
    setDirty(true)
  }

  async function askCamri(text: string) {
    const t = text.trim()
    if (!t || cBusy) return
    setCInput('')
    setCBusy(true)
    setCMsgs((m) => [...m, { from: 'you', text: t }])
    try {
      const sess = (await supabase?.auth.getSession())?.data.session
      const res = await fetch('/api/ai/camri-questions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: t, label, questions: questions.map((q) => ({ id: q.id, section: q.section, prompt: q.prompt, hint: q.hint })), history: cMsgs.slice(-8) }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error ?? 'Camri hit a snag.')
      if (j.ops?.length) { setCUndo(questions); setQuestions((prev) => applyOps(prev, j.ops as Op[])); setDirty(true) }
      setCMsgs((m) => [...m, { from: 'cami', text: j.reply }])
    } catch (e) {
      setCMsgs((m) => [...m, { from: 'cami', text: (e as Error).message }])
    } finally {
      setCBusy(false)
    }
  }

  function startNew() {
    setDraft({ id: null, section: sectionOrder[sectionOrder.length - 1] ?? 'General', prompt: '', hint: '' })
  }
  function startEdit(q: Q) {
    setDraft({ id: q.id, section: q.section, prompt: q.prompt, hint: q.hint ?? '' })
  }

  function commitDraft() {
    if (!draft) return
    const prompt = draft.prompt.trim()
    if (!prompt) { setMsg('Write the question first.'); return }
    const section = draft.section.trim() || 'General'
    const hint = draft.hint.trim() || null
    if (draft.id) {
      setQuestions((prev) => prev.map((x) => (x.id === draft.id ? { ...x, section, prompt, hint } : x)))
    } else {
      setQuestions((prev) => [...prev, { id: `local-${Date.now()}`, section, prompt, hint, sort_order: prev.length }])
    }
    setMsg(null)
    setDraft(null)
    setDirty(true)
  }

  async function saveAll() {
    const sb = supabase
    if (!sb || !uid) return
    setSaving(true)
    setMsg(null)
    const ordered = questions.map((q, i) => ({ ...q, sort_order: i }))
    const savedById = new Map(saved.map((q) => [q.id, q]))
    const toInsert = ordered
      .filter((q) => q.id.startsWith('local-'))
      .map(({ id: _id, ...rest }) => ({ ...rest, owner_id: uid, session_type: type }))
    const currentIds = new Set(ordered.map((q) => q.id))
    const toDelete = saved.filter((q) => !currentIds.has(q.id)).map((q) => q.id)
    const toUpdate = ordered.filter((q) => {
      if (q.id.startsWith('local-')) return false
      const prev = savedById.get(q.id)
      return !!prev && (prev.section !== q.section || prev.prompt !== q.prompt || prev.hint !== q.hint || prev.sort_order !== q.sort_order)
    })
    try {
      if (toInsert.length > 0) {
        const { error } = await sb.from('questionnaire_questions').insert(toInsert)
        if (error) throw error
      }
      if (toDelete.length > 0) {
        const { error } = await sb.from('questionnaire_questions').delete().in('id', toDelete)
        if (error) throw error
      }
      for (const q of toUpdate) {
        const { error } = await sb.from('questionnaire_questions').update({ section: q.section, prompt: q.prompt, hint: q.hint, sort_order: q.sort_order }).eq('id', q.id)
        if (error) throw error
      }
      await sb.from('profiles').update({ questionnaire_seeded: true }).eq('id', uid)
      const { data } = await sb.from('questionnaire_questions').select('id, section, prompt, hint, sort_order').eq('owner_id', uid).eq('session_type', type).order('sort_order', { ascending: true })
      const real = (data ?? []) as Q[]
      setSaved(real)
      setQuestions(real)
      setDirty(false)
      setMsg('Saved. Your clients and the app now use these questions.')
      setTimeout(() => setMsg((m) => (m && m.startsWith('Saved') ? null : m)), 3500)
    } catch (e) {
      setMsg((e as { message?: string }).message ?? 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const draftForm = draft && (
    <div className="rounded-2xl border border-twilight bg-card p-4">
      <div className="space-y-3">
        <div>
          <label className={lab}>Section</label>
          <input list="q-sections" className={inp} value={draft.section} onChange={(e) => setDraft({ ...draft, section: e.target.value })} />
          <datalist id="q-sections">{sectionOrder.map((x) => <option key={x} value={x} />)}</datalist>
        </div>
        <div>
          <label className={lab}>Question</label>
          <textarea rows={3} className={inp} value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} />
        </div>
        <div>
          <label className={lab}>Hint (optional)</label>
          <input className={inp} value={draft.hint} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={commitDraft} className="rounded-lg bg-twilight px-4 py-2 text-sm font-medium text-white">Done</button>
        <button type="button" onClick={() => { setDraft(null); setMsg(null) }} className="rounded-lg border border-line px-4 py-2 text-sm text-ink">Cancel</button>
      </div>
    </div>
  )

  const saveBtn = (
    <button
      type="button"
      onClick={saveAll}
      disabled={saving || !dirty}
      className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
    >
      {saving ? 'Saving…' : 'Save questionnaire'}
    </button>
  )

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="questionnaires" />
      <main className="relative mx-auto mb-10 mt-24 max-w-3xl rounded-3xl bg-[#FBF7F2]/85 px-8 py-10 shadow-[0_8px_40px_rgba(60,40,30,0.10)] backdrop-blur-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/camri/02_sitting_waving.png" alt="" className="pointer-events-none absolute -top-[84px] right-8 h-[100px] w-auto" />
        <Link href="/questionnaires" className="text-sm text-ink-soft hover:text-ink">← All questionnaires</Link>
        <div className="mb-4 mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Work</p>
            <h1 className="font-fraunces text-4xl font-semibold capitalize text-ink">{label} questionnaire</h1>
          </div>
          {saveBtn}
        </div>
        <p className="mb-4 text-sm text-ink-soft">These questions are sent to every {label.toLowerCase()} client. Their answers appear on each session in the Camrhia app.</p>

        <div className="mb-6 rounded-2xl border border-[#E8DDD0] bg-white/90 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/13_face_avatar.png" alt="" className="h-8 w-8 rounded-full" />
            <p className="font-fraunces text-lg font-semibold text-ink">Ask Camri</p>
          </div>
          <div className="mt-3 space-y-2">
            {cMsgs.slice(-4).map((m, i) => (
              <div key={i} className={'max-w-[88%] rounded-2xl px-3 py-2 text-sm ' + (m.from === 'you' ? 'ml-auto bg-twilight text-white' : 'bg-[#EBDDCF] text-ink')}>{m.text}</div>
            ))}
            {cBusy && (
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/camri/04_thinking.png" alt="" className="h-10 w-auto" /> Camri is thinking…
              </div>
            )}
          </div>
          {cMsgs.length === 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {['Reword these to sound warmer', 'What am I missing?', 'Shorten the long questions'].map((c) => (
                <button key={c} type="button" onClick={() => askCamri(c)} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-ink transition hover:border-twilight">{c}</button>
              ))}
            </div>
          )}
          {cUndo && <button type="button" onClick={() => { setQuestions(cUndo); setCUndo(null); setDirty(true) }} className="mt-2 text-xs text-twilight underline">Undo Camri&apos;s changes</button>}
          <form onSubmit={(e) => { e.preventDefault(); askCamri(cInput) }} className="mt-3 flex gap-2">
            <input value={cInput} onChange={(e) => setCInput(e.target.value)} placeholder="Ask Camri to reword, add, remove or give advice" className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
            <button type="submit" disabled={cBusy} className="rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Send</button>
          </form>
        </div>

        {dirty && (
          <p className="mb-4 rounded-xl bg-[#F3E4DC] px-4 py-2.5 text-sm text-[#7A4A3A]">You have unsaved changes. Tap Save questionnaire to publish them.</p>
        )}
        {msg && !msg.startsWith('Saved') && <p className="mb-4 text-sm text-red-600">{msg}</p>}
        {msg && msg.startsWith('Saved') && <p className="mb-4 text-sm text-twilight">{msg}</p>}

        {loading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            {sectionOrder.map((sec) => {
              const list = bySection.get(sec)!
              return (
                <div key={sec} className="mb-6">
                  <div className="mb-2 flex items-center gap-3">
                    <p className="font-fraunces text-xl font-semibold text-ink">{sec}</p>
                    <span className="rounded-full bg-[#EBDDCF] px-2 py-0.5 text-[11px] text-ink-soft">{list.length}</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <ul className="space-y-2">
                    {list.map((q, i) => (
                      <li key={q.id}>
                        {draft?.id === q.id ? draftForm : (
                          <div className="flex items-start gap-3 rounded-2xl border border-[#E8DDD0] bg-white/90 px-4 py-3.5 shadow-sm transition hover:shadow-md">
                            <div className="flex flex-col text-xs text-ink-soft">
                              <button type="button" disabled={i === 0} onClick={() => move(q, -1)} aria-label="Move up" className="px-1 hover:text-ink disabled:opacity-30"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5 6 4l3.5 3.5" /></svg></button>
                              <button type="button" disabled={i === list.length - 1} onClick={() => move(q, 1)} aria-label="Move down" className="px-1 hover:text-ink disabled:opacity-30"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 4.5 6 8l3.5-3.5" /></svg></button>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-ink">{q.prompt}</p>
                              {q.hint && <p className="mt-0.5 text-xs italic text-ink-soft">{q.hint}</p>}
                            </div>
                            <button type="button" onClick={() => startEdit(q)} className="rounded-full border border-twilight/30 px-3 py-1 text-xs text-twilight transition hover:bg-blush-wash">Edit</button>
                            <button type="button" onClick={() => remove(q)} className="px-1 text-xs text-ink-soft transition hover:text-red-600">Remove</button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}

            {questions.length === 0 && !draft && <p className="mb-4 text-sm text-ink-soft">No questions yet. Add your first one.</p>}

            {draft && draft.id === null ? draftForm : (
              <button type="button" onClick={startNew} className="w-full rounded-xl border border-twilight py-3 text-sm font-medium text-twilight transition hover:bg-blush-wash">+ Add question</button>
            )}

            <p className="mt-4 text-center font-mono text-xs text-ink-soft">{questions.length} question{questions.length === 1 ? '' : 's'} in your template</p>
            <div className="mt-4 flex justify-center">{saveBtn}</div>
          </>
        )}
      </main>
    </div>
  )
}
