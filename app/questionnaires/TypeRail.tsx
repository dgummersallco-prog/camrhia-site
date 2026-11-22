"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type T = { key: string; label: string; accent_color: string | null; count: number }

export default function TypeRail({ active }: { active?: string }) {
  const [types, setTypes] = useState<T[] | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) return
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
    load().catch(() => setTypes([]))
  }, [])

  return (
    <aside className="sticky top-[4.5rem] hidden w-64 shrink-0 self-start lg:block">
      <div className="rounded-3xl bg-[#FBF7F2]/85 p-3 shadow-[0_8px_40px_rgba(60,40,30,0.10)] backdrop-blur-md">
        <p className="px-3 pb-2 pt-2 font-mono text-xs uppercase tracking-widest text-brass">Questionnaires</p>
        {types === null && <p className="px-3 py-2 text-sm text-ink-soft">Loading...</p>}
        <nav className="flex flex-col gap-1">
          {(types ?? []).map((t) => (
            <Link
              key={t.key}
              href={'/questionnaires/' + t.key}
              className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ' + (t.key === active ? 'bg-white font-semibold text-ink shadow-sm' : 'text-ink-soft hover:bg-white/60 hover:text-ink')}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.accent_color ?? 'var(--color-twilight)' }} />
              <span className="min-w-0 flex-1 truncate">{t.label}</span>
              <span className="text-xs text-ink-soft">{t.count > 0 ? t.count : ''}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
