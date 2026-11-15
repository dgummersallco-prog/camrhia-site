'use client'

import { useState } from 'react'
import PageBuilder, { type Struct, type Links, cleanStruct } from './PageBuilder'
import FontStep, { type FontPick, type FontItem } from './FontStep'

export type Kit = {
  done: boolean
  layouts: string[]
  palettes: { name: string; accent: string; bg: string; text: string }[]
  fonts: string[]
  type: FontPick
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
  'Pick up to five layouts you love. The first one you pick becomes your starting design.',
  "First, your pages. Home and Booking are always on. Choose whether to add Galleries and About, and drag the sections you want onto each page. You can switch these around later, or just ask me.",
  "Now it's build-a-bear time! Pick a look for each part of your site and watch it come together on the right. Skip any you like as they are, and you'll see everything at the end.",
  'Last one: fonts. Pick up to three for your title, subtitle and paragraph. The first one you pick for each is what I start with.',
]

function toggle(list: string[], v: string, max: number) {
  if (list.includes(v)) return list.filter((x) => x !== v)
  if (list.length >= max) return list
  return [...list, v]
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
  }
  const a = d.about_mode
  if (a === 'page') { pageOn('about'); drop('about'); n.about.unshift('about') }
  else if (a === 'section') { pageOff('about'); toHome('about') }
  const pr = d.pricing_mode
  const setPricePage = () => {
    drop('investment')
    const e = n.extra.find((q) => q.id === 'pricing')
    if (e) e.sections = ['investment']; else n.extra.push({ id: 'pricing', label: 'Pricing', sections: ['investment'] })
  }
  if (pr === 'page') { drop('pricesec'); setPricePage() }
  else if (pr === 'both') { setPricePage(); toHome('pricesec') }
  else if (pr === 'section') { n.extra = n.extra.filter((e) => e.id !== 'pricing'); drop('pricesec'); toHome('investment') }
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
  const [step, setStep] = useState(startStep ?? 0)
  const [layouts, setLayouts] = useState<string[]>(initial?.layouts ?? [])
  const [picked, setPicked] = useState<Pal[]>(initial?.palettes ?? [])
  
  const [fp, setFp] = useState<FontPick>(initial?.type ?? { title: [], subtitle: [], paragraph: [] })
  const [struct, setStruct] = useState<Struct>(cleanStruct(structure))
  const [ls, setLs] = useState<Links>(linksIn)
  const [designs, setDesigns] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  
  const ring = 'border-twilight ring-2 ring-twilight'
  const badge = (n: number) => <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-twilight text-xs font-semibold text-white">{n}</span>
  const canGo = step === 1 ? layouts.length > 0 : step === 2 ? struct.home.length > 0 : step === 3 ? true : step === 4 ? (fp.title.length > 0 && fp.subtitle.length > 0 && fp.paragraph.length > 0) : true

  async function finish() {
    setBusy(true)
    const list: Pal[] = picked
    
    
    const s2 = withModes(struct, designs)
    const pagesOut = ['home', 'book', ...(s2.off.includes('galleries') ? [] : ['galleries']), ...(s2.off.includes('about') ? [] : ['about']), ...s2.extra.map((e) => e.id)]
    await onFinish({ done: true, layouts, palettes: list, fonts: [], type: fp, pages: pagesOut, extra_pages: '', themes: [] }, s2, ls, designs)
    setBusy(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] py-6">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step === 0 ? '/camri/01_waving.png' : '/camri/13_face_avatar.png'} alt="" className={(step === 0 ? 'h-32' : 'h-14') + ' w-auto shrink-0'} />
        <div className="rounded-2xl rounded-tl-sm bg-[#EBDDCF] px-5 py-4 text-ink">
          {step > 0 && <p className="text-xs uppercase tracking-wider text-ink-soft">Step {step} of 3</p>}
          <p className="mt-1 font-fraunces text-xl leading-snug">{LINES[step]}</p>
        </div>
      </div>

      <div className="mt-6">
        {step === 0 && (
          <div className="flex flex-col gap-10">
            <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-6">
              {[['1', 'Layouts', 'Pick the looks you love'], ['2', 'Pages', 'Choose what goes on your site']].map(([n, ttl, d]) => (
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
          <div className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3">
            {styles.map((s) => {
              const i = layouts.indexOf(s.key)
              return (
                <button key={s.key} type="button" onClick={() => setLayouts((l) => toggle(l, s.key, 5))} className="relative text-left">
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
        )}

        {step === 2 && <PageBuilder struct={struct} setStruct={setStruct} links={ls} setLinks={setLs} />}
        {step === 3 && (
          <div>
            <DesignSteps designs={designs} setDesigns={setDesigns} onBack={() => setStep(2)} onBuild={finish} busy={busy} />
            {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="mt-2 text-sm text-ink-soft underline">Back to my site</button>}
          </div>
        )}

      </div>

      {step > 0 && step < 3 && (
        <div className="mt-8 flex items-center gap-4">
          <button type="button" onClick={() => setStep(step - 1)} disabled={busy} className="rounded-full border border-black/15 px-6 py-2.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50">Back</button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep(step + 1)} disabled={!canGo} className="rounded-full bg-twilight px-7 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">Continue</button>
          ) : (
            <button type="button" onClick={finish} disabled={!canGo || busy} className="rounded-full bg-twilight px-7 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">{busy ? 'Building your site…' : 'Build my site'}</button>
          )}
          {onCancel && <button type="button" onClick={onCancel} disabled={busy} className="ml-auto text-sm text-ink-soft underline">Back to my site</button>}
          
        </div>
      )}
    </div>
  )
}

export default function CamriSetup(props: Parameters<typeof CamriSetupInner>[0]) {
  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#F6F1EA] px-6 pb-16 md:px-12">
      <div className="mx-auto flex max-w-[1400px] items-center py-4">
        <a href="/dashboard" className="rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-black/5 hover:text-ink">← Dashboard</a>
      </div>
      <CamriSetupInner {...props} />
    </div>
  )
}

const DESIGN_SECTIONS: { k: string; title: string; rows: string[] }[] = [
  { k: 'nav', title: 'Explore section', rows: ['Explore section designs'] },
  { k: 'galleries', title: 'Galleries', rows: ['Galleries main page designs', 'Photo display designs (inside a gallery)', 'Section designs'] },
  { k: 'book', title: 'Booking page', rows: ['With the calendar', 'Without the calendar'] },
  { k: 'testimonials', title: 'Testimonials', rows: ['Section designs'] },
  { k: 'about', title: 'About', rows: ['Page designs', 'Section designs'] },
  { k: 'pricing', title: 'Pricing', rows: ['Page designs', 'Section designs'] },
  { k: 'social', title: 'Social links', rows: ['Section designs'] },
  { k: 'faq', title: 'FAQ', rows: ['Section designs'] },
  { k: 'blog', title: 'Blog', rows: ['Blog main page designs', 'Post designs (inside a post)'] },
]

const HELP: Record<string, string> = {
  nav: "These are the three picture boxes on your home page that send visitors to your Galleries, About and Booking pages. Pick the look you like best.",
  galleries: "Galleries can work three ways. The main page is a page of its own that shows all your galleries as covers. The photo display is how the pictures look after someone opens one gallery. A section is a smaller version you can place on your home page, or any page you choose, to show off a few galleries. You can use the full page, the section, or both.",
  book: "This is the page where couples check your dates and send you a message. Pick how it looks.",
  testimonials: "A section that shows what happy clients say about you. Place it on your home page or any page you choose. It doesn't need a page of its own.",
  about: "Tell people who you are. The page is your full About page. A section is a short version you can place on your home page or any page you choose.",
  pricing: "Show what you charge. The page is a full Pricing page. A section is a short version for your home page or any page you choose. You can use both.",
  social: "A small strip with links to your Instagram, Facebook and more. Place it on any page you choose.",
  faq: "Answers to the questions clients always ask, like how far ahead to book. Place it on any page you choose, often right above your booking form.",
  blog: "Your blog is where you share stories and tips. The main page lists all your posts, and clicking one opens that post. Pick how the list looks and how each opened post looks.",
}

const PS = [
  { q: 'Page or section?', a: 'A page is a full page of its own in your site menu. A section is a smaller block you place on your home page or any page you choose.' },
  { q: 'Can I use both?', a: 'Yes. Many photographers put a section on the home page that links to the full page.' },
]
const qaFor = (k: string) => [{ q: 'What is this?', a: HELP[k] ?? '' }, ...(k === 'about' ? PS.slice(0, 1) : ['galleries', 'pricing'].includes(k) ? PS : [])]

const PHOTO_DESIGNS = ['lark', 'wren', 'finch', 'heron', 'swift', 'plover', 'egret', 'kestrel', 'osprey', 'sparrow'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))

const SOCIAL_DESIGNS = ['coral', 'reef', 'ember', 'dune', 'tide'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))
const FAQ_DESIGNS = ['sage', 'basil', 'thyme', 'mint', 'dill'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))

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

