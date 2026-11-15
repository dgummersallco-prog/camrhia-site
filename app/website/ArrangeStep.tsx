'use client'

import { useState, type ReactNode } from 'react'
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
const PAGE_COUNT: Record<string, number> = { jade: 7, jasper: 7, amber: 3, pearl: 9, ruby: 4, topaz: 6, garnet: 6, agate: 6, quartz: 12, moonstone: 4 }
const SUGG = ['Weddings', 'Engagements', 'Families', 'Seniors', 'Portraits', 'Newborns', 'Maternity', 'Couples', 'Events', 'Headshots']

function Row({ label, on, onClick, controls, children }: { label: string; on: boolean; onClick: () => void; controls?: ReactNode; children: ReactNode }) {
  return (
    <div className={'relative ' + (on ? 'z-10 ring-2 ring-inset ring-twilight' : '')}>
      <div className="absolute right-full top-4 mr-1 flex items-center">
        <button type="button" onClick={onClick} className={'whitespace-nowrap rounded-full border px-3 py-1 font-fraunces text-sm shadow-sm transition ' + (on ? 'border-twilight bg-twilight text-white' : 'border-black/15 bg-white text-ink hover:border-twilight')}>{label}</button>
        <span className="h-px w-4 bg-black/30" />
      </div>
      <div onClick={onClick} className="cursor-pointer">{children}</div>
      {controls && <div className="absolute left-full top-3 ml-2 flex flex-col gap-1">{controls}</div>}
    </div>
  )
}

