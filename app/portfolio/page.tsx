'use client'

import { Select } from '@/app/components/Select'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ABOUT_SHAPES, ABOUT_SIZES, aboutPhotoStyle } from '@/lib/aboutPhoto'

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
  cover_slideshow: boolean | null
  logo_path: string | null
  avatar_path: string | null
  about_photo_path: string | null
  show_about_photo: boolean | null
  about_photo_shape: string | null
  about_photo_size: string | null
  cover_style: string | null
  cover_scale: number | null
  cover_style_web: string | null
  cover_scale_web: number | null
  logo_height: number | null
  desktop_overrides: Record<string, number> | null
  title_font_size: number | null
  location_font_size: number | null
  portfolio_title_spacing: number | null
  show_name_with_logo: boolean | null
  openings_display_mode: string | null
  openings_badge_text: string | null
  openings_badge_color: string | null
  message_btn_text: string | null
  message_btn_bg_color: string | null
  message_btn_color: string | null
  message_btn_font_size: number | null
  message_btn_width: number | null
  message_btn_align: string | null
  message_btn_bold: boolean | null
  message_btn_italic: boolean | null
  message_btn_show_icon: boolean | null
  show_portfolio_public: boolean | null
  show_bio_public: boolean | null
  show_pricing_public: boolean | null
  show_availability_public: boolean | null
  show_faq_public: boolean | null
  show_socials_public: boolean | null
  show_testimonials_public: boolean | null
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
  brand_colors_named: Record<string, string | null> | null
}

const COLUMNS =
  'id, is_listed, public_token, studio_name, bio, service_city, service_state, website_url, instagram_url, facebook_url, pinterest_url, tiktok_url, cover_path, cover_paths, cover_slideshow, logo_path, avatar_path, about_photo_path, show_about_photo, about_photo_shape, about_photo_size, cover_style, cover_scale, cover_style_web, cover_scale_web, logo_height, show_name_with_logo, desktop_overrides, title_font_size, location_font_size, portfolio_title_spacing, openings_display_mode, openings_badge_text, openings_badge_color, message_btn_text, message_btn_bg_color, message_btn_color, message_btn_font_size, message_btn_width, message_btn_align, message_btn_bold, message_btn_italic, message_btn_show_icon, show_portfolio_public, show_bio_public, show_pricing_public, show_availability_public, show_faq_public, show_socials_public, show_testimonials_public, section_order, accent_color, portfolio_bg_color, title_color, location_color, paragraph_color, portfolio_section_spacing, faq, title_font, title_bold, title_italic, paragraph_font, section_titles, brand_colors_named'

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
  testimonials: 'show_testimonials_public',
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

const BRAND_ROLES: { key: string; label: string; sub: string; preset: string }[] = [
  { key: 'primary',   label: 'Primary',   sub: 'Main brand identity. Your app accent.', preset: '#A9545F' },
  { key: 'secondary', label: 'Secondary', sub: 'Badges, and your booked calendar color.', preset: '#5E7F5A' },
  { key: 'accent',    label: 'Accent',    sub: 'Buttons, links, and your hold calendar color.', preset: '#B5654B' },
  { key: 'neutral1',  label: 'Neutral 1', sub: 'Background or text.', preset: '#FAF6EF' },
  { key: 'neutral2',  label: 'Neutral 2', sub: 'Background or text.', preset: '#2A1F24' },
]

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

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-twilight' : 'bg-line'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function SortableRow({ id, render }: { id: string; render: (h: { attributes: Record<string, unknown>; listeners: Record<string, unknown> | undefined }) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, position: 'relative', zIndex: isDragging ? 20 : undefined, opacity: isDragging ? 0.9 : 1 }}>
      {render({ attributes: attributes as unknown as Record<string, unknown>, listeners: listeners as Record<string, unknown> | undefined })}
    </div>
  )
}

