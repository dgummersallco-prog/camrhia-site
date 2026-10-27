'use client'

import React, { useState } from 'react'
import type { resolveTheme } from '@/lib/siteTheme'

type Theme = ReturnType<typeof resolveTheme>
export type NavItem = { key: string; href: string; label: string; active: boolean }

export function SiteNav({ t, logo, name, items, homeHref, headStyle, back }: { back?: { href: string; label: string }; t: Theme; logo: string | null; name: string; items: NavItem[]; homeHref: string; headStyle: React.CSSProperties }) {
  const [open, setOpen] = useState(false)
  const burger = t.menu.icon === 'burger'
  const { ink, bg, line } = t
  const brand = logo && t.menu.show !== 'name'
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} />
    : <span className="el-menu_brand" style={{ ...headStyle, fontSize: 24 }}>{t.menu.brand ?? name}</span>
  if (back) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(bg).trim())
    const n = m ? parseInt(m[1], 16) : null
    const lum = n === null ? null : (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
    const auto = lum === null ? ink : lum > 0.55 ? '#2A1F24' : '#FFFFFF'
    return (
      <nav id="nav" className="relative z-20" style={{ color: auto }}>
        <div className={'mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6 py-2' + (t.menu.logoPos === 'right' ? ' flex-row-reverse' : '')}>
          <a href={homeHref} style={{ display: 'inline-flex', transform: 'translate(var(--nudge, 0px), var(--nudgey, 0px))', transition: 'transform 0.12s ease-out' }}>{brand}</a>
          <a href={back.href} className="el-menu_links text-[11px] uppercase tracking-[0.2em]" style={{ fontFamily: t.body, color: t.menu.backColor ?? undefined, fontSize: 'var(--menu)', transform: 'translateY(var(--menuy, 0px))' }}>{back.label}</a>
        </div>
      </nav>
    )
  }
  return (
    <>
      <nav
        id="nav"
        className={t.menu.none ? 'relative z-20' : 'sticky top-0 z-20'}
        style={t.menu.none ? { color: ink } : { color: ink, background: `color-mix(in srgb, ${t.menu.bg ?? bg} 94%, transparent)`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${line}` }}
      >
        <div className={t.menu.logoPos === 'center' ? 'mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-4' : 'mx-auto flex min-h-16 max-w-6xl items-center justify-between px-6 py-2' + (t.menu.logoPos === 'right' ? ' flex-row-reverse' : '')}>
          <a href={homeHref} style={{ display: 'inline-flex', transform: 'translate(var(--nudge, 0px), var(--nudgey, 0px))', transition: 'transform 0.12s ease-out' }}>{brand}</a>
          <ul className={burger ? 'hidden' : 'hidden gap-8 md:flex'} style={{ transform: 'translateY(var(--menuy, 0px))' }}>
            {items.map((n) => (
              <li key={n.key}>
                <a href={n.href} className="el-menu_links text-[11px] uppercase tracking-[0.2em]"
                  style={{ fontFamily: t.body, fontSize: 'var(--menu)', opacity: n.active ? 1 : 0.8, borderBottom: n.active ? '1px solid currentColor' : '1px solid transparent', paddingBottom: 3 }}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <button className={(burger ? 'absolute top-1/2 -translate-y-1/2 p-1 ' : 'absolute top-4 md:hidden ') + (t.menu.logoPos === 'right' ? 'left-5' : 'right-5')} aria-label="Menu" onClick={() => setOpen(!open)} style={{ fontSize: 22, lineHeight: 1 }}>
            {burger ? (
              <svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="currentColor" strokeWidth="3"><path d="M0 3h30M0 11h30M0 19h30" /></svg>
            ) : open ? '✕' : '☰'}
          </button>
        </div>
        {open && !burger && (
          <ul className="flex flex-col gap-4 px-6 pb-5 md:hidden" style={{ background: bg }}>
            {items.map((n) => (
              <li key={n.key}>
                <a href={n.href} onClick={() => setOpen(false)} className="el-menu_links text-[12px] uppercase tracking-[0.2em]" style={{ fontFamily: t.body, fontSize: 'var(--menu)' }}>{n.label}</a>
              </li>
            ))}
          </ul>
        )}
      </nav>
      {open && burger && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8" style={{ background: bg, color: ink }}>
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute right-6 top-5 text-3xl" style={{ lineHeight: 1 }}>✕</button>
          {items.map((n) => (
            <a key={n.key} href={n.href} onClick={() => setOpen(false)} className="text-4xl md:text-5xl" style={{ ...headStyle, opacity: n.active ? 1 : 0.75 }}>{n.label}</a>
          ))}
        </div>
      )}
    </>
  )
}
