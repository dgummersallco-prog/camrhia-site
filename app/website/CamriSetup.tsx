'use client'

import { useState } from 'react'
import { type Struct, type Links, cleanStruct } from './PageBuilder'
import ArrangeStep from './ArrangeStep'
import TONES from '@/lib/designTones.json'
import { useEffect as usePersist } from 'react'

function draftGet(k: string): any {
  try { return JSON.parse(window.localStorage.getItem('camriDraft2') || '{}')[k] } catch { return undefined }
}
import FontStep, { type FontPick, type FontItem } from './FontStep'

export type Kit = {
  done: boolean
  layouts: string[]
  palettes: { name: string; accent: string; bg: string; text: string }[]
  fonts: string[]
  type: FontPick
  designAlts?: Record<string, { label: string; items: { key: string; name: string }[] }>
  pages: string[]
  extra_pages: string
  themes: unknown[]
}
type Style = { key: string; name: string; blurb: string; bg: string; text: string }
type Pal = { name: string; accent: string; bg: string; text: string }
type TypeSet = { key: string; name: string; head: string; body: string }
type PageDef = { k: string; label: string; blurb: string; locked?: boolean; soon?: boolean }

const LINES = [
  "Hi, I'm Camri! I'll help you design your website. Pick the looks you love and I'll remember them, so later you can just say \"switch my layout\" or \"use my dark theme\".",
  'Pick up to three layouts you love. The first one you pick becomes your starting design.',
  "Now it's build-a-bear time! Pick a look for each part. Your site comes together on the right, and any full pages stack up beside it. Skip any you like as they are.",
  "Last look! Add the sections you picked to any of your pages. Use the arrows to flip between pages, then build your site.",
  'Last one: fonts. Pick up to three for your title, subtitle and paragraph. The first one you pick for each is what I start with.',
]

function toggle(list: string[], v: string, max: number) {
  if (list.includes(v)) return list.filter((x) => x !== v)
  if (list.length >= max) return list
  return [...list, v]
}

const tone = (hex: string) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return { l: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, w: (r - b) / 255 }
}
function camriPick(styleKey: string, styles: Style[]): Record<string, string> {
  const st = styles.find((x) => x.key === styleKey)
  const want = tone(st?.bg ?? '#FFFFFF')
  const T = TONES as unknown as Record<string, { l: number; w: number }>
  const out: Record<string, string> = {}
  Object.entries(PICKERS()).forEach(([id, pk]) => {
    if (id === 'book|Without the calendar') return
    let best = pk.items[0]?.key ?? ''
    let bd = 99
    pk.items.forEach((it) => {
      const t = T[pk.dir + '/' + it.key]
      if (!t) return
      const dd = Math.abs(t.l - want.l) * 3 + Math.abs(t.w - want.w)
      if (dd < bd) { bd = dd; best = it.key }
    })
    out[pk.field] = best
  })
  out.galleries_mode = 'both'
  out.about_mode = 'page'
  out.pricing_mode = 'section'
  out.blog_mode = 'none'
  return out
}

function withModes(s: Struct, d: Record<string, string>): Struct {
  const n: Struct = { ...s, home: [...s.home], about: [...s.about], galleries: [...s.galleries], extra: s.extra.map((e) => ({ ...e, sections: [...e.sections] })), off: [...s.off] }
  const drop = (k: string) => {
    n.home = n.home.filter((x) => x !== k)
    n.about = n.about.filter((x) => x !== k)
    n.galleries = n.galleries.filter((x) => x !== k)
    n.extra.forEach((e) => { e.sections = e.sections.filter((x) => x !== k) })
  }
  const toHome = (k: string) => { drop(k); const i = n.home.indexOf('explore'); n.home.splice(i >= 0 ? i + 1 : 0, 0, k) }
  const pageOn = (pg: string) => { n.off = n.off.filter((x) => x !== pg) }
  const pageOff = (pg: string) => { if (!n.off.includes(pg)) n.off.push(pg) }
  const g = d.galleries_mode
  if (g === 'page' || g === 'both') {
    pageOn('galleries')
    if (!n.galleries.includes('portfolio')) { drop('portfolio'); n.galleries.push('portfolio') }
    if (g === 'page') drop('galsec'); else toHome('galsec')
  } else if (g === 'section') {
    pageOff('galleries'); drop('portfolio'); toHome('galsec')
  } else if (g === 'none') {
    pageOff('galleries'); drop('portfolio'); drop('galsec')
  }
  const a = d.about_mode
  if (a === 'page') { pageOn('about'); drop('about'); n.about.unshift('about') }
  else if (a === 'both') { pageOn('about'); drop('about'); n.about.unshift('about'); const hi = n.home.indexOf('explore'); n.home.splice(hi >= 0 ? hi + 1 : 0, 0, 'about') }
  else if (a === 'section') { pageOff('about'); toHome('about') }
  else if (a === 'none') { pageOff('about'); drop('about') }
  const pr = d.pricing_mode
  const setPricePage = () => {
    drop('investment')
    const e = n.extra.find((q) => q.id === 'pricing')
    if (e) e.sections = ['investment']; else n.extra.push({ id: 'pricing', label: 'Pricing', sections: ['investment'] })
  }
  if (pr === 'page') { drop('pricesec'); setPricePage() }
  else if (pr === 'both') { setPricePage(); toHome('pricesec') }
  else if (pr === 'section') { n.extra = n.extra.filter((e) => e.id !== 'pricing'); drop('pricesec'); toHome('investment') }
  else if (pr === 'none') { n.extra = n.extra.filter((e) => e.id !== 'pricing'); drop('pricesec'); drop('investment') }
  const b = d.blog_mode
  if (b === 'none') { if (!n.off.includes('blog')) n.off.push('blog') }
  else if (b === 'page') n.off = n.off.filter((x) => x !== 'blog')
  return n
}

