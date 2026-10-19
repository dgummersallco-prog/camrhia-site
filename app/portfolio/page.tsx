'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Profile = {
  id: string
  public_token: string | null
  studio_name: string | null
  bio: string | null
  service_city: string | null
  service_state: string | null
  website_url: string | null
  instagram_url: string | null
  facebook_url: string | null
  pinterest_url: string | null
  tiktok_url: string | null
  cover_path: string | null
  cover_paths: string[] | null
  logo_path: string | null
  avatar_path: string | null
  show_portfolio_public: boolean | null
  show_bio_public: boolean | null
  show_pricing_public: boolean | null
  show_availability_public: boolean | null
  show_faq_public: boolean | null
  show_socials_public: boolean | null
  section_order: string[] | null
  accent_color: string | null
  portfolio_bg_color: string | null
  title_color: string | null
  location_color: string | null
  paragraph_color: string | null
  portfolio_section_spacing: number | null
  faq: { question: string; answer: string }[] | null
  title_font: string | null
  title_bold: boolean | null
  title_italic: boolean | null
  paragraph_font: string | null
  section_titles: Record<string, string> | null
}

const COLUMNS =
  'id, public_token, studio_name, bio, service_city, service_state, website_url, instagram_url, facebook_url, pinterest_url, tiktok_url, cover_path, cover_paths, logo_path, avatar_path, show_portfolio_public, show_bio_public, show_pricing_public, show_availability_public, show_faq_public, show_socials_public, section_order, accent_color, portfolio_bg_color, title_color, location_color, paragraph_color, portfolio_section_spacing, faq, title_font, title_bold, title_italic, paragraph_font, section_titles'

