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
  if (mode === 'satin') {
    const q = list[i % n]
    const go = (d: number) => setI((p) => (p + d + n) % n)
    const circ = (d: number) => (
      <button type="button" aria-label={d < 0 ? 'Previous' : 'Next'} onClick={() => go(d)} className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 'clamp(34px, 5.4vw, 56px)', height: 'clamp(34px, 5.4vw, 56px)', border: `1.5px solid ${accent}`, color: accent, background: 'transparent' }}>
        <svg viewBox="0 0 24 24" width="48%" height="48%" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{d < 0 ? <path d="M19 12H5M11 6l-6 6 6 6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}</svg>
      </button>
    )
    return (
      <div className="mx-auto flex max-w-6xl items-center gap-3 md:gap-6">
        {circ(-1)}
        <div className="flex-1 text-center">
          <blockquote data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontSize: 'clamp(1.5rem, 4.6vw, 4.4rem)', lineHeight: 1.12, fontWeight: 400, margin: 0, color: ink }}>&ldquo;{q.text}&rdquo;</blockquote>
          {q.who && <p data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.7rem, 1.5vw, 1.4rem)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 'clamp(18px, 3.4vw, 46px) 0 0' }}>{q.who}</p>}
          <div className="flex justify-center" style={{ gap: 'clamp(10px, 2vw, 22px)', marginTop: 'clamp(20px, 4vw, 54px)' }}>
            {list.map((_, k) => (<button key={k} type="button" aria-label={'Review ' + (k + 1)} onClick={() => setI(k)} className="rounded-full" style={{ width: k === i ? 'clamp(10px, 1.5vw, 15px)' : 'clamp(9px, 1.3vw, 13px)', height: k === i ? 'clamp(10px, 1.5vw, 15px)' : 'clamp(9px, 1.3vw, 13px)', background: accent, opacity: k === i ? 1 : 0.35 }} />))}
          </div>
        </div>
        {circ(1)}
      </div>
    )
  }
  return (
    <div ref={ref} className="flex snap-x overflow-x-auto pb-4" style={{ gap: 'clamp(10px, 1.6vw, 24px)', scrollbarWidth: 'thin', scrollbarColor: `${accent} transparent` }}>
      {list.map((q, k) => (
        <div key={k} id={'tm-' + k} className="flex flex-shrink-0 snap-start flex-col justify-between" style={{ width: 'clamp(250px, 23vw, 400px)', background: card, borderRadius: 'clamp(16px, 2.2vw, 30px)', padding: 'clamp(20px, 2.8vw, 40px)' }}>
          <p data-name="Quote" className="el-tes_quote" style={{ ...headStyle, fontWeight: 400, fontSize: 'clamp(1.1rem, 1.9vw, 1.9rem)', lineHeight: 1.25, margin: 0, color: ink, paddingLeft: '0.5em', textIndent: '-0.5em' }}>&ldquo;{q.text}&rdquo;</p>
          <div className="flex items-center" style={{ gap: 'clamp(10px, 1.4vw, 18px)', marginTop: 'clamp(20px, 3vw, 40px)' }}>
            <span className="flex flex-shrink-0 items-center justify-center rounded-full" style={{ width: 'clamp(30px, 3.6vw, 50px)', height: 'clamp(30px, 3.6vw, 50px)', background: `color-mix(in srgb, ${accent} 24%, ${card})`, color: ink, fontSize: 'clamp(0.8rem, 1.4vw, 1.3rem)' }}>{(q.who || '?').trim().charAt(0).toUpperCase()}</span>
            <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: accent, opacity: 0.7, margin: '6px 0' }} />
            <span data-name="Name" className="el-tes_name" style={{ color: ink, fontSize: 'clamp(0.6rem, 1.05vw, 1rem)', letterSpacing: '0.24em', textTransform: 'uppercase' }}>{q.who}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
