'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const useIso = typeof window !== 'undefined' ? useLayoutEffect : useEffect

// Lays the page out at a fixed phone width (the width you design at) and scales the
// whole thing to the screen, so spacing, text and elements stay exactly as designed.
export default function Fit({ children, design = 390, max = 1.25 }: { children: React.ReactNode; design?: number; max?: number }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)
  const [ready, setReady] = useState(false)

  useIso(() => {
    const o = outer.current
    const i = inner.current
    if (!o || !i) return
    const measure = () => {
      const s = Math.min(max, o.clientWidth / design)
      setScale(s)
      setHeight(i.offsetHeight * s)
      setReady(true)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(o)
    ro.observe(i)
    return () => ro.disconnect()
  }, [design, max])

  return (
    <div ref={outer} className="relative mx-auto w-full" style={{ maxWidth: design * max, height, opacity: ready ? 1 : 0 }}>
      <div ref={inner} style={{ width: design, transformOrigin: 'top left', transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  )
}
