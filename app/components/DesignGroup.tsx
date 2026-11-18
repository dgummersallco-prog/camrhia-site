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
    root?.querySelectorAll('details[data-group]').forEach((d) => {
      if (d === el) return
      // Cards above this one stay as they are: closing a tall card above shrinks the page
      // under your cursor and the screen jumps. Cards below can close without moving anything.
      if (stay && el.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_PRECEDING) return
      ;(d as HTMLDetailsElement).open = false
    })
    el.open = true
    if (stay) {
      // Keep the card exactly where it was on screen, and keep doing so for a moment
      // while fonts and pictures inside it finish loading and the layout settles.
      let stop = false
      const cancel = () => { stop = true }
      window.addEventListener('wheel', cancel, { once: true, passive: true })
      window.addEventListener('touchmove', cancel, { once: true, passive: true })
      const t0 = performance.now()
      const hold = () => {
        const after = el.getBoundingClientRect().top
        if (Math.abs(after - before) > 0.5) window.scrollBy({ top: after - before, behavior: 'instant' as ScrollBehavior })
        if (!stop && performance.now() - t0 < 600) requestAnimationFrame(hold)
        else { window.removeEventListener('wheel', cancel); window.removeEventListener('touchmove', cancel) }
      }
      hold()
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
