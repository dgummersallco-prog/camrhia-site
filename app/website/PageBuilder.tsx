'use client'

import { useEffect, useRef, useState } from 'react'

export type Links = { instagram_url: string; facebook_url: string; tiktok_url: string; pinterest_url: string }
export type Struct = { v: 1; home: string[]; about: string[]; galleries: string[]; extra: { id: string; label: string; sections: string[] }[]; off: string[] }
type Col = { id: string; label: string; fixed?: boolean; extra?: boolean }

const BLOCKS: Record<string, { label: string; blurb: string }> = {
  explore: { label: 'Explore section', blurb: 'Three picture cards linking to your pages' },
  portfolio: { label: 'Galleries', blurb: 'Your galleries' },
  galsec: { label: 'Galleries block', blurb: 'Your galleries as photo tiles' },
  pricesec: { label: 'Pricing block', blurb: 'Your packages as a home block' },
  about: { label: 'About', blurb: 'Your story and photo' },
  testimonials: { label: 'Testimonials', blurb: 'Kind words from clients' },
  investment: { label: 'Pricing', blurb: 'Your packages' },
  faq: { label: 'FAQ', blurb: 'Common questions' },
  contact: { label: 'Booking', blurb: 'Book-now band' },
  social: { label: 'Social links', blurb: 'Instagram, Facebook and more' },
}
const ORDER = ['explore', 'portfolio', 'galsec', 'about', 'testimonials', 'investment', 'pricesec', 'faq', 'contact', 'social']
const RESERVED = ['home', 'about', 'galleries', 'book', 'p', 'site']

export function cleanStruct(s: Struct): Struct {
  const keep = (l: string[]) => l.filter((k) => !!BLOCKS[k])
  return { v: 1, home: keep(s.home), about: keep(s.about), galleries: keep(s.galleries), extra: s.extra.map((e) => ({ ...e, sections: keep(e.sections) })), off: [...s.off] }
}

function listOf(s: Struct, id: string): string[] {
  if (id === 'home') return s.home
  if (id === 'about') return s.about
  if (id === 'galleries') return s.galleries
  return s.extra.find((e) => e.id === id)?.sections ?? []
}
function setList(s: Struct, id: string, l: string[]) {
  if (id === 'home') s.home = l
  else if (id === 'about') s.about = l
  else if (id === 'galleries') s.galleries = l
  else { const e = s.extra.find((q) => q.id === id); if (e) e.sections = l }
}
function strip(s: Struct, sec: string) {
  s.home = s.home.filter((k) => k !== sec)
  s.about = s.about.filter((k) => k !== sec)
  s.galleries = s.galleries.filter((k) => k !== sec)
  s.extra.forEach((e) => { e.sections = e.sections.filter((k) => k !== sec) })
}

