'use client'

import { useState } from 'react'

export type Links = { instagram_url: string; facebook_url: string; tiktok_url: string; pinterest_url: string }
export type Struct = { v: 1; home: string[]; about: string[]; galleries: string[]; extra: { id: string; label: string; sections: string[] }[]; off: string[] }
type Col = { id: string; label: string; fixed?: boolean; extra?: boolean }

const BLOCKS: Record<string, { label: string; blurb: string }> = {
  explore: { label: 'Quick links', blurb: 'Pretty cards linking to your other pages' },
  portfolio: { label: 'Galleries', blurb: 'Your galleries' },
  about: { label: 'About', blurb: 'Your story and photo' },
  testimonials: { label: 'Testimonials', blurb: 'Kind words from clients' },
  investment: { label: 'Pricing', blurb: 'Your packages' },
  faq: { label: 'FAQ', blurb: 'Common questions' },
  contact: { label: 'Booking', blurb: 'Book-now band' },
  social: { label: 'Social links', blurb: 'Instagram, Facebook and more' },
}
const ORDER = ['explore', 'portfolio', 'about', 'testimonials', 'investment', 'faq', 'contact', 'social']
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

export default function PageBuilder({ struct, setStruct, links, setLinks }: { struct: Struct; setStruct: (s: Struct) => void; links: Links; setLinks: (l: Links) => void }) {
  const [pick, setPick] = useState<string | null>(null)
  const [drag, setDrag] = useState<string | null>(null)

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

  const slice = 'mb-1.5 rounded-lg bg-black/5 px-2 py-1.5 text-xs text-ink-soft'
  return (
    <div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
        {cols.map((p) => (
          <div key={p.id}
            onDragOver={(e) => { if (drag) e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); if (drag) place(drag, p.id) }}
            className={'flex min-h-[230px] flex-col rounded-2xl border bg-white/80 p-3 ' + (pick || drag ? 'border-dashed border-twilight' : 'border-black/10')}>
            <div className="mb-2 flex items-center gap-1">
              {p.extra
                ? <input value={p.label} onChange={(e) => rename(p.id, e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none" />
                : <span className="flex-1 text-sm font-semibold text-ink">{p.label}</span>}
              {!p.fixed && <button type="button" onClick={() => removePage(p.id)} aria-label={'Remove ' + p.label} className="text-xs text-ink-soft">✕</button>}
            </div>
            <div className={slice}>Menu</div>
            {p.id === 'home' && <div className={slice}>Hero</div>}
            {listOf(struct, p.id).map((sec, i, arr) => (
              <div key={sec} draggable onDragStart={() => setDrag(sec)} onDragEnd={() => setDrag(null)}
                className={'mb-1.5 flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-xs text-ink ' + (pick === sec ? 'border-twilight ring-2 ring-twilight' : 'border-black/10')}>
                <button type="button" onClick={() => setPick(pick === sec ? null : sec)} className="min-w-0 flex-1 text-left">{nameOf(sec)}</button>
                <button type="button" disabled={i === 0} onClick={() => nudge(p.id, i, -1)} aria-label="Move up" className="px-0.5 text-ink-soft disabled:opacity-30">↑</button>
                <button type="button" disabled={i === arr.length - 1} onClick={() => nudge(p.id, i, 1)} aria-label="Move down" className="px-0.5 text-ink-soft disabled:opacity-30">↓</button>
                <button type="button" onClick={() => place(sec, 'tray')} aria-label="Take off this page" className="px-0.5 text-ink-soft">✕</button>
              </div>
            ))}
            {pick && !listOf(struct, p.id).includes(pick) && (
              <button type="button" onClick={() => place(pick, p.id)} className="mt-1 rounded-lg border border-dashed border-twilight py-2 text-xs text-twilight">Put {nameOf(pick)} here</button>
            )}
            <div className={slice + ' mt-auto'}>Footer</div>
          </div>
        ))}
        <div className="flex min-h-[230px] flex-col rounded-2xl border border-black/10 bg-white/60 p-3">
          <span className="mb-2 text-sm font-semibold text-ink">Booking</span>
          <div className={slice}>Menu</div>
          <div className={slice}>Your booking calendar</div>
        </div>
        {struct.extra.length < 8 && (
          <button type="button"
            onClick={() => addPage(pick)}
            onDragOver={(e) => { if (drag) e.preventDefault() }}
            onDrop={(e) => { e.preventDefault(); if (drag) addPage(drag) }}
            className="flex min-h-[230px] items-center justify-center rounded-2xl border-2 border-dashed border-black/20 p-3 text-sm text-ink-soft">
            + Add page
          </button>
        )}
      </div>

      <p className="mb-2 mt-6 text-xs uppercase tracking-wide text-ink-soft">Pieces to add. Drop one on a page, or make it a whole page</p>
      <div className="flex flex-wrap gap-2" onDragOver={(e) => { if (drag) e.preventDefault() }} onDrop={(e) => { e.preventDefault(); if (drag) place(drag, 'tray') }}>
        {tray.map((sec) => (
          <button key={sec} type="button" draggable onDragStart={() => setDrag(sec)} onDragEnd={() => setDrag(null)}
            onClick={() => setPick(pick === sec ? null : sec)}
            className={'rounded-xl border bg-white px-3 py-2 text-left text-sm text-ink ' + (pick === sec ? 'border-twilight ring-2 ring-twilight' : 'border-black/10')}>
            {BLOCKS[sec].label}
            <span className="block text-[11px] text-ink-soft">{BLOCKS[sec].blurb}</span>
          </button>
        ))}
        <span className="rounded-xl border border-dashed border-black/20 px-3 py-2 text-sm text-ink-soft">Blog · coming soon</span>
        {tray.length === 0 && <span className="py-2 text-xs text-ink-soft">Everything is placed. Take one off a page to see it here.</span>}
      </div>
      {placed.has('social') && (
        <div className="mt-5 rounded-xl border border-black/10 bg-white/80 p-4">
          <p className="text-sm font-medium text-ink">Your social links</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {([['instagram_url', 'Instagram'], ['facebook_url', 'Facebook'], ['tiktok_url', 'TikTok'], ['pinterest_url', 'Pinterest']] as const).map(([k, label]) => (
              <input key={k} value={links[k]} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} placeholder={label + ' link'} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
            ))}
          </div>
        </div>
      )}
      {pick && <p className="mt-2 text-xs text-ink-soft">Tap a page to put it there, or tap + Add page to make it a whole page.</p>}
    </div>
  )
}
