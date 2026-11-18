'use client'

// Cards like "Design your website": closed by default, opening one closes the
// others, smooth open, and the opened card scrolls to the top.
export default function DesignGroup({
  title, hint, left, right, dim, onOpen, onClose, stay, children,
}: {
  title: string
  hint?: string
  left?: React.ReactNode
  right?: React.ReactNode
  dim?: boolean
  onOpen?: () => void
  onClose?: () => void
  stay?: boolean
  children: React.ReactNode
}) {
  const fancy = !!(hint || left || right)
  // Open/close in one synchronous pass so the page never paints a half-moved layout.
  const toggle = (e: React.MouseEvent<HTMLElement>) => {
    if (e.defaultPrevented) return
    e.preventDefault()
    const el = e.currentTarget.parentElement as HTMLDetailsElement
    if (el.open) { el.open = false; onClose?.(); return }
    // Hold the page height while cards swap, so the browser never has to clamp the
    // scroll position (that clamp was the jump when a card sits near the page bottom).
    const doc = document.documentElement
    const held = Math.max(doc.scrollHeight, parseFloat(document.body.style.minHeight) || 0)
    document.body.style.minHeight = held + 'px'
    const before = el.getBoundingClientRect().top
    const root = el.closest('[data-accordion]') ?? el.parentElement
    root?.querySelectorAll('details[data-group]').forEach((d) => { if (d !== el) (d as HTMLDetailsElement).open = false })
    el.open = true
    if (stay) {
      const after = el.getBoundingClientRect().top
      if (after !== before) window.scrollBy({ top: after - before, behavior: 'instant' as ScrollBehavior })
    }
    const body = el.querySelector(':scope > div') as HTMLElement | null
    body?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' })
    if (!stay) requestAnimationFrame(() => {
      const y = el.getBoundingClientRect().top + window.scrollY - 16
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
    })
    onOpen?.()
  }
  return (
    <details
      data-group
      data-title={title}
      className="group rounded-2xl border border-line bg-card p-5"
      style={{ overflowAnchor: 'none' }}
    >
      {fancy ? (
        <summary onClick={toggle} className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          {left ? <span onClick={(e) => e.preventDefault()}>{left}</span> : null}
          <span className="flex-1">
            <span className={`block font-fraunces text-lg font-semibold ${dim ? 'text-ink-soft' : 'text-ink'}`}>{title}</span>
            {hint ? <span className="block text-xs font-normal text-ink-soft">{hint}</span> : null}
          </span>
          {right ? <span onClick={(e) => e.preventDefault()}>{right}</span> : null}
          <span className="text-lg text-ink-soft transition-transform group-open:rotate-90">›</span>
        </summary>
      ) : (
        <summary onClick={toggle} className="cursor-pointer font-fraunces text-lg font-semibold text-ink">{title}</summary>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}
