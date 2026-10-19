'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { FONT_OPTIONS, PAIR_PRESETS, NAV_DEFAULTS, DEFAULT_TITLES, resolveTheme } from '@/lib/siteTheme'

type Site = {
  id: string
  public_token: string | null
  slug: string | null
  accent_color: string | null
  cover_path: string | null
  cover_paths: string[] | null
  site_template: string | null
  site_accent: string | null
  site_font_pair: string | null
  site_headline: string | null
  site_subhead: string | null
  site_sections: Record<string, boolean> | null
  site_settings: Record<string, any> | null
}
type Tm = { id: string; storage_path: string | null; quote: string | null; client_name: string | null; sort_order: number }
type WPkg = { id: string; title: string; price: string | null; description: string | null; sort_order: number }
type Dev = 'phone' | 'desktop'

const COLUMNS = 'id, public_token, slug, accent_color, cover_path, cover_paths, site_template, site_accent, site_font_pair, site_headline, site_subhead, site_sections, site_settings'
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`

const TEMPLATES = [
  { key: 'editorial', name: 'Editorial', blurb: 'Full-screen photo with your headline over it.' },
  { key: 'split', name: 'Split', blurb: 'Words on one side, a big photo on the other.' },
  { key: 'minimal', name: 'Minimal', blurb: 'Clean white, photo first, lots of air.' },
]
const SWATCHES = ['#A9545F', '#5B6B8C', '#7C8B6F', '#B08D57', '#8A5A83', '#2A1F24']
const SECTION_LABELS: Record<string, string> = {
  about: 'About', portfolio: 'Portfolio galleries', investment: 'Investment (packages)', testimonials: 'Testimonials', faq: 'FAQ', contact: 'Contact',
}
const MENU_KEYS = ['home', 'about', 'portfolio', 'investment', 'contact']

const btn = 'rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50'
const btnGhost = 'rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-deep'
const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink'
const card = 'rounded-2xl border border-line bg-card p-5'

const SLIDER_CSS = `
.cr-range{-webkit-appearance:none;appearance:none;width:100%;height:18px;background:transparent;cursor:pointer;margin:0}
.cr-range::-webkit-slider-runnable-track{height:2px;border-radius:2px;background:linear-gradient(to right,#2A1F24 var(--pct),#D9CFC3 var(--pct))}
.cr-range::-moz-range-track{height:2px;border-radius:2px;background:#D9CFC3}
.cr-range::-moz-range-progress{height:2px;border-radius:2px;background:#2A1F24}
.cr-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;margin-top:-7px;border-radius:50%;background:#FAF7F2;border:1.5px solid #2A1F24;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.cr-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#FAF7F2;border:1.5px solid #2A1F24}
.cr-range:focus-visible{outline:none}
.cr-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 3px rgba(42,31,36,.18)}
`

function Group({ title, hint, open, children }: { title: string; hint?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="rounded-2xl border border-line bg-card p-5">
      <summary className="cursor-pointer font-fraunces text-lg font-semibold text-ink">
        {title}
        {hint && <span className="ml-2 text-sm font-normal text-ink-soft">{hint}</span>}
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  )
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-ink">{label}</span>
      {children}
    </div>
  )
}
function Seg<V extends string>({ value, options, onChange }: { value: V; options: { v: V; label: string }[]; onChange: (v: V) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-line bg-paper p-1">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`rounded-full px-3 py-1 text-xs ${value === o.v ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink'}`}>{o.label}</button>
      ))}
    </div>
  )
}
function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? 'bg-twilight' : 'bg-line'}`}>
      <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
    </button>
  )
}
function Slider({ min, max, step, value, onChange }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  const clamped = Math.min(max, Math.max(min, value))
  const pct = max > min ? ((clamped - min) / (max - min)) * 100 : 0
  return (
    <input type="range" className="cr-range" min={min} max={max} step={step} value={clamped}
      onChange={(e) => onChange(Number(e.target.value))} style={{ '--pct': `${pct}%` } as React.CSSProperties} />
  )
}
function NumBox({ value, min, max, step, unit, onChange }: { value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void }) {
  const [txt, setTxt] = useState(String(value))
  const [focus, setFocus] = useState(false)
  useEffect(() => { if (!focus) setTxt(String(value)) }, [value, focus])
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      <input type="number" value={txt} min={min} max={max} step={step}
        onFocus={() => setFocus(true)}
        onChange={(e) => {
          setTxt(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)))
        }}
        onBlur={() => { setFocus(false); const n = Number(txt); if (txt === '' || !Number.isFinite(n)) setTxt(String(value)) }}
        className="w-16 rounded-lg border border-line bg-white px-2 py-1 text-right text-sm text-ink" />
      <span className="w-5 text-xs text-ink-soft">{unit}</span>
    </span>
  )
}
function SizeControl({ label, unit, min, max, step, value, onChange }: {
  label: string; unit: string; min: number; max: number; step: number
  value: { phone: number; desktop: number }; onChange: (d: Dev, v: number) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-ink">{label}</p>
      <div className="space-y-2">
        {(['phone', 'desktop'] as const).map((d) => (
          <div key={d} className="flex items-center gap-3">
            <span className="w-14 shrink-0 text-[11px] uppercase tracking-widest text-ink-soft">{d}</span>
            <div className="min-w-0 flex-1"><Slider min={min} max={max} step={step} value={value[d]} onChange={(v) => onChange(d, v)} /></div>
            <NumBox value={value[d]} min={min} max={max} step={step} unit={unit} onChange={(v) => onChange(d, v)} />
          </div>
        ))}
      </div>
    </div>
  )
}

function Thumb({ kind }: { kind: string }) {
  const photo = '#9A8F88'
  const text = '#2A1F24'
  const lines = (c: string) => (
    <>
      <div style={{ height: 5, width: '70%', background: c, borderRadius: 3, margin: '0 auto 4px' }} />
      <div style={{ height: 3, width: '45%', background: c, opacity: 0.6, borderRadius: 3, margin: '0 auto' }} />
    </>
  )
  return (
    <div className="relative h-24 overflow-hidden rounded-lg border border-line bg-white">
      {kind === 'editorial' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: photo }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 10 }}>{lines('#fff')}</div>
        </>
      )}
      {kind === 'split' && (
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flex: 1, background: '#F6F1EA', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 8 }}>
            <div style={{ height: 5, width: '80%', background: text, borderRadius: 3, marginBottom: 4 }} />
            <div style={{ height: 3, width: '55%', background: text, opacity: 0.5, borderRadius: 3 }} />
          </div>
          <div style={{ flex: 1, background: photo }} />
        </div>
      )}
      {kind === 'minimal' && (
        <div style={{ padding: 8 }}>
          <div style={{ height: 44, background: photo, borderRadius: 2, marginBottom: 8 }} />
          {lines(text)}
        </div>
      )}
    </div>
  )
}

export default function WebsitePage() {
  const router = useRouter()
  const [form, setForm] = useState<Site | null>(null)
  const [saved, setSaved] = useState<Site | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [device, setDevice] = useState<Dev>('desktop')
  const [previewPage, setPreviewPage] = useState<'home' | 'availability'>('home')
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null)
  const [stageW, setStageW] = useState(0)
  const formRef = useRef<Site | null>(null)
  const [tms, setTms] = useState<Tm[]>([])
  const [pkgs, setPkgs] = useState<WPkg[]>([])
  const [tName, setTName] = useState('')
  const [tQuote, setTQuote] = useState('')
  const [tFile, setTFile] = useState<File | null>(null)
  const [tBusy, setTBusy] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [candsDb, setCandsDb] = useState<string[]>([])
  const [extraHero, setExtraHero] = useState<string[]>([])

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/website'); return }
    const { data, error } = await sb.from('profiles').select(COLUMNS).eq('id', sess.session.user.id).single()
    if (error || !data) { setMessage(error?.message ?? 'Could not load your profile.'); return }
    setForm(data as Site)
    setSaved(data as Site)
  }, [router])
  useEffect(() => { load() }, [load])

  const sendPreview = useCallback(() => {
    const f = formRef.current
    if (!f) return
    const patch = {
      site_template: f.site_template ?? 'editorial',
      site_accent: f.site_accent,
      site_font_pair: f.site_font_pair ?? 'serif',
      site_headline: f.site_headline,
      site_subhead: f.site_subhead,
      site_sections: f.site_sections ?? {},
      site_settings: f.site_settings ?? {},
    }
    const frame = document.getElementById('site-frame') as HTMLIFrameElement | null
    frame?.contentWindow?.postMessage({ type: 'camrhia-preview', patch }, '*')
  }, [])
  useEffect(() => {
    formRef.current = form
    const t = setTimeout(sendPreview, 80)
    return () => clearTimeout(t)
  }, [form, sendPreview])
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data && e.data.type === 'camrhia-preview-ready') sendPreview()
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [sendPreview])
  useEffect(() => {
    if (!stageEl) return
    const ro = new ResizeObserver(() => setStageW(stageEl.clientWidth))
    ro.observe(stageEl)
    setStageW(stageEl.clientWidth)
    return () => ro.disconnect()
  }, [stageEl])

  const loadExtras = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    const { data } = await sb.from('testimonials').select('id, storage_path, quote, client_name, sort_order').eq('owner_id', id).order('sort_order', { ascending: true })
    setTms((data ?? []) as Tm[])
    const pk = await sb.from('website_packages').select('id, title, price, description, sort_order').eq('photographer_id', id).order('sort_order', { ascending: true })
    setPkgs((pk.data ?? []) as WPkg[])
    const ph = await sb.from('website_photos').select('storage_path').eq('photographer_id', id).order('created_at', { ascending: false }).limit(80)
    setCandsDb(((ph.data ?? []) as { storage_path: string }[]).map((x) => x.storage_path))
  }, [])
  useEffect(() => { loadExtras() }, [loadExtras])

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 2500)
  }
  function set<K extends keyof Site>(key: K, val: Site[K]) {
    setForm((f) => (f ? { ...f, [key]: val } : f))
  }
  function upd(fn: (s: Record<string, any>) => void) {
    setForm((f) => {
      if (!f) return f
      const s = JSON.parse(JSON.stringify(f.site_settings ?? {})) as Record<string, any>
      fn(s)
      return { ...f, site_settings: s }
    })
  }
  function pickPair(k: string) {
    setForm((f) => {
      if (!f) return f
      const s = JSON.parse(JSON.stringify(f.site_settings ?? {})) as Record<string, any>
      if (s.fonts) { delete s.fonts.head; delete s.fonts.body }
      return { ...f, site_font_pair: k, site_settings: s }
    })
  }
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)

  async function save() {
    const sb = supabase
    if (!form || !sb) return
    setSaving(true)
    const { error } = await sb.from('profiles').update({
      site_template: form.site_template ?? 'editorial',
      site_accent: form.site_accent,
      site_font_pair: form.site_font_pair ?? 'serif',
      site_headline: form.site_headline?.trim() || null,
      site_subhead: form.site_subhead?.trim() || null,
      site_sections: form.site_sections ?? {},
      site_settings: form.site_settings ?? {},
    }).eq('id', form.id)
    setSaving(false)
    if (error) { flash(error.message); return }
    setSaved(form)
    flash('Saved')
  }

  function toggleHero(path: string) {
    upd((s) => {
      const cur: string[] = [...(s.hero?.photos ?? [])]
      const i = cur.indexOf(path)
      if (i >= 0) cur.splice(i, 1)
      else if (cur.length < 6) cur.push(path)
      s.hero = { ...(s.hero ?? {}), photos: cur }
    })
  }
  async function uploadHero(file: File) {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    try {
      const v = await makeVersions(file)
      const path = `${id}/hero_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      setExtraHero((c) => [path, ...c])
      toggleHero(path)
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Upload failed.')
    }
  }

  async function addTm() {
    const sb = supabase
    if (!sb || !tQuote.trim() || tBusy) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    setTBusy(true)
    try {
      let path: string | null = null
      if (tFile) {
        const v = await makeVersions(tFile)
        path = `${id}/testimonial_${Date.now()}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
      }
      const { error } = await sb.from('testimonials').insert({ owner_id: id, quote: tQuote.trim(), client_name: tName.trim() || null, storage_path: path, sort_order: tms.length })
      if (error) throw error
      setTName(''); setTQuote(''); setTFile(null)
      await loadExtras()
      setPreviewKey((k) => k + 1)
      flash('Testimonial added')
    } catch (e) {
      flash((e as { message?: string })?.message ?? 'Could not add the testimonial.')
    } finally {
      setTBusy(false)
    }
  }
  async function removeTm(t: Tm) {
    const sb = supabase
    if (!sb || !window.confirm('Remove this testimonial?')) return
    const { error } = await sb.from('testimonials').delete().eq('id', t.id)
    if (error) { flash(error.message); return }
    if (t.storage_path) await sb.storage.from('portfolio').remove([t.storage_path])
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }

  async function addPkg() {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    const { error } = await sb.from('website_packages').insert({ photographer_id: id, title: 'New package', price: null, description: null, sort_order: pkgs.length })
    if (error) { flash(error.message); return }
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }
  async function updatePkg(p: WPkg, patch: Partial<WPkg>) {
    const sb = supabase
    if (!sb) return
    const { error } = await sb.from('website_packages').update(patch).eq('id', p.id)
    if (error) { flash(error.message); return }
    setPkgs((list) => list.map((x) => (x.id === p.id ? { ...x, ...patch } : x)))
    setPreviewKey((k) => k + 1)
  }
  async function removePkg(p: WPkg) {
    const sb = supabase
    if (!sb || !window.confirm(`Remove "${p.title}"?`)) return
    const { error } = await sb.from('website_packages').delete().eq('id', p.id)
    if (error) { flash(error.message); return }
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }
  async function movePkg(p: WPkg, dir: -1 | 1) {
    const sb = supabase
    if (!sb) return
    const arr = [...pkgs].sort((a, b) => a.sort_order - b.sort_order)
    const i = arr.findIndex((x) => x.id === p.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= arr.length) return
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    await Promise.all(arr.map((x, idx) => sb.from('website_packages').update({ sort_order: idx }).eq('id', x.id)))
    await loadExtras()
    setPreviewKey((k) => k + 1)
  }
  const T = form ? resolveTheme(form as unknown as Record<string, any>) : null
  const S = (form?.site_settings ?? {}) as Record<string, any>
  const heroSel: string[] = Array.isArray(S.hero?.photos) ? (S.hero.photos as string[]) : []
  const cands = form
    ? Array.from(new Set([...heroSel, ...extraHero, ...(form.cover_paths ?? []), ...(form.cover_path ? [form.cover_path] : []), ...candsDb]))
    : []

  function moveSection(k: string, dir: -1 | 1) {
    if (!T) return
    const order = [...T.order]
    const i = order.indexOf(k)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp
    upd((s) => { s.order = order })
  }
  function setHero(patch: Record<string, any>) { upd((s) => { s.hero = { ...(s.hero ?? {}), ...patch } }) }
  function setIn(group: string, patch: Record<string, any>) { upd((s) => { s[group] = { ...(s[group] ?? {}), ...patch } }) }
  function setSize(key: string, d: Dev, v: number) {
    upd((s) => { s.sizes = { ...(s.sizes ?? {}), [key]: { ...(s.sizes?.[key] ?? {}), [d]: v } } })
    setDevice(d)
  }
  function colorRow(label: string, key: string, current: string) {
    return (
      <Row label={label}>
        <div className="flex items-center gap-2">
          <input type="color" value={current.length === 7 ? current : '#FFFFFF'} onChange={(e) => setIn('colors', { [key]: e.target.value })} className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent" />
          <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => upd((s) => { const c = { ...(s.colors ?? {}) }; delete c[key]; s.colors = c })}>Reset</button>
        </div>
      </Row>
    )
  }

  const token = form?.public_token ?? null
  const path = form?.slug ? `/${form.slug}/site` : token ? `/site/${token}` : null
  const fullUrl = path ? `https://camrhia.com${path}` : null
  const tpl = form?.site_template ?? 'editorial'
  const accent = form?.site_accent ?? null
  const brand = form?.accent_color ?? '#A9545F'
  const menuHidden: string[] = Array.isArray(S.menu?.hidden) ? S.menu.hidden : []

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <style>{SLIDER_CSS}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Montserrat:wght@400&family=Josefin+Sans:wght@400&family=Work+Sans:wght@400&family=Playfair+Display:wght@500&family=Lora:wght@400&display=swap" />
      <DashboardHeader active="website" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!form || !T ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Your website</p>
                <h1 className="font-fraunces text-3xl font-semibold text-ink">Design your website</h1>
                <p className="mt-1 text-sm text-ink-soft">Work down the steps. The preview updates as you go, and nothing is live until you press Save.</p>
              </div>
              <div className="flex items-center gap-3">
                {message && <span className="text-sm text-twilight">{message}</span>}
                {path && <a href={path} target="_blank" rel="noreferrer" className={btnGhost}>View live site</a>}
                <button className={btn} disabled={!dirty || saving} onClick={save}>
                  {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,480px)_1fr]">
              <div className="space-y-4">
                <Group title="1. Your content" hint="photos, prices, kind words" open>
                  <div className="rounded-xl border border-line bg-paper p-4">
                    <p className="font-medium text-ink">Galleries</p>
                    <p className="mb-3 mt-1 text-sm text-ink-soft">One gallery per kind of work: Weddings, Seniors, Families. Each gets its own page.</p>
                    <Link href="/website/galleries" className={btn + ' inline-block'}>Manage galleries</Link>
                  </div>

                  <div className="rounded-xl border border-line bg-paper p-4">
                    <p className="font-medium text-ink">Packages &amp; prices</p>
                    <p className="mb-3 mt-1 text-sm text-ink-soft">Your website&apos;s own price list. It&apos;s separate from the pricing in your app.</p>
                    <div className="mb-4 space-y-3">
                      <Row label="Price list style">
                        <Seg value={T.pricing.layout} options={[{ v: 'cards', label: 'Cards' }, { v: 'menu', label: 'Menu' }, { v: 'columns', label: 'Columns' }]} onChange={(v) => setIn('pricing', { layout: v })} />
                      </Row>
                      <Row label="Button on each package"><Switch on={T.pricing.button} onChange={(v) => setIn('pricing', { button: v })} /></Row>
                      <input value={S.pricing?.intro ?? ''} onChange={(e) => setIn('pricing', { intro: e.target.value })} placeholder="Line above the prices, e.g. Every collection includes a private gallery" className={inputCls} />
                      <input value={S.pricing?.note ?? ''} onChange={(e) => setIn('pricing', { note: e.target.value })} placeholder="Line below, e.g. Custom collections available. Just ask." className={inputCls} />
                    </div>
                    {pkgs.map((p, i) => (
                      <div key={p.id} className="mb-3 rounded-lg border border-line bg-white p-3">
                        <div className="mb-2 flex gap-2">
                          <input defaultValue={p.title} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== p.title) updatePkg(p, { title: v }) }} className={inputCls} placeholder="Package name" />
                          <input defaultValue={p.price ?? ''} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (p.price ?? '')) updatePkg(p, { price: v || null }) }} className={inputCls + ' max-w-[110px]'} placeholder="$2,400" />
                        </div>
                        <textarea defaultValue={p.description ?? ''} rows={5} onBlur={(e) => { const v = e.target.value.trim(); if (v !== (p.description ?? '')) updatePkg(p, { description: v || null }) }} className={inputCls} placeholder={"What is included, one per line:\n8 hours of coverage\nOnline gallery\nPrint release"} />
                        <div className="mt-2 flex gap-3 text-xs text-ink-soft">
                          <button type="button" disabled={i === 0} onClick={() => movePkg(p, -1)} className="disabled:opacity-30">↑ Up</button>
                          <button type="button" disabled={i === pkgs.length - 1} onClick={() => movePkg(p, 1)} className="disabled:opacity-30">↓ Down</button>
                          <button type="button" onClick={() => setIn('pricing', { featured: S.pricing?.featured === p.id ? null : p.id })} className={S.pricing?.featured === p.id ? 'font-medium text-twilight' : ''}>★ Most popular</button>
                          <button type="button" onClick={() => removePkg(p)} className="ml-auto hover:text-ink">Remove</button>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <button className={btn} onClick={addPkg}>Add package</button>
                      
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-paper p-4">
                    <p className="font-medium text-ink">Testimonials</p>
                    <p className="mb-3 mt-1 text-sm text-ink-soft">Kind words, with a picture if you have one. Shown on your website and your app profile.</p>
                    {tms.length === 0 && <p className="mb-3 text-sm text-ink-soft">No testimonials yet.</p>}
                    {tms.map((t) => (
                      <div key={t.id} className="mb-3 flex gap-3 rounded-lg border border-line bg-white p-3">
                        {t.storage_path ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={BASE + t.storage_path} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded-lg bg-line/50" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm text-ink">&ldquo;{t.quote}&rdquo;</p>
                          {t.client_name && <p className="mt-1 text-xs text-ink-soft">{t.client_name}</p>}
                        </div>
                        <button onClick={() => removeTm(t)} className="self-start text-xs text-ink-soft hover:text-ink">Remove</button>
                      </div>
                    ))}
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      <input className={inputCls} value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Client name, e.g. Sarah & Tom" />
                      <textarea className={inputCls} rows={3} value={tQuote} onChange={(e) => setTQuote(e.target.value)} placeholder="What they said" />
                      <input type="file" accept="image/*,.heic,.heif" onChange={(e) => setTFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-ink-soft" />
                      <button className={btn} disabled={!tQuote.trim() || tBusy} onClick={addTm}>{tBusy ? 'Adding…' : 'Add testimonial'}</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Link href="/portfolio" className={btnGhost + ' text-center'}>Bio, FAQ &amp; links</Link>
                  </div>
                </Group>

                <Group title="2. Template" hint="the structure">
                  <div className="grid grid-cols-3 gap-3">
                    {TEMPLATES.map((t) => (
                      <button key={t.key} onClick={() => set('site_template', t.key)} className={`text-left ${tpl === t.key ? '' : 'opacity-80 hover:opacity-100'}`}>
                        <div className={`rounded-xl p-1 ${tpl === t.key ? 'ring-2 ring-twilight' : ''}`}><Thumb kind={t.key} /></div>
                        <p className="mt-2 text-sm font-medium text-ink">{t.name}</p>
                        <p className="text-xs text-ink-soft">{t.blurb}</p>
                      </button>
                    ))}
                  </div>
                </Group>

                <Group title="3. Color & fonts" hint="the mood">
                  <div>
                    <p className="mb-2 text-sm text-ink">Accent color</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <button onClick={() => set('site_accent', null)}
                        className={`rounded-full border px-3 py-1.5 text-xs ${accent === null ? 'border-twilight bg-twilight text-white' : 'border-line text-ink'}`}>
                        <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: brand }} />
                        My brand color
                      </button>
                      {SWATCHES.map((c) => (
                        <button key={c} onClick={() => set('site_accent', c)} aria-label={c} className="h-8 w-8 rounded-full"
                          style={{ background: c, boxShadow: accent === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }} />
                      ))}
                      <input type="color" value={accent ?? (brand.length === 7 ? brand : '#A9545F')} onChange={(e) => set('site_accent', e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent" aria-label="Custom color" />
                    </div>
                  </div>
                  {colorRow('Background', 'bg', T.bg)}
                  {colorRow('Text', 'text', T.ink)}
                  {colorRow('Alternating section tint', 'tint', T.tint)}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {Object.entries(PAIR_PRESETS).map(([key, p]) => {
                      const sel = (form.site_font_pair ?? 'serif') === key && !S.fonts?.head && !S.fonts?.body
                      return (
                        <button key={key} onClick={() => pickPair(key)} className={`rounded-xl border p-3 text-left ${sel ? 'border-twilight ring-1 ring-twilight' : 'border-line'}`}>
                          <p style={{ fontFamily: FONT_OPTIONS[p.head].family, fontSize: 24, lineHeight: 1.1 }} className="text-ink">Aa</p>
                          <p style={{ fontFamily: FONT_OPTIONS[p.body].family, fontSize: 11 }} className="mt-1 text-ink-soft">{p.name}</p>
                        </button>
                      )
                    })}
                  </div>
                  <Row label="Heading font">
                    <select value={T.headKey} onChange={(e) => setIn('fonts', { head: e.target.value })} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink">
                      {Object.entries(FONT_OPTIONS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
                    </select>
                  </Row>
                  <Row label="Body font">
                    <select value={T.bodyKey} onChange={(e) => setIn('fonts', { body: e.target.value })} className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink">
                      {Object.entries(FONT_OPTIONS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}
                    </select>
                  </Row>
                </Group>

                <Group title="4. Hero" hint="the first screen">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Headline</label>
                    <input value={form.site_headline ?? ''} onChange={(e) => set('site_headline', e.target.value)} placeholder="e.g. Boise Wedding Photographer" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Line under it</label>
                    <input value={form.site_subhead ?? ''} onChange={(e) => set('site_subhead', e.target.value)} placeholder="e.g. Honest, joyful photos for people in love" className={inputCls} />
                  </div>
                  <div>
                    <p className="mb-1 text-sm text-ink">Hero photos</p>
                    <p className="mb-2 text-xs text-ink-soft">Tap photos to choose up to 6. The first one you pick leads. With none picked, your app cover is used.</p>
                    <div className="grid grid-cols-4 gap-2">
                      {cands.map((p) => {
                        const idx = heroSel.indexOf(p)
                        return (
                          <button key={p} type="button" onClick={() => toggleHero(p)} className={`relative aspect-square overflow-hidden rounded-lg ${idx >= 0 ? 'ring-2 ring-twilight' : ''}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={BASE + p} alt="" className="h-full w-full object-cover" loading="lazy" />
                            {idx >= 0 && <span className="absolute left-1 top-1 rounded bg-twilight px-1.5 text-[10px] text-white">{idx + 1}</span>}
                          </button>
                        )
                      })}
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-line text-center text-xs text-ink-soft hover:border-twilight">
                        <span className="text-xl text-ink">+</span>Upload
                        <input type="file" accept="image/*,.heic,.heif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHero(f); e.target.value = '' }} />
                      </label>
                    </div>
                  </div>
                  <Row label="Slideshow (when 2+ photos)"><Switch on={T.hero.slideshow} onChange={(v) => setHero({ slideshow: v })} /></Row>
                  <div>
                    <p className="mb-2 text-sm text-ink">Photo darkness (editorial)</p>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1"><Slider min={0} max={80} step={5} value={Math.round(T.hero.overlay * 100)} onChange={(v) => setHero({ overlay: v / 100 })} /></div>
                      <NumBox value={Math.round(T.hero.overlay * 100)} min={0} max={80} step={5} unit="%" onChange={(v) => setHero({ overlay: v / 100 })} />
                    </div>
                  </div>
                  <Row label="Text alignment">
                    <Seg value={T.hero.align} options={[{ v: 'left', label: 'Left' }, { v: 'center', label: 'Center' }, { v: 'right', label: 'Right' }]} onChange={(v) => setHero({ align: v })} />
                  </Row>
                  <Row label="Text position (editorial)">
                    <Seg value={T.hero.valign} options={[{ v: 'top', label: 'Top' }, { v: 'center', label: 'Middle' }, { v: 'bottom', label: 'Bottom' }]} onChange={(v) => setHero({ valign: v })} />
                  </Row>
                  <Row label="Show button in hero"><Switch on={T.hero.ctaShow} onChange={(v) => setHero({ cta_show: v })} /></Row>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Button wording (used on every button)</label>
                    <input value={S.hero?.cta_text ?? ''} onChange={(e) => setHero({ cta_text: e.target.value })} placeholder="Check availability" className={inputCls} />
                  </div>
                </Group>

                <Group title="5. Your words" hint="website-only text">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">About text</label>
                    <textarea rows={4} value={S.text?.about ?? ''} onChange={(e) => setIn('text', { about: e.target.value })} placeholder="Leave empty to use your bio from the app" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Contact message</label>
                    <textarea rows={3} value={S.text?.contact ?? ''} onChange={(e) => setIn('text', { contact: e.target.value })} placeholder="Tell me about your day. Check a date and send me a message." className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Footer line</label>
                    <input value={S.text?.footer ?? ''} onChange={(e) => setIn('text', { footer: e.target.value })} placeholder="e.g. Serving Boise, Sun Valley and beyond" className={inputCls} />
                  </div>
                </Group>

                <Group title="6. Check availability screen" hint="where every button leads">
                  <p className="text-sm text-ink-soft">Every button on your website opens this screen: a date check, then a short form. Requests land in your Camrhia inbox.</p>
                  <button className={btnGhost} onClick={() => setPreviewPage('availability')}>Preview this screen</button>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Heading</label>
                    <input value={S.availability?.title ?? ''} onChange={(e) => setIn('availability', { title: e.target.value })} placeholder="Check availability" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Intro</label>
                    <textarea rows={2} value={S.availability?.intro ?? ''} onChange={(e) => setIn('availability', { intro: e.target.value })} placeholder="Pick a date to see if I am free, then tell me a little about your day." className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Send button wording</label>
                    <input value={S.availability?.button ?? ''} onChange={(e) => setIn('availability', { button: e.target.value })} placeholder="Send inquiry" className={inputCls} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink">Thank-you message</label>
                    <textarea rows={2} value={S.availability?.success ?? ''} onChange={(e) => setIn('availability', { success: e.target.value })} placeholder="Thanks! I will reach out within a day." className={inputCls} />
                  </div>
                  
                </Group>

                <Group title="7. Sections" hint="order, names, on/off">
                  <div className="space-y-2">
                    {T.order.map((k, i) => (
                      <div key={k} className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
                        <div className="flex flex-col">
                          <button type="button" disabled={i === 0} onClick={() => moveSection(k, -1)} className="text-xs leading-none text-ink-soft disabled:opacity-30" aria-label="Move up">▲</button>
                          <button type="button" disabled={i === T.order.length - 1} onClick={() => moveSection(k, 1)} className="mt-1 text-xs leading-none text-ink-soft disabled:opacity-30" aria-label="Move down">▼</button>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] uppercase tracking-widest text-ink-soft">{SECTION_LABELS[k]}</p>
                          <input value={S.titles?.[k] ?? ''} onChange={(e) => setIn('titles', { [k]: e.target.value })} placeholder={DEFAULT_TITLES[k]} className="w-full bg-transparent text-sm text-ink focus:outline-none" />
                        </div>
                        {k !== 'contact' && (
                          <Switch on={form.site_sections?.[k] !== false} onChange={(v) => set('site_sections', { ...(form.site_sections ?? {}), [k]: v })} />
                        )}
                      </div>
                    ))}
                  </div>
                </Group>

                <Group title="8. Layout & sizes" hint="phone and desktop">
                  <Row label="Gallery photo layout">
                    <Seg value={T.gallery.layout} options={[{ v: 'masonry', label: 'Masonry' }, { v: 'grid', label: 'Even grid' }, { v: 'single', label: 'Single column' }]} onChange={(v) => setIn('gallery', { layout: v })} />
                  </Row>
                  <Row label="Gallery card shape">
                    <Seg value={T.gallery.card} options={[{ v: 'portrait', label: 'Portrait' }, { v: 'square', label: 'Square' }, { v: 'landscape', label: 'Landscape' }]} onChange={(v) => setIn('gallery', { card: v })} />
                  </Row>
                  <Row label="Button shape">
                    <Seg value={T.shape} options={[{ v: 'square', label: 'Square' }, { v: 'rounded', label: 'Rounded' }, { v: 'pill', label: 'Pill' }]} onChange={(v) => setIn('button', { shape: v })} />
                  </Row>
                  <p className="text-xs text-ink-soft">Move a phone or desktop control and the preview switches to that size. You can also type an exact number.</p>
                  <SizeControl label="Text size" unit="%" min={80} max={130} step={5} value={T.sizes.text} onChange={(d, v) => setSize('text', d, v)} />
                  <SizeControl label="Headline size" unit="px" min={24} max={140} step={2} value={T.sizes.headline} onChange={(d, v) => setSize('headline', d, v)} />
                  <SizeControl label="Hero height" unit="vh" min={40} max={100} step={5} value={T.sizes.heroHeight} onChange={(d, v) => setSize('heroHeight', d, v)} />
                  <SizeControl label="Space between sections" unit="px" min={16} max={220} step={4} value={T.sizes.sectionSpace} onChange={(d, v) => setSize('sectionSpace', d, v)} />
                  <SizeControl label="Space between photos" unit="px" min={0} max={60} step={2} value={T.sizes.photoGap} onChange={(d, v) => setSize('photoGap', d, v)} />
                </Group>

                <Group title="9. Menu" hint="last, trim it down">
                  <Row label="Menu bar">
                    <Seg value={T.menu.solid ? 'solid' : 'auto'} options={[{ v: 'auto', label: 'Match template' }, { v: 'solid', label: 'Solid bar' }]} onChange={(v) => setIn('menu', { style: v })} />
                  </Row>
                  <div className="space-y-2">
                    {MENU_KEYS.map((k) => (
                      <div key={k} className="flex items-center gap-3">
                        <input value={S.menu?.labels?.[k] ?? ''} placeholder={NAV_DEFAULTS[k]}
                          onChange={(e) => upd((s) => { s.menu = { ...(s.menu ?? {}), labels: { ...(s.menu?.labels ?? {}), [k]: e.target.value } } })} className={inputCls} />
                        <Switch on={!menuHidden.includes(k)}
                          onChange={(v) => upd((s) => { const h: string[] = Array.isArray(s.menu?.hidden) ? [...s.menu.hidden] : []; const i = h.indexOf(k); if (v && i >= 0) h.splice(i, 1); if (!v && i < 0) h.push(k); s.menu = { ...(s.menu ?? {}), hidden: h } })} />
                      </div>
                    ))}
                  </div>
                </Group>

                {fullUrl && (
                  <section className={card}>
                    <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Your link</h2>
                    <p className="mb-3 break-all text-sm text-ink-soft">{fullUrl.replace('https://', '')}</p>
                    <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(fullUrl); flash('Link copied') }}>Copy link</button>
                  </section>
                )}
              </div>

              <div id="site-preview" className="lg:sticky lg:top-6 lg:self-start">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <Seg value={previewPage} options={[{ v: 'home', label: 'Website' }, { v: 'availability', label: 'Check availability' }]} onChange={setPreviewPage} />
                  <Seg value={device} options={[{ v: 'phone', label: 'Phone' }, { v: 'desktop', label: 'Desktop' }]} onChange={setDevice} />
                </div>
                {token ? (
                  <div ref={setStageEl} className="overflow-hidden rounded-2xl border border-line bg-line/50 p-3">
                    {(() => {
                      const inner = Math.max(0, stageW - 24)
                      const phone = device === 'phone'
                      const scale = phone ? 1 : inner > 0 ? Math.min(1, inner / 1280) : 0.5
                      const w = phone ? 390 : 1280
                      const hCss = 'max(560px, calc(100vh - 14rem))'
                      return (
                        <div style={{ width: Math.min(inner || w, w * scale), height: hCss, margin: '0 auto', overflow: 'hidden', borderRadius: 12, background: '#fff' }}>
                          <iframe
                            id="site-frame"
                            key={previewKey + previewPage}
                            src={`/site/${token}${previewPage === 'availability' ? '/availability' : ''}?preview=1`}
                            title="Website preview"
                            style={{ width: w, height: `calc(${hCss} / ${scale})`, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff' }}
                          />
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-ink-soft">
                    Your website link isn&apos;t set up yet. Finish setting up your portfolio in the app first.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
