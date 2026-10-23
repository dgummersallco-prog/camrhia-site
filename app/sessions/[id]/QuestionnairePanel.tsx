'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Q = { id: string; section: string; prompt: string }

export function QuestionnairePanel({ weddingId }: { weddingId: string }) {
  const [qs, setQs] = useState<Q[] | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [type, setType] = useState('')

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: wd } = await sb.from('weddings').select('owner_id, session_type').eq('id', weddingId).maybeSingle()
      const w = wd as { owner_id?: string; session_type?: string } | null
      if (!w?.owner_id || !w.session_type) { setQs([]); return }
      setType(w.session_type)
      const [q, a] = await Promise.all([
        sb.from('questionnaire_questions').select('id, section, prompt').eq('owner_id', w.owner_id).eq('session_type', w.session_type).order('sort_order', { ascending: true }),
        sb.from('questionnaire_answers').select('question_id, answer').eq('wedding_id', weddingId),
      ])
      const map: Record<string, string> = {}
      ;((a.data ?? []) as { question_id: string; answer: string | null }[]).forEach((r) => { if (r.answer && r.answer.trim()) map[r.question_id] = r.answer })
      setAnswers(map)
      setQs((q.data ?? []) as Q[])
    }
    load()
  }, [weddingId])

  if (qs === null) return null

  const answered = qs.filter((q) => answers[q.id])
  const sections: string[] = []
  answered.forEach((q) => { if (!sections.includes(q.section)) sections.push(q.section) })

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-fraunces text-xl font-semibold text-ink">Questionnaire</p>
        {type && <Link href={`/questionnaires/${type}`} className="text-sm text-twilight hover:underline">Edit questions</Link>}
      </div>
      {qs.length === 0 ? (
        <p className="text-sm text-ink-soft">No questions set up for this session type yet.</p>
      ) : answered.length === 0 ? (
        <p className="text-sm text-ink-soft">Your client hasn't answered yet. {qs.length} question{qs.length === 1 ? '' : 's'} waiting.</p>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-ink-soft">{answered.length} of {qs.length} answered</p>
          {sections.map((sec) => (
            <div key={sec}>
              <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-brass">{sec}</p>
              <ul className="space-y-3">
                {answered.filter((q) => q.section === sec).map((q) => (
                  <li key={q.id}>
                    <p className="text-xs text-ink-soft">{q.prompt}</p>
                    <p className="whitespace-pre-wrap text-sm text-ink">{answers[q.id]}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