function CamriSetupInner({ styles, palettes, typeSets, pages, fam, structure, links: linksIn, fontList, initial, startStep, onCancel, onFinish, onSkip }: {
  styles: Style[]; palettes: Pal[]; typeSets: TypeSet[]; pages: PageDef[]; structure: Struct; links: Links; fontList: FontItem[]; initial?: { layouts: string[]; palettes: Pal[]; fonts: string[]; type?: FontPick }; startStep?: number; onCancel?: () => void
  fam: (k: string) => string
  onFinish: (kit: Kit, structure: Struct, links: Links, designs: Record<string, string>) => Promise<void>
  onSkip: () => void
}) {
  const [step, setStep] = useState<number>(() => {
    try { const raw = window.localStorage.getItem('camriStep2'); if (raw !== null) { const v = Number(raw); if (Number.isInteger(v) && v >= 0 && v <= 3) return v } } catch {}
    return startStep ?? 0
  })
  const [layouts, setLayouts] = useState<string[]>(initial?.layouts ?? [])
  const [startIdx, setStartIdx] = useState(0)
  const si = Math.min(startIdx, Math.max(layouts.length - 1, 0))
  const [heroList, setHeroList] = useState<string[]>([])
  const [showPlanTop, setShowPlanTop] = useState(false)
  const hl = heroList.length === layouts.length && heroList.every((x) => layouts.includes(x)) ? heroList : layouts
  const [picked, setPicked] = useState<Pal[]>(initial?.palettes ?? [])
  
  const [fp, setFp] = useState<FontPick>(initial?.type ?? { title: [], subtitle: [], paragraph: [] })
  const [struct, setStruct] = useState<Struct>(() => draftGet('struct') ?? { v: 1, home: [], about: [], galleries: [], extra: [], off: ['galleries', 'about'] })
  const [ls, setLs] = useState<Links>(linksIn)
  const [designs, setDesigns] = useState<Record<string, string>>(() => draftGet('designs') ?? ({}))
  const [busy, setBusy] = useState(false)

  
  const ring = 'border-twilight ring-2 ring-twilight'
  const badge = (n: number) => <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-twilight text-xs font-semibold text-white">{n}</span>
  const canGo = step === 1 ? layouts.length > 0 : step === 2 ? true : step === 3 ? true : step === 4 ? (fp.title.length > 0 && fp.subtitle.length > 0 && fp.paragraph.length > 0) : true

  async function finish() {
    setBusy(true)
    const list: Pal[] = picked
    
    
    const s2 = cleanStruct(struct)
    const pagesOut = ['home', 'book', ...(s2.off.includes('galleries') ? [] : ['galleries']), ...(s2.off.includes('about') ? [] : ['about']), ...s2.extra.map((e) => e.id)]
    const nameOf: Record<string, Record<string, string>> = {}
    for (const p of Object.values(PICKERS())) { const m = (nameOf[p.field] = nameOf[p.field] ?? {}); p.items.forEach((it) => { m[it.key] = it.name }) }
    const designAlts: NonNullable<Kit['designAlts']> = {}
    for (const f of Object.keys(nameOf)) {
      const keys = (designs[f + '_alts'] || designs[f] || '').split(',').filter(Boolean)
      if (keys.length) designAlts[f] = { label: DESIGN_LABELS[f] ?? f, items: keys.map((k) => ({ key: k, name: nameOf[f][k] ?? k })) }
    }
    await onFinish({ done: true, layouts, palettes: list, fonts: [], type: fp, designAlts, pages: pagesOut, extra_pages: '', themes: [] }, s2, ls, designs)
    setBusy(false)
  }

  function goArrange() {
    const base: Struct = { v: 1, home: [], about: [], galleries: [], extra: [], off: ['galleries', 'about'] }
    const dn: Record<string, string> = { ...designs }
    if (dn.about_mode !== 'none') {
      if (dn.about_page && dn.about_section) dn.about_mode = 'both'
      else if (dn.about_page) dn.about_mode = 'page'
      else if (dn.about_section) dn.about_mode = 'section'
    }
    if ((dn.blog_list || dn.blog_post) && dn.blog_mode !== 'none') dn.blog_mode = 'page'
    setDesigns(dn)
    const s = withModes(base, dn)
    s.home = []
    s.about = []
    s.galleries = []
    s.extra = s.extra.map((e) => ({ ...e, sections: [] }))
    setStruct(s)
    setStep(3)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function camriBuild() {
    const nd = { ...designs, ...camriPick(layouts[0], styles) }
    const base: Struct = { v: 1, home: [], about: [], galleries: [], extra: [], off: ['galleries', 'about'] }
    const s = withModes(base, nd)
    s.home = []
    setDesigns(nd)
    setStruct(s)
    setStep(3)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  usePersist(() => { try { window.localStorage.setItem('camriStep2', String(step)) } catch {} }, [step])
  usePersist(() => { try { window.localStorage.setItem('camriDraft2', JSON.stringify({ struct, designs })) } catch {} }, [struct, designs])

  return (
    <div className="mx-auto w-full max-w-[1400px] py-6">
      <div className={(step >= 1 ? 'hidden ' : '') + 'flex items-start gap-4'}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step === 0 ? '/camri/01_waving.png' : '/camri/13_face_avatar.png'} alt="" className={(step === 0 ? 'h-32' : 'h-14') + ' w-auto shrink-0'} />
        <div className="rounded-2xl rounded-tl-sm bg-[#EBDDCF] px-5 py-4 text-ink">
          <p className="mt-1 font-fraunces text-xl leading-snug">{LINES[step]}</p>
        </div>
      </div>

      <div className="mt-6">
        {step === 0 && (
          <div className="flex flex-col gap-10">
            <div className="mx-auto grid w-full max-w-4xl grid-cols-3 gap-6">
              {[['1', 'Layouts', 'Pick the looks you love'], ['2', 'Build', 'Pick a look for each part'], ['3', 'Arrange', 'See it all and move things around']].map(([n, ttl, d]) => (
                <div key={n} className="flex aspect-square flex-col items-center justify-center rounded-3xl border border-black/10 bg-white/70 p-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-twilight text-lg font-semibold text-white">{n}</span>
                  <p className="mt-5 font-fraunces text-2xl text-ink">{ttl}</p>
                  <p className="mt-2 text-sm text-ink-soft">{d}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setStep(1)} className="rounded-full bg-twilight px-7 py-3 text-sm font-medium text-white transition hover:opacity-90">Let&apos;s start</button>
            </div>
            
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
          <div className="sticky top-0 z-20 -mx-2 mb-6 bg-[#F6F1EA]/95 px-2 pb-3 pt-2 backdrop-blur">
            <div className="flex h-16 items-center"><h3 className="font-fraunces text-5xl tracking-tight text-ink">Hero</h3></div>
            <div className="mt-3"><Meter at={0} /></div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setStep(0)} disabled={busy} className="rounded-full border border-black/15 bg-white px-4 py-1.5 text-sm text-ink disabled:opacity-50">← Back</button>
              <button type="button" onClick={() => { if (si > 0) setLayouts((l) => [l[si], ...l.filter((_, j) => j !== si)]); setStartIdx(0); setStep(2) }} disabled={!canGo} className="rounded-full bg-twilight px-5 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">{`Next: ${DESIGN_SECTIONS[0].title} →`}</button>
            </div>
          </div>
          <div className="mb-8 flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/12_open_arms.png" alt="" className="h-24 w-auto shrink-0" />
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-[#EBDDCF] px-5 py-3">
              <p className="font-fraunces text-lg leading-snug text-ink">We&apos;re building your site one section at a time, starting with the hero. Your hero is the first thing visitors see: your best photo and what you shoot.</p>
              <p className="mt-1.5 text-sm text-ink-soft">Pick up to three layouts you love. Tap 1, 2, 3 under &quot;Your site so far&quot; to swap between them. Next up: Explore section. Or I can pick for you.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={camriBuild} disabled={layouts.length === 0} className="rounded-full bg-twilight px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">Yes, build it for me</button>
                <button type="button" onClick={() => setShowPlanTop(!showPlanTop)} className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm text-ink">How would you set it up?</button>
              </div>
              {showPlanTop && (
                <div className="mt-4 text-sm leading-relaxed text-ink-soft">
                  <p className="font-medium text-ink">Pages: Home, Galleries, About and Booking. A short menu works best.</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    <li>Hero: your best photo and what you shoot. That is your layout.</li>
                    <li>Explore: three clear paths to Galleries, About and Booking.</li>
                    <li>Galleries: a few of your best galleries that link to the full page.</li>
                    <li>Testimonials: three to five short ones, with first names.</li>
                    <li>Pricing: so people know what to expect before they ask.</li>
                    <li>FAQ: the last questions before they inquire.</li>
                    <li>Social links, then a booking button as the next step.</li>
                  </ol>
                  <p className="mt-2">Blog is optional. Add it only if you will keep posting.</p>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-12">
            {styles.map((s) => {
              const i = layouts.indexOf(s.key)
              return (
                <button key={s.key} type="button" onClick={() => setLayouts((l) => toggle(l, s.key, 3))} className="relative text-left">
                  <p className="mb-2 text-sm font-medium text-ink">{s.name}</p>
                  <img src={'/layouts/' + s.key + '.png'} alt={s.name} className={'h-auto w-full rounded-lg border transition ' + (i >= 0 ? ring : 'border-black/10 hover:border-black/30')} onError={(e) => { const el = e.currentTarget; el.style.display = 'none'; el.nextElementSibling?.removeAttribute('hidden') }} />
                  <div hidden className="h-20 rounded-lg border border-black/10 p-2" style={{ background: s.bg }}>
                    <div className="h-2.5 w-2/3 rounded" style={{ background: s.text }} />
                    <div className="mt-2 h-1.5 w-1/2 rounded opacity-50" style={{ background: s.text }} />
                  </div>
                  {i >= 0 && badge(i + 1)}
                </button>
              )
            })}
          </div>
          </div>
          <aside className="hidden lg:block lg:pt-[84px]">
            <div className="sticky top-6 max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wider text-ink-soft">Your site so far</p>
              </div>
              <div className="mt-3">
                <div className="mx-auto w-[72%] overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                  <div className="flex items-center gap-1 border-b border-black/10 bg-[#EFE7DC] px-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-black/25" /><span className="h-1.5 w-1.5 rounded-full bg-black/25" /><span className="h-1.5 w-1.5 rounded-full bg-black/25" />
                    <span className="ml-2 text-[10px] text-ink-soft">Home</span>
                  </div>
                  {layouts[si] ? (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={'/layouts/' + layouts[si] + '.png'} alt="" className="w-full" />
                      <p className="px-2 py-1 text-[10px] text-ink-soft">{'Layout ' + (si + 1) + ' · ' + (styles.find((x) => x.key === layouts[si])?.name ?? '')}</p>
                    </div>
                  ) : (
                    <div className="h-16 bg-[#F6F1EA]" />
                  )}
                  {layouts.length > 1 && (
                    <div className="flex items-center gap-1.5 px-2 pb-2">
                      {layouts.map((k, i) => (
                        <button key={k} type="button" onClick={() => setStartIdx(i)} className={'h-6 w-6 rounded-full text-xs transition ' + (si === i ? 'bg-twilight font-medium text-white' : 'border border-black/15 bg-white text-ink hover:bg-black/5')}>{i + 1}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </aside>
          </div>
        )}

        {step === 2 && (
          <div>
            <DesignSteps designs={designs} setDesigns={setDesigns} onBack={() => setStep(1)} onDone={goArrange} onAuto={camriBuild} baseKey={layouts[0]} baseName={styles.find((x) => x.key === layouts[0])?.name} />
            {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="mt-2 text-sm text-ink-soft underline">Back to my site</button>}
          </div>
        )}
        {step === 3 && (
          <div>
            <div className="sticky top-0 z-20 -mx-2 bg-[#F6F1EA]/95 px-2 pb-3 pt-2 backdrop-blur">
              <div className="flex h-16 items-center gap-3">
                <h3 className="font-fraunces text-5xl tracking-tight text-ink">Arrange</h3>
              </div>
              <div className="mt-3"><Meter at={DESIGN_SECTIONS.length + 1} /></div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setStep(2)} disabled={busy} className="rounded-full border border-black/15 bg-white px-4 py-1.5 text-sm text-ink disabled:opacity-50">← Back</button>
                <button type="button" onClick={finish} disabled={busy} className="rounded-full bg-twilight px-5 py-1.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">{busy ? 'Building your site…' : 'Build my site →'}</button>
              </div>
            </div>
            <ArrangeStep struct={struct} setStruct={setStruct} links={ls} setLinks={setLs} thumbs={thumbsOf(designs)} heroSrc={layouts[0] ? '/layouts/' + layouts[0] + '.png' : undefined} heroName={styles.find((x) => x.key === layouts[0])?.name} heroList={hl.map((k) => ({ key: k, name: styles.find((x) => x.key === k)?.name ?? k }))} heroActive={layouts[0]} onHero={(k) => { setHeroList(hl); setLayouts([k, ...layouts.filter((x) => x !== k)]) }} secAlts={altsOf(designs)} designs={designs} setDesigns={setDesigns} photoDesigns={PHOTO_DESIGNS as unknown as { key: string; name: string }[]} />
          </div>
        )}
      </div>

    </div>
  )
}

export default function CamriSetup(props: Parameters<typeof CamriSetupInner>[0]) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#F6F1EA] px-6 pb-16 md:px-12">
      <div className="mx-auto flex max-w-[1400px] items-center justify-end py-4">
        <a href="/dashboard" onClick={(e) => { e.preventDefault(); setSaved(true); setTimeout(() => { window.location.href = '/dashboard' }, 700) }} className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-5 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-twilight">
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-twilight" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" /></svg>
          {saved ? 'Progress saved' : 'Save & exit'}
        </a>
      </div>
      <CamriSetupInner {...props} />
    </div>
  )
}

const DESIGN_SECTIONS: { k: string; title: string; rows: string[] }[] = [
  { k: 'nav', title: 'Explore section', rows: ['Explore section designs'] },
  { k: 'about', title: 'About', rows: ['Page designs', 'Section designs'] },
  { k: 'galleries', title: 'Galleries', rows: ['Galleries main page designs', 'Photo display designs (inside a gallery)', 'Section designs'] },
  { k: 'testimonials', title: 'Testimonials', rows: ['Section designs'] },
  { k: 'pricing', title: 'Pricing', rows: ['Page designs', 'Section designs'] },
  { k: 'faq', title: 'FAQ', rows: ['Section designs'] },
  { k: 'blog', title: 'Blog', rows: ['Blog main page designs', 'Post designs (inside a post)'] },
  { k: 'social', title: 'Social links', rows: ['Section designs'] },
  { k: 'contact', title: 'Booking button', rows: ['Section designs'] },
  { k: 'book', title: 'Booking page', rows: ['With the calendar', 'Without the calendar'] },
]

const DESIGN_LABELS: Record<string, string> = {
  nav: 'Explore section', galleries: 'Galleries page', photos: 'Photo display', galleries_section: 'Galleries section', book: 'Booking page',
  testimonials: 'Testimonials', about_page: 'About page', about_section: 'About section', pricing_page: 'Pricing page', pricing_section: 'Pricing section',
  social: 'Social links', faq: 'FAQ', contact: 'Booking button', blog_list: 'Blog page', blog_post: 'Blog post',
}

const SEC_INTRO: Record<string, string> = {
  nav: 'Three picture boxes under your hero that send visitors to Galleries, About and Booking.',
  about: 'Tells visitors who you are. Use a full About page, a short section on your home page, or both.',
  galleries: 'Shows off your work: a page of gallery covers, how photos look inside a gallery, and a section for your home page.',
  testimonials: 'Shows what happy clients say about you. A section you can place on any page.',
  pricing: 'Lets people know what to expect before they ask. A full page, a section, or both.',
  faq: 'Answers the questions clients always ask, like how far ahead to book.',
  blog: 'Where you share stories and tips. Pick how the list of posts and each post look.',
  social: 'A small strip that links to your Instagram, Facebook and more.',
  contact: 'The closing strip that sends visitors to check your dates.',
  book: 'The page where couples check your dates and send you a message.',
}

const HELP: Record<string, string> = {
  nav: "These are the three picture boxes on your home page that send visitors to your Galleries, About and Booking pages. Pick the look you like best.",
  galleries: "Galleries can work three ways. The main page is a page of its own that shows all your galleries as covers. The photo display is how the pictures look after someone opens one gallery. A section is a smaller version you can place on your home page, or any page you choose, to show off a few galleries. You can use the full page, the section, or both.",
  book: "This is the page where couples check your dates and send you a message. Pick how it looks.",
  testimonials: "A section that shows what happy clients say about you. Place it on your home page or any page you choose. It doesn't need a page of its own.",
  about: "Tell people who you are. The page is your full About page. A section is a short version you can place on your home page or any page you choose.",
  pricing: "Show what you charge. The page is a full Pricing page. A section is a short version for your home page or any page you choose. You can use both.",
  social: "A small strip with links to your Instagram, Facebook and more. Place it on any page you choose.",
  faq: "Answers to the questions clients always ask, like how far ahead to book. Place it on any page you choose, often right above your booking form.",
  contact: "The booking button is the closing strip that sends visitors to check your dates. Pick the look you like best, then place it at the bottom of any page.",
  blog: "Your blog is where you share stories and tips. The main page lists all your posts, and clicking one opens that post. Pick how the list looks and how each opened post looks.",
}

const PS = [
  { q: 'Page or section?', a: 'A page is a full page of its own in your site menu. A section is a smaller block you place on your home page or any page you choose.' },
  { q: 'Can I use both?', a: 'Yes. Many photographers put a section on the home page that links to the full page.' },
]
const REC: Record<string, string> = {
  nav: "Put an Explore section right under your hero. It gives visitors three clear paths: Galleries, About and Booking. Short menus and an obvious next step are what the best photographer sites do.",
  galleries: "Group your galleries by type, like weddings and portraits, and show a few on your home page that link to the full Galleries page. Show your best work, not everything.",
  book: "Keep Booking in your menu and put a booking button on every page. A calendar lets couples check your date right away.",
  testimonials: "Put three to five short, specific testimonials on your home page, with first names. It builds trust right before they decide to book.",
  about: "Give About its own page so people can meet the person behind the camera. Show your face and let your personality come through.",
  pricing: "A pricing section on your home page is enough for most photographers. It helps the right clients inquire. A full pricing page is optional.",
  social: "A small social strip near the bottom of the page is plenty.",
  faq: "Put your FAQ just above your booking button to answer the last questions before someone inquires.",
  contact: "End every page with a booking button. It is the one next step you always want, so make it easy to find.",
  blog: "A blog is optional. Only add it if you will keep posting. Posts about venues and places can help local search.",
}
const qaFor = (k: string) => [{ q: 'What is this?', a: HELP[k] ?? '' }, ...(REC[k] ? [{ q: 'What do you recommend?', a: REC[k] }] : []), ...(k === 'about' ? PS.slice(0, 1) : ['galleries', 'pricing'].includes(k) ? PS : [])]

const PHOTO_DESIGNS = ['lark', 'wren', 'finch', 'heron', 'swift', 'plover', 'egret', 'kestrel', 'osprey', 'sparrow'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))

const SOCIAL_DESIGNS = ['coral', 'reef', 'ember', 'dune', 'tide'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))
const FAQ_DESIGNS = ['sage', 'basil', 'thyme', 'mint', 'dill'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))
const CONTACT_DESIGNS = [{ key: 'center', name: 'Centered' }, { key: 'split', name: 'Split' }, { key: 'bar', name: 'Slim bar' }, { key: 'framed', name: 'Framed' }, { key: 'photo', name: 'Photo' }, { key: 'duo', name: 'Duo' }]

const ABOUT_PAGE = ['lyra', 'vega', 'orion', 'cygnus', 'draco', 'aries', 'libra', 'pavo', 'lynx', 'hydra'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))
const ABOUT_SEC = ['saffron', 'cumin', 'clove', 'anise', 'fennel'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))

const TESTI_DESIGNS = ['linen', 'velvet', 'silk', 'satin', 'tweed', 'mohair', 'lace', 'wool', 'cotton', 'chiffon'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))

const cap = (k: string) => k[0].toUpperCase() + k.slice(1)
const PRICE_SEC = ['capri', 'skye', 'bali', 'fiji', 'crete', 'malta', 'aruba', 'maui'].map((k) => ({ key: k, name: cap(k) }))
const PRICE_PAGE = ['corsica', 'sardinia', 'tahiti', 'santorini', 'zanzibar', 'madeira', 'mykonos', 'bermuda', 'tobago', 'lanai', 'azores', 'ibiza'].map((k) => ({ key: k, name: cap(k) }))

const BOOK_CAL_D = ['tahoe', 'como', 'garda', 'bled', 'annecy', 'tekapo'].map((k) => ({ key: k, name: cap(k) }))
const BOOK_NOCAL_D = ['louise', 'placid', 'lucerne', 'orta', 'maggiore', 'braies'].map((k) => ({ key: k, name: cap(k) }))
const GALSEC_D = ['sahara', 'gobi', 'mojave', 'atacama', 'namib', 'sonora', 'kalahari', 'thar'].map((k) => ({ key: k, name: cap(k) }))
const BLOG_LIST_D = ['danube', 'loire', 'rhine', 'seine', 'thames', 'tiber', 'volga', 'elbe', 'ebro', 'tagus', 'arno', 'rhone'].map((k) => ({ key: k, name: cap(k) }))
const BLOG_POST_D = ['eiger', 'rainier', 'denali', 'olympus', 'whitney', 'elbrus', 'etna', 'shasta', 'blanc', 'kenya', 'fuji', 'cervin'].map((k) => ({ key: k, name: cap(k) }))

const GAL_DESIGNS = ['jade', 'jasper', 'amber', 'pearl', 'ruby', 'topaz', 'garnet', 'agate', 'quartz', 'moonstone'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))

const NAV_DESIGNS = ['birch', 'willow', 'aspen', 'alder', 'maple', 'elm', 'hawthorn', 'linden', 'rowan', 'beech', 'sorrel', 'tansy'].map((k) => ({ key: k, name: k === 'hawthorn' ? 'Hawthorne' : k[0].toUpperCase() + k.slice(1) }))

const PICKERS = (): Record<string, { dir: string; field: string; ar: string; items: { key: string; name: string }[] }> => ({
  'nav|Explore section designs': { dir: 'explore', ar: '2/1', field: 'nav', items: NAV_DESIGNS },
  'galleries|Galleries main page designs': { dir: 'galleries', ar: '4/5', field: 'galleries', items: GAL_DESIGNS },
  'galleries|Photo display designs (inside a gallery)': { dir: 'photos', ar: '4/5', field: 'photos', items: PHOTO_DESIGNS },
  'social|Section designs': { dir: 'social', ar: '2/1', field: 'social', items: SOCIAL_DESIGNS },
  'faq|Section designs': { dir: 'faq', ar: '2/1', field: 'faq', items: FAQ_DESIGNS },
  'contact|Section designs': { dir: 'contact', ar: '2/1', field: 'contact', items: CONTACT_DESIGNS },
  'about|Page designs': { dir: 'about-page', ar: '4/5', field: 'about_page', items: ABOUT_PAGE },
  'about|Section designs': { dir: 'about-section', ar: '2/1', field: 'about_section', items: ABOUT_SEC },
  'testimonials|Section designs': { dir: 'testimonials', ar: '2/1', field: 'testimonials', items: TESTI_DESIGNS },
  'pricing|Page designs': { dir: 'pricing-page', ar: '3/4', field: 'pricing_page', items: PRICE_PAGE },
  'pricing|Section designs': { dir: 'pricing-section', ar: '2/1', field: 'pricing_section', items: PRICE_SEC },
  'book|With the calendar': { dir: 'booking', ar: '1/1', field: 'book', items: BOOK_CAL_D },
  'book|Without the calendar': { dir: 'booking', ar: '1/1', field: 'book', items: BOOK_NOCAL_D },
  'galleries|Section designs': { dir: 'galleries-section', ar: '2/1', field: 'galleries_section', items: GALSEC_D },
  'blog|Blog main page designs': { dir: 'blog-list', ar: '4/3', field: 'blog_list', items: BLOG_LIST_D },
  'blog|Post designs (inside a post)': { dir: 'blog-post', ar: '3/4', field: 'blog_post', items: BLOG_POST_D },
})

const ROW_TITLE: Record<string, string> = {
  'Explore section designs': 'How should your Explore section look?',
  'Galleries main page designs': 'How should your Galleries page look?',
  'Photo display designs (inside a gallery)': 'How should the photos look once someone opens a gallery?',
  'Section designs': 'How should the section look?',
  'Page designs': 'How should the page look?',
  'Blog main page designs': 'How should your Blog page look?',
  'Post designs (inside a post)': 'How should each blog post look?',
}
const rowKind = (r: string) => (/photo display/i.test(r) ? 'always' : /^section designs$/i.test(r) ? 'section' : 'page')
const MODES = [
  { k: 'page', t: 'A full page', d: 'Visitors click it in your menu and land on a page of its own.' },
  { k: 'section', t: 'A section on a page', d: 'A smaller block shown on your home page or any page you choose.' },
  { k: 'both', t: 'Both', d: 'A block on a page that also links to the full page.' },
]

const BLOG_MODES = [
  { k: 'page', t: 'Yes, add a blog', d: 'A Blog page in your menu where your posts live.' },
  { k: 'none', t: 'No blog for now', d: 'You can turn it on later whenever you want.' },
]

type PickT = { title: string; row: string; name: string; src: string; ar: string; field: string }
function planOf(designs: Record<string, string>) {
  const PK = PICKERS() as unknown as Record<string, { dir: string; ar: string; field: string; items: { key: string; name: string }[] }>
  const home: (PickT & { k: string })[] = []
  const pages: { k: string; title: string; picks: PickT[] }[] = []
  DESIGN_SECTIONS.forEach((s) => {
    const md = designs[s.k + '_mode'] || ''
    const moded = ['galleries', 'about', 'pricing', 'blog'].includes(s.k)
    if (md === 'none') return
    if (moded && !md) return
    s.rows.forEach((row) => {
      const kd = rowKind(row)
      if (moded && !(kd === 'always' || (kd === 'page' ? md !== 'section' : md !== 'page'))) return
      const pk = PK[s.k + '|' + row]
      const it = pk ? pk.items.find((d) => d.key === designs[pk.field]) : undefined
      if (!pk || !it) return
      if (pk.field === 'photos') return
      const t = { title: s.title, row, name: it.name, src: '/' + pk.dir + '/' + it.key + '.png', ar: pk.ar, field: pk.field }
      const toPage = moded ? kd === 'page' || (kd === 'always' && md !== 'section') : s.k === 'book' || s.k === 'booking'
      if (toPage) {
        let pg = pages.find((q) => q.k === s.k)
        if (!pg) { pg = { k: s.k, title: s.title, picks: [] }; pages.push(pg) }
        pg.picks.push(t)
      } else home.push({ ...t, k: s.k })
    })
  })
  return { home, pages }
}

function altsOf(designs: Record<string, string>) {
  const PK = PICKERS() as unknown as Record<string, { dir: string; ar: string; field: string; items: { key: string; name: string }[] }>
  const out: Record<string, { field: string; keys: string[]; active: string }> = {}
  const pickOf = (s: (typeof DESIGN_SECTIONS)[number], pred: (kd: string) => boolean) => {
    for (const row of s.rows) {
      if (!pred(String(rowKind(row)))) continue
      const pk = PK[s.k + '|' + row]
      const it = pk ? pk.items.find((d) => d.key === designs[pk.field]) : undefined
      if (pk && it && pk.field !== 'photos') return { field: pk.field, keys: (designs[pk.field + '_alts'] || '').split(',').filter(Boolean), active: it.key }
    }
    return undefined
  }
  DESIGN_SECTIONS.forEach((s) => {
    if (designs[s.k + '_mode'] === 'none') return
    const pg = pickOf(s, (kd) => kd !== 'section')
    const sc = pickOf(s, (kd) => kd === 'section')
    if (s.k === 'galleries') { if (pg) out.portfolio = pg; if (sc) out.galsec = sc }
    else if (s.k === 'pricing') { if (pg) out.investment = pg; if (sc) out.pricesec = sc }
    else if (s.k === 'about') { if (pg) out.aboutpage = pg; if (sc) out.about = sc; else if (pg) out.about = pg }
    else { const f = pickOf(s, () => true); if (f) out[s.k === 'nav' ? 'explore' : s.k] = f }
  })
  return out
}

function thumbsOf(designs: Record<string, string>) {
  const PK = PICKERS() as unknown as Record<string, { dir: string; ar: string; field: string; items: { key: string; name: string }[] }>
  const out: Record<string, { src: string; ar: string }> = {}
  const pickOf = (s: (typeof DESIGN_SECTIONS)[number], pred: (kd: string) => boolean) => {
    for (const row of s.rows) {
      if (!pred(String(rowKind(row)))) continue
      const pk = PK[s.k + '|' + row]
      const it = pk ? pk.items.find((d) => d.key === designs[pk.field]) : undefined
      if (pk && it) return { src: '/' + pk.dir + '/' + it.key + '.png', ar: pk.ar }
    }
    return undefined
  }
  DESIGN_SECTIONS.forEach((s) => {
    if (designs[s.k + '_mode'] === 'none') return
    const pg = pickOf(s, (kd) => kd !== 'section')
    const sc = pickOf(s, (kd) => kd === 'section')
    if (s.k === 'galleries') { if (pg) out.portfolio = pg; if (sc) out.galsec = sc }
    else if (s.k === 'pricing') { if (pg) out.investment = pg; if (sc) out.pricesec = sc }
    else if (s.k === 'about') { if (pg) out.aboutpage = pg; if (sc) out.about = sc; else if (pg) out.about = pg }
    else { const f = pickOf(s, () => true); if (f) out[s.k === 'nav' ? 'explore' : s.k] = f }
  })
  return out
}

function Meter({ at }: { at: number }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: DESIGN_SECTIONS.length + 1 }).map((_, n) => (
        <span key={n} className={'h-1.5 flex-1 rounded-full ' + (n <= at ? 'bg-twilight' : 'bg-black/10')} />
      ))}
    </div>
  )
}

