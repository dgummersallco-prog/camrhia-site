'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Q = { id: string; section: string | null; prompt: string; hint: string | null; sort_order: number }
type Mine = { wedding_id: string; owner_id: string | null; session_type: string; photographer_studio: string | null }

export default function ClientQuestionnairePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [qs, setQs] = useState<Q[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [studio, setStudio] = useState('')
  const [ready, setReady] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace(`/login?next=/my/questionnaire/${id}`); return }
      const { data: mine } = await sb.rpc('get_my_wedding')
      const w = ((mine ?? []) as Mine[]).find((r) => r.wedding_id === id)
      if (!w || !w.owner_id) { setReady(true); return }
      setStudio(w.photographer_studio ?? '')
      const [q, a] = await Promise.all([
        sb.from('questionnaire_questions').select('id, section, prompt, hint, sort_order').eq('owner_id', w.owner_id).eq('session_type', w.session_type).order('sort_order', { ascending: true }),
        sb.from('questionnaire_answers').select('question_id, answer').eq('wedding_id', id),
      ])
      setQs((q.data ?? []) as Q[])
      const map: Record<string, string> = {}
      ;((a.data ?? []) as { question_id: string; answer: string | null }[]).forEach((r) => { if (r.answer) map[r.question_id] = r.answer })
      setAnswers(map)
      setReady(true)
    }
    load()
  }, [id, router])

  async function save(qid: string, value: string) {
    const sb = supabase
    if (!sb) return
    setStatus('Saving…')
    const { error } = await sb.from('questionnaire_answers').upsert({ wedding_id: id, question_id: qid, answer: value }, { onConflict: 'wedding_id,question_id' })
    setStatus(error ? 'Could not save. Try again.' : 'Saved')
    if (!error) setTimeout(() => setStatus((s) => (s === 'Saved' ? null : s)), 1500)
  }

  const answered = qs.filter((q) => (answers[q.id] ?? '').trim()).length
  const sections: { name: string; items: Q[] }[] = []
  qs.forEach((q) => {
    const name = q.section || 'Questions'
    const last = sections[sections.length - 1]
    if (last && last.name === name) last.items.push(q)
    else sections.push({ name, items: [q] })
  })

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-10 border-b border-line bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <a href="/my" className="text-sm text-ink-soft underline hover:text-ink">Back</a>
            <h1 className="font-fraunces text-lg font-semibold text-ink">Questionnaire</h1>
          </div>
          <div className="text-xs text-ink-soft">{status ?? (qs.length ? `${answered} of ${qs.length} answered` : '')}</div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {!ready ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : qs.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-6 text-ink-soft">There are no questions to answer for this session yet.</p>
        ) : (
          <>
            <p className="text-ink-soft">{studio ? `${studio} uses your answers to plan your session.` : 'Your photographer uses your answers to plan your session.'} Everything saves as you go.</p>
            {sections.map((sec) => (
              <section key={sec.name} className="mt-8">
                <h2 className="font-mono text-xs uppercase tracking-widest text-brass">{sec.name}</h2>
                <div className="mt-3 space-y-4">
                  {sec.items.map((q) => (
                    <div key={q.id} className="rounded-2xl border border-line bg-card p-5">
                      <label className="block text-sm font-semibold text-ink">{q.prompt}</label>
                      {q.hint && <p className="mt-1 text-xs text-ink-soft">{q.hint}</p>}
                      <textarea
                        rows={3}
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        onBlur={(e) => save(q.id, e.target.value)}
                        className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
            <a href="/my" className="mt-8 inline-block rounded-full bg-twilight px-6 py-2.5 text-sm font-semibold text-white">Done</a>
          </>
        )}
      </main>
    </div>
  )
}
