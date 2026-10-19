'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Site = {
  id: string
  public_token: string | null
  slug: string | null
  accent_color: string | null
  site_template: string | null
  site_accent: string | null
  site_font_pair: string | null
  site_headline: string | null
  site_subhead: string | null
  site_sections: Record<string, boolean> | null
}

type Tm = { id: string; storage_path: string | null; quote: string | null; client_name: string | null; sort_order: number }

const COLUMNS = 'id, public_token, slug, accent_color, site_template, site_accent, site_font_pair, site_headline, site_subhead, site_sections'

const TEMPLATES = [
  { key: 'editorial', name: 'Editorial', blurb: 'Full-screen photo with your headline over it.' },
  { key: 'split', name: 'Split', blurb: 'Words on one side, a big photo on the other.' },
  { key: 'minimal', name: 'Minimal', blurb: 'Clean white, photo first, lots of air.' },
]
const FONTS = [
  { key: 'serif', name: 'Classic', head: "'Cormorant Garamond', serif", body: "'Montserrat', sans-serif" },
  { key: 'modern', name: 'Modern', head: "'Josefin Sans', sans-serif", body: "'Work Sans', sans-serif" },
  { key: 'romantic', name: 'Romantic', head: "'Playfair Display', serif", body: "'Lora', serif" },
]
const SWATCHES = ['#A9545F', '#5B6B8C', '#7C8B6F', '#B08D57', '#8A5A83', '#2A1F24']

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const SECTION_LIST = [
  { key: 'about', label: 'About' },
  { key: 'portfolio', label: 'Portfolio galleries' },
  { key: 'investment', label: 'Investment (packages)' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'faq', label: 'FAQ' },
  { key: 'availability', label: 'Check-a-date calendar' },
]
const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink'
const btn = 'rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50'
const btnGhost = 'rounded-full border border-line px-5 py-2.5 text-sm text-ink hover:bg-paper-deep'
const card = 'rounded-2xl border border-line bg-card p-5'

