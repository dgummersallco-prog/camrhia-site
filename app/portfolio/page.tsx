'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Profile = {
  id: string
  public_token: string | null
  is_listed: boolean | null
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
  'id, is_listed, public_token, studio_name, bio, service_city, service_state, website_url, instagram_url, facebook_url, pinterest_url, tiktok_url, cover_path, cover_paths, logo_path, avatar_path, show_portfolio_public, show_bio_public, show_pricing_public, show_availability_public, show_faq_public, show_socials_public, section_order, accent_color, portfolio_bg_color, title_color, location_color, paragraph_color, portfolio_section_spacing, faq, title_font, title_bold, title_italic, paragraph_font, section_titles'

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
  const [open, setOpen] = useState<string | null>(null)
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

  const EDITOR_TITLES: Record<string, string> = {
    cover: 'Cover photo', name: 'Studio name', location: 'Location', master: 'Master style',
    background: 'Background', spacing: 'Section spacing', message: 'Message button', listed: 'List me publicly', ...LABELS,
  }
  const STYLE_KEYS = ['cover', 'name', 'location', 'master', 'background', 'spacing', 'message']

  function summary(key: string): string {
    if (!form) return ''
    const links = [form.website_url, form.instagram_url, form.facebook_url, form.pinterest_url, form.tiktok_url].filter(Boolean).length
    switch (key) {
      case 'cover': return coverUrl ? 'Photo added' : 'Add your cover photo'
      case 'name': return form.studio_name || 'Add your studio name'
      case 'location': return [form.service_city, form.service_state].filter(Boolean).join(', ') || 'Add your city and state'
      case 'master': { const f = FONTS.find(([k]) => k === form.title_font); return f ? f[1] : 'Fonts and text colors' }
      case 'background': return form.portfolio_bg_color ?? 'Default color'
      case 'spacing': return `${form.portfolio_section_spacing ?? 14} px between sections`
      case 'message': return 'Button color'
      case 'about': return form.bio ? 'Written' : 'Tell clients who you are'
      case 'featured_photos': return 'Your photo sets'
      case 'testimonials': return 'Kind words from clients'
      case 'pricing': return 'Packages and prices'
      case 'openings': return 'Open dates'
      case 'faq': { const n = (form.faq ?? []).length; return n ? `${n} question${n === 1 ? '' : 's'}` : 'Add common questions' }
      case 'links': return links ? `${links} link${links === 1 ? '' : 's'}` : 'Website and social'
      case 'listed': return form.is_listed ? 'Clients can find you on Camrhia' : 'Hidden from search'
      default: return ''
    }
  }

  async function setListed(v: boolean) {
    const sb = supabase
    if (!sb || !form) return
    const { error } = await sb.from('profiles').update({ is_listed: v }).eq('id', form.id)
    if (error) { flash(error.message); return }
    setForm((f) => (f ? { ...f, is_listed: v } : f))
    setSaved((f) => (f ? { ...f, is_listed: v } : f))
    flash(v ? 'You are now listed' : 'You are now hidden')
  }

  function goBack() {
    if (dirty) save()
    setOpen(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function hubRow(key: string, extra?: ReactNode, dim?: boolean) {
    return (
      <div key={key} className="flex items-center gap-2 rounded-2xl border border-line bg-card pr-3 transition hover:border-twilight">
        <button type="button" onClick={() => { setOpen(key); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left">
          <span className="flex-1">
            <span className={`block text-sm font-medium ${dim ? 'text-ink-soft' : 'text-ink'}`}>{EDITOR_TITLES[key]}</span>
            <span className="block text-xs text-ink-soft">{summary(key)}</span>
          </span>
          <span className="text-lg text-ink-soft">›</span>
        </button>
        {extra}
      </div>
    )
  }

  function groupHeading(text: string, sub: string) {
    return (
      <div className="mb-3 mt-8 first:mt-0">
        <p className="font-mono text-xs uppercase tracking-widest text-brass">{text}</p>
        <p className="mt-1 text-xs text-ink-soft">{sub}</p>
      </div>
    )
  }

  function headingField(key: string) {
    return (
      <div>
        <label className={label}>Heading on your site</label>
        <input
          className={input}
          value={form?.section_titles?.[key] ?? ''}
          placeholder={LABELS[key]}
          onChange={(e) => {
            const next = { ...(form?.section_titles ?? {}) }
            if (e.target.value) next[key] = e.target.value
            else delete next[key]
            setField('section_titles', next)
          }}
        />
      </div>
    )
  }

  function showToggle(key: string) {
    const toggle = TOGGLE[key]
    if (!toggle || !form) return null
    return (
      <label className="flex items-center gap-3 text-sm text-ink">
        <input type="checkbox" className="h-5 w-5" checked={form[toggle] !== false} onChange={(e) => setField(toggle, e.target.checked as never)} />
        Show this section on my site
      </label>
    )
  }

  function editorBody(key: string): ReactNode {
    if (!form) return null
    const sec = (children: ReactNode) => <section className={`${card} space-y-4`}>{children}</section>
    switch (key) {
      case 'cover':
        return sec(
          <>
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
          </>,
        )
      case 'name':
        return sec(
          <>
            <div>
              <label className={label}>Studio name</label>
              <input className={input} value={form.studio_name ?? ''} onChange={(e) => setField('studio_name', e.target.value)} />
            </div>
            <div>
              <p className={label}>Logo</p>
              <p className="mb-2 text-xs text-ink-soft">Replaces your studio name at the top.</p>
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
          </>,
        )
      case 'location':
        return sec(
          <>
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
            <ColorField title="Location text color" value={form.location_color} fallback="#202020" onChange={(v) => setField('location_color', v)} />
          </>,
        )
      case 'master':
        return sec(
          <>
            <div>
              <label className={label}>Heading font</label>
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
            <ColorField title="Headings" value={form.title_color} fallback="#A57E60" onChange={(v) => setField('title_color', v)} />
            <ColorField title="Body text" value={form.paragraph_color} fallback="#202020" onChange={(v) => setField('paragraph_color', v)} />
          </>,
        )
      case 'background':
        return sec(<ColorField title="Page background" value={form.portfolio_bg_color} fallback="#F9F9F9" onChange={(v) => setField('portfolio_bg_color', v)} />)
      case 'spacing':
        return sec(
          <div>
            <label className={label}>Space between sections</label>
            <input type="range" min={0} max={48} value={form.portfolio_section_spacing ?? 14}
              onChange={(e) => setField('portfolio_section_spacing', Number(e.target.value))} className="w-full" />
            <p className="mt-1 text-xs text-ink-soft">{form.portfolio_section_spacing ?? 14} px</p>
          </div>,
        )
      case 'message':
        return sec(
          <>
            <ColorField title="Message button color" value={form.accent_color} fallback="#A9545F" onChange={(v) => setField('accent_color', v)} />
            <p className="text-xs text-ink-soft">Button text, size and shape are set in the app for now.</p>
          </>,
        )
      case 'about':
        return sec(
          <>
            <div>
              <p className={label}>Profile photo</p>
              <p className="mb-2 text-xs text-ink-soft">Shows in your About section.</p>
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
            <div>
              <label className={label}>About you</label>
              <textarea rows={6} className={input} value={form.bio ?? ''} onChange={(e) => setField('bio', e.target.value)}
                placeholder="Tell clients who you are and how you shoot." />
            </div>
            {headingField('about')}
            {showToggle('about')}
          </>,
        )
      case 'featured_photos':
        return sec(
          <>
            <a href="/portfolio/photos" className={`${btnGhost} inline-block`}>Open your featured photo sets</a>
            <p className="text-xs text-ink-soft">You will be asked to confirm if you leave with unsaved changes.</p>
            {headingField('featured_photos')}
            {showToggle('featured_photos')}
          </>,
        )
      case 'testimonials':
        return sec(
          <>
            <a href="/portfolio/testimonials" className={`${btnGhost} inline-block`}>Open your testimonials</a>
            {headingField('testimonials')}
            <p className="text-xs text-ink-soft">Shows when you have some.</p>
          </>,
        )
      case 'pricing':
        return sec(
          <>
            <p className="text-sm text-ink-soft">Packages and prices are edited in the Camrhia app for now. Anything you change there shows up on your site.</p>
            {headingField('pricing')}
            {showToggle('pricing')}
          </>,
        )
      case 'openings':
        return sec(
          <>
            <p className="text-sm text-ink-soft">Your open dates are managed in the Camrhia app. Turn the section on or off here.</p>
            {headingField('openings')}
            {showToggle('openings')}
          </>,
        )
      case 'faq':
        return sec(
          <>
            {(form.faq ?? []).map((item, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-line p-3">
                <input className={input} placeholder="Question" value={item.question}
                  onChange={(e) => setField('faq', (form.faq ?? []).map((f, j) => (j === i ? { ...f, question: e.target.value } : f)))} />
                <textarea rows={3} className={input} placeholder="Answer" value={item.answer}
                  onChange={(e) => setField('faq', (form.faq ?? []).map((f, j) => (j === i ? { ...f, answer: e.target.value } : f)))} />
                <button type="button" className="text-xs text-ink-soft underline hover:text-ink"
                  onClick={() => setField('faq', (form.faq ?? []).filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className={btnGhost} onClick={() => setField('faq', [...(form.faq ?? []), { question: '', answer: '' }])}>Add a question</button>
            {headingField('faq')}
            {showToggle('faq')}
          </>,
        )
      case 'links':
        return sec(
          <>
            {(
              [
                ['website_url', 'Website'],
                ['instagram_url', 'Instagram'],
                ['facebook_url', 'Facebook'],
                ['pinterest_url', 'Pinterest'],
                ['tiktok_url', 'TikTok'],
              ] as [keyof Profile, string][]
            ).map(([k, name]) => (
              <div key={k}>
                <label className="mb-1 block text-xs text-ink-soft">{name}</label>
                <input className={input} value={(form[k] as string | null) ?? ''} onChange={(e) => setField(k, e.target.value as never)} placeholder="https://" />
              </div>
            ))}
            {headingField('links')}
            {showToggle('links')}
          </>,
        )
      case 'listed':
        return sec(
          <>
            <label className="flex items-start gap-3 text-sm text-ink">
              <input type="checkbox" className="mt-0.5 h-5 w-5" checked={form.is_listed === true} onChange={(e) => setListed(e.target.checked)} />
              <span>
                List me publicly
                <span className="mt-1 block text-xs text-ink-soft">
                  Lets clients browsing Camrhia find your portfolio. Your own portfolio link works either way. This saves right away.
                </span>
              </span>
            </label>
          </>,
        )
      default:
        return null
    }
  }

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
                <h1 className="font-fraunces text-3xl font-semibold text-ink">Your website</h1>
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
                {open === null ? (
                  <div>
                    {groupHeading('Portfolio style', 'The look and feel of your site.')}
                    <div className="space-y-2.5">{STYLE_KEYS.map((k) => hubRow(k))}</div>

                    {groupHeading('Sections', 'Turn sections on or off and reorder them with the arrows.')}
                    <div className="space-y-2.5">
                      {(form.section_order ?? []).map((key, i, arr) => {
                        const toggle = TOGGLE[key]
                        const on = toggle ? form[toggle] !== false : true
                        return hubRow(
                          key,
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                              <button type="button" disabled={i === 0} onClick={() => move(key, -1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move up">▲</button>
                              <button type="button" disabled={i === arr.length - 1} onClick={() => move(key, 1)} className="px-1 text-xs text-ink-soft hover:text-ink disabled:opacity-30" aria-label="Move down">▼</button>
                            </div>
                            {toggle ? (
                              <input type="checkbox" checked={on} onChange={(e) => setField(toggle, e.target.checked as never)} className="h-5 w-5" aria-label={`Show ${LABELS[key]}`} />
                            ) : null}
                          </div>,
                          !on,
                        )
                      })}
                    </div>

                    {groupHeading('Visibility', 'Who can find you.')}
                    <div className="space-y-2.5">{hubRow('listed')}</div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <button type="button" className="text-sm text-ink-soft hover:text-ink" onClick={goBack}>← All sections</button>
                    <h2 className="font-fraunces text-2xl font-semibold text-ink">{EDITOR_TITLES[open]}</h2>
                    {editorBody(open)}
                    <button type="button" className={btn} onClick={goBack}>Done</button>
                  </div>
                )}

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
