'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type T = { key: string; label: string; accent_color: string | null; count: number }

export default function QuestionnairesPage() {
  const router = useRouter()
  const [types, setTypes] = useState<T[] | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/questionnaires'); return }
      const uid = sess.session.user.id
      const [st, prof, qs] = await Promise.all([
        sb.from('session_types').select('key, label, accent_color').eq('has_questionnaire', true).order('sort_order', { ascending: true }),
        sb.from('profiles').select('enabled_session_types').eq('id', uid).maybeSingle(),
        sb.from('questionnaire_questions').select('session_type').eq('owner_id', uid),
      ])
      const enabled = (prof.data as { enabled_session_types?: string[] | null } | null)?.enabled_session_types
      const all = (st.data ?? []) as { key: string; label: string; accent_color: string | null }[]
      const visible = Array.isArray(enabled) ? all.filter((t) => enabled.includes(t.key)) : all
      const counts: Record<string, number> = {}
      ;((qs.data ?? []) as { session_type: string }[]).forEach((q) => { counts[q.session_type] = (counts[q.session_type] ?? 0) + 1 })
      setTypes(visible.map((t) => ({ ...t, count: counts[t.key] ?? 0 })))
    }
    load()
  }, [router])

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="questionnaires" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Work</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Questionnaires</h1>
        <p className="mt-2 text-sm text-ink-soft">Each session type has its own intake questions. Pick one to view, add, edit or remove questions. Changes also appear in the Camrhia app.</p>

        {types === null ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : types.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-6 text-sm text-ink-soft">No session types with a questionnaire yet.</p>
        ) : (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {types.map((t) => (
              <Link
                key={t.key}
                href={`/questionnaires/${t.key}`}
                className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-line bg-card py-4 pl-6 pr-4 transition hover:-translate-y-0.5 hover:border-twilight hover:shadow-md"
              >
                <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: t.accent_color ?? 'var(--color-twilight)' }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-fraunces text-lg font-semibold text-ink">{t.label}</span>
                  <span className="block text-xs text-ink-soft">
                    {t.count > 0 ? `${t.count} question${t.count === 1 ? '' : 's'}` : 'Starter questions ready to use'}
                  </span>
                </span>
                <span className="text-ink-soft">→</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
