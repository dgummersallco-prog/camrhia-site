'use client'

// Same behavior as the cards in "Design your website": closed by default,
// opening one closes the others, smooth open, and the preview scrolls to match.
export default function DesignGroup({ title, onOpen, children }: { title: string; onOpen?: () => void; children: React.ReactNode }) {
  return (
    <details onToggle={(e) => {
      const el = e.currentTarget as HTMLDetailsElement
      if (el.open) {
        const topBefore = el.getBoundingClientRect().top
        el.parentElement?.querySelectorAll(':scope > details').forEach((d) => { if (d !== el) (d as HTMLDetailsElement).open = false })
        const shift = el.getBoundingClientRect().top - topBefore
        let sp: HTMLElement | null = el.parentElement
        while (sp) { const o = getComputedStyle(sp).overflowY; if ((o === 'auto' || o === 'scroll') && sp.scrollHeight > sp.clientHeight) break; sp = sp.parentElement }
        if (shift) { if (sp) sp.scrollTop += shift; else window.scrollBy(0, shift) }
        const body = el.querySelector(':scope > div') as HTMLElement | null
        body?.animate?.([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' })
        requestAnimationFrame(() => {
          const off = el.getBoundingClientRect().top - (sp ? sp.getBoundingClientRect().top : 0)
          if (sp && Math.abs(off - 12) > 24) sp.scrollTo({ top: sp.scrollTop + off - 12, behavior: 'smooth' })
        })
        setTimeout(() => onOpen?.(), 220)
      }
    }} className="scroll-mt-4 rounded-2xl border border-line bg-card p-5">
      <summary className="cursor-pointer font-fraunces text-lg font-semibold text-ink">{title}</summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}
