'use client'

import { createElement, useEffect, useRef } from 'react'

// Type straight onto the page. Uncontrolled on purpose: the text is only pushed in
// from outside when the box is not focused, so the cursor never jumps while typing.
export default function Editable({
  tag = 'div',
  value,
  onChange,
  placeholder,
  single,
  className,
  style,
  attrs,
}: {
  tag?: 'p' | 'h1' | 'div' | 'span'
  value: string
  onChange: (v: string) => void
  placeholder: string
  single?: boolean
  className?: string
  style?: React.CSSProperties
  attrs?: Record<string, string>
}) {
  const ref = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el) return
    if (el.innerText !== value) el.innerText = value
  }, [value])
  const props: Record<string, unknown> = {
    ref,
    contentEditable: 'plaintext-only',
    suppressContentEditableWarning: true,
    spellCheck: false,
    'data-ph': placeholder,
    className,
    style,
    ...attrs,
    onInput: (e: React.FormEvent<HTMLElement>) => {
      const el = e.currentTarget
      let v = el.innerText
      if (v === '\n' || v === '') { el.innerHTML = ''; v = '' }
      onChange(single ? v.replace(/\n/g, ' ') : v)
    },
    onKeyDown: single ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') e.preventDefault() } : undefined,
  }
  return createElement(tag, props)
}
