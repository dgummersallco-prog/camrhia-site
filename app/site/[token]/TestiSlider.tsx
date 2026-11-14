"use client"
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

type Q = { text: string; who?: string | null; img?: string | null }

export function TestiSlider({ list, mode, headStyle, ink, soft, accent, card }: {
  list: Q[]; mode: 'satin' | 'wool'; headStyle: CSSProperties; ink: string; soft: string; accent: string; card: string
}) {
  const [i, setI] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const n = list.length
  useEffect(() => {
    if (mode !== 'satin' || n < 2) return
    const id = setInterval(() => setI((p) => (p + 1) % n), 7000)
    return () => clearInterval(id)
  }, [mode, n])
  if (n === 0) return null
  const arrow = (d: number, onClick: () => void) => (
    <button type="button" aria-label={d < 0 ? 'Previous' : 'Next'} onClick={onClick} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border" style={{ borderColor: soft, color: ink }}>{d < 0 ? '←' : '→'}</button>
  )
  if (mode === 'satin') {
    const q = list[i % n]
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-4 md:gap-8">
        {arrow(-1, () => setI((p) => (p - 1 + n) % n))}
        <div className="flex-1 text-center">
          <blockquote className="el-tes_quote" style={{ ...headStyle, fontSize: 'clamp(1.4rem, 3vw, 2.2rem)', lineHeight: 1.4, fontWeight: 300 }}>{q.text}</blockquote>
          {q.who && <p className="el-tes_name mt-6 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</p>}
          <div className="mt-6 flex justify-center gap-2">
            {list.map((_, k) => (<button key={k} type="button" aria-label={'Review ' + (k + 1)} onClick={() => setI(k)} className="h-2 w-2 rounded-full" style={{ background: k === i ? accent : soft, opacity: k === i ? 1 : 0.35 }} />))}
          </div>
        </div>
        {arrow(1, () => setI((p) => (p + 1) % n))}
      </div>
    )
  }
  return (
    <div>
      <div ref={ref} className="flex snap-x gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
        {list.map((q, k) => (
          <div key={k} className="w-[280px] flex-shrink-0 snap-start rounded-2xl p-6 sm:w-[320px]" style={{ background: card }}>
            <p className="el-tes_quote leading-[1.7]" style={{ color: ink, fontSize: 15 }}>{q.text}</p>
            <div className="mt-5 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm text-white" style={{ background: accent }}>{(q.who || '?').trim().charAt(0)}</span>
              <span className="el-tes_name text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>{q.who}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-3">
        {arrow(-1, () => ref.current?.scrollBy({ left: -340, behavior: 'smooth' }))}
        {arrow(1, () => ref.current?.scrollBy({ left: 340, behavior: 'smooth' }))}
      </div>
    </div>
  )
}
