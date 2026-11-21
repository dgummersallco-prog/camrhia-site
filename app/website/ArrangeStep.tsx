'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BLOCKS, ORDER, type Struct, type Links } from './PageBuilder'
import { supabase } from '@/lib/supabase'

type Pg = { id: string; label: string; extra?: boolean }
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

function listOf(s: Struct, id: string): string[] {
  if (id === 'home') return s.home
  if (id === 'about') return s.about
  if (id === 'galleries') return s.galleries
  if (id === 'book') return s.book ?? []
  return s.extra.find((e) => e.id === id)?.sections ?? []
}
function setList(s: Struct, id: string, l: string[]) {
  if (id === 'home') s.home = l
  else if (id === 'about') s.about = l
  else if (id === 'galleries') s.galleries = l
  else if (id === 'book') s.book = l
  else { const e = s.extra.find((q) => q.id === id); if (e) e.sections = l }
}
function strip(s: Struct, sec: string) {
  s.home = s.home.filter((k) => k !== sec)
  s.about = s.about.filter((k) => k !== sec)
  s.galleries = s.galleries.filter((k) => k !== sec)
  s.book = (s.book ?? []).filter((k) => k !== sec)
  s.extra.forEach((e) => { e.sections = e.sections.filter((k) => k !== sec) })
}

type GCard = { n: string; d: string }
const SEC_COUNT: Record<string, number> = { sahara: 3, gobi: 4, mojave: 3, atacama: 4, namib: 3, sonora: 4, kalahari: 4, thar: 3 }
const PAGE_COUNT: Record<string, number> = { jade: 7, jasper: 7, amber: 3, pearl: 9, ruby: 4, topaz: 6, garnet: 6, agate: 6, quartz: 12, moonstone: 4 }
const SEC_ANCH: Record<string, [number, number][]> = {
  sahara: [[0.18, 0.87], [0.5, 0.87], [0.82, 0.87]],
  gobi: [[0.5, 0.55], [0.23, 0.92], [0.5, 0.92], [0.77, 0.92]],
  mojave: [[0.17, 0.9], [0.5, 0.9], [0.83, 0.9]],
  atacama: [[0.15, 0.83], [0.38, 0.83], [0.62, 0.83], [0.86, 0.83]],
  namib: [[0.92, 0.3], [0.92, 0.58], [0.92, 0.86]],
  sonora: [[0.25, 0.5], [0.75, 0.5], [0.25, 0.98], [0.75, 0.98]],
  kalahari: [[0.48, 0.47], [0.75, 0.52], [0.48, 0.9], [0.75, 0.94]],
  thar: [[0.2, 0.84], [0.5, 0.84], [0.8, 0.84]],
}
const PAGE_COLS: Record<string, number> = { pearl: 3, jade: 2, jasper: 2, amber: 1, ruby: 1, topaz: 2, garnet: 1, agate: 3, quartz: 4, moonstone: 2 }
function anchorsFor(key: string, n: number): [number, number][] {
  if (SEC_ANCH[key] && SEC_ANCH[key].length === n) return SEC_ANCH[key]
  const cols = PAGE_COLS[key] ?? 3
  const hero = key === 'jade' || key === 'jasper'
  const out: [number, number][] = []
  let rest = n
  let top = 0.2
  if (hero) { out.push([0.5, 0.34]); rest -= 1; top = 0.42 }
  const rows = Math.max(1, Math.ceil(rest / cols))
  for (let q = 0; q < rest; q++) {
    const r = Math.floor(q / cols)
    const ci = q % cols
    const inRow = Math.min(cols, rest - r * cols)
    const x = inRow === 1 ? 0.5 : 0.18 + (ci * 0.64) / (inRow - 1)
    const y = top + ((r + 1) / rows) * (0.9 - top) - 0.02
    out.push([x, y])
  }
  return out
}
function roundPath(raw: [number, number][], r = 14) {
  const p = raw.filter((q, i) => i === 0 || q[0] !== raw[i - 1][0] || q[1] !== raw[i - 1][1])
  let d = `M ${p[0][0]} ${p[0][1]}`
  for (let i = 1; i < p.length - 1; i++) {
    const [x0, y0] = p[i - 1]
    const [x1, y1] = p[i]
    const [x2, y2] = p[i + 1]
    const l1 = Math.hypot(x1 - x0, y1 - y0)
    const l2 = Math.hypot(x2 - x1, y2 - y1)
    const rr = Math.min(r, l1 / 2, l2 / 2)
    d += ` L ${x1 - ((x1 - x0) / l1) * rr} ${y1 - ((y1 - y0) / l1) * rr} Q ${x1} ${y1} ${x1 + ((x2 - x1) / l2) * rr} ${y1 + ((y2 - y1) / l2) * rr}`
  }
  const last = p[p.length - 1]
  return d + ` L ${last[0]} ${last[1]}`
}
const baseOf = (s?: string) => (s || '').split('/').pop()?.replace('.png', '') || ''
const SUGG = ['Weddings', 'Engagements', 'Families', 'Seniors', 'Portraits', 'Newborns', 'Maternity', 'Couples', 'Events', 'Headshots']

