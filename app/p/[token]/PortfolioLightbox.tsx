'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

export function PortfolioLightbox() {
  const [srcs, setSrcs] = useState<string[]>([])
  const [idx, setIdx] = useState<number | null>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement | null
      const el = t?.closest?.('img[data-zoom]') as HTMLImageElement | null
      if (!el) return
      const all = Array.from(document.querySelectorAll('img[data-zoom]')) as HTMLImageElement[]
      setSrcs(all.map((i) => i.currentSrc || i.src))
      setIdx(all.indexOf(el))
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const close = useCallback(() => setIdx(null), [])
  const step = useCallback(
    (d: number) => setIdx((i) => (i === null || srcs.length === 0 ? null : (i + d + srcs.length) % srcs.length)),
    [srcs.length],
  )

  useEffect(() => {
    if (idx === null) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [idx, close, step])

  if (idx === null || !srcs[idx]) return null

  const btn: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: 22,
    border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 22, cursor: 'pointer',
  }

  return (
    <div
      onClick={close}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        touchX.current = null
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1)
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={srcs[idx]} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '94vw', maxHeight: '92vh', objectFit: 'contain', borderRadius: 4 }} />
      <button aria-label="Close" onClick={close} style={{ ...btn, top: 24, right: 16, transform: 'none' }}>×</button>
      {srcs.length > 1 && (
        <>
          <button aria-label="Previous" onClick={(e) => { e.stopPropagation(); step(-1) }} style={{ ...btn, left: 12 }}>‹</button>
          <button aria-label="Next" onClick={(e) => { e.stopPropagation(); step(1) }} style={{ ...btn, right: 12 }}>›</button>
        </>
      )}
    </div>
  )
}
