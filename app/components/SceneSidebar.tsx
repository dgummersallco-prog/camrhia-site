'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Wordmark from '@/app/components/Wordmark'
import DashScenes from '@/app/components/DashScenes'

export type SceneItem = { href: string; label: string; icon?: string; badge?: number; onClick?: () => void; sub?: boolean; id?: string; active?: boolean }
export type SceneGroup = { label?: string; items: SceneItem[] }

export default function SceneSidebar({ groups, activeHref, homeHref, onSignOut, tag, noScenes }: {
  groups: SceneGroup[]
  activeHref: string
  homeHref: string
  onSignOut: () => void
  tag?: string
  noScenes?: boolean
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('dash-shell')
    return () => root.classList.remove('dash-shell')
  }, [])

  const nav = groups.map((g, gi) => (
    <div key={gi} className={gi === 0 ? '' : 'mt-6'}>
      {g.label && (
        <div className="mb-2 flex items-center gap-3 px-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white">{g.label}</p>
          <span className="h-px flex-1 bg-white/40" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        {g.items.map((it) => {
          const isActive = it.active ?? it.href === activeHref
          return (
            <Link
              key={it.id ?? it.href}
              href={it.href}
              onClick={(e) => { if (it.onClick) { e.preventDefault(); it.onClick() } setOpen(false) }}
              className={`relative flex items-center gap-3.5 rounded-2xl ${it.sub ? 'ml-5 px-3 py-1.5 text-sm' : 'px-3 py-2.5 text-[15px]'} text-white transition ${
                isActive
                  ? (it.sub ? 'bg-white/15 font-semibold' : 'bg-gradient-to-r from-white/25 via-white/30 to-white/20 font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.6),0_4px_14px_-6px_rgba(0,0,0,0.6)]')
                  : 'hover:bg-white/5'
              }`}
            >
              {it.icon && (
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d={it.icon} />
                </svg>
              )}
              {it.label}
              {!!it.badge && it.badge > 0 && (
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[rgb(var(--scene-b,165_100_106))]">{it.badge > 9 ? '9+' : it.badge}</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  ))

  return (
    <>
      {!noScenes && <DashScenes />}
      <aside className="fixed bottom-0 left-0 top-0 z-40 hidden w-60 flex-col border-r border-white/30 bg-[linear-gradient(180deg,rgb(var(--scene-a,204_138_140)/0.26)_0%,rgb(var(--scene-b,158_98_106)/0.3)_100%)] px-3 py-7 shadow-[8px_0_40px_-18px_rgba(0,0,0,0.45)] backdrop-blur-xl [text-shadow:0_1px_6px_rgba(0,0,0,0.35)] xl:flex">
        <Link href={homeHref} className="mb-8 block px-3 text-center"><Wordmark className="text-5xl text-white!" />{tag && <span className="-mt-1 block font-fraunces text-lg italic tracking-wide text-white/90">{tag}</span>}</Link>
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto">{nav}</nav>
        <button onClick={onSignOut} className="rounded-xl px-3 py-2.5 text-left text-sm text-white transition hover:bg-white/5">Sign out</button>
      </aside>

      <header className="sticky top-0 z-40 border-b border-white/30 bg-[color-mix(in_srgb,rgb(var(--scene-a,185_122_126))_65%,#e6e6e6)] xl:hidden">
        <div className="flex items-center justify-between px-6 py-3">
          <Link href={homeHref} className="flex items-baseline gap-2"><Wordmark className="text-3xl text-white!" />{tag && <span className="font-fraunces text-sm italic text-white/90">{tag}</span>}</Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-white"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {open && (
          <nav className="flex flex-col border-t border-white/30 px-4 pb-4 pt-3">
            {nav}
            <button onClick={onSignOut} className="rounded-xl px-3 py-2.5 text-left text-sm text-white">Sign out</button>
          </nav>
        )}
      </header>
    </>
  )
}