export default function ArrangeStep({ struct, setStruct, links, setLinks, thumbs, heroSrc, heroName, designs, setDesigns, photoDesigns }: {
  struct: Struct; setStruct: (s: Struct) => void; links: Links; setLinks: (l: Links) => void
  thumbs: Record<string, { src: string; ar: string }>; heroSrc?: string; heroName?: string
  designs: Record<string, string>; setDesigns: (d: Record<string, string>) => void; photoDesigns: { key: string; name: string }[]
}) {
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number | null>(null)
  const [act, setAct] = useState<string | null>(null)
  const secN = SEC_COUNT[(designs.galleries_section || '').toLowerCase()]
  const secOnly = designs.galleries_mode === 'section' && !!secN
  const want = secOnly ? secN : (PAGE_COUNT[(designs.galleries || '').toLowerCase()] ?? 9)
  const maxCards = want
  let cards: GCard[] = []
  try { cards = JSON.parse(designs.galcards || '[]') } catch {}
  if (!Array.isArray(cards)) cards = []
  cards = Array.from({ length: want }, (_, k) => cards[k] ?? { n: '', d: '' })
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
  const GAL = ['galsec', 'portfolio']
  const focus: string | null = act && (mine.includes(act) || act === 'hero') ? act : (mine.find((k) => GAL.includes(k) || k === 'social') ?? (page.id === 'galleries' ? 'portfolio' : null))

  function add(sec: string) {
    if (isBook) return
    const s = clone()
    strip(s, sec)
    setList(s, page.id, [...listOf(s, page.id), sec])
    setStruct(s)
    setAct(sec)
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
  const ctl = 'flex h-7 w-7 items-center justify-center rounded-full border border-black/15 bg-white text-sm text-ink-soft shadow-sm hover:border-twilight disabled:opacity-30'
  const slice = 'bg-[#EFE7DC] px-4 py-3 text-sm text-ink-soft'

  const introG = secOnly
    ? 'Your galleries section shows ' + secN + ' cards, and each card opens its own gallery.'
    : secN && designs.galleries_mode !== 'page'
      ? 'Your home page shows the first ' + secN + ' cards. Your Galleries page has room for all of them.'
      : 'Your Galleries page has a card for each gallery you shoot, and each opens its own gallery.'

  const pageN = cards.length
  const galPanel = (
    <div>
      <div className="flex items-start gap-3">
        <img src="/camri/09_holding_photo.png" alt="" className="h-14 w-auto shrink-0" />
        <p className="font-fraunces text-base leading-snug text-ink">
          {secOnly
            ? 'Your galleries section has ' + secN + ' destinations.'
            : secN && designs.galleries_mode !== 'page'
              ? 'Your Galleries page has ' + pageN + ' destinations, and your home page shows the first ' + secN + '.'
              : 'Your Galleries page has ' + pageN + ' destinations.'} Name each one below the page, then pick how its gallery is displayed.
        </p>
      </div>
    </div>
  )
  const showDest = page.id === 'galleries' || mine.includes('galsec') || mine.includes('portfolio')
  const destinations = (
    <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-black/10 bg-[#FBF8F4] p-6">
      <p className="font-fraunces text-xl text-ink">Your {pageN} gallery destinations</p>
      <p className="mt-1 text-sm text-ink-soft">Each picture on your page opens its own gallery. Name it, then tap it to pick how that gallery is displayed.</p>
      <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-7">
        {cards.map((c, k) => {
          const d = eff(c)
          const on = sel === k
          return (
            <div key={k}>
              <button type="button" onClick={() => setSel(on ? null : k)} className="block w-full">
                <div className={'relative flex items-center justify-center rounded-lg border-2 bg-[#EFE7DC] ' + (on ? 'border-twilight' : 'border-black/10')} style={{ aspectRatio: '4/3' }}>
                  <span className="font-fraunces text-2xl text-ink-soft">{k + 1}</span>
                  {secN && !secOnly && designs.galleries_mode !== 'page' && k < secN && <span className="absolute right-1.5 top-1.5 rounded-full bg-white px-2 py-0.5 text-[10px] text-ink">Home</span>}
                </div>
              </button>
              <div className="mx-auto h-4 w-0 border-l-2 border-dotted border-black/30" />
              <input value={c.n} onChange={(e) => setCard(k, { n: e.target.value.slice(0, 24) })} placeholder={SUGG[k % SUGG.length]} className="w-full rounded-full border border-black/10 bg-white px-3 py-1.5 text-center font-fraunces text-sm text-ink outline-none focus:border-twilight" />
              <button type="button" onClick={() => setSel(on ? null : k)} className="mt-2 flex w-full items-center justify-center gap-2 text-left">
                {d
                  ? <img src={'/photos/' + d + '.png'} alt="" className={'w-9 shrink-0 rounded border-2 object-cover object-top ' + (on ? 'border-twilight' : 'border-black/10')} style={{ aspectRatio: '4/5' }} />
                  : <span className="flex w-9 shrink-0 items-center justify-center rounded border-2 border-dashed border-black/20 text-[9px] text-ink-soft" style={{ aspectRatio: '4/5' }}>Pick</span>}
                <span className="text-[11px] leading-tight text-ink-soft">{c.d ? (photoDesigns.find((x) => x.key === d)?.name ?? d) : 'Default style'}</span>
              </button>
            </div>
          )
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-1.5">
        {SUGG.filter((s) => !cards.some((c) => c.n.trim().toLowerCase() === s.toLowerCase())).map((s) => (
          <button key={s} type="button" onClick={() => fillChip(s)} className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs text-ink">{s}</button>
        ))}
      </div>
      {sel !== null && cards[sel] && (
        <div className="mt-6 rounded-xl border border-black/10 bg-white p-4">
          <p className="font-fraunces text-base text-ink">Display style for {cards[sel].n.trim() || 'destination ' + (sel + 1)}</p>
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
  )

  const socialPanel = (
    <div>
      <p className="font-fraunces text-lg text-ink">Your social links</p>
      <p className="mt-1 text-sm text-ink-soft">Paste the links you want to show. Leave blank to skip.</p>
      <div className="mt-3 space-y-2">
        {([['instagram_url', 'Instagram'], ['facebook_url', 'Facebook'], ['tiktok_url', 'TikTok'], ['pinterest_url', 'Pinterest']] as const).map(([k, label]) => (
          <input key={k} value={links[k]} onChange={(e) => setLinks({ ...links, [k]: e.target.value })} placeholder={label + ' link'} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
        ))}
      </div>
    </div>
  )

  let panel: ReactNode
  if (focus && GAL.includes(focus)) panel = galPanel
  else if (focus === 'social') panel = socialPanel
  else if (focus === 'hero') panel = (
    <div>
      <p className="font-fraunces text-lg text-ink">Hero</p>
      <p className="mt-1 text-sm text-ink-soft">{'Layout 1' + (heroName ? ' · ' + heroName : '') + '. This is the first thing visitors see. You pick your photo and words after your site is built.'}</p>
    </div>
  )
  else if (focus && BLOCKS[focus]) panel = (
    <div>
      <p className="font-fraunces text-lg text-ink">{BLOCKS[focus].label}</p>
      <p className="mt-1 text-sm text-ink-soft">{BLOCKS[focus].blurb}</p>
    </div>
  )
  else panel = (
    <div className="flex items-start gap-3">
      <img src="/camri/08_peeking.png" alt="" className="h-14 w-auto shrink-0" />
      <p className="font-fraunces text-base leading-snug text-ink">{isBook ? 'Booking is just your calendar, so there is nothing to add here.' : 'Tap any block on the page to see what it does and fill out what it needs.'}</p>
    </div>
  )

  const MAIN = (p: Pg): string | undefined => {
    if (p.id === 'home') return heroSrc
    if (p.id === 'galleries') return thumbs.portfolio?.src
    if (p.id === 'about') return thumbs.about?.src
    if (p.id === 'book') return thumbs.book?.src
    const f = listOf(struct, p.id)[0]
    return (f && thumbs[f]?.src) || thumbs.investment?.src
  }
  const WHY: Record<string, string> = {
    galsec: 'Show your best work first. Pick a few galleries, not everything, and link to the full Galleries page.',
    testimonials: 'Three to five short, specific reviews right after your work build trust before the ask.',
    pricesec: 'Showing pricing helps the right clients inquire and saves you time.',
    investment: 'Your packages and what is included, in plain words.',
    faq: 'Answer the last questions, like backup gear and delivery time, just before they inquire.',
    social: 'A small social strip near the bottom is plenty.',
    contact: 'A booking button at the bottom of every page keeps the next step easy to find.',
    about: 'Let people meet the person behind the camera.',
    explore: 'Your menu already links your pages, so only add this if you want a visual shortcut.',
  }
  const RECS: Record<string, string[]> = {
    home: ['galsec', 'testimonials', 'pricesec', 'faq', 'social', 'contact'],
    galleries: ['testimonials', 'contact'],
    about: ['testimonials', 'contact'],
  }
  const SAY: Record<string, string> = {
    home: 'Your home page is the first impression. Start with the hero, then show a few galleries, reviews, pricing and FAQ, and finish with a booking button.',
    galleries: 'Keep this page about your work. Group galleries by type and end with a booking button.',
    about: 'People often read About right before they book. Add a few reviews and a booking button.',
    book: 'Booking is just your calendar, so there is nothing to add here.',
  }
  const okRec = (k: string) => !!BLOCKS[k] && (!['galsec', 'pricesec', 'investment', 'portfolio'].includes(k) || !!thumbs[k] || !!where(k))
  const recKeys = (RECS[page.id] ?? (page.extra ? ['faq', 'testimonials', 'contact'] : [])).filter(okRec)
  const others = sections.filter((k) => !recKeys.includes(k) && !mine.includes(k))
  function addAll() {
    const s = clone()
    recKeys.forEach((k) => { if (!listOf(s, page.id).includes(k)) { strip(s, k); setList(s, page.id, [...listOf(s, page.id), k]) } })
    setStruct(s)
  }

  const rightPanel = (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-3">
          <img src={isBook ? '/camri/11_thumbs_up.png' : '/camri/04_thinking.png'} alt="" className="h-14 w-auto shrink-0" />
          <p className="font-fraunces text-base leading-snug text-ink">{SAY[page.id] ?? 'Add what this page needs and finish with a booking button.'}</p>
        </div>
        {recKeys.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-ink-soft">Camri suggests</p>
              <button type="button" onClick={addAll} className="rounded-full bg-twilight px-3 py-1 text-xs font-medium text-white">Add all</button>
            </div>
            {recKeys.map((k) => {
              const th = thumbs[k]
              const here = mine.includes(k)
              const w = where(k)
              return (
                <div key={k} className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-fraunces text-base text-ink">{BLOCKS[k].label}</span>
                    <button type="button" disabled={here} onClick={() => add(k)} className="rounded-full border border-black/15 px-3 py-1 text-xs text-ink disabled:opacity-50">{here ? 'Added' : w ? 'Move here' : '+ Add'}</button>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-ink-soft">{WHY[k]}</p>
                  {th && <img src={th.src} alt="" className="mt-2 max-h-28 w-full rounded-lg object-cover object-top" />}
                </div>
              )
            })}
          </div>
        )}
        {!isBook && others.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Other sections you picked</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {others.map((k) => <button key={k} type="button" onClick={() => add(k)} className="rounded-full border border-black/15 bg-white px-3 py-1 text-xs text-ink">+ {BLOCKS[k].label}</button>)}
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-black/10 pt-5">{panel}</div>
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <img src="/camri/12_open_arms.png" alt="" className="h-20 w-auto shrink-0" />
          <div className="rounded-2xl rounded-tl-sm bg-[#EBDDCF] px-5 py-4">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Step 3 of 3</p>
            <p className="mt-1 font-fraunces text-xl leading-snug text-ink">You have {NUM[pages.length] ?? pages.length} pages: {nameList}. Here is the main block of each. Tap a page to build it out, then I will suggest what goes next.</p>
          </div>
        </div>
        <div className="mt-5 flex items-start overflow-x-auto pb-2">
          {pages.map((p, k) => {
            const src = MAIN(p)
            const on = k === i
            return (
              <div key={p.id} className="flex items-start">
                {k > 0 && (
                  <div className="mt-16 flex w-10 shrink-0 items-center justify-center gap-1">
                    <span className="h-0.5 w-1.5 rounded-full bg-black/30" /><span className="h-0.5 w-1.5 rounded-full bg-black/30" /><span className="h-0.5 w-1.5 rounded-full bg-black/30" />
                  </div>
                )}
                <button type="button" onClick={() => { setCur(k); setAct(null) }} className={'w-44 shrink-0 rounded-2xl border-2 bg-white p-2 text-left shadow-sm transition ' + (on ? 'border-twilight' : 'border-black/10 hover:border-twilight')}>
                  <p className="px-1 pb-1.5 font-fraunces text-base text-ink">{p.label}</p>
                  {src
                    ? <img src={src} alt="" className="h-32 w-full rounded-lg object-cover object-top" />
                    : <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-black/20 text-xs text-ink-soft">{p.id === 'book' ? 'Your calendar' : 'Add sections'}</div>}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <p className="mb-5 text-center font-fraunces text-2xl text-ink">{page.label}<span className="ml-3 text-xs text-ink-soft">{i + 1} of {pages.length}</span></p>
          <div className="mx-auto max-w-xl pl-32 pr-10">
            <div className="border-x border-black/10 bg-white shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#EFE7DC] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-black/25" /><span className="h-2 w-2 rounded-full bg-black/25" /><span className="h-2 w-2 rounded-full bg-black/25" />
                {page.extra
                  ? <input value={page.label} onChange={(e) => rename(e.target.value)} className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" />
                  : <span className="ml-2 flex-1 text-sm text-ink-soft">{page.label}</span>}
                {page.id !== 'home' && page.id !== 'book' && <button type="button" onClick={removePage} aria-label={'Remove ' + page.label} className="text-sm text-ink-soft">✕</button>}
              </div>

              {page.id === 'home' && (
                <Row label="Hero" on={focus === 'hero'} onClick={() => setAct('hero')}>
                  {heroSrc ? <img src={heroSrc} alt="" className="block w-full" /> : <div className={slice + ' py-10 text-center'}>Hero</div>}
                </Row>
              )}

              {mine.map((sec, idx) => {
                const th = thumbs[sec]
                return (
                  <Row
                    key={sec}
                    label={BLOCKS[sec]?.label ?? 'Section'}
                    on={focus === sec}
                    onClick={() => setAct(sec)}
                    controls={<>
                      <button type="button" disabled={idx === 0} onClick={() => nudge(idx, -1)} aria-label="Move up" className={ctl}>↑</button>
                      <button type="button" disabled={idx === mine.length - 1} onClick={() => nudge(idx, 1)} aria-label="Move down" className={ctl}>↓</button>
                      <button type="button" onClick={() => take(sec)} aria-label="Take off this page" className={ctl}>✕</button>
                    </>}
                  >
                    {th ? <img src={th.src} alt="" className="block w-full" /> : <div className="bg-[#FBF8F4] px-4 py-8 text-sm text-ink-soft">{BLOCKS[sec]?.label}</div>}
                  </Row>
                )
              })}

              {isBook && <Row label="Calendar" on={false} onClick={() => setAct(null)}><div className={slice + ' py-16 text-center'}>Your booking calendar</div></Row>}
              {!isBook && mine.length === 0 && page.id !== 'home' && <div className="border-t border-dashed border-black/20 px-4 py-10 text-center text-sm text-ink-soft">Add sections from Camri's suggestions</div>}
              <Row label="Footer" on={false} onClick={() => setAct(null)}><div className={slice}>Footer</div></Row>
            </div>
          </div>
          {showDest && destinations}
        </div>

        <aside className="self-start rounded-2xl border border-black/10 bg-[#FBF8F4] p-5 lg:sticky lg:top-6 lg:max-h-[88vh] lg:overflow-y-auto">
          {rightPanel}
        </aside>
      </div>
    </div>
  )
}
