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
  "This is like build-a-bear, but for your pages! Start with an empty page and add the pieces you love. Drag a section onto a page, or make it a whole page of its own. You can switch these around later, or just ask me.",
  'Now colors. Pick up to three schemes you like. The first one is your starting scheme, and you can fine-tune it.',
  'Last one: fonts. Pick up to three for your title, subtitle and paragraph. The first one you pick for each is what I start with.',
]

function toggle(list: string[], v: string, max: number) {
  if (list.includes(v)) return list.filter((x) => x !== v)
  if (list.length >= max) return list
  return [...list, v]
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
  const canGo = step === 1 ? layouts.length > 0 : step === 2 ? struct.home.length > 0 : step === 3 ? picked.length > 0 : step === 4 ? (fp.title.length > 0 && fp.subtitle.length > 0 && fp.paragraph.length > 0) : true

  async function finish() {
    setBusy(true)
    const list: Pal[] = picked
    
    
    const pagesOut = ['home', 'book', ...(struct.off.includes('galleries') ? [] : ['galleries']), ...(struct.off.includes('about') ? [] : ['about']), ...struct.extra.map((e) => e.id)]
    await onFinish({ done: true, layouts, palettes: list, fonts: [], type: fp, pages: pagesOut, extra_pages: '', themes: [] }, struct, ls, designs)
    setBusy(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] py-6">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step === 0 ? '/camri/01_waving.png' : '/camri/13_face_avatar.png'} alt="" className={(step === 0 ? 'h-32' : 'h-14') + ' w-auto shrink-0'} />
        <div className="rounded-2xl rounded-tl-sm bg-[#EBDDCF] px-5 py-4 text-ink">
          {step > 0 && <p className="text-xs uppercase tracking-wider text-ink-soft">Step {step} of 2</p>}
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

        {step === 2 && (
          <div className="space-y-16">
            <PageBuilder struct={struct} setStruct={setStruct} links={ls} setLinks={setLs} />
            <DesignPlaceholders designs={designs} setDesigns={setDesigns} />
          </div>
        )}

      </div>

      {step > 0 && (
        <div className="mt-8 flex items-center gap-4">
          <button type="button" onClick={() => setStep(step - 1)} disabled={busy} className="rounded-full border border-black/15 px-6 py-2.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50">Back</button>
          {step < 2 ? (
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
  { k: 'book', title: 'Booking page', rows: ['Page designs'] },
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

const GAL_DESIGNS = ['jade', 'jasper', 'amber', 'pearl', 'ruby', 'topaz', 'garnet', 'agate', 'quartz', 'moonstone'].map((k) => ({ key: k, name: k[0].toUpperCase() + k.slice(1) }))

const NAV_DESIGNS = ['birch', 'willow', 'aspen', 'alder', 'maple', 'elm', 'hawthorn', 'linden', 'rowan', 'beech', 'sorrel', 'tansy'].map((k) => ({ key: k, name: k === 'hawthorn' ? 'Hawthorne' : k[0].toUpperCase() + k.slice(1) }))

const PICKERS = (): Record<string, { dir: string; field: string; items: { key: string; name: string }[] }> => ({
  'nav|Explore section designs': { dir: 'explore', field: 'nav', items: NAV_DESIGNS },
  'galleries|Galleries main page designs': { dir: 'galleries', field: 'galleries', items: GAL_DESIGNS },
})

function DesignPlaceholders({ designs, setDesigns }: { designs: Record<string, string>; setDesigns: (d: Record<string, string>) => void }) {
  const [zoom, setZoom] = useState<string | null>(null)
  return (
    <div className="space-y-14">
      {zoom && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" onClick={() => setZoom(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="" className="max-h-[90vh] max-w-[95vw] rounded-lg" />
        </div>
      )}
      {DESIGN_SECTIONS.map((sec) => (
        <div key={sec.k}>
          <h3 className="font-fraunces text-2xl text-ink">{sec.title}</h3>
          {HELP[sec.k] && (
            <div className="mt-3 max-w-2xl rounded-xl border border-black/10 bg-white/70 p-4 text-sm leading-relaxed text-ink-soft">
              <span className="mr-2 text-xs font-medium uppercase tracking-wider text-twilight">Camri says</span>{HELP[sec.k]}
            </div>
          )}
          {sec.rows.map((row) => (
            <div key={row} className="mt-6">
              <p className="text-xs uppercase tracking-wider text-ink-soft">{row}</p>
              {PICKERS()[sec.k + '|' + row] ? (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                  {PICKERS()[sec.k + '|' + row].items.map((d) => {
                    const pk = PICKERS()[sec.k + '|' + row]
                    const on = designs[pk.field] === d.key
                    return (
                      <button key={d.key} type="button" className="text-left" onClick={() => setDesigns({ ...designs, [pk.field]: on ? '' : d.key })}>
                        <p className="mb-1.5 text-xs font-medium text-ink">{d.name}</p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <div className="relative">
                          <img src={'/' + pk.dir + '/' + d.key + '.png'} alt="" className={'w-full rounded-lg border-2 ' + (on ? 'border-twilight ring-2 ring-twilight' : 'border-transparent')} />
                          <span role="button" aria-label="Zoom" onClick={(e) => { e.stopPropagation(); setZoom('/' + pk.dir + '/' + d.key + '.png') }} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white">⤢</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex aspect-[5/4] items-center justify-center rounded-lg border border-dashed border-black/20 bg-white/50 text-xs text-ink-soft">Design coming soon</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
