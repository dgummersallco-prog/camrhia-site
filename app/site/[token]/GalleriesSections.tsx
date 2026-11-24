'use client'

import React, { useState } from 'react'

export const GALSEC = ['sahara', 'gobi', 'mojave', 'atacama', 'namib', 'sonora', 'kalahari', 'thar']
export const GALOWN = ['sahara', 'gobi', 'mojave', 'atacama', 'namib', 'sonora', 'kalahari', 'thar']
export type GalItem = { id: string; title: string; line: string; u: string | null; href: string; n?: number }
type P = { bg?: string; title: string; items: GalItem[]; viewHref: string; viewText: string; headStyle: React.CSSProperties; nameStyle: React.CSSProperties; ink: string; soft: string; accent: string; line: string }

const bleed: React.CSSProperties = { width: '100vw', marginLeft: 'calc(50% - 50vw)' }
const small: React.CSSProperties = { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }
const DARK = '#17130f'
const CREAM = '#f4efe7'

function Ph({ u, ratio, style }: { u: string | null; ratio: string; style?: React.CSSProperties }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: ratio, background: '#E5E1DB', ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {u ? <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="400" height="300" fill="#d8d0c6" /><circle cx="290" cy="80" r="20" fill="#b8aa98" opacity="0.55" /><path d="M0 300 L110 120 L180 210 L260 100 L400 300 Z" fill="#b8aa98" opacity="0.8" /></svg>}
    </div>
  )
}
function Cap({ g, p, center = false, size = 26, color }: { g: GalItem; p: P; center?: boolean; size?: number; color?: string }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', paddingTop: 14, color: color ?? p.ink }}>
      <p style={{ ...p.nameStyle, fontSize: size, lineHeight: 1.2, margin: 0 }}>{g.title}</p>
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
      <h2 data-name="Section title" className="el-gs_title" style={{ ...h2(p, 'clamp(2.6rem,6vw,5.6rem)'), textAlign: 'center', marginBottom: 'clamp(12px,2.3vw,40px)' }}>{p.title}</h2>
      <div className="grid sm:grid-cols-3" style={{ columnGap: '5.2%', rowGap: 32 }}>
        {p.items.slice(0, 3).map((g) => tile(g, <><Ph u={g.u} ratio="4/5" /><div style={{ textAlign: 'center', paddingTop: 'clamp(8px,1.4vw,24px)', color: p.ink }}><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, fontSize: 'clamp(1.4rem,2.5vw,2.4rem)', lineHeight: 1.2, margin: 0 }}>{g.title}</p><p data-name="Gallery count" className="el-gal_count" style={{ ...small, fontSize: 'clamp(10px,1.1vw,16px)', letterSpacing: '0.3em', color: p.soft, margin: 'clamp(6px,1.2vw,20px) 0 0' }}>{g.n ?? 0} photos</p></div></>))}
      </div>
    </div>
  )
}
function Gobi(p: P) {
  const a = p.items[0]
  const rest = p.items.slice(1, 4)
  return (
    <div>
      <h2 data-name="Section title" className="el-gs_title" style={{ ...h2(p, 'clamp(1.5rem,3.8vw,3.6rem)'), textAlign: 'center', letterSpacing: '0.5em', paddingLeft: '0.5em', marginBottom: 'clamp(12px,2.2vw,38px)' }}>{p.title}</h2>
      {a && (
        <div className="[--gr:16/9] sm:[--gr:4.41/1]" style={{ width: '100%' }}>
          {tile(a, <><Ph u={a.u} ratio="4.41/1" style={{ aspectRatio: 'var(--gr)' }} /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(20,12,6,.78), transparent 48%)' }} /><div style={{ position: 'absolute', left: '3.6%', bottom: '8%', color: '#fff' }}><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, fontSize: 'clamp(2rem,5.6vw,5.4rem)', lineHeight: 1.05, margin: 0 }}>{a.title}</p></div></>)}
        </div>
      )}
      <div className="grid sm:grid-cols-3" style={{ width: '85.6%', margin: 'clamp(14px,1.4vw,24px) auto 0', columnGap: '7.2%', rowGap: 24 }}>
        {rest.map((g) => tile(g, <><Ph u={g.u} ratio="5/4" /><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, fontSize: 'clamp(1.2rem,2.5vw,2.4rem)', lineHeight: 1.2, margin: 0, textAlign: 'center', paddingTop: 'clamp(6px,0.9vw,16px)', color: p.ink }}>{g.title}</p></>))}
      </div>
    </div>
  )
}
const h2 = (p: P, size: string, color?: string): React.CSSProperties => ({ ...p.headStyle, fontSize: size, lineHeight: 1.05, margin: 0, color: color ?? p.ink })
function Mojave(p: P) {
  return (
    <div>
      <div style={{ position: 'relative', ...bleed }}>
        <div className="grid sm:grid-cols-3">
          {p.items.slice(0, 3).map((g) => tile(g, <><Ph u={g.u} ratio="2/3" /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 55%, rgba(24,18,12,.82))' }} /><div style={{ position: 'absolute', left: 0, right: 0, bottom: '6.2%', textAlign: 'center', color: '#fff' }}><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, fontSize: 'clamp(1rem,2.7vw,2.8rem)', letterSpacing: '0.24em', lineHeight: 1.15, margin: 0 }}>{g.title}</p></div></>))}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(24,18,12,.7), transparent 40%)', pointerEvents: 'none' }} />
        <h2 data-name="Section title" className="el-gs_title" style={{ ...h2(p, 'clamp(2.2rem,5.8vw,6rem)', '#fff'), letterSpacing: '0.08em', position: 'absolute', top: 'clamp(12px,1.8vw,32px)', left: 'max(16px, 3.3vw)' }}>{p.title}</h2>
      </div>
    </div>
  )
}
function Atacama(p: P) {
  return (
    <div>
      <div style={{ borderBottom: `1px solid ${p.line}`, paddingBottom: 'clamp(8px,1.5vw,26px)', marginBottom: 'clamp(14px,2.6vw,46px)' }}>
        <h2 data-name="Section title" className="el-gs_title" style={{ ...h2(p, 'clamp(2.4rem,6.2vw,6.2rem)'), margin: 0 }}>{p.title}</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ columnGap: '2.6%', rowGap: 28 }}>
        {p.items.slice(0, 4).map((g) => tile(g, <><Ph u={g.u} ratio="7/10" /><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, color: p.ink, fontSize: 'clamp(1.3rem,2.7vw,2.7rem)', lineHeight: 1.15, margin: 0, paddingTop: 'clamp(6px,1vw,18px)' }}>{g.title}</p><p data-name="Gallery count" className="el-gal_count" style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", fontSize: 'clamp(9px,1.2vw,20px)', letterSpacing: '0.26em', textTransform: 'uppercase', color: p.soft, margin: 'clamp(6px,1.1vw,18px) 0 0' }}>{g.line || g.title}</p></>))}
      </div>
    </div>
  )
}
function Namib(p: P) {
  const [i, setI] = useState(0)
  const cur = p.items[i] ?? p.items[0]
  const rows = p.items.slice(0, 3)
  return (
    <div style={{ ...bleed, background: '#ebe7e1', padding: '4px 0' }}>
    <div className="grid md:grid-cols-[44.4%_1fr] md:aspect-[2/1]">
      <a href={cur?.href} className="group relative block min-h-[360px]" style={{ textDecoration: 'none' }}>
        <Ph u={cur?.u ?? null} ratio="787/887" style={{ position: 'absolute', inset: 0, height: '100%', aspectRatio: 'auto' }} />
      </a>
      <div className="flex flex-col" style={{ background: p.bg || '#f8f4ee', padding: 'clamp(16px,2.4vw,42px) clamp(16px,3.3vw,58px) clamp(16px,3vw,48px) clamp(16px,4vw,71px)' }}>
        <p data-name="Section title" className="el-gs_title" style={{ ...p.headStyle, color: p.accent, fontSize: 'clamp(0.8rem,2vw,2rem)', letterSpacing: '0.5em', textTransform: 'uppercase', textAlign: 'right', margin: 0, fontWeight: 400 }}>{p.title}</p>
        <div className="flex flex-1 flex-col" style={{ marginTop: 'clamp(8px,1.2vw,22px)' }}>
          {rows.map((g, k) => (
            <a key={g.id} href={g.href} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} className="flex flex-1 flex-col justify-center" style={{ borderBottom: k < rows.length - 1 ? `1px solid ${p.line}` : 'none', textDecoration: 'none', padding: 'clamp(8px,1vw,16px) 0' }}>
              <span data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, color: k === i ? p.ink : '#8c8a86', fontSize: 'clamp(2rem,6.2vw,6.2rem)', lineHeight: 1.05, transition: 'color .3s' }}>{g.title}</span>
              <span data-name="Gallery count" className="el-gal_count" style={{ fontFamily: "'Inter','Helvetica Neue',Arial,sans-serif", fontSize: 'clamp(9px,1.15vw,20px)', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8c8a86', marginTop: 'clamp(4px,0.7vw,12px)' }}>{g.line || g.title}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}
function Sonora(p: P) {
  return (
    <div style={{ position: 'relative', ...bleed }}>
      <div className="grid sm:grid-cols-2" style={{ gap: 3, background: p.bg || '#fbf8f3', padding: '3px 0' }}>
        {p.items.slice(0, 4).map((g) => tile(g, <><Ph u={g.u} ratio="2.025/1" /><div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 50%, rgba(24,18,12,.7))' }} /><div style={{ position: 'absolute', left: '2.9%', bottom: '13%', color: '#fff' }}><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, letterSpacing: '0.06em', fontSize: 'clamp(1.2rem,2.8vw,3rem)', lineHeight: 1.1, margin: 0 }}>{g.title}</p></div></>))}
      </div>
      <div className="hidden sm:block" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: p.bg || '#fbf8f3', color: p.ink, width: '29%', padding: 'clamp(10px,1.4vw,26px) 0', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,.2)' }}>
        <h2 data-name="Section title" className="el-gs_title" style={{ ...h2(p, 'clamp(1.2rem,2.9vw,3rem)', p.ink), letterSpacing: '0.4em', paddingLeft: '0.4em' }}>{p.title}</h2>
      </div>
    </div>
  )
}
function Kalahari(p: P) {
  const R = ['398/393', '405/350', '400/336', '405/320']
  const it = p.items.slice(0, 4)
  const col = (idx: number[], offset: boolean) => (
    <div className="flex flex-col" style={{ gap: 'clamp(14px,1.7vw,30px)', marginTop: offset ? '9.3%' : 0 }}>
      {idx.map((n) => it[n] && tile(it[n], <><Ph u={it[n].u} ratio={R[n]} /><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, color: '#5a5753', fontWeight: 700, letterSpacing: '0.4em', fontSize: 'clamp(9px,1.1vw,19px)', lineHeight: 1.2, margin: 0, paddingTop: 'clamp(8px,1.1vw,20px)' }}>{it[n].title}</p></>))}
    </div>
  )
  return (
    <div className="grid items-center gap-8 md:grid-cols-[37.2%_50%]">
      <div style={{ paddingLeft: '3.7%' }}>
        <h2 data-name="Section title" className="el-gs_title" style={{ ...h2(p, 'clamp(2.4rem,8.4vw,8.4rem)'), lineHeight: 0.95 }}>{p.title}</h2>
      </div>
      <div className="grid grid-cols-2 items-start" style={{ columnGap: '9.1%' }}>
        {col([0, 2], false)}
        {col([1, 3], true)}
      </div>
    </div>
  )
}
function Thar(p: P) {
  return (
    <div style={{ background: DARK, color: CREAM, boxShadow: `0 0 0 100vmax ${DARK}`, clipPath: 'inset(0 -100vmax)', padding: 'clamp(14px,1.6vw,28px) 0 clamp(16px,3.2vw,56px)' }}>
      <div className="flex items-center" style={{ gap: '2.5%', padding: '0 3.8% 0 4%', marginBottom: 'clamp(16px,3.4vw,60px)' }}>
        <h2 data-name="Section title" className="el-gs_title" style={{ ...h2(p, 'clamp(1.4rem,3.6vw,3.6rem)', CREAM), letterSpacing: '0.3em', whiteSpace: 'nowrap' }}>{p.title}</h2>
        <div style={{ flex: 1, height: 1.5, background: CREAM }} />
      </div>
      <div className="grid sm:grid-cols-3" style={{ width: '87.2%', margin: '0 auto', columnGap: '4.9%', rowGap: 28 }}>
        {p.items.slice(0, 3).map((g) => tile(g, <><div style={{ border: `1.5px solid ${CREAM}`, padding: 3 }}><Ph u={g.u} ratio="4/5" /></div><div style={{ textAlign: 'center', paddingTop: 'clamp(8px,1.3vw,24px)' }}><p data-name="Gallery name" className="el-gal_name" style={{ ...p.nameStyle, color: CREAM, fontSize: 'clamp(1.4rem,3.2vw,3.2rem)', lineHeight: 1.15, margin: 0 }}>{g.title}</p><p data-name="Gallery count" className="el-gal_count" style={{ fontFamily: "'Lato',sans-serif", color: CREAM, fontSize: 'clamp(8px,1vw,17px)', letterSpacing: '0.3em', textTransform: 'uppercase', margin: 'clamp(6px,1vw,18px) 0 0' }}>{g.line || g.title}</p></div></>))}
      </div>
    </div>
  )
}
const DESIGNS: Record<string, (p: P) => React.ReactElement> = { sahara: Sahara, gobi: Gobi, mojave: Mojave, atacama: Atacama, namib: Namib, sonora: Sonora, kalahari: Kalahari, thar: Thar }

type FontSpec = { h: string; hw: number; hi?: boolean; hu?: boolean; hl?: string; n: string; nw: number; ni?: boolean; nu?: boolean; nl?: string }
const FONTS: Record<string, FontSpec> = {
  sahara: { h: 'Cormorant Garamond', hw: 300, hi: true, n: 'Cormorant Garamond', nw: 400 },
  gobi: { h: 'Bodoni Moda', hw: 400, hu: true, hl: '0.14em', n: 'Bodoni Moda', nw: 400 },
  mojave: { h: 'Montserrat', hw: 200, hu: true, hl: '0.06em', n: 'Montserrat', nw: 300, nu: true, nl: '0.14em' },
  atacama: { h: 'DM Serif Display', hw: 400, n: 'DM Serif Display', nw: 400 },
  namib: { h: 'Josefin Sans', hw: 300, n: 'Playfair Display', nw: 400, ni: true },
  sonora: { h: 'Italiana', hw: 400, hu: true, hl: '0.12em', n: 'Italiana', nw: 400, nu: true, nl: '0.1em' },
  kalahari: { h: 'Fjalla One', hw: 400, hu: true, hl: '0.02em', n: 'Lato', nw: 400, nu: true, nl: '0.16em' },
  thar: { h: 'Cinzel', hw: 400, hl: '0.08em', n: 'Cormorant Garamond', nw: 400 },
}
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Bodoni+Moda:wght@400&family=Montserrat:wght@200;300&family=DM+Serif+Display&family=Playfair+Display:ital,wght@1,400&family=Josefin+Sans:wght@300&family=Italiana&family=Fjalla+One&family=Lato:wght@400&family=Cinzel:wght@400&display=swap'

export function GalleriesSection({ design, ...p }: { design: string } & Omit<P, 'nameStyle'>) {
  const C = DESIGNS[design] ?? Sahara
  const F = FONTS[design] ?? FONTS.sahara
  const hs = { fontFamily: `'${F.h}', serif`, fontWeight: F.hw, fontStyle: F.hi ? 'italic' : 'normal', textTransform: F.hu ? 'uppercase' : 'none', letterSpacing: F.hl ?? '0.01em' } as React.CSSProperties
  const ns = { fontFamily: `'${F.n}', serif`, fontWeight: F.nw, fontStyle: F.ni ? 'italic' : 'normal', textTransform: F.nu ? 'uppercase' : 'none', letterSpacing: F.nl ?? '0.01em' } as React.CSSProperties
  return (
    <>
      <link rel="stylesheet" href={FONT_HREF} />
      <C {...p} headStyle={hs} nameStyle={ns} />
    </>
  )
}

export function GalleryGarnet({ items, headStyle, ink }: { items: { id: string; title: string; u: string | null; href: string }[]; headStyle: React.CSSProperties; ink: string }) {
  const [i, setI] = useState(0)
  const cur = items[i] ?? items[0]
  if (!cur) return null
  return (
    <div className="grid md:grid-cols-[35.3%_62.5%] [--ga:3/4] md:[--ga:0.56/1]">
      <div className="flex flex-col py-4 md:py-0">
        {items.map((it, k) => {
          const on = k === i
          return (
            <a key={it.id} href={it.href} onMouseEnter={() => setI(k)} onFocus={() => setI(k)} className="relative flex flex-1 flex-col justify-center" style={{ textDecoration: 'none', color: ink, paddingLeft: on ? '5.5%' : '7.3%', paddingTop: 8, paddingBottom: 8 }}>
              {on && <span aria-hidden="true" style={{ position: 'absolute', left: '2.3%', top: '50%', transform: 'translateY(-50%)', width: 1, height: '70%', maxHeight: 98, background: ink }} />}
              <span data-name="Gallery name" className="el-gal_name" style={{ ...headStyle, fontStyle: on ? 'italic' : 'normal', fontSize: on ? 'clamp(2.4rem,8.4vw,7rem)' : 'clamp(1.3rem,3.9vw,3.4rem)', lineHeight: 1.1 }}>{it.title}</span>
              {!on && <span aria-hidden="true" style={{ display: 'block', width: 'clamp(24px,5.2vw,52px)', height: 1, background: ink, marginTop: 'clamp(10px,2.4vw,30px)' }} />}
            </a>
          )
        })}
      </div>
      <a href={cur.href} className="group relative block overflow-hidden" style={{ aspectRatio: 'var(--ga)', background: '#E5E1DB' }}>
        {cur.u ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={cur.id} src={cur.u} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 300 500" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full"><rect width="300" height="500" fill="#d8cfc4" /><circle cx="220" cy="120" r="22" fill="#b8aa98" opacity="0.55" /><path d="M0 500 L80 260 L140 380 L210 230 L300 500 Z" fill="#b8aa98" opacity="0.8" /></svg>
        )}
      </a>
    </div>
  )
}