function ModeIcon({ kind }: { kind: string }) {
  const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const }
  return (
    <svg viewBox="0 0 40 28" className="h-7 w-10" aria-hidden="true">
      {kind === 'section' && (<><rect x="1" y="1" width="38" height="26" rx="3" {...c} /><line x1="5" y1="6" x2="35" y2="6" {...c} /><rect x="5" y="10" width="30" height="8" rx="1.5" fill="currentColor" opacity="0.8" /><line x1="5" y1="22" x2="26" y2="22" {...c} /></>)}
      {kind === 'page' && (<><rect x="1" y="1" width="38" height="26" rx="3" {...c} /><line x1="6" y1="6" x2="10" y2="6" {...c} /><line x1="14" y1="6" x2="18" y2="6" {...c} /><line x1="22" y1="6" x2="26" y2="6" {...c} /><line x1="6" y1="12" x2="34" y2="12" {...c} /><line x1="6" y1="16" x2="30" y2="16" {...c} /><line x1="6" y1="20" x2="24" y2="20" {...c} /></>)}
      {kind === 'both' && (<><rect x="1" y="1" width="16" height="26" rx="2.5" {...c} /><rect x="4" y="9" width="10" height="7" rx="1" fill="currentColor" opacity="0.8" /><line x1="18.5" y1="14" x2="21.5" y2="14" {...c} /><rect x="23" y="1" width="16" height="26" rx="2.5" {...c} /><line x1="26" y1="8" x2="36" y2="8" {...c} /><line x1="26" y1="13" x2="34" y2="13" {...c} /><line x1="26" y1="18" x2="31" y2="18" {...c} /></>)}
      {kind === 'none' && (<><rect x="1" y="1" width="38" height="26" rx="3" {...c} /><line x1="8" y1="21" x2="32" y2="7" {...c} /></>)}
      {kind === 'blog' && (<><rect x="1" y="1" width="38" height="26" rx="3" {...c} /><rect x="5" y="5" width="13" height="9" rx="1" {...c} /><rect x="22" y="5" width="13" height="9" rx="1" {...c} /><line x1="5" y1="19" x2="18" y2="19" {...c} /><line x1="22" y1="19" x2="35" y2="19" {...c} /></>)}
    </svg>
  )
}