function ColorField({ title, value, fallback, onChange, swatches }: { title: string; value: string | null; fallback: string; onChange: (v: string | null) => void; swatches?: string[] }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value ?? '') ? (value as string) : fallback
  return (
    <div>
      <div className="flex items-center gap-3">
        <input type="color" value={hex} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent p-0.5" />
        <span className="flex-1 text-sm text-ink">{title}</span>
        {value && <button type="button" onClick={() => onChange(null)} className="text-xs text-ink-soft underline hover:text-ink">Reset</button>}
      </div>
      {swatches && swatches.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[60px]">
          <span className="mr-1 text-[11px] text-ink-soft">Brand</span>
          {swatches.map((c) => (
            <button key={c} type="button" aria-label={`Use ${c}`} onClick={() => onChange(c.toUpperCase())}
              className="h-5 w-5 rounded-full border border-line" style={{ backgroundColor: c }} />
          ))}
        </div>
      )}
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
  const device: 'phone' | 'desktop' = 'phone'
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null)
  const [stageW, setStageW] = useState(0)
  const formRef = useRef<Profile | null>(null)
  const sendPreview = useCallback(() => {
    const f = formRef.current
    if (!f) return
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, public_token: _pt, ...patch } = f as unknown as Record<string, unknown>
    const frame = document.getElementById('portfolio-frame') as HTMLIFrameElement | null
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
  const fileInput = useRef<HTMLInputElement>(null)
  const coverTarget = useRef<number | null>(0)
  const logoInput = useRef<HTMLInputElement>(null)
  const avatarInput = useRef<HTMLInputElement>(null)
  const aboutInput = useRef<HTMLInputElement>(null)
  const [brandBusy, setBrandBusy] = useState<string | null>(null)
  const latest = useRef<{ save: () => void; dirty: boolean }>({ save: () => {}, dirty: false })
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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
      show_testimonials_public: form.show_testimonials_public !== false,
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
      cover_style: form.cover_style ?? 'standard',
      cover_scale: form.cover_scale ?? 1,
      cover_style_web: form.cover_style_web ?? null,
      cover_scale_web: form.cover_scale_web ?? null,
      cover_slideshow: form.cover_slideshow === true,
      logo_height: form.logo_height ?? null,
      show_name_with_logo: form.show_name_with_logo === true,
      desktop_overrides: form.desktop_overrides ?? {},
      title_font_size: form.title_font_size ?? null,
      location_font_size: form.location_font_size ?? null,
      portfolio_title_spacing: form.portfolio_title_spacing ?? 10,
      openings_display_mode: form.openings_display_mode ?? 'date_check',
      openings_badge_text: t(form.openings_badge_text),
      openings_badge_color: t(form.openings_badge_color),
      message_btn_text: t(form.message_btn_text),
      message_btn_bg_color: t(form.message_btn_bg_color),
      message_btn_color: t(form.message_btn_color),
      message_btn_font_size: form.message_btn_font_size ?? null,
      message_btn_width: form.message_btn_width ?? null,
      message_btn_align: form.message_btn_align ?? null,
      message_btn_bold: form.message_btn_bold ?? null,
      message_btn_italic: form.message_btn_italic ?? null,
      message_btn_show_icon: form.message_btn_show_icon !== false,
      show_about_photo: form.show_about_photo !== false,
      about_photo_shape: form.about_photo_shape ?? 'portrait',
      about_photo_size: form.about_photo_size ?? 'large',
      ...(form.brand_colors_named ? {
        brand_colors_named: form.brand_colors_named,
        brand_colors: BRAND_ROLES.map((r) => form.brand_colors_named?.[r.key]).filter((c): c is string => !!c),
      } : {}),
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

  async function removeCover(i: number) {
    const sb = supabase
    if (!sb || !form) return
    const current = form.cover_paths?.length ? form.cover_paths : (form.cover_path ? [form.cover_path] : [])
    if (current.length <= 1) return
    const gone = current[i]
    const next = current.filter((_, k) => k !== i)
    const { error } = await sb.from('profiles').update({ cover_path: next[0], cover_paths: next }).eq('id', form.id)
    if (error) { setMessage(error.message); return }
    setForm((f) => (f ? { ...f, cover_path: next[0], cover_paths: next } : f))
    setSaved((v) => (v ? { ...v, cover_path: next[0], cover_paths: next } : v))
    setPreviewKey((k) => k + 1)
    await sb.storage.from('portfolio').remove([gone])
  }

  async function uploadCover(file: File, index: number | null = 0) {
    const sb = supabase
    if (!sb || !form) return
    setUploading(true)
    setMessage(null)
    try {
      const v = await makeVersions(file)
      const path = `${form.id}/cover_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const current = form.cover_paths?.length ? form.cover_paths : (form.cover_path ? [form.cover_path] : [])
      const coverPaths = index == null
        ? [...current, path].slice(0, 5)
        : (current.length ? current.map((p, k) => (k === index ? path : p)) : [path])
      const old = index == null ? null : (current[index] ?? null)
      const { error } = await sb.from('profiles').update({ cover_path: coverPaths[0], cover_paths: coverPaths }).eq('id', form.id)
      if (error) throw error
      setForm((f) => (f ? { ...f, cover_path: coverPaths[0], cover_paths: coverPaths } : f))
      setSaved((s) => (s ? { ...s, cover_path: coverPaths[0], cover_paths: coverPaths } : s))
      if (old && old !== path) await sb.storage.from('portfolio').remove([old])
      setPreviewKey((k) => k + 1)
      flash('Cover photo updated')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload the cover photo.')
    } finally {
      setUploading(false)
    }
  }

  async function uploadAbout(file: File) {
    const sb = supabase
    if (!sb || !form) return
    setBrandBusy('about')
    setMessage(null)
    try {
      const v = await makeVersions(file)
      const path = `${form.id}/about_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      const { error } = await sb.from('profiles').update({ about_photo_path: path }).eq('id', form.id)
      if (error) throw error
      setForm((f) => (f ? { ...f, about_photo_path: path } : f))
      setSaved((v2) => (v2 ? { ...v2, about_photo_path: path } : v2))
      setPreviewKey((k) => k + 1)
      flash('About photo updated')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload that image.')
    } finally {
      setBrandBusy(null)
    }
  }

  async function removeAbout() {
    const sb = supabase
    if (!sb || !form) return
    const { error } = await sb.from('profiles').update({ about_photo_path: null }).eq('id', form.id)
    if (error) { setMessage(error.message); return }
    setForm((f) => (f ? { ...f, about_photo_path: null } : f))
    setSaved((v2) => (v2 ? { ...v2, about_photo_path: null } : v2))
    setPreviewKey((k) => k + 1)
    flash('About photo removed')
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

  const brandSwatches = Object.values(form?.brand_colors_named ?? {}).filter((c): c is string => !!c)
  const EDITOR_TITLES: Record<string, string> = {
    brand: 'Brand colors', cover: 'Cover photo', name: 'Studio name', location: 'Location', master: 'Master style',
    background: 'Background', spacing: 'Section spacing', message: 'Message button', listed: 'List me publicly', ...LABELS,
  }
  const STYLE_KEYS = ['brand', 'cover', 'name', 'location', 'master', 'background', 'spacing', 'message']

  function summary(key: string): string {
    if (!form) return ''
    const links = [form.website_url, form.instagram_url, form.facebook_url, form.pinterest_url, form.tiktok_url].filter(Boolean).length
    switch (key) {
      case 'brand': { const n = Object.values(form.brand_colors_named ?? {}).filter(Boolean).length; return n ? `${n} of 5 colors set` : 'Your five brand colors' }
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

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id || !form) return
    const order = form.section_order ?? []
    const from = order.indexOf(String(active.id))
    const to = order.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    setField('section_order', arrayMove(order, from, to))
  }

  function goBack() {
    if (dirty) save()
    setOpen(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function hubRow(key: string, extra?: ReactNode, dim?: boolean, lead?: ReactNode) {
    return (
      <div key={key} className="flex items-center gap-2 rounded-2xl border border-line bg-card pr-3 transition hover:border-twilight">
        {lead}
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
        <Toggle on={form[toggle] !== false} onChange={(v) => setField(toggle, v as never)} label="Show this section on my site" />
        Show this section on my site
      </label>
    )
  }

  function editorBody(key: string): ReactNode {
    const isDesk = device === 'desktop'
    const ovMap = (form?.desktop_overrides ?? {}) as Record<string, number>
    const eff = (k: string, phoneVal: number): number => (isDesk && ovMap[k] !== undefined ? ovMap[k] : phoneVal)
    const setV = (phoneField: keyof Profile, k: string, v: number) => {
      if (isDesk) setField('desktop_overrides', { ...ovMap, [k]: v })
      else setField(phoneField, v as never)
    }
    const matchPhone = (k: string) => {
      const next = { ...ovMap }
      delete next[k]
      setField('desktop_overrides', next)
    }
    const deviceBar = () => null
    const deviceSlider = (title: string, phoneField: keyof Profile, ovKey: string, min: number, max: number, step: number, phoneDefault: number, factor = 1, unit = 'px') => {
      const phoneVal = Number((form as unknown as Record<string, unknown>)?.[phoneField as string] ?? phoneDefault)
      const hasOv = isDesk && ovMap[ovKey] !== undefined
      const val = eff(ovKey, phoneVal)
      return (
        <div>
          <div className="flex items-center justify-between">
            <p className={label}>{title}</p>
            {hasOv && <button type="button" className="text-xs font-medium text-twilight hover:underline" onClick={() => matchPhone(ovKey)}>Match phone</button>}
          </div>
          <input type="range" min={min} max={max} step={step} value={Math.round(val * factor)}
            onChange={(e) => setV(phoneField, ovKey, Number(e.target.value) / factor)} className="w-full accent-[var(--color-twilight)]" />
          <p className="text-xs text-ink-soft">{Math.round(val * factor)} {unit}</p>
        </div>
      )
    }
    if (!form) return null
    const sec = (children: ReactNode) => <section className={`${card} space-y-4`}>{children}</section>
    switch (key) {
      case 'brand': {
        const named = form.brand_colors_named ?? {}
        return sec(
          <>
            <p className="text-xs text-ink-soft">
              Your five brand colors. They show up as swatches in every color picker on your website and in the Camrhia app, and changes here appear in the app too.
            </p>
            {BRAND_ROLES.map((r) => (
              <div key={r.key}>
                <ColorField title={r.label} value={named[r.key] ?? null} fallback={r.preset}
                  onChange={(v) => setField('brand_colors_named', { ...named, [r.key]: v })} />
                <p className="mt-1 pl-[60px] text-xs text-ink-soft">{r.sub}</p>
              </div>
            ))}
          </>,
        )
      }
      case 'cover': {
        const shapes: { key: string; label: string; sub: string; ratio: number }[] = [
          { key: 'standard', label: 'Standard', sub: 'Classic 16:9', ratio: 16 / 9 },
          { key: 'tall', label: 'Tall', sub: 'Portrait 4:5', ratio: 4 / 5 },
          { key: 'wide', label: 'Wide', sub: 'Banner 21:9', ratio: 21 / 9 },
          { key: 'full', label: 'Full screen', sub: 'Phone 9:16', ratio: 9 / 16 },
        ]
        const isDesk = device === 'desktop'
        const curStyle = (isDesk ? form.cover_style_web ?? form.cover_style : form.cover_style) ?? 'standard'
        const rawScale = isDesk ? form.cover_scale_web ?? form.cover_scale : form.cover_scale
        const curScale = Math.min(1, Math.max(0.5, Number(rawScale ?? 1) || 1))
        const ratio = shapes.find((x) => x.key === curStyle)?.ratio ?? 16 / 9
        const baseW = Math.min(240, 180 * ratio)
        const bw = baseW * curScale
        const bh = bw / ratio
        const hasWeb = form.cover_style_web != null || form.cover_scale_web != null
        const coverList = form.cover_paths?.length ? form.cover_paths : (form.cover_path ? [form.cover_path] : [])
        const setStyle = (k: string) => setField(isDesk ? 'cover_style_web' : 'cover_style', k)
        const setScale = (v: number) => setField(isDesk ? 'cover_scale_web' : 'cover_scale', v)
        return sec(
          <>
            <div className="flex h-[200px] items-center justify-center rounded-xl bg-paper">
              <div className="overflow-hidden rounded-lg bg-line" style={{ width: bw, height: bh }}>
                {coverUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${STORAGE_BASE}${coverUrl}`} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            </div>
            <div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,.heic,.heif"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f, coverTarget.current); e.target.value = '' }}
              />
              <p className={label}>Cover photos ({coverList.length}/5)</p>
              <div className="flex flex-wrap gap-2">
                {coverList.map((p, i) => (
                  <div key={p} className="relative h-16 w-16">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => { coverTarget.current = i; fileInput.current?.click() }}
                      className="h-16 w-16 overflow-hidden rounded-lg border border-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${STORAGE_BASE}${p}`} alt="" className="h-full w-full object-cover" />
                    </button>
                    {coverList.length > 1 && (
                      <button
                        type="button"
                        aria-label="Remove photo"
                        onClick={() => removeCover(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {coverList.length < 5 && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => { coverTarget.current = null; fileInput.current?.click() }}
                    className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-ink-soft text-xl text-ink-soft"
                  >
                    {uploading ? '…' : '+'}
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs text-ink-soft">Click a photo to replace it. Up to 5 photos.</p>
              <label className="mt-3 flex items-center gap-3 text-sm text-ink">
                <Toggle on={form.cover_slideshow === true} onChange={(v) => setField('cover_slideshow', v as never)} label="Rotate between photos" />
                Rotate between photos
              </label>
            </div>
            <div>
              <p className={label}>Cover shape</p>
              <div className="grid grid-cols-2 gap-2">
                {shapes.map((sh) => (
                  <button
                    key={sh.key}
                    type="button"
                    onClick={() => setStyle(sh.key)}
                    className={`rounded-xl border px-3 py-2 text-left transition ${curStyle === sh.key ? 'border-twilight bg-blush-wash' : 'border-line hover:border-twilight'}`}
                  >
                    <span className="block text-sm font-medium text-ink">{sh.label}</span>
                    <span className="block text-xs text-ink-soft">{sh.sub}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className={label}>Cover size</p>
                <button type="button" className="text-xs text-ink-soft hover:text-ink" onClick={() => setScale(1)}>Reset</button>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={Math.round(curScale * 100)}
                onChange={(e) => setScale(Number(e.target.value) / 100)}
                className="w-full accent-[var(--color-twilight)]"
              />
              <p className="text-xs text-ink-soft">{Math.round(curScale * 100)}% of the page width. Slide left to make the cover smaller.</p>
            </div>
          </>,
        )
      }
      case 'name':
        return sec(
          <>
            {deviceBar()}
            <div>
              <label className={label}>Studio name</label>
              <input className={input} value={form.studio_name ?? ''} onChange={(e) => setField('studio_name', e.target.value)} />
            </div>
            {deviceSlider('Name size', 'title_font_size', 'title_font_size', 16, 96, 1, 34)}
            <div>
              <p className={label}>Logo</p>
              <p className="mb-1 text-xs text-ink-soft">Shows at the top of your portfolio in place of your studio name.</p>
              <p className="mb-2 text-xs text-ink-soft">Suggested size: <span className="font-medium text-ink">1200 × 400 px</span> (wide 3:1), saved as a PNG with a transparent background. A square logo works at 800 × 800 px. In Canva, choose Custom size, enter those numbers, and download as PNG with Transparent background on.</p>
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
              {form.logo_path && (
                <div className="mt-4 space-y-4">
                  {deviceSlider('Logo size (height)', 'logo_height', 'logo_height', 24, 320, 4, 40)}
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input type="checkbox" checked={form.show_name_with_logo === true} onChange={(e) => setField('show_name_with_logo', e.target.checked)} />
                    Also show my studio name above the logo
                  </label>
                </div>
              )}
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
            <ColorField swatches={brandSwatches} title="Location text color" value={form.location_color} fallback="#202020" onChange={(v) => setField('location_color', v)} />
            {deviceBar()}
            {deviceSlider('Location text size', 'location_font_size', 'location_font_size', 10, 36, 1, 14)}
          </>,
        )
      case 'master':
        return sec(
          <>
            <div>
              <label className={label}>Heading font</label>
              <Select className={input} value={form.title_font ?? ''} onChange={(e) => setField('title_font', e.target.value || null)}>
                <option value="">Default</option>
                {FONTS.map(([k, n, c]) => <option key={k} value={k}>{n} ({c})</option>)}
              </Select>
              <div className="mt-2 flex gap-5 text-sm text-ink">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.title_bold === true} onChange={(e) => setField('title_bold', e.target.checked)} />Bold</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.title_italic === true} onChange={(e) => setField('title_italic', e.target.checked)} />Italic</label>
              </div>
            </div>
            <div>
              <label className={label}>Body text font</label>
              <Select className={input} value={form.paragraph_font ?? ''} onChange={(e) => setField('paragraph_font', e.target.value || null)}>
                <option value="">Default</option>
                {FONTS.map(([k, n, c]) => <option key={k} value={k}>{n} ({c})</option>)}
              </Select>
            </div>
            <ColorField swatches={brandSwatches} title="Headings" value={form.title_color} fallback="#A57E60" onChange={(v) => setField('title_color', v)} />
            <ColorField swatches={brandSwatches} title="Body text" value={form.paragraph_color} fallback="#202020" onChange={(v) => setField('paragraph_color', v)} />
          </>,
        )
      case 'background':
        return sec(<ColorField swatches={brandSwatches} title="Page background" value={form.portfolio_bg_color} fallback="#F9F9F9" onChange={(v) => setField('portfolio_bg_color', v)} />)
      case 'spacing':
        return sec(
          <div className="space-y-4">
            {deviceBar()}
            {deviceSlider('Space between sections', 'portfolio_section_spacing', 'portfolio_section_spacing', 0, 120, 2, 14)}
            {deviceSlider('Space under section titles', 'portfolio_title_spacing', 'portfolio_title_spacing', 0, 60, 2, 10)}
          </div>,
        )
      case 'message': {
        const bw = Math.min(1, Math.max(0.4, Number(eff('message_btn_width', form.message_btn_width ?? 0.8)) || 0.8))
        const bs = Math.min(32, Math.max(12, Number(eff('message_btn_font_size', form.message_btn_font_size ?? 15)) || 15))
        const al = form.message_btn_align ?? 'center'
        const bgc = form.message_btn_bg_color ?? form.accent_color ?? '#A9545F'
        const tc = form.message_btn_color ?? '#FFFFFF'
        const bt = (form.message_btn_text && form.message_btn_text.trim()) || `Message ${form.studio_name ?? ''}`.trim()
        return sec(
          <>
            <div className="rounded-xl bg-paper p-4">
              <div
                className={`mx-auto flex items-center gap-2 rounded-full px-4 py-3 ${al === 'left' ? 'justify-start' : al === 'right' ? 'justify-end' : 'justify-center'}`}
                style={{ width: `${Math.round(bw * 100)}%`, backgroundColor: bgc, color: tc, fontSize: bs, fontWeight: form.message_btn_bold ? 700 : 500, fontStyle: form.message_btn_italic ? 'italic' : 'normal' }}
              >
                {form.message_btn_show_icon !== false && <span aria-hidden>💬</span>}
                <span className="truncate">{bt}</span>
              </div>
            </div>
            <div>
              <label className={label}>Button text</label>
              <input className={input} value={form.message_btn_text ?? ''} onChange={(e) => setField('message_btn_text', e.target.value)} placeholder={`Message ${form.studio_name ?? ''}`.trim()} />
            </div>
            <ColorField swatches={brandSwatches} title="Button color" value={form.message_btn_bg_color ?? form.accent_color} fallback="#A9545F" onChange={(v) => setField('message_btn_bg_color', v)} />
            <ColorField swatches={brandSwatches} title="Text color" value={form.message_btn_color} fallback="#FFFFFF" onChange={(v) => setField('message_btn_color', v)} />
            {deviceBar()}
            {deviceSlider('Text size', 'message_btn_font_size', 'message_btn_font_size', 12, 32, 1, 15, 1, 'pt')}
            {deviceSlider('Button width', 'message_btn_width', 'message_btn_width', 40, 100, 5, 0.8, 100, '%')}
            <div>
              <p className={label}>Text position</p>
              <div className="flex gap-2">
                {['left', 'center', 'right'].map((x) => (
                  <button key={x} type="button" onClick={() => setField('message_btn_align', x)}
                    className={`rounded-full border px-4 py-1.5 text-sm capitalize transition ${al === x ? 'border-twilight bg-blush-wash text-twilight' : 'border-line text-ink hover:border-twilight'}`}>
                    {x}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-ink">
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.message_btn_bold} onChange={(e) => setField('message_btn_bold', e.target.checked)} />Bold</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.message_btn_italic} onChange={(e) => setField('message_btn_italic', e.target.checked)} />Italic</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.message_btn_show_icon !== false} onChange={(e) => setField('message_btn_show_icon', e.target.checked)} />Show icon</label>
            </div>
            <p className="text-xs text-ink-soft">The font and text shadow are set in the app for now.</p>
          </>,
        )
      }
      case 'about':
        return sec(
          <>
            <div>
              <p className={label}>About photo</p>
              <p className="mb-2 text-xs text-ink-soft">The portrait that shows above your bio. Separate from your round profile photo.</p>
              <div className="mb-3 rounded-xl bg-paper p-4">
                {(form.about_photo_path ?? form.avatar_path) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`${STORAGE_BASE}${form.about_photo_path ?? form.avatar_path}`} alt="" style={{ ...aboutPhotoStyle(form.about_photo_shape, form.about_photo_size), margin: '0 auto' }} />
                ) : (
                  <p className="py-6 text-center text-xs text-ink-soft">Add a photo to see it here</p>
                )}
              </div>
              <input ref={aboutInput} type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAbout(f); e.target.value = '' }} />
              <div className="flex flex-wrap items-center gap-3">
                <button className={btnGhost} disabled={brandBusy === 'about'} onClick={() => aboutInput.current?.click()}>
                  {brandBusy === 'about' ? 'Uploading…' : form.about_photo_path ? 'Change photo' : 'Add photo'}
                </button>
                {form.about_photo_path && (
                  <button type="button" className="text-sm text-ink-soft hover:text-ink" onClick={removeAbout}>Remove</button>
                )}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={form.show_about_photo !== false} onChange={(e) => setField('show_about_photo', e.target.checked)} />
                Show this photo in my About section
              </label>
              <p className={`${label} mt-4`}>Photo shape</p>
              <div className="flex flex-wrap gap-2">
                {ABOUT_SHAPES.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setField('about_photo_shape', o.key)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${(form.about_photo_shape ?? 'portrait') === o.key ? 'border-twilight bg-blush-wash' : 'border-line hover:border-twilight'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className={`${label} mt-4`}>Photo size</p>
              <div className="flex flex-wrap gap-2">
                {ABOUT_SIZES.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setField('about_photo_size', o.key)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${(form.about_photo_size ?? 'large') === o.key ? 'border-twilight bg-blush-wash' : 'border-line hover:border-twilight'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
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
            <a href="/portfolio/packages" className={`${btnGhost} inline-block`}>Open your packages</a>
            <p className="text-xs text-ink-soft">Add, edit, hide and reorder your packages. Anything you change here shows up in the Camrhia app too.</p>
            {headingField('pricing')}
            {showToggle('pricing')}
          </>,
        )
      case 'openings':
        return sec(
          <>
            <div>
              <p className={label}>How openings show</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['date_check', 'Date check', 'Clients pick a date and see if you are free'],
                  ['badge', 'Badge', 'A simple banner like "Booking Now"'],
                ] as const).map(([k, t, sub]) => {
                  const on = (form.openings_display_mode ?? 'date_check') === k
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setField('openings_display_mode', k)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${on ? 'border-twilight bg-blush-wash' : 'border-line hover:border-twilight'}`}
                    >
                      <span className="block text-sm font-medium text-ink">{t}</span>
                      <span className="block text-xs text-ink-soft">{sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            {(form.openings_display_mode ?? 'date_check') === 'badge' ? (
              <>
                <div>
                  <label className={label}>Badge text</label>
                  <input className={input} value={form.openings_badge_text ?? ''} onChange={(e) => setField('openings_badge_text', e.target.value)} placeholder="Booking Now" />
                </div>
                <ColorField swatches={brandSwatches} title="Badge text color" value={form.openings_badge_color} fallback="#FFFFFF" onChange={(v) => setField('openings_badge_color', v)} />
                <p className="text-xs text-ink-soft">Badge background, gradient, corners and shadow are set in the app for now.</p>
              </>
            ) : (
              <p className="text-xs text-ink-soft">Open days come from your Calendar. Block or hold days there and this updates on its own.</p>
            )}
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
              <Toggle on={form.is_listed === true} onChange={(v) => setListed(v)} label="List me publicly" />
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
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="portfolio" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        {!form ? (
          <p className="text-sm text-ink-soft">{message ?? 'Loading…'}</p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">App portfolio</p>
                <h1 className="font-fraunces text-3xl font-semibold text-ink">App portfolio</h1>
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

            <div className="mb-6 rounded-2xl border border-line bg-card p-4 text-sm text-ink-soft">
              <span className="font-medium text-ink">This is your app profile.</span> It&apos;s what clients see when they shop for photographers on Camrhia, so it&apos;s kept short and quick on purpose. For galleries, your story and more, build your <a href="/website" className="text-twilight underline">website</a>.
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,540px)_1fr]">
              {/* Form */}
              <div className="space-y-5">
                {open === null ? (
                  <div>
                    {groupHeading('Portfolio', 'What clients see first.')}
                    <div className="space-y-2.5">{['cover', 'name', 'location'].map((k) => hubRow(k))}</div>

                    {groupHeading('Portfolio style', 'The look and feel of your site.')}
                    <div className="space-y-2.5">{['brand', 'master', 'background', 'spacing', 'message'].map((k) => hubRow(k))}</div>

                    {groupHeading('Sections', 'Use the switch to show or hide a section on your site. Drag the dots up or down to change the order. Your changes apply to your website and to the Camrhia app.')}
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                      <SortableContext items={form.section_order ?? []} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2.5">
                          {(form.section_order ?? []).map((key) => {
                            const toggle = TOGGLE[key]
                            const on = toggle ? form[toggle] !== false : true
                            return (
                              <SortableRow
                                key={key}
                                id={key}
                                render={(h) =>
                                  hubRow(
                                    key,
                                    toggle ? (
                                      <Toggle on={on} onChange={(v) => setField(toggle, v as never)} label={`Show ${LABELS[key]}`} />
                                    ) : (
                                      <span className="text-xs text-ink-soft">Auto</span>
                                    ),
                                    !on,
                                    <button
                                      type="button"
                                      aria-label={`Drag ${LABELS[key]} to reorder`}
                                      className="cursor-grab touch-none py-4 pl-3 pr-1 text-ink-soft hover:text-ink active:cursor-grabbing"
                                      {...(h.attributes as object)}
                                      {...(h.listeners as object)}
                                    >
                                      <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
                                        <circle cx="4" cy="3" r="1.5" /><circle cx="10" cy="3" r="1.5" />
                                        <circle cx="4" cy="9" r="1.5" /><circle cx="10" cy="9" r="1.5" />
                                        <circle cx="4" cy="15" r="1.5" /><circle cx="10" cy="15" r="1.5" />
                                      </svg>
                                    </button>,
                                  )
                                }
                              />
                            )
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>

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
                </div>
                {portfolioUrl ? (
                  <div ref={setStageEl} className="overflow-hidden rounded-2xl border border-line bg-line/50 p-3">
                    {(() => {
                      const inner = Math.max(0, stageW - 24)
                      const phone = device === 'phone'
                      const scale = phone ? 1 : inner > 0 ? Math.min(1, inner / 1280) : 0.5
                      const w = phone ? 390 : 1280
                      const hCss = 'max(520px, calc(100vh - 14rem))'
                      return (
                        <div style={{ width: Math.min(inner || w, w * scale), height: hCss, margin: '0 auto', overflow: 'hidden', borderRadius: 12, background: '#fff' }}>
                          <iframe
                            id="portfolio-frame"
                            key={previewKey}
                            src={`${portfolioUrl}?preview=1`}
                            title="Portfolio preview"
                            style={{ width: w, height: `calc(${hCss} / ${scale})`, border: 0, transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff' }}
                          />
                        </div>
                      )
                    })()}
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
