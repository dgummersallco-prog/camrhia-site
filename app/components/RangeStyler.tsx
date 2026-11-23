'use client'
import { useEffect } from 'react'

function paint(el: HTMLInputElement) {
  const min = parseFloat(el.min || '0')
  const max = parseFloat(el.max || '100')
  const v = parseFloat(el.value || '0')
  const p = max > min ? Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100)) : 0
  el.style.setProperty('--p', p + '%')
}

export default function RangeStyler() {
  useEffect(() => {
    const all = () => document.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach(paint)
    let raf = 0
    const soon = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; all() }) }
    all()
    document.addEventListener('input', soon, true)
    const mo = new MutationObserver(soon)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'min', 'max'] })
    return () => { document.removeEventListener('input', soon, true); mo.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return null
}