function Row({ label, on, onClick, controls, alts, children }: { label: string; on: boolean; onClick: () => void; controls?: ReactNode; alts?: { n: number; on: boolean; click: () => void }[]; children: ReactNode }) {
  return (
    <div className={'relative ' + (on ? 'z-10 ring-2 ring-inset ring-twilight' : '')}>
      <div className="absolute right-full top-4 mr-1 flex items-center">
        <button type="button" onClick={onClick} className={'whitespace-nowrap rounded-full border px-3 py-1 font-fraunces text-sm shadow-sm transition ' + (on ? 'border-twilight bg-twilight text-white' : 'border-black/15 bg-white text-ink hover:border-twilight')}>{label}</button>
        <span className="h-px w-4 bg-black/30" />
      </div>
      {alts && alts.length > 1 && (
        <div className="absolute right-full top-14 mr-5 flex gap-1">
          {alts.map((x) => (
            <button key={x.n} type="button" onClick={x.click} className={'flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium shadow-sm transition ' + (x.on ? 'border-twilight bg-twilight text-white' : 'border-black/15 bg-white text-ink hover:border-twilight')}>{x.n}</button>
          ))}
        </div>
      )}
      <div onClick={onClick} className="cursor-pointer">{children}</div>
      {controls && <div className="absolute left-full top-3 ml-2 flex flex-col gap-1">{controls}</div>}
    </div>
  )
}

