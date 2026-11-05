'use client'

// Cards like "Design your website": closed by default, opening one closes the
// others, smooth open, the opened card scrolls to the top, and the preview follows.
export default function DesignGroup({ title, onOpen, children }: { title: string; onOpen?: () => void; children: React.ReactNode }) {
  return (
    <details
      onToggle={(e) => {
        const el = e.currentTarget as HTMLDetailsElement
        if (!el.open) return
        el.parentElement?.querySelectorAll(':scope > details').forEach((d) => { if (d !== el) (d as HTMLDetailsElement).open = false })
        const body = el.querySelector(':scope > div') as HTMLElement | null
        body?.animate?.([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' })
        requestAnimationFrame(() => {
          const y = el.getBoundingClientRect().top + window.scrollY - 16
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
        })
        setTimeout(() => onOpen?.(), 220)
      }}
      className="rounded-2xl border border-line bg-card p-5"
      style={{ overflowAnchor: 'none' }}
    >
      <summary className="cursor-pointer font-fraunces text-lg font-semibold text-ink">{title}</summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}