export default function PageBuilder({ struct, setStruct, links, setLinks, thumbs, wires }: { struct: Struct; setStruct: (s: Struct) => void; links: Links; setLinks: (l: Links) => void; thumbs?: Record<string, { src: string; ar: string }>; wires?: boolean }) {
  const [pick, setPick] = useState<string | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [paths, setPaths] = useState<{ d: string; x: number; y: number }[]>([])
  useEffect(() => {
    if (!wires) return
    const measure = () => {
      const w = wrapRef.current
      const m = menuRef.current
      if (!w || !m) return
      const wb = w.getBoundingClientRect()
      const mb = m.getBoundingClientRect()
      const x1 = mb.left + mb.width / 2 - wb.left
      const y1 = mb.bottom - wb.top
      const next = Object.values(cardRefs.current).filter((el): el is HTMLDivElement => !!el).map((el) => {
        const b = el.getBoundingClientRect()
        const x2 = b.left + b.width / 2 - wb.left
        const y2 = b.top - wb.top
        const my = (y1 + y2) / 2
        return { d: 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + my + ' ' + x2 + ',' + my + ' ' + x2 + ',' + y2, x: x2, y: y2 }
      })
      const key = JSON.stringify(next)
      setPaths((prev) => (JSON.stringify(prev) === key ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  })

  const clone = (): Struct => JSON.parse(JSON.stringify(struct))
  const placed = new Set<string>([...struct.home, ...struct.about, ...struct.galleries, ...struct.extra.flatMap((e) => e.sections)])
  const tray = ORDER.filter((k) => !placed.has(k))
  const cols: Col[] = [
    { id: 'home', label: 'Home', fixed: true },
    ...(struct.off.includes('galleries') ? [] : [{ id: 'galleries', label: 'Galleries' }]),
    ...(struct.off.includes('about') ? [] : [{ id: 'about', label: 'About' }]),
    ...struct.extra.map((e) => ({ id: e.id, label: e.label, extra: true })),
  ]
  const nameOf = (k: string) => BLOCKS[k]?.label ?? 'Section'

  function place(sec: string, target: string) {
    const s = clone()
    strip(s, sec)
    if (target !== 'tray') setList(s, target, [...listOf(s, target), sec])
    setStruct(s); setPick(null); setDrag(null)
  }
  function nudge(id: string, i: number, d: number) {
    const s = clone()
    const l = [...listOf(s, id)]
    const j = i + d
    if (j < 0 || j >= l.length) return
    ;[l[i], l[j]] = [l[j], l[i]]
    setList(s, id, l)
    setStruct(s)
  }
  function addPage(sec: string | null) {
    const s = clone()
    if (sec) strip(s, sec)
    const reuse = sec === 'about' ? 'about' : sec === 'portfolio' ? 'galleries' : null
    if (sec && reuse && s.off.includes(reuse)) {
      s.off = s.off.filter((k) => k !== reuse)
      setList(s, reuse, [sec])
    } else {
      if (s.extra.length >= 8) return
      const base = sec ? nameOf(sec) : 'New page'
      const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page'
      let id = slug
      let n = 2
      while (RESERVED.includes(id) || s.extra.some((e) => e.id === id)) id = slug + '-' + n++
      s.extra.push({ id, label: base, sections: sec ? [sec] : [] })
    }
    setStruct(s); setPick(null); setDrag(null)
  }
  function removePage(id: string) {
    const s = clone()
    if (id === 'about' || id === 'galleries') { setList(s, id, []); if (!s.off.includes(id)) s.off.push(id) }
    else s.extra = s.extra.filter((e) => e.id !== id)
    setStruct(s)
  }
  function rename(id: string, label: string) {
    const s = clone()
    const e = s.extra.find((q) => q.id === id)
    if (e) { e.label = label.slice(0, 24); setStruct(s) }
  }

  function addBuiltIn(id: 'galleries' | 'about') {
    const s = clone()
    s.off = s.off.filter((q) => q !== id)
    setStruct(s)
  }
  const hasPricing = struct.extra.some((e) => e.id === 'pricing')
  const galOn = !struct.off.includes('galleries')
  const aboutOn = !struct.off.includes('about')
  const locked = 'rounded-xl bg-[#EFE7DC] px-4 py-3 text-sm text-ink-soft'
  const pageBtn = 'flex w-full items-center justify-between rounded-xl border border-black/10 bg-[#FBF8F4] px-4 py-3 text-left font-fraunces text-base text-ink shadow-sm transition hover:border-twilight disabled:opacity-50'
  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-6 self-start lg:sticky lg:top-6">
        <div>
          <p className="mb-3 text-xs uppercase tracking-wider text-ink-soft">Add a page</p>
          <div className="space-y-2.5">
            <button type="button" disabled={galOn} onClick={() => addBuiltIn('galleries')} className={pageBtn}>Galleries page <span className="text-xs text-ink-soft">{galOn ? 'Added' : '+'}</span></button>
            <button type="button" disabled={aboutOn} onClick={() => addBuiltIn('about')} className={pageBtn}>About page <span className="text-xs text-ink-soft">{aboutOn ? 'Added' : '+'}</span></button>
            <button type="button" disabled={hasPricing || struct.extra.length >= 8} onClick={() => addPage('investment')} className={pageBtn}>Pricing page <span className="text-xs text-ink-soft">{hasPricing ? 'Added' : '+'}</span></button>
            <button type="button" disabled={struct.extra.length >= 8} onClick={() => addPage(null)} className={pageBtn}>Blank page <span className="text-xs text-ink-soft">+</span></button>
          </div>
        </div>
        <div onDragOver={(e) => { if (drag) e.preventDefault() }} onDrop={(e) => { e.preventDefault(); if (drag) place(drag, 'tray') }}>
          <p className="mb-3 text-xs uppercase tracking-wider text-ink-soft">Add a block</p>
          <div className="space-y-2.5">
            {tray.map((sec) => (
              <button key={sec} type="button" draggable onDragStart={() => setDrag(sec)} onDragEnd={() => setDrag(null)}
                onClick={() => setPick(pick === sec ? null : sec)}
                className={'w-full rounded-xl border bg-[#FBF8F4] px-4 py-3 text-left shadow-sm transition ' + (pick === sec ? 'border-twilight ring-2 ring-twilight' : 'border-black/10 hover:border-twilight')}>
                <span className="block font-fraunces text-base text-ink">{BLOCKS[sec].label}</span>
                <span className="block text-xs text-ink-soft">{BLOCKS[sec].blurb}</span>
              </button>
            ))}
            {tray.length === 0 && <p className="text-xs text-ink-soft">Everything is placed. Take one off a page to see it here.</p>}
          </div>
          {pick && <p className="mt-3 text-xs text-ink-soft">Now tap Put here on a page, or drag it across.</p>}
        </div>
      </aside>

      <div ref={wrapRef} className="relative">
        {wires && (
          <>
            <div ref={menuRef} className="relative z-10 mx-auto mb-16 w-fit rounded-full bg-[#EFE7DC] px-10 py-3.5 font-fraunces text-xl text-ink shadow-sm">Menu</div>
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" fill="none">
              {paths.map((q, i) => (
                <g key={i}>
                  <path d={q.d} stroke="#B89F8A" strokeWidth="2" strokeDasharray="6 5" />
                  <circle cx={q.x} cy={q.y} r="5" fill="#B89F8A" />
                </g>
              ))}
            </svg>
          </>
        )}
        <div className={'relative z-10 grid gap-5 ' + (wires ? 'grid-cols-[repeat(auto-fill,minmax(300px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(250px,1fr))]')}>
          {cols.map((p) => (
            <div key={p.id} ref={(el) => { cardRefs.current[p.id] = el }}
              onDragOver={(e) => { if (drag) e.preventDefault() }}
              onDrop={(e) => { e.preventDefault(); if (drag) place(drag, p.id) }}
              className={'flex min-h-[420px] flex-col rounded-3xl border bg-[#FBF8F4] p-5 shadow-sm transition ' + (pick || drag ? 'border-dashed border-twilight' : 'border-black/10')}>
              <div className="mb-4 flex items-center gap-2">
                {p.extra
                  ? <input value={p.label} onChange={(e) => rename(p.id, e.target.value)} className="min-w-0 flex-1 bg-transparent font-fraunces text-2xl text-ink outline-none" />
                  : <span className="flex-1 font-fraunces text-2xl text-ink">{p.label}</span>}
                {!p.fixed && <button type="button" onClick={() => removePage(p.id)} aria-label={'Remove ' + p.label} className="text-sm text-ink-soft">✕</button>}
              </div>
              <div className={locked + ' mb-2.5'}>Menu</div>
              {p.id === 'home' && <div className={locked + ' mb-2.5 py-8 text-center'}>Hero</div>}
              {listOf(struct, p.id).map((sec, i, arr) => (
                <div key={sec} draggable onDragStart={() => setDrag(sec)} onDragEnd={() => setDrag(null)}
                  className={'mb-2.5 rounded-xl border bg-white px-4 py-3.5 shadow-sm ' + (pick === sec ? 'border-twilight ring-2 ring-twilight' : 'border-black/10')}>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPick(pick === sec ? null : sec)} className="min-w-0 flex-1 text-left font-fraunces text-base text-ink">{nameOf(sec)}</button>
                    <button type="button" disabled={i === 0} onClick={() => nudge(p.id, i, -1)} aria-label="Move up" className="px-1 text-ink-soft disabled:opacity-30">↑</button>
                    <button type="button" disabled={i === arr.length - 1} onClick={() => nudge(p.id, i, 1)} aria-label="Move down" className="px-1 text-ink-soft disabled:opacity-30">↓</button>
                    <button type="button" onClick={() => place(sec, 'tray')} aria-label="Take off this page" className="px-1 text-ink-soft">✕</button>
                  </div>
                  {thumbs?.[sec] && <img src={thumbs![sec].src} alt="" className="mt-3 w-full rounded-lg border border-black/10 object-cover object-top" style={{ aspectRatio: thumbs![sec].ar }} />}
                </div>
              ))}
              {pick && !listOf(struct, p.id).includes(pick) ? (
                <button type="button" onClick={() => place(pick, p.id)} className="mb-2.5 rounded-xl border-2 border-dashed border-twilight py-4 text-sm text-twilight">Put {nameOf(pick)} here</button>
              ) : listOf(struct, p.id).length === 0 ? (
                <div className="mb-2.5 flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-black/15 py-6 text-center text-sm text-ink-soft">Add blocks from the left</div>
              ) : null}
              <div className={locked + ' mt-auto'}>Footer</div>
            </div>
          ))}
          <div ref={(el) => { cardRefs.current['book'] = el }} className="flex min-h-[420px] flex-col rounded-3xl border border-black/10 bg-[#FBF8F4] p-5 shadow-sm">
            <span className="mb-4 font-fraunces text-2xl text-ink">Booking</span>
            <div className={locked + ' mb-2.5'}>Menu</div>
            <div className={locked + ' mb-2.5 py-8 text-center'}>Your booking calendar</div>
            <div className={locked + ' mt-auto'}>Footer</div>
          </div>
        </div>

        {placed.has('social') && (
          <div className="mt-6 rounded-2xl border border-black/10 bg-[#FBF8F4] p-5">
            <p className="font-fraunces text-lg text-ink">Your social links</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {([['instagram_url', 'Instagram'], ['facebook_url', 'Facebook'], ['tiktok_url', 'TikTok'], ['pinterest_url', 'Pinterest']] as const).map(([k, label]) => (
                <input key={k} value={links[k]} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} placeholder={label + ' link'} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
