'use client'

import { Children, isValidElement, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactElement, ReactNode } from 'react'

type Opt = { value: string; label: string; disabled: boolean }

type Props = {
  value?: string | number
  defaultValue?: string
  onChange?: (e: { target: { value: string }; currentTarget: { value: string } }) => void
  className?: string
  disabled?: boolean
  children?: ReactNode
  id?: string
  name?: string
  autoFocus?: boolean
  title?: string
  style?: CSSProperties
}

function collect(children: ReactNode, out: Opt[]) {
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return
    const el = c as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>
    if (el.type === 'option') {
      const label = Children.toArray(el.props.children).join('')
      out.push({ value: el.props.value !== undefined ? String(el.props.value) : label, label, disabled: !!el.props.disabled })
    } else if (el.props?.children) {
      collect(el.props.children, out)
    }
  })
}

const WRAP = /^([a-z0-9]+:)*(w-|min-w-|max-w-|flex-|grow|shrink|self-|col-span|basis-)/

export function Select({ value, defaultValue, onChange, className = '', disabled, children, id, name, autoFocus, title, style }: Props) {
  const opts: Opt[] = []
  collect(children, opts)

  const [open, setOpen] = useState(false)
  const [up, setUp] = useState(false)
  const [inner, setInner] = useState(defaultValue ?? '')
  const [hi, setHi] = useState(-1)
  const root = useRef<HTMLDivElement>(null)

  const cur = value !== undefined ? String(value) : inner
  const selIdx = Math.max(0, opts.findIndex((o) => o.value === cur))
  const label = opts[selIdx]?.label ?? ''

  const tokens = className.split(/\s+/).filter(Boolean)
  const wrapCls = tokens.filter((t) => WRAP.test(t)).join(' ')
  let btnCls = tokens.filter((t) => !WRAP.test(t)).join(' ')
  if (!/(^|\s)border(\s|$)/.test(btnCls)) btnCls += ' rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink'

  function pick(i: number) {
    const o = opts[i]
    if (!o || o.disabled) return
    setInner(o.value)
    onChange?.({ target: { value: o.value }, currentTarget: { value: o.value } })
    setOpen(false)
  }

  function toggle() {
    if (disabled) return
    if (!open && root.current) {
      const r = root.current.getBoundingClientRect()
      setUp(window.innerHeight - r.bottom < 280 && r.top > 280)
      setHi(selIdx)
    }
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (root.current && !root.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function move(dir: 1 | -1) {
    let i = hi
    for (let n = 0; n < opts.length; n++) {
      i = (i + dir + opts.length) % opts.length
      if (!opts[i].disabled) { setHi(i); return }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { toggle(); return }
      move(e.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (open && hi >= 0) pick(hi)
      else toggle()
    }
  }

  return (
    <div ref={root} className={`relative ${wrapCls || 'w-full'}`} style={style}>
      {name && <input type="hidden" name={name} value={cur} />}
      <button
        type="button"
        id={id}
        title={title}
        autoFocus={autoFocus}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`${btnCls} w-full pr-9 text-left focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25 ${disabled ? 'opacity-60' : ''}`}
      >
        <span className="block truncate">{label}</span>
      </button>
      <svg viewBox="0 0 24 24" className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6 6-6" />
      </svg>
      {open && (
        <ul role="listbox" className={`absolute left-0 right-0 z-50 max-h-64 min-w-full overflow-auto rounded-xl border border-line bg-card py-1 shadow-lg ${up ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {opts.map((o, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === selIdx}
              onMouseDown={(e) => { e.preventDefault(); pick(i) }}
              onMouseEnter={() => setHi(i)}
              className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${o.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${i === selIdx ? 'font-medium text-twilight' : 'text-ink'} ${hi === i && !o.disabled ? 'bg-blush-wash' : ''}`}
            >
              <span className="truncate">{o.label}</span>
              {i === selIdx && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
