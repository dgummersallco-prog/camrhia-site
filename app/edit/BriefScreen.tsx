'use client'

import { useState } from 'react'
import { QUESTIONS, type Brief } from '@/lib/brief'

const primary = 'rounded-full bg-[var(--color-twilight)] px-7 py-3 text-sm font-medium text-white transition hover:opacity-90'
const quiet = 'rounded-full border border-white/15 px-6 py-3 text-sm text-white/70 transition hover:border-white/35 hover:text-white'

export default function BriefScreen({
  title,
  initial,
  onDone,
  onSkip,
}: {
  title: string
  initial: Brief
  onDone: (b: Brief) => void
  onSkip: () => void
}) {
  const [i, setI] = useState(0)
  const [b, setB] = useState<Brief>(initial)
  const q = QUESTIONS[i]
  const last = i === QUESTIONS.length - 1

  function pick(v: string) {
    setB({ ...b, [q.key]: v })
    if (!last) setTimeout(() => setI((x) => Math.min(x + 1, QUESTIONS.length - 1)), 180)
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

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.options.map((o) => {
            const on = b[q.key] === o.value
            return (
              <button
                key={o.value}
                onClick={() => pick(o.value)}
                className={`rounded-2xl border bg-[#151518] p-5 text-left transition ${on ? 'border-[var(--color-twilight)] shadow-[0_0_24px_-6px_var(--color-twilight)]' : 'border-white/10 hover:border-white/30'}`}
              >
                <p className="text-lg text-white">{o.label}</p>
                {o.blurb && <p className="mt-1 text-sm text-white/50">{o.blurb}</p>}
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
