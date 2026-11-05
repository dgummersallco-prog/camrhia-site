'use client'

// Cards like "Design your website": closed by default, opening one closes the
// others, smooth open, and the opened card scrolls to the top.
export default function DesignGroup({
  title, hint, left, right, dim, onOpen, onClose, children,
}: {
  title: string
  hint?: string
  left?: React.ReactNode
  right?: React.ReactNode
  dim?: boolean
  onOpen?: () => void
  onClose?: () => void
  children: React.ReactNode
}) {
  const fancy = !!(hint || left || right)
  return (
    <details
      data-group
      onToggle={(e) => {
        const el = e.currentTarget as HTMLDetailsElement
        if (!el.open) { onClose?.(); return }
        const root = el.closest('[data-accordion]') ?? el.parentElement
        root?.querySelectorAll('details[data-group]').forEach((d) => { if (d !== el) (d as HTMLDetailsElement).open = false })
        const body = el.querySelector(':scope > div') as HTMLElement | null
        body?.animate?.([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'ease-out' })
        requestAnimationFrame(() => {
          const y = el.getBoundingClientRect().top + window.scrollY - 16
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
        })
        onOpen?.()
      }}
      className="group rounded-2xl border border-line bg-card p-5"
      style={{ overflowAnchor: 'none' }}
    >
      {fancy ? (
        <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
          {left ? <span onClick={(e) => e.preventDefault()}>{left}</span> : null}
          <span className="flex-1">
            <span className={`block font-fraunces text-lg font-semibold ${dim ? 'text-ink-soft' : 'text-ink'}`}>{title}</span>
            {hint ? <span className="block text-xs font-normal text-ink-soft">{hint}</span> : null}
          </span>
          {right ? <span onClick={(e) => e.preventDefault()}>{right}</span> : null}
          <span className="text-lg text-ink-soft transition-transform group-open:rotate-90">›</span>
        </summary>
      ) : (
        <summary className="cursor-pointer font-fraunces text-lg font-semibold text-ink">{title}</summary>
      )}
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}
