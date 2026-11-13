'use client'

import { useState } from 'react'

export type Kit = {
  done: boolean
  layouts: string[]
  palettes: { name: string; accent: string; bg: string; text: string }[]
  fonts: string[]
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
  "Which pages do you want? Home and Booking are always on. Is there anything I'm missing? Tell me below.",
  'Now colors. Pick up to three schemes you like. The first one is your starting scheme, and you can fine-tune it.',
  'Last one: fonts. Pick up to three pairings you love. The first one is your starting pair.',
]

function toggle(list: string[], v: string, max: number) {
  if (list.includes(v)) return list.filter((x) => x !== v)
  if (list.length >= max) return list
  return [...list, v]
}

export default function CamriSetup({ styles, palettes, typeSets, pages, fam, onFinish, onSkip }: {
  styles: Style[]; palettes: Pal[]; typeSets: TypeSet[]; pages: PageDef[]
  fam: (k: string) => string
  onFinish: (kit: Kit) => Promise<void>
  onSkip: () => void
}) {
  const [step, setStep] = useState(0)
  const [layouts, setLayouts] = useState<string[]>([])
  const [pals, setPals] = useState<string[]>([])
  const [tweak, setTweak] = useState<{ accent: string; bg: string; text: string } | null>(null)
  const [fonts, setFonts] = useState<string[]>([])
  const [pg, setPg] = useState<string[]>(pages.filter((p) => p.locked).map((p) => p.k))
  const [extra, setExtra] = useState('')
  const [busy, setBusy] = useState(false)

  const base = pals.length ? palettes.find((p) => p.name === pals[0]) ?? null : null
  const ring = 'border-twilight ring-2 ring-twilight'
  const badge = (n: number) => <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-twilight text-xs font-semibold text-white">{n}</span>
  const canGo = step === 1 ? layouts.length > 0 : step === 3 ? pals.length > 0 : step === 4 ? fonts.length > 0 : true

  async function finish() {
    setBusy(true)
    const list: Pal[] = []
    if (tweak) list.push({ name: 'My colors', ...tweak })
    pals.forEach((n) => { const p = palettes.find((x) => x.name === n); if (p) list.push(p) })
    await onFinish({ done: true, layouts, palettes: list, fonts, pages: pg, extra_pages: extra.trim().slice(0, 300), themes: [] })
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step === 0 ? '/camri/01_waving.png' : '/camri/13_face_avatar.png'} alt="" className={(step === 0 ? 'h-32' : 'h-14') + ' w-auto shrink-0'} />
        <div className="rounded-2xl rounded-tl-sm bg-[#EBDDCF] px-5 py-4 text-ink">
          {step > 0 && <p className="text-xs uppercase tracking-wider text-ink-soft">Step {step} of 4</p>}
          <p className="mt-1 font-fraunces text-xl leading-snug">{LINES[step]}</p>
        </div>
      </div>

      <div className="mt-6">
        {step === 0 && (
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => setStep(1)} className="rounded-full bg-twilight px-7 py-3 text-sm font-medium text-white transition hover:opacity-90">Let&apos;s start</button>
            
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {styles.map((s) => {
              const i = layouts.indexOf(s.key)
              return (
                <button key={s.key} type="button" onClick={() => setLayouts((l) => toggle(l, s.key, 5))} className={'relative rounded-xl border bg-white/80 p-3 text-left transition hover:bg-white ' + (i >= 0 ? ring : 'border-black/10')}>
                  <div className="h-20 rounded-lg border border-black/10 p-2" style={{ background: s.bg }}>
                    <div className="h-2.5 w-2/3 rounded" style={{ background: s.text }} />
                    <div className="mt-2 h-1.5 w-1/2 rounded opacity-50" style={{ background: s.text }} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">{s.name}</p>
                  <p className="text-xs text-ink-soft">{s.blurb}</p>
                  {i >= 0 && badge(i + 1)}
                </button>
              )
            })}
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="grid gap-2 sm:grid-cols-2">
              {pages.map((p) => {
                const on = pg.includes(p.k)
                return (
                  <label key={p.k} className={'flex cursor-pointer items-center gap-3 rounded-xl border bg-white/80 px-4 py-3 ' + (on ? ring : 'border-black/10')}>
                    <input type="checkbox" checked={on} disabled={!!p.locked} onChange={() => setPg((l) => (l.includes(p.k) ? l.filter((x) => x !== p.k) : [...l, p.k]))} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">{p.label}{p.soon && <span className="ml-2 text-xs font-normal text-ink-soft">coming soon</span>}</span>
                      <span className="block text-xs text-ink-soft">{p.blurb}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <input value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={300} placeholder="Anything I'm missing? (for example: testimonials, process, contact)" className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-twilight" />
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {palettes.map((p) => {
                const i = pals.indexOf(p.name)
                return (
                  <button key={p.name} type="button" onClick={() => setPals((l) => toggle(l, p.name, 3))} className={'relative rounded-xl border bg-white/80 p-3 text-left transition hover:bg-white ' + (i >= 0 ? ring : 'border-black/10')}>
                    <div className="flex h-14 overflow-hidden rounded-lg border border-black/10">
                      <span className="flex-1" style={{ background: p.bg }} />
                      <span className="flex-1" style={{ background: p.accent }} />
                      <span className="flex-1" style={{ background: p.text }} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-ink">{p.name}</p>
                    {i >= 0 && badge(i + 1)}
                  </button>
                )
              })}
            </div>
            {base && (
              <div className="mt-5 rounded-xl border border-black/10 bg-white/80 p-4">
                <p className="text-sm font-medium text-ink">Fine-tune your first scheme ({base.name})</p>
                <div className="mt-3 flex flex-wrap gap-5">
                  {([['accent', 'Accent'], ['bg', 'Background'], ['text', 'Main text']] as const).map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm text-ink">
                      <input type="color" value={(tweak ?? base)[k]} onChange={(e) => setTweak({ accent: (tweak ?? base).accent, bg: (tweak ?? base).bg, text: (tweak ?? base).text, [k]: e.target.value })} className="h-9 w-9 cursor-pointer rounded border border-black/10 bg-transparent p-0" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {typeSets.map((t) => {
              const i = fonts.indexOf(t.key)
              return (
                <button key={t.key} type="button" onClick={() => setFonts((l) => toggle(l, t.key, 3))} className={'relative flex h-28 flex-col justify-center rounded-xl border bg-white/80 px-4 text-left transition hover:bg-white ' + (i >= 0 ? ring : 'border-black/10')}>
                  <span className="truncate text-2xl text-ink" style={{ fontFamily: fam(t.head) }}>Your Name</span>
                  <span className="mt-1 truncate text-sm text-ink-soft" style={{ fontFamily: fam(t.body) }}>Wedding photography</span>
                  <span className="mt-1 text-[11px] uppercase tracking-wider text-ink-soft">{t.name}</span>
                  {i >= 0 && badge(i + 1)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {step > 0 && (
        <div className="mt-8 flex items-center gap-4">
          <button type="button" onClick={() => setStep(step - 1)} disabled={busy} className="rounded-full border border-black/15 px-6 py-2.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50">Back</button>
          {step < 4 ? (
            <button type="button" onClick={() => setStep(step + 1)} disabled={!canGo} className="rounded-full bg-twilight px-7 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">Continue</button>
          ) : (
            <button type="button" onClick={finish} disabled={!canGo || busy} className="rounded-full bg-twilight px-7 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">{busy ? 'Building your site…' : 'Build my site'}</button>
          )}
          
        </div>
      )}
    </div>
  )
}