function DesignSteps({ designs, setDesigns, onBack, onBuild, busy }: { designs: Record<string, string>; setDesigns: (d: Record<string, string>) => void; onBack: () => void; onBuild: () => void; busy: boolean }) {
  type Pk = { dir: string; ar: string; field: string; items: { key: string; name: string }[] }
  type Sec = (typeof DESIGN_SECTIONS)[number]
  const PK = PICKERS() as unknown as Record<string, Pk>
  const [step, setStep] = useState(0)
  const [zoom, setZoom] = useState<string | null>(null)
  const [ask, setAsk] = useState(false)
  const [ans, setAns] = useState<string | null>(null)
  const total = DESIGN_SECTIONS.length
  const review = step >= total
  const sec = DESIGN_SECTIONS[Math.min(step, total - 1)]
  const MODED = ['galleries', 'about', 'pricing', 'blog']
  const hasMode = MODED.includes(sec.k)
  const mode = designs[sec.k + '_mode'] || ''
  const rowsOf = (s: Sec) => {
    const md = designs[s.k + '_mode'] || ''
    return s.rows.filter((row) => {
      if (s.k === 'blog' && md === 'none') return false
      if (!MODED.includes(s.k)) return true
      if (!md) return false
      const kd = rowKind(row)
      return kd === 'always' || (kd === 'page' ? md !== 'section' : md !== 'page')
    })
  }
  const rows = rowsOf(sec)
  const picks: { s: Sec; row: string; pk: Pk; it: { key: string; name: string } }[] = []
  DESIGN_SECTIONS.forEach((s) => rowsOf(s).forEach((row) => {
    const pk = PK[s.k + '|' + row]
    const it = pk ? pk.items.find((d) => d.key === designs[pk.field]) : undefined
    if (pk && it) picks.push({ s, row, pk, it })
  }))
  const go = (n: number) => { setStep(n); setAsk(false); setAns(null); if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const btnPrimary = 'rounded-full bg-twilight px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
      <div>
        {zoom && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={zoom} alt="" className="max-h-[90vh] max-w-[95vw] rounded-lg" />
          </div>
        )}
        <p className="text-xs uppercase tracking-wider text-ink-soft">{review ? 'Last look' : `Part ${step + 1} of ${total}`}</p>
        <div className="mt-2 flex gap-1.5">
          {[...DESIGN_SECTIONS.map((x) => x.k), 'review'].map((k, n) => (
            <span key={k} className={'h-1.5 flex-1 rounded-full ' + (n <= step ? 'bg-twilight' : 'bg-black/10')} />
          ))}
        </div>

        {review ? (
          <div>
            <h3 className="mt-6 font-fraunces text-3xl text-ink">Here is your site</h3>
            <p className="mt-2 text-sm text-ink-soft">Check each part. Press Change to go back and swap one, or build it now. You can change anything later.</p>
            {DESIGN_SECTIONS.map((s, n) => {
              const its = picks.filter((p) => p.s.k === s.k)
              return (
                <div key={s.k} className="mt-4 flex items-center gap-4 rounded-2xl border border-black/10 bg-white/60 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-fraunces text-lg text-ink">{s.title}</p>
                    {its.length > 0 ? its.map((p) => <p key={p.row} className="text-sm text-ink-soft">{p.row}: {p.it.name}</p>) : <p className="text-sm text-ink-soft">Keeping the look from your layout</p>}
                  </div>
                  <div className="hidden gap-2 sm:flex">
                    {its.slice(0, 3).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.row} src={'/' + p.pk.dir + '/' + p.it.key + '.png'} alt="" className="h-14 w-auto rounded border border-black/10 object-cover object-top" />
                    ))}
                  </div>
                  <button type="button" onClick={() => go(n)} className="rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs text-ink">Change</button>
                </div>
              )
            })}
          </div>
        ) : (
          <div>
            <h3 className="mt-6 font-fraunces text-3xl text-ink">{sec.title}</h3>
            <button type="button" onClick={() => { setAsk(!ask); setAns(null) }} className="mt-2 rounded-full border border-black/15 bg-white px-3 py-1 text-xs text-ink">Ask Camri about this</button>
            {ask && (
              <div className="mt-2 max-w-xl rounded-xl border border-black/10 bg-white/80 p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  {qaFor(sec.k).map((x) => (
                    <button key={x.q} type="button" onClick={() => setAns(x.a)} className="rounded-full border border-black/15 px-3 py-1 text-xs text-ink">{x.q}</button>
                  ))}
                </div>
                {ans && <p className="mt-3 leading-relaxed text-ink-soft">{ans}</p>}
              </div>
            )}

            {hasMode && (
              <div className="mt-8 rounded-2xl border border-black/10 bg-white/60 p-5">
                <p className="text-sm font-medium text-ink">How do you want {sec.title} on your site?</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {(sec.k === 'blog' ? BLOG_MODES : MODES.filter((m) => !(sec.k === 'about' && m.k === 'both'))).map((m) => (
                    <button key={m.k} type="button" onClick={() => setDesigns({ ...designs, [sec.k + '_mode']: m.k })} className={'rounded-xl border-2 p-4 text-left ' + (mode === m.k ? 'border-twilight bg-white' : 'border-black/10 bg-white/60')}>
                      <p className="text-sm font-medium text-ink">{m.t}</p>
                      <p className="mt-1 text-xs text-ink-soft">{m.d}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {rows.map((row, ri) => {
              const pk = PK[sec.k + '|' + row]
              return (
                <div key={row} className="mt-8 rounded-2xl border border-black/10 bg-white/60 p-5">
                  <p className="text-xs uppercase tracking-wider text-ink-soft">Choice {ri + 1}</p>
                  <p className="mt-1 font-fraunces text-xl text-ink">{ROW_TITLE[row] ?? row}</p>
                  {pk ? (
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                      {pk.items.map((d) => {
                        const on = designs[pk.field] === d.key
                        return (
                          <button key={d.key} type="button" className="text-left" onClick={() => setDesigns({ ...designs, [pk.field]: on ? '' : d.key })}>
                            <p className="mb-1.5 text-xs font-medium text-ink">{d.name}</p>
                            <div className="relative overflow-hidden rounded-lg" style={{ aspectRatio: pk.ar }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={'/' + pk.dir + '/' + d.key + '.png'} alt="" className={'h-full w-full rounded-lg border-2 object-cover object-top ' + (on ? 'border-twilight ring-2 ring-twilight' : 'border-transparent')} />
                              <span role="button" aria-label="Zoom" onClick={(e) => { e.stopPropagation(); setZoom('/' + pk.dir + '/' + d.key + '.png') }} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white">⤢</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="flex aspect-[5/4] items-center justify-center rounded-lg border border-dashed border-black/20 bg-white/50 text-xs text-ink-soft">Design coming soon</div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="sticky bottom-0 z-10 mt-10 flex items-center gap-3 bg-white/80 py-4 backdrop-blur">
          <button type="button" onClick={() => (step > 0 ? go(step - 1) : onBack())} disabled={busy} className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm text-ink disabled:opacity-50">← Back</button>
          {review ? (
            <button type="button" onClick={onBuild} disabled={busy} className={btnPrimary}>{busy ? 'Building your site…' : 'Build my site'}</button>
          ) : (
            <button type="button" onClick={() => go(step + 1)} className={btnPrimary}>{step < total - 1 ? `Next: ${DESIGN_SECTIONS[step + 1].title} →` : 'See my whole site →'}</button>
          )}
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 max-h-[88vh] overflow-y-auto rounded-2xl border border-black/10 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-wider text-ink-soft">Your site so far</p>
          {picks.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">Your picks stack up here as you go.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {picks.map((p) => (
                <button key={p.row + p.s.k} type="button" onClick={() => go(DESIGN_SECTIONS.findIndex((x) => x.k === p.s.k))} className="block w-full text-left">
                  <p className="mb-1 text-[11px] text-ink-soft">{p.s.title} · {p.it.name}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={'/' + p.pk.dir + '/' + p.it.key + '.png'} alt="" className="w-full rounded border border-black/10 object-cover object-top" style={{ aspectRatio: p.pk.ar }} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
