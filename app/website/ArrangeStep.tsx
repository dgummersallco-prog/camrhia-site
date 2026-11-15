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
  const maxCards = secOnly ? secN : 12
  let cards: GCard[] = []
  try { cards = JSON.parse(designs.galcards || '[]') } catch {}
  if (!Array.isArray(cards) || cards.length === 0) cards = Array.from({ length: secOnly ? secN : 9 }, () => ({ n: '', d: '' }))
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

  const galPanel = (
    <div>
      <div className="flex items-start gap-3">
        <img src="/camri/09_holding_photo.png" alt="" className="h-14 w-auto shrink-0" />
        <p className="font-fraunces text-base leading-snug text-ink">{introG} Name your cards, then pick how each gallery is displayed.</p>
      </div>
      <p className="mt-5 text-xs uppercase tracking-wider text-ink-soft">1 · Name your cards</p>
      <div className="mt-2 space-y-2">
        {cards.map((c, k) => (
          <div key={k} className="flex items-center gap-2">
            <span className="w-4 text-right text-xs text-ink-soft">{k + 1}</span>
            <input value={c.n} onChange={(e) => setCard(k, { n: e.target.value.slice(0, 24) })} placeholder={SUGG[k % SUGG.length]} className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-twilight" />
            {secN && !secOnly && designs.galleries_mode !== 'page' && k < secN && <span className="shrink-0 rounded-full bg-[#EBDDCF] px-2 py-0.5 text-[10px] text-ink">Home</span>}
          </div>
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
        <div className="mt-3 space-y-2">
          {named.map(({ c, i: k }) => {
            const d = eff(c)
            return (
              <button key={k} type="button" onClick={() => setSel(sel === k ? null : k)} className="flex w-full items-center gap-2 text-left">
                <span className={'min-w-0 flex-1 truncate rounded-full border-2 bg-white px-3 py-1.5 font-fraunces text-sm text-ink shadow-sm ' + (sel === k ? 'border-twilight' : 'border-black/10')}>{c.n}</span>
                <span className="flex shrink-0 items-center gap-0.5"><span className="h-0.5 w-1 rounded-full bg-black/30" /><span className="h-0.5 w-1 rounded-full bg-black/30" /><span className="h-0.5 w-1 rounded-full bg-black/30" /></span>
                {d
                  ? <img src={'/photos/' + d + '.png'} alt="" className={'w-12 shrink-0 rounded-md border-2 object-cover object-top ' + (sel === k ? 'border-twilight' : 'border-black/10')} style={{ aspectRatio: '4/5' }} />
                  : <span className="flex w-12 shrink-0 items-center justify-center rounded-md border-2 border-dashed border-black/20 text-[9px] text-ink-soft" style={{ aspectRatio: '4/5' }}>Pick</span>}
              </button>
            )
          })}
        </div>
      )}
      {sel !== null && cards[sel] && cards[sel].n.trim() && (
        <div className="mt-4 rounded-xl border border-black/10 bg-white p-3">
          <p className="font-fraunces text-base text-ink">Display for {cards[sel].n}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
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

  return (
    <div className="grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)_320px]">
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
          <button type="button" className={arrow} disabled={i === 0} onClick={() => { setCur(i - 1); setAct(null) }} aria-label="Previous page">←</button>
          <p className="min-w-[200px] text-center font-fraunces text-2xl text-ink">{page.label}<span className="ml-3 text-xs text-ink-soft">{i + 1} of {pages.length}</span></p>
          <button type="button" className={arrow} disabled={i === pages.length - 1} onClick={() => { setCur(i + 1); setAct(null) }} aria-label="Next page">→</button>
        </div>

        <div className="mx-auto max-w-xl pl-32 pr-10">
          <div className="border-x border-black/10 bg-white shadow-sm">
            <div className="flex items-center gap-1.5 rounded-t-2xl border-b border-black/10 bg-[#EFE7DC] px-3 py-2">
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
            {!isBook && mine.length === 0 && <div className="border-t border-dashed border-black/20 px-4 py-10 text-center text-sm text-ink-soft">Add sections from the left</div>}
            <Row label="Footer" on={false} onClick={() => setAct(null)}><div className={slice + ' rounded-b-2xl'}>Footer</div></Row>
          </div>
        </div>
      </div>

      <aside className="self-start rounded-2xl border border-black/10 bg-[#FBF8F4] p-5 lg:sticky lg:top-6 lg:max-h-[88vh] lg:overflow-y-auto">
        {panel}
      </aside>
    </div>
  )
}