export default function ArrangeStep({ struct, setStruct, links, setLinks, thumbs, heroSrc, heroName, heroList, heroActive, onHero, secAlts, designs, setDesigns, photoDesigns }: {
  struct: Struct; setStruct: (s: Struct) => void; links: Links; setLinks: (l: Links) => void
  thumbs: Record<string, { src: string; ar: string }>; heroSrc?: string; heroName?: string; heroList?: { key: string; name: string }[]; heroActive?: string; onHero?: (k: string) => void; secAlts?: Record<string, { field: string; keys: string[]; active: string }>
  designs: Record<string, string>; setDesigns: (d: Record<string, string>) => void; photoDesigns: { key: string; name: string }[]
}) {
  const [cur, setCur] = useState<number>(() => {
    try { const v = Number(window.localStorage.getItem('camriArrCur')); if (Number.isInteger(v) && v >= 0) return v } catch {}
    return 0
  })
  useEffect(() => { try { window.localStorage.setItem('camriArrCur', String(cur)) } catch {} }, [cur])
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
  const eff = (c: GCard, k = 0) => c.d || (photoDesigns.length ? photoDesigns[k % photoDesigns.length].key : designs.photos || '')
  const wrapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState<string | null>(null)
  const [siteGals, setSiteGals] = useState<string[]>([])
  const [newIdx, setNewIdx] = useState<number[]>([])
  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      sb.from('website_galleries').select('title').eq('photographer_id', uid).order('sort_order', { ascending: true }).then(({ data: g }) => setSiteGals(((g ?? []) as { title: string }[]).map((x) => x.title)))
    })
  }, [])
  const [geo, setGeo] = useState<{ paths: { d: string; k: number }[]; dots: { x: number; y: number; k: number }[] }>({ paths: [], dots: [] })
  useEffect(() => {
    if (!photoDesigns.length) return
    const filled = cards.map((cd, k) => (cd.d ? cd : { ...cd, d: photoDesigns[k % photoDesigns.length].key }))
    const next = JSON.stringify(filled)
    if (next !== (designs.galcards || '')) setDesigns({ ...designs, galcards: next })
  }, [designs.galcards, want, photoDesigns.length])
  useEffect(() => {
    const calc = () => {
      const wrap = wrapRef.current
      if (!wrap) return
      const img = wrap.querySelector('[data-galimg]') as HTMLElement | null
      const frame = wrap.querySelector('[data-frame]') as HTMLElement | null
      const dest = Array.from(wrap.querySelectorAll('[data-dest]')) as HTMLElement[]
      const next: { paths: { d: string; k: number }[]; dots: { x: number; y: number; k: number }[] } = { paths: [], dots: [] }
      if (img && frame && dest.length) {
        const wr = wrap.getBoundingClientRect()
        const ir = img.getBoundingClientRect()
        const fr = frame.getBoundingClientRect()
        const A = anchorsFor(img.getAttribute('data-galimg') || '', dest.length)
        const info = dest.map((el) => {
          const r = el.getBoundingClientRect()
          return { k: Number(el.getAttribute('data-dest')), cx: r.left - wr.left + r.width / 2, cy: r.top - wr.top, l: r.left - wr.left, rt: r.right - wr.left }
        })
        const fl = fr.left - wr.left
        const frt = fr.right - wr.left
        const mid = (fl + frt) / 2
        const xL = Math.min(fl, ...info.map((q) => q.l)) - 26
        const xR = Math.max(frt, ...info.map((q) => q.rt)) + 26
        const ds = [...info].sort((p, q) => (Math.abs(p.cx - q.cx) > 10 ? p.cx - q.cx : p.cy - q.cy))
        const rowTops = Array.from(new Set(info.map((q) => Math.round(q.cy / 10)))).sort((p, q) => p - q)
        const top0 = Math.min(...info.map((q) => q.cy))
        const items = A.map(([fx, fy]) => ({ ax: ir.left - wr.left + fx * ir.width, ay: ir.top - wr.top + fy * ir.height }))
        const Lg = items.filter((q) => q.ax < mid).sort((p, q) => p.ay - q.ay)
        const Rg = items.filter((q) => q.ax >= mid).sort((p, q) => p.ay - q.ay)
        const dl = ds.slice(0, Lg.length)
        const dr = ds.slice(Lg.length).reverse()
        const draw = (g: typeof items, dd: typeof info, side: number) =>
          g.forEach((q, j) => {
            const cc = dd[j]
            if (!cc) return
            const row = rowTops.indexOf(Math.round(cc.cy / 10))
            const lx = side < 0 ? xL - (g.length - 1 - j) * 18 : xR + (g.length - 1 - j) * 18
            const yb = top0 - 90 - j * 20
            const pts: [number, number][] = row <= 0
              ? [[q.ax, q.ay], [lx, q.ay], [lx, yb], [cc.cx, yb], [cc.cx, cc.cy]]
              : [[q.ax, q.ay], [lx, q.ay], [lx, yb], [cc.l - 14 + (((row - 1) % 3) - 1) * 5, yb], [cc.l - 14 + (((row - 1) % 3) - 1) * 5, cc.cy - 24], [cc.cx, cc.cy - 24], [cc.cx, cc.cy]]
            next.paths.push({ d: roundPath(pts, 56), k: cc.k })
            next.dots.push({ x: q.ax, y: q.ay, k: cc.k }, { x: cc.cx, y: cc.cy, k: cc.k })
          })
        draw(Lg, dl, -1)
        draw(Rg, dr, 1)
      }
      setGeo((g) => (JSON.stringify(g) === JSON.stringify(next) ? g : next))
    }
    calc()
    const t = setTimeout(calc, 350)
    window.addEventListener('resize', calc)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(calc) : null
    if (ro && wrapRef.current) ro.observe(wrapRef.current)
    return () => { clearTimeout(t); window.removeEventListener('resize', calc); ro?.disconnect() }
  })
  const pages: Pg[] = [
    { id: 'home', label: 'Home' },
    ...(struct.off.includes('galleries') ? [] : [{ id: 'galleries', label: 'Galleries' }]),
    ...(struct.off.includes('about') ? [] : [{ id: 'about', label: 'About' }]),
    ...struct.extra.map((e) => ({ id: e.id, label: e.label, extra: true })),
    ...(designs.blog_mode === 'page' ? [{ id: 'blog', label: 'Blog' }] : []),
    { id: 'book', label: 'Booking' },
  ]
  const i = Math.min(cur, pages.length - 1)
  const page = pages[i]
  const isBook = page.id === 'book'
  const isBlog = page.id === 'blog'
  const isFixed = isBook || isBlog
  const clone = (): Struct => JSON.parse(JSON.stringify(struct))
  const where = (k: string) => pages.find((p) => listOf(struct, p.id).includes(k))
  const sections = ORDER.filter((k) => thumbs[k] || where(k))
  const names = pages.map((p) => p.label)
  const nameList = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]
  const mine = listOf(struct, page.id)
  const mainKey = page.id === 'galleries' ? 'portfolio' : page.id === 'about' ? 'about' : page.id === 'pricing' ? 'investment' : null
  const vMain = !!mainKey && !mine.includes(mainKey) && !!thumbs[mainKey]
  const GAL = ['galsec', 'portfolio']
  const focus: string | null = act && (mine.includes(act) || act === 'hero' || (vMain && act === mainKey)) ? act : (mine.find((k) => GAL.includes(k) || k === 'social') ?? (page.id === 'galleries' ? 'portfolio' : null))

  function add(sec: string) {
    if (page.id === 'galleries' || (isFixed && sec !== 'faq')) return
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
  const onGalPage = page.id === 'galleries'
  const vis = !onGalPage && secN ? Math.min(secN, cards.length) : cards.length
  const galPanel = (
    <div>
      <div className="flex items-start gap-3">
        <img src="/camri/09_holding_photo.png" alt="" className="h-14 w-auto shrink-0" />
        <p className="font-fraunces text-base leading-snug text-ink">
          {!onGalPage && secN
            ? 'Your galleries block has ' + vis + ' destinations.'
            : secOnly
            ? 'Your galleries section has ' + secN + ' destinations.'
            : secN && designs.galleries_mode !== 'page'
              ? 'Your Galleries page has ' + pageN + ' destinations, and your home page shows the first ' + secN + '.'
              : 'Your Galleries page has ' + pageN + ' destinations.'} Name each one below the page, then pick how its gallery is displayed.
        </p>
      </div>
    </div>
  )
  const showDest = page.id === 'galleries' || mine.includes('galsec') || mine.includes('portfolio')
  const pickI = Math.min(sel ?? 0, Math.max(vis - 1, 0))
  const DW = 120
  const DG = 28
  const perRow = vis <= 4 ? Math.max(vis, 1) : vis % 4 === 0 ? 4 : vis % 3 === 0 ? 3 : 4
  const destinations = (
    <div style={{ marginTop: 150 + 20 * Math.ceil(vis / 2) }}>
      <div className="relative z-10 mx-auto flex flex-wrap justify-center gap-y-14" style={{ maxWidth: perRow * DW + (perRow - 1) * DG, columnGap: DG }}>
        {cards.map((cd, k) => {
          if (k >= vis) return null
          const d = eff(cd, k)
          const on = pickI === k
          return (
            <div key={k} data-dest={k} style={{ width: DW }}>
              <button type="button" onClick={() => setSel(k)} className="block w-full">
                <div className={'relative flex items-center justify-center overflow-hidden rounded-lg border-2 bg-[#EFE7DC] ' + (on ? 'border-twilight' : 'border-black/10')} style={{ aspectRatio: '4/5' }}>
                  {d ? <img src={'/photos/' + d + '.png'} alt="" className="h-full w-full object-cover object-top" /> : null}
                  <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs text-ink">{k + 1}</span>
                  {onGalPage && secN && !secOnly && designs.galleries_mode !== 'page' && k < secN && <span className="absolute right-1.5 top-1.5 rounded-full bg-white px-2 py-0.5 text-[10px] text-ink">Home</span>}
                </div>
              </button>
              {(() => {
                const inList = siteGals.includes(cd.n)
                const isNew = newIdx.includes(k) || (!!cd.n && !inList)
                const txt = <input value={cd.n} onFocus={() => setSel(k)} onChange={(e) => setCard(k, { n: e.target.value.slice(0, 24) })} placeholder={SUGG[k % SUGG.length]} className="mt-2 w-full rounded-full border border-black/10 bg-white px-2 py-1.5 text-center font-fraunces text-sm text-ink outline-none focus:border-twilight" />
                if (siteGals.length === 0) return txt
                return (
                  <>
                    <select value={inList ? cd.n : isNew ? '__new' : ''} onFocus={() => setSel(k)} onChange={(e) => { const v = e.target.value; if (v === '__new') { setNewIdx((a) => (a.includes(k) ? a : [...a, k])); if (inList) setCard(k, { n: '' }) } else { setNewIdx((a) => a.filter((x) => x !== k)); setCard(k, { n: v }) } }} className="mt-2 w-full rounded-full border border-black/10 bg-white px-2 py-1.5 text-center font-fraunces text-sm text-ink outline-none focus:border-twilight">
                      <option value="">Choose a gallery</option>
                      {siteGals.map((t) => <option key={t} value={t} disabled={cards.some((x, j) => j !== k && x.n === t)}>{t}</option>)}
                      <option value="__new">+ New gallery…</option>
                    </select>
                    {isNew && txt}
                  </>
                )
              })()}
              <button type="button" onClick={() => setSel(k)} className="mt-1.5 block w-full text-center text-[11px] text-ink-soft">{photoDesigns.find((x) => x.key === d)?.name ?? d}</button>
            </div>
          )
        })}
      </div>

      {cards[pickI] && (
        <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-fraunces text-base text-ink">How should {cards[pickI].n.trim() || 'destination ' + (pickI + 1)} look when someone opens it?</p>
            <button type="button" onClick={() => saveCards(cards.map((x) => ({ ...x, d: eff(cards[pickI], pickI) })))} className="rounded-full border border-black/15 px-3 py-1 text-xs text-ink">Use this style for all</button>
          </div>
          <p className="mt-1 text-xs text-ink-soft">Tap a destination above to pick a different one.</p>
          {zoom && (
            <div className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/70 p-6" onClick={() => setZoom(null)}>
              <img src={'/photos/' + zoom + '.png'} alt="" className="max-h-full max-w-full rounded-xl bg-white shadow-2xl" />
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {photoDesigns.map((pd) => (
              <div key={pd.key} className="relative">
                <button type="button" onClick={() => setCard(pickI, { d: pd.key })} className="block w-full text-left">
                  <img src={'/photos/' + pd.key + '.png'} alt="" className={'w-full rounded-lg border-2 object-cover object-top ' + (eff(cards[pickI], pickI) === pd.key ? 'border-twilight ring-2 ring-twilight' : 'border-transparent')} style={{ aspectRatio: '4/5' }} />
                  <p className="mt-1 text-[11px] text-ink">{pd.name}</p>
                </button>
                <button type="button" aria-label={'Zoom ' + pd.name} onClick={() => setZoom(pd.key)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-ink shadow">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4M11 8v6M8 11h6" /></svg>
                </button>
              </div>
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
      <p className="font-fraunces text-base leading-snug text-ink">{isBook ? 'Booking is just your calendar, so there is nothing to add here.' : isBlog ? 'Your Blog page lists your posts for you, so there is nothing to arrange here.' : 'Tap any block on the page to see what it does and fill out what it needs.'}</p>
    </div>
  )

  const MAIN = (p: Pg): string | undefined => {
    if (p.id === 'home') return heroSrc
    if (p.id === 'galleries') return thumbs.portfolio?.src
    if (p.id === 'about') return thumbs.about?.src
    if (p.id === 'book') return thumbs.book?.src
    if (p.id === 'blog') return thumbs.blog?.src
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
    home: ['explore', 'galsec', 'testimonials', 'pricesec', 'faq', 'social', 'contact'],
    galleries: ['testimonials', 'contact'],
    about: ['testimonials', 'contact'],
    book: ['faq'],
  }
  const SAY: Record<string, string> = {
    home: 'Your home page is the first impression. Start with the hero, then show a few galleries, reviews, pricing and FAQ, and finish with a booking button.',
    galleries: 'This page is just your galleries and a booking button. Your other sections live on your home page.',
    about: 'People often read About right before they book. Add a few reviews and a booking button.',
    book: 'Booking is your calendar. A short FAQ right under it answers the last questions before someone inquires.',
  }
  const okRec = (k: string) => !!BLOCKS[k] && k !== 'portfolio' && !(k === 'about' && designs.about_mode !== 'section' && designs.about_mode !== 'both') && !(k === 'galsec' && designs.galleries_mode === 'page') && (!['galsec', 'pricesec', 'investment', 'explore'].includes(k) || !!thumbs[k] || !!where(k))
  const recKeys = (RECS[page.id] ?? (page.extra ? ['faq', 'testimonials', 'contact'] : [])).filter(okRec)
  const others = sections.filter((k) => okRec(k) && !recKeys.includes(k) && !mine.includes(k))
  function addAll() {
    const s = clone()
    cardKeys.forEach((k) => { if (!listOf(s, page.id).includes(k)) { strip(s, k); setList(s, page.id, [...listOf(s, page.id), k]) } })
    setStruct(s)
  }

  const ALLOW: string[] | null = page.id === 'galleries' ? [] : isBook ? ['faq'] : page.id === 'about' ? ['testimonials', 'social', 'contact'] : page.id === 'blog' ? ['social', 'contact'] : page.extra ? ['faq', 'testimonials', 'social', 'contact'] : null
  const cardKeys = [...recKeys].filter((k) => !mine.includes(k) && (!ALLOW || ALLOW.includes(k)))
  const rightPanel = (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-3">
          <img src={isBook ? '/camri/11_thumbs_up.png' : '/camri/04_thinking.png'} alt="" className="h-14 w-auto shrink-0" />
          <p className="font-fraunces text-base leading-snug text-ink">{isBook || page.id === 'galleries' ? SAY[page.id] : 'Below are the sections you loved most. Add them to your ' + page.label.toLowerCase() + ' page and watch it grow.'}</p>
        </div>
        {cardKeys.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-ink-soft">Sections you loved</p>
              <button type="button" onClick={addAll} className="rounded-full bg-twilight px-3 py-1 text-xs font-medium text-white">Add all</button>
            </div>
            {cardKeys.map((k) => {
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
      </div>
      {!isFixed && <div className="border-t border-black/10 pt-5">{panel}</div>}
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
        <div className="mt-5 overflow-x-auto pb-2"><div className="mx-auto flex w-max items-start">
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
                    : <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-black/20 text-xs text-ink-soft">{p.id === 'book' ? 'Your calendar' : p.id === 'blog' ? 'Your posts' : 'Add sections'}</div>}
                </button>
              </div>
            )
          })}
        </div></div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={wrapRef} className="relative">
          <p className="mb-5 text-center font-fraunces text-2xl text-ink">{page.label}<span className="ml-3 text-xs text-ink-soft">{i + 1} of {pages.length}</span></p>
          <div className="mx-auto max-w-xl pl-32 pr-10">
            <div data-frame="1" className="border-x border-black/10 bg-white shadow-sm">
              <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#EFE7DC] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-black/25" /><span className="h-2 w-2 rounded-full bg-black/25" /><span className="h-2 w-2 rounded-full bg-black/25" />
                {page.extra
                  ? <input value={page.label} onChange={(e) => rename(e.target.value)} className="ml-2 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none" />
                  : <span className="ml-2 flex-1 text-sm text-ink-soft">{page.label}</span>}
                {page.id !== 'home' && page.id !== 'book' && <button type="button" onClick={removePage} aria-label={'Remove ' + page.label} className="text-sm text-ink-soft">✕</button>}
              </div>

              {page.id === 'home' && (
                <Row label="Hero" on={focus === 'hero'} onClick={() => setAct('hero')} alts={heroList && heroList.length > 1 ? heroList.map((h, i) => ({ n: i + 1, on: h.key === heroActive, click: () => onHero?.(h.key) })) : undefined}>
                  {heroSrc ? <img src={heroSrc} alt="" className="block w-full" /> : <div className={slice + ' py-10 text-center'}>Hero</div>}
                </Row>
              )}

              {vMain && mainKey && (
                <Row label={BLOCKS[mainKey]?.label ?? page.label} on={focus === mainKey} onClick={() => setAct(mainKey)} alts={secAlts?.[mainKey] && secAlts[mainKey].keys.length > 1 ? secAlts[mainKey].keys.map((kk, i) => ({ n: i + 1, on: kk === secAlts[mainKey].active, click: () => setDesigns({ ...designs, [secAlts[mainKey].field]: kk }) })) : undefined}>
                  <img src={thumbs[mainKey].src} alt="" data-galimg={mainKey === 'portfolio' ? baseOf(thumbs[mainKey].src) : undefined} className="block w-full" />
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
                    alts={secAlts?.[sec] && secAlts[sec].keys.length > 1 ? secAlts[sec].keys.map((kk, i) => ({ n: i + 1, on: kk === secAlts[sec].active, click: () => setDesigns({ ...designs, [secAlts[sec].field]: kk }) })) : undefined}
                    controls={<>
                      <button type="button" disabled={idx === 0} onClick={() => nudge(idx, -1)} aria-label="Move up" className={ctl}>↑</button>
                      <button type="button" disabled={idx === mine.length - 1} onClick={() => nudge(idx, 1)} aria-label="Move down" className={ctl}>↓</button>
                      <button type="button" onClick={() => take(sec)} aria-label="Take off this page" className={ctl}>✕</button>
                    </>}
                  >
                    {th ? <img src={th.src} alt="" data-galimg={sec === 'galsec' || sec === 'portfolio' ? baseOf(th.src) : undefined} className="block w-full" /> : <div className="bg-[#FBF8F4] px-4 py-8 text-sm text-ink-soft">{BLOCKS[sec]?.label}</div>}
                  </Row>
                )
              })}

              {isBook && (thumbs.book
                ? <Row label="Booking page" on={false} onClick={() => setAct(null)}><img src={thumbs.book.src} alt="" className="block w-full" /></Row>
                : <Row label="Calendar" on={false} onClick={() => setAct(null)}><div className={slice + ' py-16 text-center'}>Your booking calendar</div></Row>)}
              {isBlog && (thumbs.blog
                ? <Row label="Blog page" on={false} onClick={() => setAct(null)}><img src={thumbs.blog.src} alt="" className="block w-full" /></Row>
                : <Row label="Blog" on={false} onClick={() => setAct(null)}><div className={slice + ' py-16 text-center'}>Your blog posts</div></Row>)}
              {!isFixed && mine.length === 0 && !vMain && page.id !== 'home' && <div className="border-t border-dashed border-black/20 px-4 py-10 text-center text-sm text-ink-soft">Add sections from Camri's suggestions</div>}
              
            </div>
          </div>
          {showDest && !(act && !(GAL as string[]).includes(String(act)) && String(act) !== String(mainKey)) && destinations}
          <svg className="pointer-events-none absolute left-0 top-0 z-20 overflow-visible" width="100%" height="100%" fill="none" style={{ opacity: act && !(GAL as string[]).includes(String(act)) && String(act) !== String(mainKey) ? 0.1 : 1, transition: 'opacity 0.4s' }}>
            {[...geo.paths].sort((a, b) => Number(a.k === pickI) - Number(b.k === pickI)).map((p, i) => <path key={i} d={p.d} stroke="rgba(70,50,30,0.6)" strokeWidth={p.k === pickI ? 2.5 : 2} strokeDasharray="6 7" strokeLinecap="round" style={{ opacity: p.k === pickI ? 1 : 0.12, transition: 'opacity 0.3s' }} />)}
            {geo.dots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={4} fill="rgba(70,50,30,0.7)" style={{ opacity: p.k === pickI ? 1 : 0.12, transition: 'opacity 0.3s' }} />)}
          </svg>
        </div>

        <aside className="self-start rounded-2xl border border-black/10 bg-[#FBF8F4] p-5 lg:sticky lg:top-6 lg:max-h-[88vh] lg:overflow-y-auto">
          {rightPanel}
        </aside>
      </div>
    </div>
  )
}