function Thumb({ kind }: { kind: string }) {
  const photo = '#9A8F88'
  const text = '#2A1F24'
  const lines = (c: string, w = ['70%', '45%']) => (
    <>
      <div style={{ height: 5, width: w[0], background: c, borderRadius: 3, margin: '0 auto 4px' }} />
      <div style={{ height: 3, width: w[1], background: c, opacity: 0.6, borderRadius: 3, margin: '0 auto' }} />
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
  const [device, setDevice] = useState<'phone' | 'desktop'>('desktop')
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null)
  const [stageW, setStageW] = useState(0)
  const formRef = useRef<Site | null>(null)
  const [tms, setTms] = useState<Tm[]>([])
  const [tName, setTName] = useState('')
  const [tQuote, setTQuote] = useState('')
  const [tFile, setTFile] = useState<File | null>(null)
  const [tBusy, setTBusy] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)

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

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 2500)
  }
  function set<K extends keyof Site>(key: K, val: Site[K]) {
    setForm((f) => (f ? { ...f, [key]: val } : f))
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
    }).eq('id', form.id)
    setSaving(false)
    if (error) { flash(error.message); return }
    setSaved(form)
    flash('Saved')
  }

  const loadTms = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    const id = sess.session?.user.id
    if (!id) return
    const { data } = await sb.from('testimonials').select('id, storage_path, quote, client_name, sort_order').eq('owner_id', id).order('sort_order', { ascending: true })
    setTms((data ?? []) as Tm[])
  }, [])
  useEffect(() => { loadTms() }, [loadTms])

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
      await loadTms()
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
    await loadTms()
    setPreviewKey((k) => k + 1)
  }

  const token = form?.public_token ?? null
  const path = form?.slug ? `/${form.slug}/site` : token ? `/site/${token}` : null
  const fullUrl = path ? `https://camrhia.com${path}` : null
  const tpl = form?.site_template ?? 'editorial'
  const font = form?.site_font_pair ?? 'serif'
  const accent = form?.site_accent ?? null
  const brand = form?.accent_color ?? '#A9545F'

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Montserrat:wght@400&family=Josefin+Sans:wght@400&family=Work+Sans:wght@400&family=Playfair+Display:wght@500&family=Lora:wght@400&display=swap" />
      <DashboardHeader active="website" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!form ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Your website</p>
                <h1 className="font-fraunces text-3xl font-semibold text-ink">Design your website</h1>
              </div>
              <div className="flex items-center gap-3">
                {message && <span className="text-sm text-twilight">{message}</span>}
                {path && <a href={path} target="_blank" rel="noreferrer" className={btnGhost}>View live site</a>}
                <button className={btn} disabled={!dirty || saving} onClick={save}>
                  {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,460px)_1fr]">
              <div className="space-y-5">
                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Your galleries</h2>
                  <p className="mb-4 text-sm text-ink-soft">Make a gallery for each kind of work: Weddings, Seniors, Families. Each one gets its own page on your website, with as many photos as you like.</p>
                  <Link href="/website/galleries" className={btn + ' inline-block'}>Manage galleries</Link>
                </section>

                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Pick a look</h2>
                  <p className="mb-4 text-sm text-ink-soft">Same content, different feel. Switch any time.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {TEMPLATES.map((t) => (
                      <button key={t.key} onClick={() => set('site_template', t.key)} className={`text-left ${tpl === t.key ? '' : 'opacity-80 hover:opacity-100'}`}>
                        <div className={`rounded-xl p-1 ${tpl === t.key ? 'ring-2 ring-twilight' : ''}`}><Thumb kind={t.key} /></div>
                        <p className="mt-2 text-sm font-medium text-ink">{t.name}</p>
                        <p className="text-xs text-ink-soft">{t.blurb}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Color</h2>
                  <p className="mb-4 text-sm text-ink-soft">Used for buttons, prices and links.</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => set('site_accent', null)}
                      className={`rounded-full border px-3 py-1.5 text-xs ${accent === null ? 'border-twilight bg-twilight text-white' : 'border-line text-ink'}`}
                    >
                      <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: brand }} />
                      My brand color
                    </button>
                    {SWATCHES.map((c) => (
                      <button key={c} onClick={() => set('site_accent', c)} aria-label={c}
                        className="h-8 w-8 rounded-full" style={{ background: c, boxShadow: accent === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : undefined }} />
                    ))}
                    <input type="color" value={accent ?? brand} onChange={(e) => set('site_accent', e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-line bg-transparent" aria-label="Custom color" />
                  </div>
                </section>

                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Fonts</h2>
                  <p className="mb-4 text-sm text-ink-soft">Three pairs picked to always look good together.</p>
                  <div className="grid grid-cols-3 gap-3">
                    {FONTS.map((f) => (
                      <button key={f.key} onClick={() => set('site_font_pair', f.key)}
                        className={`rounded-xl border p-3 text-left ${font === f.key ? 'border-twilight ring-1 ring-twilight' : 'border-line'}`}>
                        <p style={{ fontFamily: f.head, fontSize: 24, lineHeight: 1.1 }} className="text-ink">Aa</p>
                        <p style={{ fontFamily: f.body, fontSize: 11 }} className="mt-1 text-ink-soft">{f.name}</p>
                      </button>
                    ))}
                  </div>
                </section>

                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Sections</h2>
                  <p className="mb-4 text-sm text-ink-soft">Choose what shows on your website. This does not change your app profile.</p>
                  <div className="space-y-2">
                    {SECTION_LIST.map((s) => {
                      const on = form.site_sections?.[s.key] !== false
                      return (
                        <button key={s.key} type="button" onClick={() => set('site_sections', { ...(form.site_sections ?? {}), [s.key]: !on })}
                          className="flex w-full items-center justify-between rounded-xl border border-line bg-paper px-4 py-2.5 text-left">
                          <span className="text-sm text-ink">{s.label}</span>
                          <span className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-twilight' : 'bg-line'}`}>
                            <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Your words</h2>
                  <p className="mb-4 text-sm text-ink-soft">The first thing visitors read.</p>
                  <label className="mb-1 block text-xs font-medium text-ink">Headline</label>
                  <input value={form.site_headline ?? ''} onChange={(e) => set('site_headline', e.target.value)} placeholder="e.g. Boise Wedding Photographer"
                    className="mb-4 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink" />
                  <label className="mb-1 block text-xs font-medium text-ink">Line under it</label>
                  <input value={form.site_subhead ?? ''} onChange={(e) => set('site_subhead', e.target.value)} placeholder="e.g. Honest, joyful photos for people in love"
                    className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink" />
                </section>

                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Testimonials</h2>
                  <p className="mb-4 text-sm text-ink-soft">Kind words from clients, with a picture if you have one. Shown on your website and your app profile.</p>
                  {tms.length === 0 && <p className="mb-3 text-sm text-ink-soft">No testimonials yet.</p>}
                  {tms.map((t) => (
                    <div key={t.id} className="mb-3 flex gap-3 rounded-xl border border-line bg-paper p-3">
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
                  <div className="mt-4 space-y-2 border-t border-line pt-4">
                    <input className={inputCls} value={tName} onChange={(e) => setTName(e.target.value)} placeholder="Client name, e.g. Sarah & Tom" />
                    <textarea className={inputCls} rows={3} value={tQuote} onChange={(e) => setTQuote(e.target.value)} placeholder="What they said" />
                    <input type="file" accept="image/*,.heic,.heif" onChange={(e) => setTFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-ink-soft" />
                    <button className={btn} disabled={!tQuote.trim() || tBusy} onClick={addTm}>{tBusy ? 'Adding…' : 'Add testimonial'}</button>
                  </div>
                </section>

                <section className={card}>
                  <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Your content</h2>
                  <p className="mb-4 text-sm text-ink-soft">Your website shows what you already have. Edit it here and it updates everywhere.</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Link href="/website/galleries" className={btnGhost + ' text-center'}>Galleries</Link>
                    <Link href="/portfolio/packages" className={btnGhost + ' text-center'}>Packages &amp; prices</Link>
                                        <Link href="/portfolio" className={btnGhost + ' text-center'}>Bio, FAQ &amp; links</Link>
                  </div>
                </section>

                {fullUrl && (
                  <section className={card}>
                    <h2 className="mb-1 font-fraunces text-lg font-semibold text-ink">Your link</h2>
                    <p className="mb-3 break-all text-sm text-ink-soft">{fullUrl.replace('https://', '')}</p>
                    <button className={btnGhost} onClick={() => { navigator.clipboard?.writeText(fullUrl); flash('Link copied') }}>Copy link</button>
                  </section>
                )}
              </div>

              <div id="site-preview">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-xs uppercase tracking-widest text-brass">Live preview</p>
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => setDevice('phone')} className={`rounded-full px-4 py-1.5 ${device === 'phone' ? 'bg-twilight text-white' : 'border border-line text-ink'}`}>Phone</button>
                    <button onClick={() => setDevice('desktop')} className={`rounded-full px-4 py-1.5 ${device === 'desktop' ? 'bg-twilight text-white' : 'border border-line text-ink'}`}>Desktop</button>
                  </div>
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
                            key={previewKey}
                            src={`/site/${token}?preview=1`}
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
