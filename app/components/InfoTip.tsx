'use client'

import { useEffect, useRef, useState } from 'react'

export default function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  return (
    <span ref={ref} className="relative inline-flex">
      <button type="button" aria-label="How this is calculated" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-line text-[10px] font-semibold normal-case leading-none text-ink-soft hover:text-ink">i</button>
      {open && (
        <span role="tooltip" className="absolute left-0 top-6 z-20 w-56 max-w-[70vw] rounded-lg border border-line bg-white p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-ink shadow-lg">{text}</span>
      )}
    </span>
  )
}
