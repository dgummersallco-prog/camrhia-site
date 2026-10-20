"use client"
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

type Q = { text: string; who?: string | null; img?: string | null }

export function TestimonialCarousel({ list, heading, headStyle, bodyFont, ink, soft, bg, tint }: {
  list: Q[]; heading: string; headStyle: CSSProperties; bodyFont: string; ink: string; soft: string; bg: string; tint: string
}) {
  const [i, setI] = useState(0)
  const [show, setShow] = useState(true)
  const n = list.length

  const go = (d: number) => {
    setShow(false)
    setTimeout(() => { setI((p) => (p + d + n) % n); setShow(true) }, 280)
  }

  useEffect(() => {
    if (n < 2) return
    const id = setInterval(() => go(1), 6500)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n])

  if (n === 0) return null
  const q = list[i % n]

  return (
    <div className="mx-auto max-w-4xl">
      {n > 1 && (
        <div className="mb-6 flex gap-6" style={{ color: ink }}>
          <button aria-label="Previous review" onClick={() => go(-1)} className="p-1">
            <svg width="34" height="14" viewBox="0 0 34 14" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M34 7H2M8 1L2 7l6 6" /></svg>
          </button>
          <button aria-label="Next review" onClick={() => go(1)} className="p-1">
            <svg width="34" height="14" viewBox="0 0 34 14" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M0 7h32M26 1l6 6-6 6" /></svg>
          </button>
        </div>
      )}

      <div style={{ opacity: show ? 1 : 0, transition: 'opacity 280ms ease' }}>
        <h2 className="pointer-events-none relative z-0 leading-none"
          style={{ ...headStyle, fontWeight: 200, fontSize: 'clamp(3rem, 11vw, 8.5rem)', marginBottom: '-0.38em', color: `color-mix(in srgb, ${ink} 14%, transparent)` }}>
          {heading}
        </h2>

        <div className="relative z-10 mx-auto" style={{ maxWidth: 680 }}>
          <div className="aspect-[4/3] overflow-hidden" style={{ borderRadius: 28, background: tint }}>
            {q.img && <img src={q.img} alt="" className="h-full w-full object-cover" />}
          </div>
          {q.who && (
            <span className="absolute bottom-8 right-0 translate-x-[30%] rounded-full px-5 py-2.5 text-[11px] uppercase tracking-[0.22em]"
              style={{ background: `color-mix(in srgb, ${ink} 12%, ${bg})`, color: ink, fontFamily: bodyFont }}>
              {q.who}
            </span>
          )}
        </div>

        <blockquote className="mx-auto mt-10 max-w-3xl text-xl leading-relaxed md:text-2xl" style={{ color: soft, fontWeight: 300, fontFamily: bodyFont }}>
          &ldquo;{q.text}&rdquo;
        </blockquote>
      </div>
    </div>
  )
}