const DEFAULT_ORDER = ['featured_photos', 'about', 'testimonials', 'pricing', 'openings', 'faq', 'links']
const LABELS: Record<string, string> = {
  featured_photos: 'Featured photos',
  about: 'About',
  testimonials: 'Testimonials',
  pricing: 'Packages',
  openings: 'Openings / availability',
  faq: 'FAQ',
  links: 'Links and social',
}
const TOGGLE: Record<string, keyof Profile | null> = {
  featured_photos: 'show_portfolio_public',
  about: 'show_bio_public',
  testimonials: null,
  pricing: 'show_pricing_public',
  openings: 'show_availability_public',
  faq: 'show_faq_public',
  links: 'show_socials_public',
}

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`

function normalizeOrder(order: string[] | null): string[] {
  const saved = (order ?? []).filter((k) => DEFAULT_ORDER.includes(k))
  return [...saved, ...DEFAULT_ORDER.filter((k) => !saved.includes(k))]
}

const card = 'rounded-2xl border border-line bg-card p-5'
const input = 'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line px-4 py-2.5 text-sm text-ink transition hover:border-twilight disabled:opacity-50'
const label = 'mb-1.5 block text-sm font-medium text-ink'

const FONTS: [string, string, string][] = [
  ['playfair_display', 'Playfair Display', 'Serif'], ['cormorant_garamond', 'Cormorant Garamond', 'Serif'],
  ['libre_baskerville', 'Libre Baskerville', 'Serif'], ['eb_garamond', 'EB Garamond', 'Serif'],
  ['lora', 'Lora', 'Serif'], ['crimson_pro', 'Crimson Pro', 'Serif'], ['bodoni_moda', 'Bodoni Moda', 'Serif'],
  ['dm_serif_display', 'DM Serif Display', 'Serif'], ['italiana', 'Italiana', 'Serif'],
  ['great_vibes', 'Great Vibes', 'Script'], ['parisienne', 'Parisienne', 'Script'], ['sacramento', 'Sacramento', 'Script'],
  ['allura', 'Allura', 'Script'], ['pinyon_script', 'Pinyon Script', 'Script'], ['alex_brush', 'Alex Brush', 'Script'],
  ['montserrat', 'Montserrat', 'Sans-Serif'], ['poppins', 'Poppins', 'Sans-Serif'], ['josefin_sans', 'Josefin Sans', 'Sans-Serif'],
  ['raleway', 'Raleway', 'Sans-Serif'], ['work_sans', 'Work Sans', 'Sans-Serif'],
]

function ColorField({ title, value, fallback, onChange }: { title: string; value: string | null; fallback: string; onChange: (v: string | null) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value ?? '') ? (value as string) : fallback
  return (
    <div className="flex items-center gap-3">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent p-0.5" />
      <span className="flex-1 text-sm text-ink">{title}</span>
      {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-ink-soft underline hover:text-ink">Reset</button>}
    </div>
  )
}

export default function PortfolioEditorPage() {
  const router = useRouter()
  const [form, setForm] = useState<Profile | null>(null)
  const [saved, setSaved] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [step, setStep] = useState(1)
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone')
  const fileInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const [brandBusy, setBrandBusy] = useState<string | null>(null)
  const latest = useRef<{ save: () => void; dirty: boolean }>({ save: () => {}, dirty: false })

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/portfolio'); return }
    const { data, error } = await sb.from('profiles').select(COLUMNS).eq('id', sess.session.user.id).single()
    if (error || !data) { setMessage(error?.message ?? 'Could not load your profile.'); return }
    const p = { ...(data as Profile), section_order: normalizeOrder((data as Profile).section_order) }
    setForm(p)
    setSaved(p)
  }, [router])

  useEffect(() => { load() }, [load])

  function flash(text: string) {
    setMessage(text)
    setTimeout(() => setMessage((m) => (m === text ? null : m)), 2500)
  }

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f))
  }

  function move(key: string, dir: -1 | 1) {
    if (!form) return
    const order = [...(form.section_order ?? [])]
    const i = order.indexOf(key)
    const j = i + dir
    if (i < 0 || j < 0 || j >= order.length) return
    ;[order[i], order[j]] = [order[j], order[i]]
    setField('section_order', order)
  }

  const dirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved)

  async function save() {
    const sb = supabase
    if (!sb || !form) return
    const t = (v: string | null) => (v && v.trim() ? v.trim() : null)
    const patch = {
      studio_name: t(form.studio_name),
      bio: form.bio ?? null,
      service_city: t(form.service_city),
      service_state: t(form.service_state),
      website_url: t(form.website_url),
      instagram_url: t(form.instagram_url),
      facebook_url: t(form.facebook_url),
      pinterest_url: t(form.pinterest_url),
      tiktok_url: t(form.tiktok_url),
      show_portfolio_public: form.show_portfolio_public !== false,
      show_bio_public: form.show_bio_public !== false,
      show_pricing_public: form.show_pricing_public !== false,
      show_availability_public: form.show_availability_public !== false,
      show_faq_public: form.show_faq_public !== false,
      show_socials_public: form.show_socials_public !== false,
      section_order: form.section_order,
      accent_color: t(form.accent_color),
      portfolio_bg_color: t(form.portfolio_bg_color),
      title_color: t(form.title_color),
      location_color: t(form.location_color),
      paragraph_color: t(form.paragraph_color),
      portfolio_section_spacing: form.portfolio_section_spacing ?? 14,
      title_font: t(form.title_font),
      title_bold: form.title_bold ?? null,
      title_italic: form.title_italic ?? null,
      paragraph_font: t(form.paragraph_font),
      section_titles: form.section_titles ?? {},
      faq: (() => { const c = (form.faq ?? []).filter((f) => f.question.trim() || f.answer.trim()); return c.length ? c : null })(),
    }
    setSaving(true)
    const { error } = await sb.from('profiles').update(patch).eq('id', form.id)
    setSaving(false)
    if (error) { setMessage(error.message); return }
    setSaved(form)
    setPreviewKey((k) => k + 1)
    flash('Saved. Your portfolio is updated.')
  }

  async function uploadCover(file: File) {
    const sb = supabase
    if (!sb || !form) return
    setUploading(true)
    setMessage(null)
    try {
      const v = await makeVersions(file)
      const path = `${form.id}/cover_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const rest = (form.cover_paths ?? []).slice(1)
      const coverPaths = [path, ...rest]
      const { error } = await sb.from('profiles').update({ cover_path: path, cover_paths: coverPaths }).eq('id', form.id)
      if (error) throw error
      setForm((f) => (f ? { ...f, cover_path: path, cover_paths: coverPaths } : f))
      setSaved((s) => (s ? { ...s, cover_path: path, cover_paths: coverPaths } : s))
      setPreviewKey((k) => k + 1)
      flash('Cover photo updated')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload the cover photo.')
    } finally {
      setUploading(false)
    }
  }

  async function uploadBrand(kind: 'logo' | 'avatar', file: File) {
    const sb = supabase
    if (!sb || !form) return
    setBrandBusy(kind)
    setMessage(null)
    try {
      let blob: Blob = file
      let ext = 'jpg'
      let type = 'image/jpeg'
      if (kind === 'logo' && (file.type === 'image/png' || file.type === 'image/webp')) {
        if (file.size > 5_000_000) throw new Error('Logo must be under 5 MB.')
        ext = file.type === 'image/png' ? 'png' : 'webp'
        type = file.type
      } else {
        const v = await makeVersions(file)
        blob = v.web.blob
      }
      const path = `${form.id}/${kind}_${Date.now()}.${ext}`
      const up = await sb.storage.from('portfolio').upload(path, blob, { contentType: type, upsert: true })
      if (up.error) throw up.error
      const patch = kind === 'logo' ? { logo_path: path } : { avatar_path: path }
      const { error } = await sb.from('profiles').update(patch).eq('id', form.id)
      if (error) throw error
      setForm((f) => (f ? { ...f, ...patch } : f))
      setSaved((v) => (v ? { ...v, ...patch } : v))
      setPreviewKey((k) => k + 1)
      flash(kind === 'logo' ? 'Logo updated' : 'Profile photo updated')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload that image.')
    } finally {
      setBrandBusy(null)
    }
  }

  async function removeLogo() {
    const sb = supabase
    if (!sb || !form) return
    const { error } = await sb.from('profiles').update({ logo_path: null }).eq('id', form.id)
    if (error) { setMessage(error.message); return }
    setForm((f) => (f ? { ...f, logo_path: null } : f))
    setSaved((v) => (v ? { ...v, logo_path: null } : v))
    setPreviewKey((k) => k + 1)
    flash('Logo removed')
  }

  latest.current = { save, dirty }

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (latest.current.dirty) latest.current.save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const coverUrl = form?.cover_paths?.[0] ?? form?.cover_path
  const portfolioUrl = form?.public_token ? `/p/${form.public_token}` : null

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="portfolio" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!form ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Your website</p>
                <h1 className="font-fraunces text-3xl font-semibold text-ink">Portfolio</h1>
              </div>
              <div className="flex items-center gap-3">
                {message && <span className="text-sm text-twilight">{message}</span>}
                {portfolioUrl && (
                  <a href={portfolioUrl} target="_blank" rel="noreferrer" className={btnGhost}>View live site</a>
                )}
                <button className={btn} disabled={!dirty || saving} onClick={save}>
                  {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
                </button>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,540px)_1fr]">
              {/* Form */}
              <div className="space-y-5">
                <div className="mb-1">
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-twilight transition-all" style={{ width: `${(step / 4) * 100}%` }} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {(['About you', 'Photos', 'Look', 'Sections'] as const).map((t, i) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setStep(i + 1)}
                        className={`rounded-full px-4 py-1.5 ${step === i + 1 ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                      >
                        {i + 1}. {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={`space-y-5 ${step === 1 ? '' : 'hidden'}`}>
<section className={card}>
                  <p className={label}>Logo and profile photo</p>
                  <div className="flex flex-wrap gap-8">
                    <div>
                      <p className="mb-2 text-xs text-ink-soft">Logo. Replaces your studio name at the top.</p>
                      <div className="mb-2 flex h-16 w-40 items-center justify-center overflow-hidden rounded-xl bg-line">
                        {form.logo_path && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${STORAGE_BASE}${form.logo_path}`} alt="" className="max-h-full max-w-full object-contain" />
                          </>
                        )}
                      </div>
                      <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrand('logo', f); e.target.value = '' }} />
                      <div className="flex gap-3">
                        <button className={btnGhost} disabled={brandBusy === 'logo'} onClick={() => logoInput.current?.click()}>
                          {brandBusy === 'logo' ? 'Uploading…' : form.logo_path ? 'Change logo' : 'Add logo'}
                        </button>
                        {form.logo_path && <button type="button" className="text-xs text-ink-soft underline hover:text-ink" onClick={removeLogo}>Remove</button>}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-xs text-ink-soft">Profile photo. Shows in your About section.</p>
                      <div className="mb-2 h-16 w-16 overflow-hidden rounded-full bg-line">
                        {form.avatar_path && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`${STORAGE_BASE}${form.avatar_path}`} alt="" className="h-full w-full object-cover" />
                          </>
                        )}
                      </div>
                      <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBrand('avatar', f); e.target.value = '' }} />
                      <button className={btnGhost} disabled={brandBusy === 'avatar'} onClick={() => avatarInput.current?.click()}>
                        {brandBusy === 'avatar' ? 'Uploading…' : form.avatar_path ? 'Change photo' : 'Add photo'}
                      </button>
                    </div>
                  </div>
                </section>