function ModePreview({ title, mode }: { title: string; mode: string }) {
  const on = mode === 'section' || mode === 'both'
  const inMenu = mode === 'page' || mode === 'both'
  const others = ['Home', 'Galleries', 'About', 'Pricing'].filter((x) => x !== title && x !== 'Home').slice(0, 2)
  const menu = ['Home', ...others, ...(inMenu ? [title] : []), 'Booking']
  return (
    <div className="w-full max-w-[280px] overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="flex items-center gap-1 border-b border-black/10 bg-[#EFE6DB] px-2.5 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-black/20" /><span className="h-1.5 w-1.5 rounded-full bg-black/20" /><span className="h-1.5 w-1.5 rounded-full bg-black/20" />
        <span className="ml-2 text-[10px] text-ink-soft">Your website</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 px-3 pt-2 text-[10px] uppercase tracking-wider text-ink-soft">
        {menu.map((m) => <span key={m} className={m === title ? 'font-semibold text-twilight underline underline-offset-2' : ''}>{m}</span>)}
      </div>
      <div className="space-y-1.5 px-3 pb-3 pt-2">
        <div className="h-9 rounded bg-black/10" />
        {on ? (
          <div className="flex h-9 items-center justify-center rounded border-2 border-dashed border-twilight bg-twilight/10 text-[11px] font-medium text-twilight">{title} block</div>
        ) : (
          <div className="h-3 rounded bg-black/5" />
        )}
        <div className="h-3 w-2/3 rounded bg-black/5" />
      </div>
    </div>
  )
}

function DesignSteps({ designs, setDesigns, onBack, onDone, onAuto, baseKey, baseName }: { designs: Record<string, string>; setDesigns: (d: Record<string, string>) => void; onBack: () => void; onDone: () => void; onAuto: () => void; baseKey?: string; baseName?: string }) {
  type Pk = { dir: string; ar: string; field: string; items: { key: string; name: string }[] }
  const PK = PICKERS() as unknown as Record<string, Pk>
  const [step, setStep] = useState<number>(() => {
    try { const v = Number(window.localStorage.getItem('camriDsStep')); if (Number.isInteger(v) && v >= 0 && v < DESIGN_SECTIONS.length) return v } catch {}
    return 0
  })
  usePersist(() => { try { window.localStorage.setItem('camriDsStep', String(step)) } catch {} }, [step])
  const [zoom, setZoom] = useState<string | null>(null)
  const [ask, setAsk] = useState(false)
  const [ans, setAns] = useState<string | null>(null)
  const [showPlan, setShowPlan] = useState(false)
  const [view, setView] = useState<'pages' | 'sections'>('pages')
  const [pend, setPend] = useState<{ pk: Pk; key: string; row: string } | null>(null)
  const total = DESIGN_SECTIONS.length
  const sec = DESIGN_SECTIONS[step]
  const MODED = ['galleries', 'about', 'pricing', 'blog']
  const hasMode = MODED.includes(sec.k)
  const mode = designs[sec.k + '_mode'] || ''
  const T = sec.title.toLowerCase()
  const modeOpts: { k: string; t: string }[] = sec.k === 'blog'
    ? [{ k: 'page', t: 'Add a blog' }, { k: 'none', t: 'No blog' }]
    : [{ k: 'section', t: 'Section' }, { k: 'page', t: 'Full page' }, { k: 'both', t: 'Both' }, { k: 'none', t: 'Off' }]
  const rows = sec.rows.filter((row) => {
    if (PK[sec.k + '|' + row]?.field === 'photos') return false
    if (mode === 'none' && sec.k !== 'blog') return false
    if (hasMode && sec.k !== 'blog') { const kd0 = rowKind(row); if ((kd0 === 'page' && mode === 'section') || (kd0 === 'section' && mode === 'page')) return false }
    return true
  })
  const rowsOrdered = hasMode && sec.k !== 'blog' ? [...rows].sort((a, b) => (rowKind(a) === 'section' ? 0 : 1) - (rowKind(b) === 'section' ? 0 : 1)) : rows
  const plan = planOf(designs)
  const secs = [
    ...plan.home.map((p) => ({ k: p.k, row: p.row, title: p.title, name: p.name, src: p.src, ar: p.ar, field: p.field })),
  ]
  const picker = (field: string) => {
    const alts = (designs[field + '_alts'] || designs[field] || '').split(',').filter(Boolean)
    if (alts.length < 2) return null
    return (
      <div className="flex items-center gap-1.5 px-2 pb-2">
        {alts.map((k, i) => (
          <button key={k} type="button" onClick={() => setDesigns({ ...designs, [field]: k })} className={'h-6 w-6 rounded-full text-xs transition ' + (designs[field] === k ? 'bg-twilight font-medium text-white' : 'border border-black/15 bg-white text-ink hover:border-twilight')}>{i + 1}</button>
        ))}
      </div>
    )
  }
  const pickDesign = (pk: Pk, key: string, row: string) => {
    const have = (designs[pk.field + '_alts'] || designs[pk.field] || '').split(',').filter(Boolean)
    if (key && !have.includes(key) && have.length >= 3) return
    const alts = !key ? [] : have.includes(key) ? have.filter((x) => x !== key) : [...have, key]
    const added = !!key && alts.includes(key)
    const nd: Record<string, string> = { ...designs, [pk.field]: alts.includes(designs[pk.field]) ? designs[pk.field] : (alts[0] ?? ''), [pk.field + '_alts']: alts.join(',') }
    if (added && sec.k === 'blog' && mode !== 'none') nd.blog_mode = 'page'
    if (added && MODED.includes(sec.k) && sec.k !== 'blog') {
      const kd = rowKind(row)
      const cur = designs[sec.k + '_mode'] || ''
      if (kd === 'page') nd[sec.k + '_mode'] = cur === 'section' || cur === 'both' ? 'both' : 'page'
      else if (kd === 'section') nd[sec.k + '_mode'] = cur === 'page' || cur === 'both' ? 'both' : 'section'
    }
    setDesigns(nd)
  }
  const tryPick = (pk: Pk, key: string, row: string) => {
    const kd = rowKind(row)
    const clash = !!key && !(designs[pk.field + '_alts'] || designs[pk.field] || '').split(',').includes(key) && ['galleries', 'pricing', 'about'].includes(sec.k) && ((kd === 'page' && mode === 'section') || (kd === 'section' && mode === 'page'))
    if (clash) setPend({ pk, key, row })
    else pickDesign(pk, key, row)
  }
  const go = (n: number) => { if (n < 0) return; setStep(n); setAsk(false); setAns(null); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const btnPrimary = 'rounded-full bg-twilight px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
  return (
    <div>
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        {zoom && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt="" className="max-h-[90vh] max-w-[95vw] rounded-lg" />
          </div>
        )}
        {pend && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setPend(null)}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <p className="font-fraunces text-xl text-ink">Switch to both?</p>
              <p className="mt-2 text-sm text-ink-soft">{'You chose ' + (mode === 'section' ? 'a section on a page' : 'a full page') + ' for ' + sec.title + '. To use this design, switch to both a full page and a section on a page.'}</p>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => { pickDesign(pend.pk, pend.key, pend.row); setPend(null) }} className={btnPrimary}>Yes, switch to both</button>
                <button type="button" onClick={() => setPend(null)} className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm text-ink">No, keep it</button>
              </div>
            </div>
          </div>
        )}
        <div className="sticky top-0 z-20 -mx-2 bg-[#F6F1EA]/95 px-2 pb-3 pt-2 backdrop-blur">
          <div className="flex h-16 items-center gap-3">
            <h3 className="font-fraunces text-5xl tracking-tight text-ink">{sec.title}</h3>
          </div>
          <div className="mt-3"><Meter at={step + 1} /></div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap gap-2">
              {hasMode && modeOpts.map((m) => (
                <button key={m.k} type="button" onClick={() => setDesigns({ ...designs, [sec.k + '_mode']: m.k })} className={'rounded-full px-5 py-1.5 text-sm transition ' + (mode === m.k ? 'bg-twilight font-medium text-white hover:opacity-90' : 'border border-black/15 bg-white text-ink hover:border-twilight')}>{m.t}</button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => (step > 0 ? go(step - 1) : onBack())} className="rounded-full border border-black/15 bg-white px-4 py-1.5 text-sm text-ink">← Back</button>
            {step < total - 1 ? (
              <button type="button" onClick={() => go(step + 1)} className="rounded-full bg-twilight px-5 py-1.5 text-sm font-medium text-white transition hover:opacity-90">{`Next: ${DESIGN_SECTIONS[step + 1].title} →`}</button>
            ) : (
              <button type="button" onClick={onDone} className="rounded-full bg-twilight px-5 py-1.5 text-sm font-medium text-white transition hover:opacity-90">Arrange my site →</button>
            )}
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/camri/12_open_arms.png" alt="" className="h-24 w-auto shrink-0" />
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-[#EBDDCF] px-5 py-3">
            <p className="font-fraunces text-lg leading-snug text-ink">{'We are building your site one section at a time. Now: ' + sec.title + '. ' + (SEC_INTRO[sec.k] ?? '')}</p>
            <p className="mt-1.5 text-sm text-ink-soft">{'Pick up to three designs you love. Tap 1, 2, 3 under "Your site so far" to swap between them. ' + (step < total - 1 ? 'Next up: ' + DESIGN_SECTIONS[step + 1].title + '.' : 'Next, we arrange your site.')}</p>
          </div>
        </div>
        {rowsOrdered.map((row, ri) => {
          const pk = PK[sec.k + '|' + row]
          return (
            <div key={row} className="mt-8 rounded-2xl border border-black/10 bg-white/60 p-5">
              {hasMode && sec.k !== 'blog' && rowKind(row) !== 'always' ? (
                <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-ink-soft"><span className="rounded-full bg-twilight/10 px-2.5 py-1 font-medium text-twilight">{rowKind(row) === 'section' ? 'Home page block' : 'Full page'}</span><span>Pick up to 3</span></p>
              ) : (
                <p className="text-xs uppercase tracking-wider text-ink-soft">Choice {ri + 1}</p>
              )}
              <p className="mt-1 font-fraunces text-xl text-ink">{ROW_TITLE[row] ?? row}</p>
              {pk ? (
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                  {pk.items.map((d) => {
                    const picks = (designs[pk.field + '_alts'] || designs[pk.field] || '').split(',').filter(Boolean)
                    const on = picks.includes(d.key)
                    return (
                      <button key={d.key} type="button" className="text-left" onClick={() => tryPick(pk, d.key, row)}>
                        <p className="mb-1.5 text-xs font-medium text-ink">{d.name}</p>
                        <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: pk.ar }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={'/' + pk.dir + '/' + d.key + '.png'} alt="" className={'h-full w-full rounded-lg border-2 object-cover object-top ' + (on ? 'border-twilight ring-2 ring-twilight' : 'border-transparent')} />
                          {on && <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-twilight text-xs font-medium text-white">{picks.indexOf(d.key) + 1}</span>}
                          <span role="button" aria-label="Zoom" onClick={(e) => { e.stopPropagation(); setZoom('/' + pk.dir + '/' + d.key + '.png') }} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white">⤢</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex aspect-[5/4] items-center justify-center rounded-lg border border-dashed border-black/20 bg-white/50 text-xs text-ink-soft">Design coming soon</div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

      </div>

      <aside className="hidden lg:block lg:pt-[84px]">
        <div className="sticky top-6 max-h-[90vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-ink-soft">Your site so far</p>
            <div className="inline-flex rounded-full border border-black/10 bg-white p-0.5">
              {([['pages', 'Pages'], ['sections', 'Sections']] as const).map(([k, t]) => (
                <button key={k} type="button" onClick={() => setView(k)} className={'rounded-full px-3 py-1 text-xs transition ' + (view === k ? 'bg-twilight text-white' : 'text-ink hover:bg-black/5')}>{t}</button>
              ))}
            </div>
          </div>
          <div className="mt-3">
            {view === 'pages' && (<>
            <div className="mx-auto w-[72%] overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
              <div className="flex items-center gap-1 border-b border-black/10 bg-[#EFE7DC] px-2 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-black/25" /><span className="h-1.5 w-1.5 rounded-full bg-black/25" /><span className="h-1.5 w-1.5 rounded-full bg-black/25" />
                <span className="ml-2 text-[10px] text-ink-soft">Home</span>
              </div>
              {baseKey ? (
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={'/layouts/' + baseKey + '.png'} alt="" className="w-full" />
                  <p className="px-2 py-1 text-[10px] text-ink-soft">Layout 1{baseName ? ' · ' + baseName : ''}</p>
                </div>
              ) : (
                <div className="h-16 bg-[#F6F1EA]" />
              )}
            </div>
            {plan.pages.map((pg) => (
              <div key={pg.k}>
                <div className="flex h-7 flex-col items-center justify-center gap-0.5">
                  <span className="h-1 w-0.5 rounded-full bg-black/30" /><span className="h-1 w-0.5 rounded-full bg-black/30" /><span className="h-1 w-0.5 rounded-full bg-black/30" />
                </div>
                <div className="mx-auto w-[72%] overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                  <div className="flex items-center gap-1 border-b border-black/10 bg-[#EFE7DC] px-2 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-black/25" /><span className="h-1.5 w-1.5 rounded-full bg-black/25" /><span className="h-1.5 w-1.5 rounded-full bg-black/25" />
                    <span className="ml-2 text-[10px] text-ink-soft">{pg.title}</span>
                  </div>
                  {pg.picks.length > 0 ? (
                    <>
                    <button type="button" onClick={() => go(DESIGN_SECTIONS.findIndex((x) => x.k === pg.k))} className="block w-full text-left">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pg.picks[0].src} alt="" className="w-full object-cover object-top" style={{ aspectRatio: pg.picks[0].ar }} />
                      <p className="px-2 py-1 text-[10px] text-ink-soft">{pg.picks[0].name}</p>
                    </button>
                    {picker(pg.picks[0].field)}
                    </>
                  ) : (
                    <div className="space-y-1.5 bg-[#FBF8F4] p-2.5">
                      <div className="h-1.5 w-2/3 rounded bg-black/10" />
                      <div className="h-1.5 w-1/2 rounded bg-black/10" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            </>)}
            {view === 'sections' && (<>
            {secs.length === 0 ? (
              <p className="text-xs text-ink-soft">The looks you pick show up here.</p>
            ) : (
              <div className="space-y-3">
                {secs.map((p) => (
                  <div key={p.k + p.row} className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
                    <button type="button" onClick={() => go(DESIGN_SECTIONS.findIndex((x) => x.k === p.k))} className="block w-full text-left">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.src} alt="" className="w-full object-cover object-top" style={{ aspectRatio: p.ar }} />
                      <p className="truncate px-2 py-1.5 text-[11px] text-ink-soft">{p.title} · {p.name}</p>
                    </button>
                    {picker(p.field)}
                  </div>
                ))}
              </div>
            )}
            </>)}
          </div>
        </div>
      </aside>
    </div>
    </div>
  )
}
