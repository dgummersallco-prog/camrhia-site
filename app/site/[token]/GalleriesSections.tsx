'use client'

import React, { useState } from 'react'

export const GALSEC = ['sahara', 'gobi', 'mojave', 'atacama', 'namib', 'sonora', 'kalahari', 'thar']
export const GALOWN = ['mojave', 'atacama', 'namib', 'sonora', 'kalahari', 'thar']
export type GalItem = { id: string; title: string; line: string; u: string | null; href: string }
type P = { title: string; items: GalItem[]; viewHref: string; viewText: string; headStyle: React.CSSProperties; ink: string; soft: string; accent: string; line: string }

const bleed: React.CSSProperties = { width: '100vw', marginLeft: 'calc(50% - 50vw)' }
const small: React.CSSProperties = { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }
const DARK = '#17130f'
const CREAM = '#f4efe7'

function Ph({ u, ratio, style }: { u: string | null; ratio: string; style?: React.CSSProperties }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: ratio, background: '#E5E1DB', ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
    </div>
  )
}
function Cap({ g, p, center = false, size = 26, color }: { g: GalItem; p: P; center?: boolean; size?: number; color?: string }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', paddingTop: 14, color: color ?? p.ink }}>
      <p style={{ ...p.headStyle, fontSize: size, lineHeight: 1.2, margin: 0 }}>{g.title}</p>
      {g.line && <p style={{ ...small, color: color ? 'rgba(244,239,231,.7)' : p.soft, margin: '8px 0 0' }}>{g.line}</p>}
    </div>
  )
}
function ViewAll(_: { p: P; align?: 'left' | 'center' | 'right'; color?: string; border?: boolean }) {
  return null
}
const tile = (g: GalItem, children: React.ReactNode, style?: React.CSSProperties) => (
  <a key={g.id} href={g.href} className="group relative block" style={{ textDecoration: 'none', color: 'inherit', ...style }}>{children}</a>
)
const shade = <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 45%, rgba(0,0,0,.66))' }} />