<section className={`${card} space-y-4`}>
                  <div>
                    <label className={label}>Studio name</label>
                    <input className={input} value={form.studio_name ?? ''} onChange={(e) => setField('studio_name', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className={label}>City</label>
                      <input className={input} value={form.service_city ?? ''} onChange={(e) => setField('service_city', e.target.value)} />
                    </div>
                    <div>
                      <label className={label}>State</label>
                      <input className={input} value={form.service_state ?? ''} onChange={(e) => setField('service_state', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>About you</label>
                    <textarea
                      rows={6}
                      className={input}
                      value={form.bio ?? ''}
                      onChange={(e) => setField('bio', e.target.value)}
                      placeholder="Tell clients who you are and how you shoot."
                    />
                  </div>
                </section>

<section className={`${card} space-y-4`}>
                  <p className="text-sm font-medium text-ink">Links</p>
                  {(
                    [
                      ['website_url', 'Website'],
                      ['instagram_url', 'Instagram'],
                      ['facebook_url', 'Facebook'],
                      ['pinterest_url', 'Pinterest'],
                      ['tiktok_url', 'TikTok'],
                    ] as [keyof Profile, string][]
                  ).map(([key, name]) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-ink-soft">{name}</label>
                      <input
                        className={input}
                        value={(form[key] as string | null) ?? ''}
                        onChange={(e) => setField(key, e.target.value as never)}
                        placeholder="https://"
                      />
                    </div>
                  ))}
                </section>
                </div>
                <div className={`space-y-5 ${step === 2 ? '' : 'hidden'}`}>
<section className={card}>
                  <p className={label}>Cover photo</p>
                  <div className="flex items-center gap-4">
                    <div className="h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-line">
                      {coverUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${STORAGE_BASE}${coverUrl}`} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,.heic,.heif"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = '' }}
                      />
                      <button className={btnGhost} disabled={uploading} onClick={() => fileInput.current?.click()}>
                        {uploading ? 'Uploading…' : coverUrl ? 'Change photo' : 'Add photo'}
                      </button>
                      <p className="mt-2 text-xs text-ink-soft">Cover size, shape and rotation are set in the app for now.</p>
                    </div>
                  </div>
                </section>

<section className={`${card} space-y-3`}>
                  <p className="text-sm font-medium text-ink">Photos and testimonials</p>
                  <a href="/portfolio/photos" className="block rounded-xl border border-line px-4 py-3 text-sm text-ink hover:border-twilight">Featured photo sets</a>
                  <a href="/portfolio/testimonials" className="block rounded-xl border border-line px-4 py-3 text-sm text-ink hover:border-twilight">Testimonials</a>
                  <p className="text-xs text-ink-soft">You will be asked to confirm if you leave with unsaved changes.</p>
                </section>
                </div>
                <div className={`space-y-5 ${step === 3 ? '' : 'hidden'}`}>
<section className={`${card} space-y-4`}>
                  <p className="text-sm font-medium text-ink">Fonts</p>
                  <div>
                    <label className={label}>Studio name font</label>
                    <select className={input} value={form.title_font ?? ''} onChange={(e) => setField('title_font', e.target.value || null)}>
                      <option value="">Default</option>
                      {FONTS.map(([k, n, c]) => <option key={k} value={k}>{n} ({c})</option>)}
                    </select>
                    <div className="mt-2 flex gap-5 text-sm text-ink">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.title_bold === true} onChange={(e) => setField('title_bold', e.target.checked)} />Bold</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={form.title_italic === true} onChange={(e) => setField('title_italic', e.target.checked)} />Italic</label>
                    </div>
                  </div>
                  <div>
                    <label className={label}>Body text font</label>
                    <select className={input} value={form.paragraph_font ?? ''} onChange={(e) => setField('paragraph_font', e.target.value || null)}>
                      <option value="">Default</option>
                      {FONTS.map(([k, n, c]) => <option key={k} value={k}>{n} ({c})</option>)}
                    </select>
                  </div>
                </section>

<section className={`${card} space-y-4`}>
                  <p className="text-sm font-medium text-ink">Colors and spacing</p>
                  <ColorField title="Page background" value={form.portfolio_bg_color} fallback="#F9F9F9" onChange={(v) => setField('portfolio_bg_color', v)} />
                  <ColorField title="Studio name and headings" value={form.title_color} fallback="#A57E60" onChange={(v) => setField('title_color', v)} />
                  <ColorField title="Body text" value={form.paragraph_color} fallback="#202020" onChange={(v) => setField('paragraph_color', v)} />
                  <ColorField title="Location text" value={form.location_color} fallback="#202020" onChange={(v) => setField('location_color', v)} />
                  <ColorField title="Accent and buttons" value={form.accent_color} fallback="#A9545F" onChange={(v) => setField('accent_color', v)} />
                  <div>
                    <label className={label}>Space between sections</label>
                    <input
                      type="range" min={0} max={48}
                      value={form.portfolio_section_spacing ?? 14}
                      onChange={(e) => setField('portfolio_section_spacing', Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </section>
                </div>
                <div className={`space-y-5 ${step === 4 ? '' : 'hidden'}`}>
<section className={card}>
                  <p className="mb-1 text-sm font-medium text-ink">Sections</p>
                  <p className="mb-4 text-xs text-ink-soft">Turn sections on or off and reorder them with the arrows.</p>
                  <ul className="divide-y divide-line">
                    {(form.section_order ?? []).map((key, i, arr) => {
                      const toggle = TOGGLE[key]
                      const on = toggle ? form[toggle] !== false : true
                      return (
                        <li key={key} className="flex items-center gap-3 py-3">
                          <div className="flex flex-col">
                            <button disabled={i === 0} onClick={() => move(key, -1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move up">▲</button>
                            <button disabled={i === arr.length - 1} onClick={() => move(key, 1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move down">▼</button>
                          </div>
                          <span className={`flex-1 text-sm ${on ? 'text-ink' : 'text-ink-soft line-through'}`}>{LABELS[key]}</span>
                          {toggle ? (
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={(e) => setField(toggle, e.target.checked as never)}
                              className="h-5 w-5"
                              aria-label={`Show ${LABELS[key]}`}
                            />
                          ) : (
                            <span className="text-xs text-ink-soft">Shows when you have some</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </section>

<section className={`${card} space-y-3`}>
                  <p className="text-sm font-medium text-ink">Section names</p>
                  <p className="text-xs text-ink-soft">Rename the headings on your portfolio. Leave blank to use the default.</p>
                  {DEFAULT_ORDER.map((key) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-ink-soft">{LABELS[key]}</label>
                      <input
                        className={input}
                        value={form.section_titles?.[key] ?? ''}
                        placeholder={LABELS[key]}
                        onChange={(e) => {
                          const next = { ...(form.section_titles ?? {}) }
                          if (e.target.value) next[key] = e.target.value
                          else delete next[key]
                          setField('section_titles', next)
                        }}
                      />
                    </div>
                  ))}
                </section>

<section className={`${card} space-y-4`}>
                  <p className="text-sm font-medium text-ink">FAQ</p>
                  {(form.faq ?? []).map((item, i) => (
                    <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                      <input
                        className={input}
                        placeholder="Question"
                        value={item.question}
                        onChange={(e) => setField('faq', (form.faq ?? []).map((f, j) => (j === i ? { ...f, question: e.target.value } : f)))}
                      />
                      <textarea
                        rows={3}
                        className={input}
                        placeholder="Answer"
                        value={item.answer}
                        onChange={(e) => setField('faq', (form.faq ?? []).map((f, j) => (j === i ? { ...f, answer: e.target.value } : f)))}
                      />
                      <button type="button" className="text-xs text-ink-soft underline hover:text-ink" onClick={() => setField('faq', (form.faq ?? []).filter((_, j) => j !== i))}>
                        Remove
                      </button>
                    </div>
                  ))}
                  <button type="button" className={btnGhost} onClick={() => setField('faq', [...(form.faq ?? []), { question: '', answer: '' }])}>
                    Add a question
                  </button>
                </section>

                <section className={`${card} text-center`}>
                  <p className="font-fraunces text-xl font-semibold text-ink">You&apos;re all set</p>
                  <p className="mt-1 text-sm text-ink-soft">Save your changes, then take a look at your live site.</p>
                  {portfolioUrl && (
                    <a href={portfolioUrl} target="_blank" rel="noreferrer" className={`${btn} mt-4 inline-block`}>View live site</a>
                  )}
                </section>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button type="button" className={btnGhost} disabled={step === 1} onClick={() => { if (dirty) save(); setStep(step - 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Back</button>
                  {step < 4 && <button type="button" className={btn} onClick={() => { if (dirty) save(); setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Next</button>}
                </div>

                <p className="text-xs text-ink-soft">
                  Photo layouts and packages are edited in the Camrhia app for now. Anything you change here shows up there too.
                </p>
              </div>

              {/* Preview */}
              <div id="portfolio-preview" className="lg:sticky lg:top-6 lg:self-start">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-ink">Live preview</p>
                  <div className="flex gap-2 text-sm">
                    <button
                      onClick={() => setDevice('phone')}
                      className={`rounded-full px-4 py-1.5 ${device === 'phone' ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                    >
                      Phone
                    </button>
                    <button
                      onClick={() => setDevice('desktop')}
                      className={`rounded-full px-4 py-1.5 ${device === 'desktop' ? 'bg-twilight text-white' : 'border border-line text-ink'}`}
                    >
                      Desktop
                    </button>
                  </div>
                </div>
                {portfolioUrl ? (
                  <div className="flex justify-center overflow-hidden rounded-2xl border border-line bg-line/50 p-3">
                    <iframe
                      key={previewKey}
                      src={portfolioUrl}
                      title="Portfolio preview"
                      className="h-[calc(100vh-14rem)] min-h-[520px] rounded-xl bg-white"
                      style={{ width: device === 'phone' ? 390 : '100%', maxWidth: '100%' }}
                    />
                  </div>
                ) : (
                  <p className="rounded-2xl border border-line bg-card p-8 text-center text-sm text-ink-soft">
                    Your portfolio link isn&apos;t set up yet. Finish setting up your portfolio in the app first.
                  </p>
                )}
              </div>
            </div>
            <a href="#portfolio-preview" className="fixed bottom-5 right-5 z-40 rounded-full bg-twilight px-5 py-3 text-sm font-medium text-white shadow-lg lg:hidden">Preview</a>
          </>
        )}
      </main>
    </div>
  )
}
