'use client'

import { useState } from 'react'
import { QUESTIONS, type Brief } from '@/lib/brief'

const primary = 'rounded-full bg-[var(--color-twilight)] px-7 py-3 text-sm font-medium text-white transition hover:opacity-90'
const quiet = 'rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:border-white/35 hover:text-white'

type Usual = { value: string; n: number; total: number }

function usualFor(history: Brief[], key: keyof Brief): Usual | null {
  const tally = new Map<string, number>()
  let total = 0
  for (const h of history) {
    const v = h[key]
    if (typeof v !== 'string' || !v) continue
    total++
    tally.set(v, (tally.get(v) ?? 0) + 1)
  }
  let best: Usual | null = null
  for (const [value, n] of tally) if (!best || n > best.n) best = { value, n, total }
  return best && best.n >= 2 ? best : null
}

export default function BriefScreen({
  title,
  initial,
  history,
  onDone,
  onSkip,
}: {
  title: string
  initial: Brief
  history: Brief[]
  onDone: (b: Brief) => void
  onSkip: () => void
}) {
  const [i, setI] = useState(0)
  const [b, setB] = useState<Brief>(initial)
  const q = QUESTIONS[i]
  const last = i === QUESTIONS.length - 1
  const usual = usualFor(history, q.key)

  function pick(v: string) {
    setB({ ...b, [q.key]: v })
    if (!last) setTimeout(() => setI((x) => Math.min(x + 1, QUESTIONS.length - 1)), 180)
  }

  function useUsual() {
    const next: Brief = { ...b }
    for (const qq of QUESTIONS) {
      if (qq.key === 'type') continue
      const u = usualFor(history, qq.key)
      if (u) (next as Record<string, unknown>)[qq.key] = u.value
    }
    setB(next)
    setI(QUESTIONS.length - 1)
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">Camrhia Pro</p>
            <p className="mt-1 text-sm text-white/60">{title}</p>
          </div>
          <button className="text-sm text-white/45 hover:text-white" onClick={onSkip}>Skip for now</button>
        </div>

        <div className="mt-8 flex gap-2">
          {QUESTIONS.map((_, n) => (
            <div key={n} className={`h-1 flex-1 rounded-full ${n <= i ? 'bg-[var(--color-twilight)]' : 'bg-white/10'}`} />
          ))}
        </div>

        <h1 className="mt-12 font-fraunces text-4xl text-white sm:text-5xl">{q.title}</h1>
        {q.hint && <p className="mt-3 text-white/55">{q.hint}</p>}

        {i === 0 && history.length >= 3 && (
          <button className={`${quiet} mt-6`} onClick={useUsual}>Use my usual for everything</button>
        )}

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.options.map((o) => {
            const on = b[q.key] === o.value
            const isUsual = usual?.value === o.value
            return (
              <button
                key={o.value}
                onClick={() => pick(o.value)}
                className={`rounded-2xl border bg-[#151518] p-5 text-left transition ${on ? 'border-[var(--color-twilight)] shadow-[0_0_24px_-6px_var(--color-twilight)]' : 'border-white/10 hover:border-white/30'}`}
              >
                <p className="text-lg text-white">{o.label}</p>
                {o.blurb && <p className="mt-1 text-sm text-white/50">{o.blurb}</p>}
                {isUsual && usual && (
                  <p className="mt-3 text-xs text-[var(--color-twilight)]">Your usual · {usual.n} of {usual.total} shoots</p>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          {i > 0 && <button className={quiet} onClick={() => setI(i - 1)}>Back</button>}
          {!last && <button className={quiet} onClick={() => setI(i + 1)}>Skip this one</button>}
          {last && <button className={primary} onClick={() => onDone(b)}>Start editing</button>}
        </div>
      </div>
    </div>
  )
}