function Sahara(p: P) {
  return (
    <div>
      <div className="grid gap-8 sm:grid-cols-3">{p.items.slice(0, 3).map((g) => tile(g, <><Ph u={g.u} ratio="4/5" /><Cap g={g} p={p} center /></>))}</div>
      <ViewAll p={p} />
    </div>
  )
}
function Gobi(p: P) {
  const [a, ...rest] = p.items
  return (
    <div>
      {a && tile(a, <><Ph u={a.u} ratio="21/9" />{shade}<div style={{ position: 'absolute', left: 32, bottom: 28, color: '#fff' }}><p style={{ ...p.headStyle, fontSize: 'clamp(26px,3.6vw,44px)', lineHeight: 1.1, margin: 0 }}>{a.title}</p>{a.line && <p style={{ ...small, margin: '8px 0 0', opacity: 0.85 }}>{a.line}</p>}</div></>)}
      <div className="mt-6 grid gap-6 sm:grid-cols-3">{rest.slice(0, 3).map((g) => tile(g, <><Ph u={g.u} ratio="1/1" /><Cap g={g} p={p} size={20} /></>))}</div>
      <ViewAll p={p} />
    </div>
  )
}
const h2 = (p: P, size: string, color?: string): React.CSSProperties => ({ ...p.headStyle, fontSize: size, lineHeight: 1.05, margin: 0, color: color ?? p.ink })
function Mojave(p: P) {
  return (
    <div>
      <div style={{ position: 'relative', ...bleed }}>
        <div className="grid sm:grid-cols-3">
          {p.items.slice(0, 3).map((g) => tile(g, <><Ph u={g.u} ratio="3/4" />{shade}<div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 28, color: '#fff' }}><p style={{ ...p.headStyle, fontSize: 26, lineHeight: 1.15, margin: 0 }}>{g.title}</p>{g.line && <p style={{ ...small, margin: '8px 0 0', opacity: 0.85 }}>{g.line}</p>}</div></>))}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,.5), transparent 38%)', pointerEvents: 'none' }} />
        <h2 style={{ ...h2(p, 'clamp(44px,7vw,96px)', '#fff'), position: 'absolute', top: 36, left: 'max(24px, 5vw)' }}>{p.title}</h2>
      </div>
      <ViewAll p={p} align="right" />
    </div>
  )
}
function Atacama(p: P) {
  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-6" style={{ borderBottom: `1px solid ${p.line}`, paddingBottom: 16 }}>
        <h2 style={h2(p, 'clamp(2rem,4vw,3rem)')}>{p.title}</h2>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-4" style={{ scrollSnapType: 'x mandatory' }}>
        {p.items.map((g) => tile(g, <><Ph u={g.u} ratio="4/5" /><Cap g={g} p={p} size={22} /></>, { flex: 'none', width: 'min(300px, 72vw)', scrollSnapAlign: 'start' }))}
      </div>
    </div>
  )
}
function Namib(p: P) {
  const [i, setI] = useState(0)
  const cur = p.items[i] ?? p.items[0]
  return (
    <div className="grid items-center gap-12 md:grid-cols-[1.1fr_1fr]">
      <a href={cur.href} className="group relative block" style={{ textDecoration: 'none' }}><Ph u={cur.u} ratio="4/5" /></a>
      <div>
        <p style={{ ...small, color: p.accent, margin: '0 0 18px' }}>{p.title}</p>
        {p.items.map((g, k) => (
          <a key={g.id} href={g.href} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} style={{ display: 'block', padding: '18px 0', borderTop: `1px solid ${p.line}`, color: p.ink, textDecoration: 'none', opacity: k === i ? 1 : 0.5, transition: 'opacity .3s' }}>
            <span style={{ ...p.headStyle, fontSize: 'clamp(28px,3.6vw,46px)', lineHeight: 1.12 }}>{g.title}</span>
            {g.line && <span style={{ ...small, color: p.soft, display: 'block', marginTop: 6 }}>{g.line}</span>}
          </a>
        ))}
        <ViewAll p={p} align="left" />
      </div>
    </div>
  )
}
function Sonora(p: P) {
  return (
    <div style={{ position: 'relative' }}>
      <div className="grid gap-3 sm:grid-cols-2">
        {p.items.slice(0, 4).map((g) => tile(g, <><Ph u={g.u} ratio="3/2" />{shade}<div style={{ position: 'absolute', left: 24, bottom: 20, color: '#fff' }}><p style={{ ...p.headStyle, fontSize: 'clamp(20px,2.4vw,28px)', lineHeight: 1.15, margin: 0 }}>{g.title}</p></div></>))}
      </div>
      <div className="hidden sm:block" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: '#fbf8f3', color: p.ink, padding: '34px 48px', textAlign: 'center', boxShadow: '0 14px 40px rgba(0,0,0,.18)' }}>
        <h2 style={h2(p, 'clamp(1.8rem,3vw,2.6rem)', p.ink)}>{p.title}</h2>
      </div>
    </div>
  )
}
function Kalahari(p: P) {
  return (
    <div className="grid items-start gap-12 md:grid-cols-[1fr_2.2fr]">
      <div className="md:sticky md:top-10">
        <h2 style={h2(p, 'clamp(2.6rem,5.5vw,4.6rem)')}>{p.title}</h2>
        <ViewAll p={p} align="left" />
      </div>
      <div className="grid grid-cols-2 items-start gap-6">
        {p.items.slice(0, 4).map((g, k) => tile(g, <><Ph u={g.u} ratio="3/4" /><Cap g={g} p={p} size={20} /></>, { marginTop: k % 2 ? 56 : 0 }))}
      </div>
    </div>
  )
}
function Thar(p: P) {
  return (
    <div style={{ background: DARK, color: CREAM, boxShadow: `0 0 0 100vmax ${DARK}`, clipPath: 'inset(0 -100vmax)', padding: '24px 0 8px' }}>
      <div className="mb-10 flex items-center gap-6">
        <h2 style={h2(p, 'clamp(2rem,4vw,3rem)', CREAM)}>{p.title}</h2>
        <div style={{ flex: 1, height: 1, background: 'rgba(244,239,231,.3)' }} />
      </div>
      <div className="grid gap-8 sm:grid-cols-3">
        {p.items.slice(0, 3).map((g) => tile(g, <><div style={{ border: '1px solid rgba(244,239,231,.25)', padding: 10 }}><Ph u={g.u} ratio="4/5" /></div><Cap g={g} p={p} center color={CREAM} size={24} /></>))}
      </div>
      <div style={{ paddingBottom: 24 }}><ViewAll p={p} align="right" color={CREAM} border /></div>
    </div>
  )
}
const DESIGNS: Record<string, (p: P) => React.ReactElement> = { sahara: Sahara, gobi: Gobi, mojave: Mojave, atacama: Atacama, namib: Namib, sonora: Sonora, kalahari: Kalahari, thar: Thar }

export function GalleriesSection({ design, ...p }: { design: string } & P) {
  const C = DESIGNS[design] ?? Sahara
  return <C {...p} />
}
