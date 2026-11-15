'use client'

import { useState } from 'react'
import { BLOCKS, ORDER, type Struct, type Links } from './PageBuilder'

type Pg = { id: string; label: string; extra?: boolean }
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

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

type GCard = { n: string; d: string }
const SEC_COUNT: Record<string, number> = { sahara: 3, gobi: 4, mojave: 3, atacama: 4, namib: 4, sonora: 3, kalahari: 4, thar: 3 }
const SUGG = ['Weddings', 'Engagements', 'Families', 'Seniors', 'Portraits', 'Newborns', 'Maternity', 'Couples', 'Events', 'Headshots']

export default function ArrangeStep({ struct, setStruct, links, setLinks, thumbs, heroSrc, heroName, designs, setDesigns, photoDesigns }: {
  struct: Struct; setStruct: (s: Struct) => void; links: Links; setLinks: (l: Links) => void
  thumbs: Record<string, { src: string; ar: string }>; heroSrc?: string; heroName?: string
  designs: Record<string, string>; setDesigns: (d: Record<string, string>) => void; photoDesigns: { key: string; name: string }[]
}) {
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number | null>(null)
  const secN = SEC_COUNT[(designs.galleries_section || '').toLowerCase()]
  const secOnly = designs.galleries_mode === 'section' && !!secN
  const maxCards = secOnly ? secN : 10
  let cards: GCard[] = []
  try { cards = JSON.parse(designs.galcards || '[]') } catch {}
  if (!Array.isArray(cards) || cards.length === 0) cards = Array.from({ length: secOnly ? secN : 6 }, () => ({ n: '', d: '' }))
  const saveCards = (c: GCard[]) => setDesigns({ ...designs, galcards: JSON.stringify(c) })
  const setCard = (i: number, patch: Partial<GCard>) => saveCards(cards.map((c, k) => (k === i ? { ...c, ...patch } : c)))
  const fillChip = (s: string) => {
    const k = cards.findIndex((c) => !c.n.trim())
    if (k >= 0) setCard(k, { n: s })
    else if (cards.length < maxCards) saveCards([...cards, { n: s, d: '' }])
  }
  const named = cards.map((c, i) => ({ c, i })).filter((x) => x.c.n.trim())
  const eff = (c: GCard) => c.d || designs.photos || ''
  const pages: Pg[] = [
    { id: 'home', label: 'Home' },
    ...(struct.off.includes('galleries') ? [] : [{ id: 'galleries', label: 'Galleries' }]),
    ...(struct.off.includes('about') ? [] : [{ id: 'about', label: 'About' }]),
    ...struct.extra.map((e) => ({ id: e.id, label: e.label, extra: true })),
    { id: 'book', label: 'Booking' },
  ]
  const i = Math.min(cur, pages.length - 1)
  const page = pages[i]
  const isBook = page.id === 'book'
  const clone = (): Struct => JSON.parse(JSON.stringify(struct))
  const where = (k: string) => pages.find((p) => p.id !== 'book' && listOf(struct, p.id).includes(k))
  const sections = ORDER.filter((k) => thumbs[k] || where(k))
  const names = pages.map((p) => p.label)
  const nameList = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]
  const mine = isBook ? [] : listOf(struct, page.id)
  const social = pages.some((p) => p.id !== 'book' && listOf(struct, p.id).includes('social'))

  function add(sec: string) {
    if (isBook) return
    const s = clone()
    strip(s, sec)
    setList(s, page.id, [...listOf(s, page.id), sec])
    setStruct(s)
  }
  function take(sec: string) { const s = clone(); strip(s, sec); setStruct(s) }
  function nudge(idx: number, d: number) {
    const s = clone()
    const l = [...listOf(s, page.id)]
    const j = idx + d
    if (j < 0 || j >= l.length) return
    ;[l[idx], l[j]] = [l[j], l[idx]]
    setList(s, page.id, l)
    setStruct(s)
  }
  function removePage() {
    const s = clone()
    if (page.id === 'about' || page.id === 'galleries') { setList(s, page.id, []); if (!s.off.includes(page.id)) s.off.push(page.id) }
    else s.extra = s.extra.filter((e) => e.id !== page.id)
    setStruct(s)
    setCur(Math.max(0, i - 1))
  }
  function rename(label: string) {
    const s = clone()
    const e = s.extra.find((q) => q.id === page.id)
    if (e) { e.label = label.slice(0, 24); setStruct(s) }
  }

  const arrow = 'flex h-11 w-11 items-center justify-center rounded-full border border-black/15 bg-white text-lg text-ink shadow-sm transition hover:border-twilight disabled:opacity-30'
  const slice = 'bg-[#EFE7DC] px-4 py-3 text-sm text-ink-soft'
  return (
    <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
      <aside className="space-y-4 self-start lg:sticky lg:top-6">
        <div className="rounded-2xl border border-black/10 bg-[#FBF8F4] p-5">
          <p className="font-fraunces text-xl leading-snug text-ink">You have {NUM[pages.length] ?? pages.length} pages: {nameList}.</p>
          <p className="mt-2 text-sm text-ink-soft">Add the sections you picked to any page. {isBook ? 'Booking is just your calendar.' : 'Tap one to put it on ' + page.label + '.'}</p>
        </div>
        <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
          {sections.map((k) => {
            const th = thumbs[k]
            const w = where(k)
            const here = w?.id === page.id
            return (
              <button key={k} type="button" disabled={isBook || here} onClick={() => add(k)} className="block w-full overflow-hidden rounded-xl border border-black/10 bg-white text-left shadow-sm transition hover:border-twilight disabled:opacity-60">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="font-fraunces text-base text-ink">{BLOCKS[k].label}</span>
                  <span className="text-[11px] text-ink-soft">{here ? 'On this page' : w ? 'On ' + w.label : 'Not placed yet'}</span>
                </div>
                {th && <img src={th.src} alt="" className="w-full" />}
              </button>
            )
          })}
        </div>
      </aside>

      <div>
        <div className="mb-5 flex items-center justify-center gap-5">
          <button type="button" className={arrow} disabled={i === 0} onClick={() => setCur(i - 1)} aria-label="Previous page">←</button>
          <p className="min-w-[200px] text-center font-fraunces text-2xl text-ink">{page.label}<span className="ml-3 text-xs text-ink-soft">{i + 1} of {pages.length}</span></p>
          <button type="button" className={arrow} disabled={i === pages.length - 1} onClick={() => setCur(i + 1)} aria-label="Next page">→</button>
        </div>

        <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#EFE7DC] px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-black/25" /><span className="h-2 w-2 rounded-full bg-black/25" /><span className="h-2 w-2 rounded-full bg-black/25" />
            {page.extra
              ? <input value={page.label} onChange={(e) => rename(e.target.value)} className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" />
              : <span className="ml-2 flex-1 text-sm text-ink-soft">{page.label}</span>}
            {page.id !== 'home' && page.id !== 'book' && <button type="button" onClick={removePage} aria-label={'Remove ' + page.label} className="text-sm text-ink-soft">✕</button>}
          </div>

          {page.id === 'home' && (heroSrc
            ? <div><img src={heroSrc} alt="" className="w-full" />{heroName && <p className="bg-[#FBF8F4] px-4 py-1.5 text-[11px] text-ink-soft">Layout 1 · {heroName}</p>}</div>
            : <div className={slice + ' py-10 text-center'}>Hero</div>)}

          {mine.map((sec, idx) => {
            const th = thumbs[sec]
            return (
              <div key={sec} className="border-t border-black/10">
                <div className="flex items-center gap-2 bg-[#FBF8F4] px-4 py-2">
                  <span className="flex-1 font-fraunces text-base text-ink">{BLOCKS[sec]?.label ?? 'Section'}</span>
                  <button type="button" disabled={idx === 0} onClick={() => nudge(idx, -1)} aria-label="Move up" className="px-1 text-ink-soft disabled:opacity-30">↑</button>
                  <button type="button" disabled={idx === mine.length - 1} onClick={() => nudge(idx, 1)} aria-label="Move down" className="px-1 text-ink-soft disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => take(sec)} aria-label="Take off this page" className="px-1 text-ink-soft">✕</button>
                </div>
                {th ? <img src={th.src} alt="" className="w-full" /> : <div className="px-4 py-6 text-sm text-ink-soft">{BLOCKS[sec]?.blurb}</div>}
              </div>
            )
          })}

          {isBook && <div className={slice + ' border-t border-black/10 py-10 text-center'}>Your booking calendar</div>}
          {!isBook && mine.length === 0 && <div className="border-t border-dashed border-black/20 px-4 py-10 text-center text-sm text-ink-soft">Add sections from the left</div>}
          <div className={slice + ' border-t border-black/10'}>Footer</div>
        </div>

        {(page.id === 'galleries' || mine.includes('galsec') || mine.includes('portfolio')) && (
          <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-black/10 bg-[#FBF8F4] p-5">
            <div className="flex items-start gap-3">
              <img src="/camri/13_face_avatar.png" alt="" className="h-10 w-auto shrink-0" />
              <p className="font-fraunces text-lg leading-snug text-ink">{secOnly ? 'Your galleries section shows ' + secN + ' cards, and each card opens its own gallery. ' : 'Your galleries have cards, and each card opens its own gallery. '}Name your cards, then pick how each gallery is displayed.</p>
            </div>
            <p className="mt-5 text-xs uppercase tracking-wider text-ink-soft">1 · Name your cards</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {cards.map((c, i) => (
                <input key={i} value={c.n} onChange={(e) => setCard(i, { n: e.target.value.slice(0, 24) })} placeholder={SUGG[i % SUGG.length]} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGG.filter((s) => !cards.some((c) => c.n.trim().toLowerCase() === s.toLowerCase())).map((s) => (
                <button key={s} type="button" onClick={() => fillChip(s)} className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs text-ink">{s}</button>
              ))}
              {cards.length < maxCards && <button type="button" onClick={() => saveCards([...cards, { n: '', d: '' }])} className="rounded-full border border-dashed border-black/25 px-3 py-1 text-xs text-ink-soft">+ Add card</button>}
            </div>

            <p className="mt-6 text-xs uppercase tracking-wider text-ink-soft">2 · Pick the display for each card</p>
            {named.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">Name a card above and it will show up here.</p>
            ) : (
              <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                {named.map(({ c, i }) => {
                  const d = eff(c)
                  return (
                    <button key={i} type="button" onClick={() => setSel(sel === i ? null : i)} className="w-32 shrink-0 text-left">
                      <div className={'rounded-xl border-2 bg-white px-3 py-4 text-center font-fraunces text-base text-ink shadow-sm ' + (sel === i ? 'border-twilight' : 'border-black/10')}>{c.n}</div>
                      <div className="flex h-7 flex-col items-center justify-center gap-0.5">
                        <span className="h-1 w-0.5 rounded-full bg-black/30" /><span className="h-1 w-0.5 rounded-full bg-black/30" /><span className="h-1 w-0.5 rounded-full bg-black/30" />
                      </div>
                      {d ? (
                        <div>
                          <img src={'/photos/' + d + '.png'} alt="" className={'w-full rounded-lg border-2 object-cover object-top ' + (sel === i ? 'border-twilight' : 'border-black/10')} style={{ aspectRatio: '4/5' }} />
                          <p className="mt-1 text-[11px] text-ink-soft">{c.d ? (photoDesigns.find((x) => x.key === d)?.name ?? d) : 'Default display'}</p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-black/20 text-xs text-ink-soft" style={{ aspectRatio: '4/5' }}>Pick a display</div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {sel !== null && cards[sel] && cards[sel].n.trim() && (
              <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
                <p className="font-fraunces text-base text-ink">Display for {cards[sel].n}</p>
                <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {photoDesigns.map((pd) => (
                    <button key={pd.key} type="button" onClick={() => setCard(sel, { d: cards[sel].d === pd.key ? '' : pd.key })} className="text-left">
                      <img src={'/photos/' + pd.key + '.png'} alt="" className={'w-full rounded-lg border-2 object-cover object-top ' + (cards[sel].d === pd.key ? 'border-twilight ring-2 ring-twilight' : 'border-transparent')} style={{ aspectRatio: '4/5' }} />
                      <p className="mt-1 text-[11px] text-ink">{pd.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {social && (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-black/10 bg-[#FBF8F4] p-5">
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
