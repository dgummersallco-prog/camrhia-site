'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { camiSite, applyPalette, CAMI_EXAMPLES, type SiteState } from '@/lib/camiSite'

type Prof = SiteState & { id: string; public_token: string | null; slug: string | null; logo_path: string | null }
type Step = 'intro' | 'style' | 'name' | 'colors' | 'photos' | 'build'
type Msg = { from: 'cami' | 'you'; text: string }

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const COLS = 'id, public_token, slug, logo_path, site_template, site_accent, site_font_pair, site_headline, site_subhead, site_settings'
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

const STYLES = [
  { key: 'airy', name: 'Light & airy', blurb: 'Bright white, lots of space.', tpl: 'minimal', pair: 'modern', bg: '#FFFFFF', text: '#2A1F24' },
  { key: 'classic', name: 'Classic & elegant', blurb: 'Timeless serif, warm cream.', tpl: 'editorial', pair: 'serif', bg: '#FAF7F2', text: '#2A1F24' },
  { key: 'romantic', name: 'Romantic', blurb: 'Soft, framed and dreamy.', tpl: 'framed', pair: 'romantic', bg: '#FBF4F1', text: '#3A2A2E' },
  { key: 'bold', name: 'Bold editorial', blurb: 'Huge headline, magazine feel.', tpl: 'magazine', pair: 'modern', bg: '#FFFFFF', text: '#1B1B1D' },
  { key: 'moody', name: 'Moody & dark', blurb: 'Dark, cinematic, dramatic.', tpl: 'editorial', pair: 'serif', bg: '#17141A', text: '#F4EEE8' },
  { key: 'clean', name: 'Clean split', blurb: 'Words on one side, photo on the other.', tpl: 'split', pair: 'modern', bg: '#F6F1EA', text: '#2A1F24' },
]
const PALETTES = [
  { name: 'Blush', accent: '#C98A8D', bg: '#FBF6F1', text: '#2A1F24' },
  { name: 'Sage', accent: '#7C8B6F', bg: '#F7F5EE', text: '#27302A' },
  { name: 'Navy & cream', accent: '#1F2D4A', bg: '#FAF7F2', text: '#1F2D4A' },
  { name: 'Terracotta', accent: '#C06A4D', bg: '#FAF4EC', text: '#3A2A22' },
  { name: 'Gold & ivory', accent: '#B08D57', bg: '#FBF8F1', text: '#2A1F24' },
  { name: 'Noir', accent: '#E6D3B3', bg: '#17141A', text: '#F4EEE8' },
]

const glass = 'rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_18px_40px_-22px_rgba(90,50,60,0.45)]'
const accentBtn = 'rounded-xl bg-[rgb(var(--scene-b,201_133_136))] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const ghostBtn = 'rounded-xl border border-white/80 bg-white/60 px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-white/80'

export default function DesignWithCami() {
  const router = useRouter()
  const [form, setForm] = useState<Prof | null>(null)
  const [history, setHistory] = useState<Prof[]>([])
  const [step, setStep] = useState<Step>('intro')
  const [previewKey, setPreviewKey] = useState(0)
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'cami', text: "Hi, I'm Cami. Tell me what to change and I'll do it. Try \"make the buttons rectangles\"." }])
  const [input, setInput] = useState('')
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) { router.push('/login'); return }
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const { data, error } = await sb.from('profiles').select(COLS).eq('id', sess.session.user.id).single()
      if (error) { setErr(error.message); return }
      const p = data as unknown as Prof
      setForm(p)
      setName(((p.site_settings?.menu?.brand as string | undefined) ?? '') || '')
    }
    load()
  }, [router])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  async function save(next: Prof) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('profiles').update({
      site_template: next.site_template ?? 'editorial',
      site_accent: next.site_accent,
      site_font_pair: next.site_font_pair ?? 'serif',
      site_headline: next.site_headline?.trim() || null,
      site_subhead: next.site_subhead?.trim() || null,
      site_settings: next.site_settings ?? {},
    }).eq('id', next.id)
    if (error) { setErr(error.message); return }
    setErr(null)
    setPreviewKey((k) => k + 1)
  }

  async function commit(fn: (n: Prof) => void) {
    if (!form) return
    const next = clone(form)
    fn(next)
    setHistory((h) => [...h, form])
    setForm(next)
    await save(next)
  }

  async function undo() {
    const prev = history[history.length - 1]
    if (!prev) return false
    setHistory((h) => h.slice(0, -1))
    setForm(prev)
    await save(prev)
    return true
  }

  async function send(text: string) {
    const t = text.trim()
    if (!t || !form) return
    setMsgs((m) => [...m, { from: 'you', text: t }])
    setInput('')
    if (/^\s*(undo|go back|revert|that was wrong|put it back)\b/i.test(t)) {
      const ok = await undo()
      setMsgs((m) => [...m, { from: 'cami', text: ok ? 'Undone.' : 'Nothing to undo yet.' }])
      return
    }
    const r = camiSite(t, form)
    if (r.changed) await commit((n) => { n.site_template = r.state.site_template; n.site_accent = r.state.site_accent; n.site_font_pair = r.state.site_font_pair; n.site_headline = r.state.site_headline; n.site_subhead = r.state.site_subhead; n.site_settings = r.state.site_settings })
    setMsgs((m) => [...m, { from: 'cami', text: r.reply }])
  }

  async function addPhotos(files: FileList | null) {
    const sb = supabase
    if (!files || !form || !sb) return
    setBusy(true)
    try {
      const cur: string[] = [...(form.site_settings?.hero?.photos ?? [])]
      for (const f of Array.from(files)) {
        if (cur.length >= 6) break
        const v = await makeVersions(f)
        const path = `${form.id}/hero_${Date.now()}_${cur.length}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
        cur.push(path)
      }
      await commit((n) => { const s = (n.site_settings = n.site_settings ?? {}); s.hero = { ...(s.hero ?? {}), photos: cur, slideshow: cur.length > 1 } })
    } catch (e) {
      setErr((e as { message?: string })?.message ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }
  async function removePhoto(path: string) {
    await commit((n) => { const s = (n.site_settings = n.site_settings ?? {}); const l = ((s.hero?.photos ?? []) as string[]).filter((p) => p !== path); s.hero = { ...(s.hero ?? {}), photos: l, slideshow: l.length > 1 } })
  }

  if (!form) {
    return (
      <div className="min-h-screen bg-paper xl:pl-60">
        <DashboardHeader active="website" />
        <main className="mx-auto max-w-3xl px-6 py-10"><p className="text-sm text-ink-soft">{err ?? 'Loading…'}</p></main>
      </div>
    )
  }

  const photos: string[] = form.site_settings?.hero?.photos ?? []
  const colors = form.site_settings?.colors ?? {}
  const accent = form.site_accent ?? '#C98A8D'
  const bg = colors.bg ?? '#FAF7F2'
  const txt = colors.text ?? '#2A1F24'
  const link = form.slug ? `camrhia.com/${form.slug}` : null
  const steps: Step[] = ['style', 'name', 'colors', 'photos']
  const si = steps.indexOf(step)

  const dots = si >= 0 && (
    <div className="mb-6 flex gap-2">
      {steps.map((s, i) => <span key={s} className={'h-1.5 w-10 rounded-full ' + (i <= si ? 'bg-[rgb(var(--scene-b,201_133_136))]' : 'bg-white/70')} />)}
    </div>
  )

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="website" />
      <main className={'mx-auto px-6 py-8 ' + (step === 'build' ? 'max-w-[1500px]' : 'max-w-3xl')}>
        {err && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

        {step === 'intro' && (
          <section className={glass + ' p-10 text-center'}>
            <h1 className="font-fraunces text-4xl font-bold text-ink">Design with Cami</h1>
            <p className="mx-auto mt-3 max-w-md text-ink-soft">Answer a few quick questions and your website is built. Then just tell Cami what to change, in plain words.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button className={accentBtn} onClick={() => setStep('style')}>Start</button>
              {form.public_token && <button className={ghostBtn} onClick={() => setStep('build')}>Skip to editing</button>}
            </div>
            <Link href="/website" className="mt-6 inline-block text-sm text-ink-soft hover:text-ink">← Back to Website</Link>
          </section>
        )}

        {step === 'style' && (
          <section>
            {dots}
            <h1 className="font-fraunces text-3xl font-bold text-ink">What feeling do you want?</h1>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STYLES.map((s) => (
                <button key={s.key} type="button" onClick={async () => {
                  await commit((n) => { const st = (n.site_settings = n.site_settings ?? {}); n.site_template = s.tpl; n.site_font_pair = s.pair; if (st.fonts) { delete st.fonts.head; delete st.fonts.body }; applyPalette(n, n.site_accent ?? '#C98A8D', s.bg, s.text) })
                  setStep('name')
                }} className={glass + ' p-5 text-left transition hover:-translate-y-0.5'}>
                  <div className="h-20 rounded-lg border border-white/80" style={{ background: s.bg }}>
                    <div className="px-3 pt-4 font-fraunces text-lg" style={{ color: s.text }}>Your name</div>
                  </div>
                  <p className="mt-3 font-fraunces text-lg font-semibold text-ink">{s.name}</p>
                  <p className="text-sm text-ink-soft">{s.blurb}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'name' && (
          <section className={glass + ' p-8'}>
            {dots}
            <h1 className="font-fraunces text-3xl font-bold text-ink">What's your business name?</h1>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kadee Smith Photography" className="mt-5 w-full rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-lg text-ink outline-none focus:border-twilight" />
            <div className="mt-6 flex gap-3">
              <button className={accentBtn} disabled={!name.trim()} onClick={async () => {
                const nm = name.trim()
                await commit((n) => { const s = (n.site_settings = n.site_settings ?? {}); s.menu = { ...(s.menu ?? {}), brand: nm, ...(n.logo_path ? {} : { show: 'name' }) }; if (!n.site_headline) n.site_headline = nm })
                setStep('colors')
              }}>Next</button>
              <button className={ghostBtn} onClick={() => setStep('style')}>Back</button>
            </div>
          </section>
        )}

        {step === 'colors' && (
          <section className={glass + ' p-8'}>
            {dots}
            <h1 className="font-fraunces text-3xl font-bold text-ink">Pick your three colors</h1>
            <p className="mt-1 text-sm text-ink-soft">Start from a palette or choose your own.</p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {PALETTES.map((p) => (
                <button key={p.name} type="button" onClick={() => commit((n) => applyPalette(n, p.accent, p.bg, p.text))} className="rounded-xl border border-white/80 bg-white/60 p-3 text-left transition hover:bg-white/80">
                  <div className="flex gap-1.5">
                    {[p.accent, p.bg, p.text].map((c) => <span key={c} className="h-7 w-7 rounded-full border border-black/10" style={{ background: c }} />)}
                  </div>
                  <p className="mt-2 text-sm font-medium text-ink">{p.name}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {([['Main color', accent, 'accent'], ['Background', bg, 'bg'], ['Text', txt, 'text']] as const).map(([label, val, k]) => (
                <label key={k} className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/60 p-3">
                  <input type="color" value={val} onChange={(e) => {
                    const v = e.target.value
                    commit((n) => applyPalette(n, k === 'accent' ? v : n.site_accent ?? accent, k === 'bg' ? v : n.site_settings?.colors?.bg ?? bg, k === 'text' ? v : n.site_settings?.colors?.text ?? txt))
                  }} className="h-10 w-10 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                  <span className="text-sm text-ink">{label}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button className={accentBtn} onClick={() => setStep('photos')}>Next</button>
              <button className={ghostBtn} onClick={() => setStep('name')}>Back</button>
            </div>
          </section>
        )}

        {step === 'photos' && (
          <section className={glass + ' p-8'}>
            {dots}
            <h1 className="font-fraunces text-3xl font-bold text-ink">Add your best photos</h1>
            <p className="mt-1 text-sm text-ink-soft">These open your site. Up to 6, your strongest first. More than one becomes a slideshow.</p>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {photos.map((p) => (
                <div key={p} className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={BASE + p} alt="" className="h-full w-full object-cover" />
                  <button type="button" aria-label="Remove photo" onClick={() => removePhoto(p)} className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-xs text-white">×</button>
                </div>
              ))}
              {photos.length < 6 && (
                <label className="flex aspect-[4/5] cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink/30 bg-white/50 text-center text-xs text-ink-soft hover:bg-white/80">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
                  {busy ? 'Uploading…' : '+ Add photos'}
                </label>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button className={accentBtn} disabled={busy} onClick={() => { setMsgs([{ from: 'cami', text: "Your site is built. Tell me what to change, like \"make the buttons rectangles\" or \"change the main color to sage\"." }]); setStep('build') }}>Build my site</button>
              <button className={ghostBtn} onClick={() => setStep('colors')}>Back</button>
            </div>
          </section>
        )}

        {step === 'build' && (
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={glass + ' px-4 py-2 text-sm font-medium text-ink'}>{link ?? 'Your link is not set up yet'}</span>
                {link && <button className={ghostBtn + ' !px-3 !py-2'} onClick={() => { navigator.clipboard?.writeText('https://' + link); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? 'Copied' : 'Copy'}</button>}
                {link && <a href={'https://' + link} target="_blank" rel="noreferrer" className={ghostBtn + ' !px-3 !py-2'}>Open</a>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex overflow-hidden rounded-xl border border-white/70 bg-white/60 text-sm">
                  {(['desktop', 'phone'] as const).map((d) => (
                    <button key={d} type="button" onClick={() => setDevice(d)} className={'px-4 py-2 font-medium transition ' + (device === d ? 'bg-[rgb(var(--scene-b,201_133_136))] text-white' : 'text-ink-soft hover:text-ink')}>{d === 'desktop' ? 'Desktop' : 'Phone'}</button>
                  ))}
                </div>
                <button className={ghostBtn + ' !px-3 !py-2'} onClick={() => setStep('intro')}>Start over</button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className={glass + ' overflow-hidden p-3'}>
                {form.public_token ? (
                  <div style={{ height: 'calc(100vh - 12rem)', minHeight: 520 }} className="flex justify-center">
                    <iframe
                      key={previewKey}
                      src={`/site/${form.public_token}?preview=1`}
                      title="Website preview"
                      style={{ width: device === 'phone' ? 390 : '100%', height: '100%', border: 0, borderRadius: 12, background: '#fff' }}
                    />
                  </div>
                ) : (
                  <p className="p-8 text-center text-sm text-ink-soft">Your website link isn&apos;t set up yet. Finish setting up your portfolio in the app first.</p>
                )}
              </div>

              <div className={glass + ' flex flex-col p-4'} style={{ height: 'calc(100vh - 12rem)', minHeight: 520 }}>
                <p className="font-fraunces text-xl font-semibold text-ink">Cami</p>
                <p className="text-xs text-ink-soft">Your website designer</p>
                <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {msgs.map((m, i) => (
                    <div key={i} className={'max-w-[88%] rounded-2xl px-3 py-2 text-sm ' + (m.from === 'you' ? 'ml-auto bg-[rgb(var(--scene-b,201_133_136))] text-white' : 'bg-white/80 text-ink')}>{m.text}</div>
                  ))}
                  <div ref={chatEnd} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CAMI_EXAMPLES.map((x) => <button key={x} type="button" onClick={() => send(x)} className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs text-ink transition hover:bg-white">{x}</button>)}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="mt-3 flex gap-2">
                  <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Tell Cami what to change" className="min-w-0 flex-1 rounded-xl border border-white/80 bg-white/80 px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
                  <button type="submit" className={accentBtn + ' !px-4'}>Send</button>
                </form>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
