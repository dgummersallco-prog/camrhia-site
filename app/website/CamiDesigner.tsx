'use client'

import { structureOf } from '@/lib/siteTheme'
import CamriTyping from '@/app/components/CamriTyping'
import { useEffect, useRef, useState } from 'react'
import { EyeDropperButton } from '@/app/components/ColorInput'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { camiSite, applyPalette, setButtons, type SiteState } from '@/lib/camiSite'
import { FONT_OPTIONS, PAIR_PRESETS } from '@/lib/siteTheme'
import CamriSetup from './CamriSetup'
import { useEntitlements } from '@/lib/useEntitlements'

type Prof = SiteState & {
  id: string; public_token: string | null; slug: string | null; logo_path: string | null
  instagram_url: string | null; facebook_url: string | null; tiktok_url: string | null; pinterest_url: string | null
}
type Tab = 'style' | 'pages' | 'colors' | 'type' | 'photos' | 'social'
type Msg = { from: 'cami' | 'you'; text: string }

const TABS: Tab[] = ['style', 'pages', 'colors', 'type', 'photos', 'social']
const TAB_TITLES: Record<Tab, string> = { style: 'Style', pages: 'Pages', colors: 'Colors', type: 'Fonts & buttons', photos: 'Photos', social: 'Social links' }
const HEADINGS: Record<Tab, [string, string]> = {
  style: ['What feeling do you want?', 'Pick the layout that feels like you.'],
  pages: ['Which pages do you want?', 'Home and Booking are always on.'],
  colors: ['Pick your three colors', 'Start from a palette or choose your own.'],
  type: ['Fonts and buttons', 'Pick a pairing, or choose every font yourself.'],
  photos: ['Hero photos', 'The big photos that open your site. Up to 6, strongest first. More than one becomes a slideshow.'],
  social: ['Where can people find you?', 'All optional. These show on your site.'],
}
const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const COLS = 'id, public_token, slug, logo_path, instagram_url, facebook_url, tiktok_url, pinterest_url, site_template, site_accent, site_font_pair, site_headline, site_subhead, site_settings'
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

const STYLES = [
  { key: 'airy', name: 'Light & airy', blurb: 'Bright white, lots of space.', tpl: 'minimal', pair: 'modern', bg: '#FFFFFF', text: '#2A1F24', acc: '#5C4A44', shape: 'square' },
  { key: 'classic', name: 'Classic & elegant', blurb: 'Big photo, timeless serif.', tpl: 'editorial', pair: 'serif', bg: '#FAF7F2', text: '#2A1F24', acc: '#8A6F4E', shape: 'square' },
  { key: 'romantic', name: 'Romantic', blurb: 'Soft, framed and dreamy.', tpl: 'framed', pair: 'romantic', bg: '#FBF4F1', text: '#3A2A2E', acc: '#C98A8D', shape: 'pill' },
  { key: 'bold', name: 'Bold editorial', blurb: 'Huge headline, magazine feel.', tpl: 'magazine', pair: 'modern', bg: '#FFFFFF', text: '#1B1B1D', acc: '#111111', shape: 'square' },
  { key: 'moody', name: 'Moody & dark', blurb: 'Dark, cinematic, dramatic.', tpl: 'editorial', pair: 'serif', bg: '#17141A', text: '#F4EEE8', acc: '#C9A24D', shape: 'square' },
  { key: 'clean', name: 'Warm & earthy', blurb: 'Cream, clay and soft serif.', tpl: 'split', pair: 'modern', bg: '#F6F1EA', text: '#2A1F24', acc: '#B5532F', shape: 'square' },
  { key: 'peony', name: 'Peony', blurb: 'Soft full-photo hero, centered logo.', tpl: 'peony', pair: 'romantic', bg: '#FBF4F1', text: '#3A2A2E', acc: '#C98B88', shape: 'rounded' },
  { key: 'ivy', name: 'Ivy', blurb: 'Three tall photos, centered title.', tpl: 'ivy', pair: 'serif', bg: '#FFFFFF', text: '#2A1F24', acc: '#2A1F24', shape: 'square' },
  { key: 'wisteria', name: 'Wisteria', blurb: 'One framed photo on a soft panel.', tpl: 'wisteria', pair: 'romantic', bg: '#F4F0F8', text: '#2E2538', acc: '#6E5A87', shape: 'rounded' },
  { key: 'juniper', name: 'Juniper', blurb: 'Two photos and a bold name.', tpl: 'juniper', pair: 'modern', bg: '#F6F1EA', text: '#3A2A22', acc: '#C06A4D', shape: 'square' },
  { key: 'camellia', name: 'Camellia', blurb: 'Photo with a caption bar.', tpl: 'camellia', pair: 'serif', bg: '#F3F0EC', text: '#2A1F24', acc: '#2A1F24', shape: 'square' },
  { key: 'cedar', name: 'Cedar', blurb: 'Dark, headline over the photo.', tpl: 'cedar', pair: 'modern', bg: '#0D0D0F', text: '#F4EEE8', acc: '#C9A24D', shape: 'square' },
  { key: 'olive', name: 'Olive', blurb: 'Photo with a label box.', tpl: 'olive', pair: 'serif', bg: '#F1F2EA', text: '#2B3026', acc: '#6F7A52', shape: 'square' },
  { key: 'magnolia', name: 'Magnolia', blurb: 'Sidebar menu, tall photo.', tpl: 'magnolia', pair: 'serif', bg: '#FAF7F2', text: '#2A1F24', acc: '#8A6F63', shape: 'square' },
  { key: 'lily', name: 'Lily', blurb: 'Photo with an overlapping panel.', tpl: 'lily', pair: 'serif', bg: '#F6F0E6', text: '#3A2A22', acc: '#3A2A22', shape: 'square' },
  { key: 'orchid', name: 'Orchid', blurb: 'One big photo, thumbnails below.', tpl: 'orchid', pair: 'modern', bg: '#FFFFFF', text: '#1B1B1D', acc: '#1B1B1D', shape: 'square' },
  { key: 'lotus', name: 'Lotus', blurb: 'Menu bar along the bottom.', tpl: 'lotus', pair: 'modern', bg: '#FFFFFF', text: '#1B1B1D', acc: '#1B1B1D', shape: 'pill' },
  { key: 'aster', name: 'Aster', blurb: 'Arch-shaped photo, words beside it.', tpl: 'aster', pair: 'serif', bg: '#FBF6EE', text: '#27302A', acc: '#7C8B6F', shape: 'rounded' },
  { key: 'fern', name: 'Fern', blurb: 'Four staggered portraits.', tpl: 'fern', pair: 'romantic', bg: '#FFFFFF', text: '#2A1F24', acc: '#2A1F24', shape: 'square' },
  { key: 'sage', name: 'Sage', blurb: 'Two photos flank a center column.', tpl: 'sage', pair: 'serif', bg: '#F4F6F0', text: '#27302A', acc: '#7C8B6F', shape: 'square' },
  { key: 'rose', name: 'Rose', blurb: 'A circle photo, soft and round.', tpl: 'rose', pair: 'romantic', bg: '#FBF1EE', text: '#3A2A2E', acc: '#C98A8D', shape: 'pill' },
  { key: 'hazel', name: 'Hazel', blurb: 'Panorama over a checkerboard.', tpl: 'hazel', pair: 'serif', bg: '#FFFFFF', text: '#2A1F24', acc: '#A67C52', shape: 'square' },
  { key: 'saffron', name: 'Saffron', blurb: 'Numbered list beside a tall photo.', tpl: 'saffron', pair: 'serif', bg: '#F6EFE4', text: '#3A2A22', acc: '#D08A2E', shape: 'square' },
  { key: 'cypress', name: 'Cypress', blurb: 'Floating menu, photo on photo.', tpl: 'cypress', pair: 'modern', bg: '#FFFFFF', text: '#1B1B1D', acc: '#1B1B1D', shape: 'pill' },
  { key: 'laurel', name: 'Laurel', blurb: 'Framed photo with side text.', tpl: 'laurel', pair: 'modern', bg: '#E9E3DA', text: '#2A2622', acc: '#2A2622', shape: 'square' },
  { key: 'iris', name: 'Iris', blurb: 'Magazine cover masthead.', tpl: 'iris', pair: 'serif', bg: '#F4EFE9', text: '#1F1A17', acc: '#1F1A17', shape: 'square' },
  { key: 'poppy', name: 'Poppy', blurb: 'Cinematic letterbox.', tpl: 'poppy', pair: 'modern', bg: '#101010', text: '#F2EEE8', acc: '#C0452E', shape: 'square' },
  { key: 'thistle', name: 'Thistle', blurb: 'Diagonal split.', tpl: 'thistle', pair: 'modern', bg: '#EEE9F2', text: '#2B2433', acc: '#6E5A87', shape: 'rounded' },
  { key: 'clover', name: 'Clover', blurb: 'Polaroid wall.', tpl: 'clover', pair: 'romantic', bg: '#F3EFE6', text: '#2E3A2B', acc: '#5F7A52', shape: 'rounded' },
  { key: 'mimosa', name: 'Mimosa', blurb: 'Story timeline.', tpl: 'mimosa', pair: 'romantic', bg: '#FBF3DF', text: '#3A2F1E', acc: '#D9A21B', shape: 'pill' },
  { key: 'yarrow', name: 'Yarrow', blurb: 'Save the date.', tpl: 'yarrow', pair: 'serif', bg: '#F7F3EA', text: '#33302A', acc: '#8A8F5C', shape: 'square' },
]
const PALETTES = [
  { name: 'Blush', accent: '#C98A8D', bg: '#FBF6F1', text: '#2A1F24' },
  { name: 'Sage', accent: '#7C8B6F', bg: '#F7F5EE', text: '#27302A' },
  { name: 'Navy & cream', accent: '#1F2D4A', bg: '#FAF7F2', text: '#1F2D4A' },
  { name: 'Terracotta', accent: '#C06A4D', bg: '#FAF4EC', text: '#3A2A22' },
  { name: 'Gold & ivory', accent: '#B08D57', bg: '#FBF8F1', text: '#2A1F24' },
  { name: 'Noir', accent: '#E6D3B3', bg: '#17141A', text: '#F4EEE8' },
]
const ACCENTS = ['#C98A8D', '#D98C8C', '#B76E79', '#A65D57', '#C06A4D', '#D4A373', '#B08D57', '#E6D3B3', '#C9B79C', '#9CAF88', '#7C8B6F', '#5F7A61', '#3F5B4A', '#6B8E9B', '#4A5D7A', '#1F2D4A', '#8E7AA3', '#6B4F5E', '#8B5E3C', '#2A1F24', '#7A7A7A', '#111111']
const BGS = ['#FFFFFF', '#FAF7F2', '#FBF6F1', '#F6F1EA', '#F7F5EE', '#EFE8DD', '#F3E9E4', '#E9EEF0', '#E8EDE6', '#17141A', '#1F1B20', '#2B2B2B']
const TEXTS = ['#2A1F24', '#1B1B1D', '#3A2A22', '#27302A', '#1F2D4A', '#4A4A4A', '#6B4F5E', '#F4EEE8', '#FFFFFF']
const TYPE_SETS: { key: string; name: string; pair?: string; head: string; body: string }[] = [
  { key: 'classic', name: 'Classic', pair: 'serif', head: PAIR_PRESETS.serif.head, body: PAIR_PRESETS.serif.body },
  { key: 'modern', name: 'Modern', pair: 'modern', head: PAIR_PRESETS.modern.head, body: PAIR_PRESETS.modern.body },
  { key: 'romantic', name: 'Romantic', pair: 'romantic', head: PAIR_PRESETS.romantic.head, body: PAIR_PRESETS.romantic.body },
  { key: 'luxury', name: 'Luxury', head: 'cormorant', body: 'josefin' },
  { key: 'editorial', name: 'Editorial', head: 'playfair', body: 'worksans' },
  { key: 'bold', name: 'Bold', head: 'bebasneue', body: 'montserrat' },
]
const SHAPES = [
  { k: 'square', name: 'Rectangle', r: 0 },
  { k: 'rounded', name: 'Soft', r: 10 },
  { k: 'pill', name: 'Pill', r: 999 },
] as const
const PAGES: { k: string; label: string; blurb: string; locked?: boolean; soon?: boolean }[] = [
  { k: 'home', label: 'Home', blurb: 'Your front page', locked: true },
  { k: 'book', label: 'Booking', blurb: 'Check dates, send an inquiry', locked: true },
  { k: 'galleries', label: 'Galleries', blurb: 'Your work, gallery by gallery' },
  { k: 'about', label: 'About', blurb: 'Your story' },
  { k: 'blog', label: 'Blog', blurb: 'Posts and stories' },
  { k: 'pricing', label: 'Pricing', blurb: 'Your packages', soon: true },
  { k: 'faq', label: 'FAQ', blurb: 'Common questions', soon: true },
]

const glass = 'rounded-2xl border border-white/70 bg-white/60 backdrop-blur-xl shadow-[0_18px_40px_-22px_rgba(90,50,60,0.45)]'
const accentBtn = 'rounded-xl bg-[color-mix(in_srgb,rgb(var(--scene-a,201_133_136))_65%,#e6e6e6)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const ghostBtn = 'rounded-xl border border-white/80 bg-white/60 px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-white/80'
const ringOn = 'border-[rgb(var(--scene-b,201_133_136))] ring-2 ring-[rgb(var(--scene-b,201_133_136))]'
const fam = (k: string) => FONT_OPTIONS[k]?.family ?? 'serif'
const DESIGN_PATHS: Record<string, string[]> = {
  nav: ['explore', 'layout'], galleries: ['galindex', 'layout'], photos: ['galpage', 'layout'], social: ['socialDesign'], faq: ['faqDesign'],
  contact: ['contactDesign'], testimonials: ['testiDesign'], pricing_page: ['pricing', 'pageDesign'], pricing_section: ['pricing', 'sectionDesign'],
  book: ['bookDesign'], galleries_section: ['galSection'], blog_list: ['blog', 'listDesign'], blog_post: ['blog', 'postDesign'],
  about_page: ['about', 'pageDesign'], about_section: ['about', 'sectionDesign'],
}
const getPath = (x: Record<string, any>, p: string[]): unknown => p.reduce<any>((o, k) => (o == null ? o : o[k]), x)
function setPath(x: Record<string, any>, p: string[], v: string) {
  let o = x
  for (let i = 0; i < p.length - 1; i++) o = (o[p[i]] = { ...(o[p[i]] ?? {}) })
  o[p[p.length - 1]] = v
}
const fname = (k: string) => { const o = FONT_OPTIONS[k] as unknown as Record<string, string> | undefined; return o?.label ?? o?.name ?? k }
const FONT_IDS = Object.keys(FONT_OPTIONS)
type Pick = { key: string; text: string; left: number; top: number; color: string; size?: number; op?: number }
const PICK_LABELS: Record<string, string> = { hero_headline: 'Headline', menu_links: 'Menu links', menu_brand: 'Your name', ex_label: 'Section label', ex_title: 'Section title', ex_sub: 'Section subtitle', con_msg: 'Contact message', con_social: 'Social links', ft_line: 'Footer line', ft_copy: 'Copyright', gal_name: 'Gallery name', gal_count: 'Gallery count', gal_link: 'Gallery link', tes_quote: 'Testimonial', tes_name: 'Testimonial name', about_text: 'About text', pr_intro: 'Package intro', pr_group: 'Package group', pr_name: 'Package name', pr_price: 'Package price', pr_list: 'Package list', pr_note: 'Package note', faq_q: 'Question', faq_a: 'Answer', feat_title: 'Featured work title', hero_btn: 'Button text', air_label: 'About label', air_more: 'Link text', ls_title: 'Stories title', rom_kicker: 'Small line', rom_story: 'Story title', rom_more: 'Link text', ea_kicker: 'Small line', ea_para: 'Paragraph', ea_follow: 'Section title', pe_tag: 'Tagline', iv_kicker: 'Small line', iv_tag: 'Tagline', wi_hi: 'About heading', ju_kicker: 'Small line', ju_para: 'Intro', ju_s1t: 'Service title', ju_s1d: 'Service text', ju_s2t: 'Service title', ju_s2d: 'Service text', ju_s3t: 'Service title', ju_s3d: 'Service text', ca_sub: 'Subtitle', ca_bar: 'Bar text', ca_w1: 'Word', ca_w2: 'Word', ca_w3: 'Word', ca_w4: 'Word', ce_p1: 'Paragraph', ce_p2: 'Paragraph', ol_kicker: 'Small line', ol_c1: 'Caption', ol_c2: 'Caption', ol_c3: 'Caption', ol_c4: 'Caption', mg_story: 'Heading', mg_text: 'Paragraph', li_kicker: 'Small line', li_para: 'Paragraph', li_meet: 'Heading', li_more: 'Link', as_kicker: 'Small line', as_para: 'Paragraph', as_kind: 'Heading', as_q1: 'Quote', as_n1: 'Name', as_q2: 'Quote', as_n2: 'Name', as_q3: 'Quote', as_n3: 'Name', sg_tag: 'Tagline', sg_recent: 'Heading', ro_script: 'Script word', ro_c1: 'Caption', ro_c2: 'Caption', ro_c3: 'Caption', hz_kicker: 'Small line', hz_para: 'Paragraph', hz_quote: 'Quote', hz_name: 'Name', sf_n1: 'Service', sf_n2: 'Service', sf_n3: 'Service', sf_n4: 'Service', sf_c1: 'Caption', sf_c2: 'Caption', sf_c3: 'Caption', cy_tag: 'Tagline', cy_s1: 'Label', cy_s2: 'Label', cy_s3: 'Label', la_vert: 'Side text', la_para: 'Paragraph', ir_l: 'Left words', ir_r: 'Right words', ir_issue: 'Heading', ir_t1: 'Label', ir_t2: 'Label', ir_t3: 'Label', pr_kicker: 'Small line', pr_c1: 'Caption', pr_c2: 'Caption', pr_c3: 'Caption', pr_c4: 'Caption', th_tag: 'Tagline', cl_p1: 'Caption', cl_p2: 'Caption', cl_p3: 'Caption', cl_p4: 'Caption', cl_p5: 'Caption', cl_sub: 'Subheading', cl_t1: 'Label', cl_t2: 'Label', cl_t3: 'Label', mi_t1: 'Label', mi_t2: 'Label', mi_t3: 'Label', mi_t4: 'Label', ya_script: 'Script line', ya_month: 'Month', ya_head: 'Heading', ya_para: 'Paragraph', ya_link: 'Link', gs_title: 'Section title', gp_title: 'Page title', tes_title: 'Section title', faq_title: 'Page title', ab_h1: 'Story heading', ab_h2: 'Belief heading', ab_h3: 'Invitation heading', ab_p3: 'Invitation text', ab_by: 'By line', ab_loves: 'Loves label', ab_hi: 'Greeting', ab_n1: 'Stat 1', ab_l1: 'Stat 1 label', ab_n2: 'Stat 2', ab_l2: 'Stat 2 label', ab_n3: 'Stat 3', ab_l3: 'Stat 3 label', ab_quote: 'Pull quote', ab_sig: 'Signature', ab_tag: 'Tagline', ab_f1t: 'Fact 1 title', ab_f1d: 'Fact 1 text', ab_f2t: 'Fact 2 title', ab_f2d: 'Fact 2 text', ab_f3t: 'Fact 3 title', ab_f3d: 'Fact 3 text', ab_f4t: 'Fact 4 title', ab_f4d: 'Fact 4 text', ab_f5t: 'Fact 5 title', ab_f5d: 'Fact 5 text', soc_title: 'Social heading', soc_handle: 'Social handle', con_title: 'Booking heading' }
const TEXT_KEYS = ['hero_headline', 'menu_brand', 'about_text', 'con_msg', 'ft_line', 'ft_copy', 'feat_title', 'hero_btn', 'air_label', 'air_more', 'ls_title', 'rom_kicker', 'rom_story', 'rom_more', 'ea_kicker', 'ea_para', 'ea_follow', 'pe_tag', 'iv_kicker', 'iv_tag', 'wi_hi', 'ju_kicker', 'ju_para', 'ju_s1t', 'ju_s1d', 'ju_s2t', 'ju_s2d', 'ju_s3t', 'ju_s3d', 'ca_sub', 'ca_bar', 'ca_w1', 'ca_w2', 'ca_w3', 'ca_w4', 'ce_p1', 'ce_p2', 'ol_kicker', 'ol_c1', 'ol_c2', 'ol_c3', 'ol_c4', 'mg_story', 'mg_text', 'li_kicker', 'li_para', 'li_meet', 'li_more', 'as_kicker', 'as_para', 'as_kind', 'as_q1', 'as_n1', 'as_q2', 'as_n2', 'as_q3', 'as_n3', 'sg_tag', 'sg_recent', 'ro_script', 'ro_c1', 'ro_c2', 'ro_c3', 'hz_kicker', 'hz_para', 'hz_quote', 'hz_name', 'sf_n1', 'sf_n2', 'sf_n3', 'sf_n4', 'sf_c1', 'sf_c2', 'sf_c3', 'cy_tag', 'cy_s1', 'cy_s2', 'cy_s3', 'la_vert', 'la_para', 'ir_l', 'ir_r', 'ir_issue', 'ir_t1', 'ir_t2', 'ir_t3', 'pr_kicker', 'pr_c1', 'pr_c2', 'pr_c3', 'pr_c4', 'th_tag', 'cl_p1', 'cl_p2', 'cl_p3', 'cl_p4', 'cl_p5', 'cl_sub', 'cl_t1', 'cl_t2', 'cl_t3', 'mi_t1', 'mi_t2', 'mi_t3', 'mi_t4', 'ya_script', 'ya_month', 'ya_head', 'ya_para', 'ya_link', 'gs_title', 'gp_title', 'tes_title', 'faq_title', 'ab_h1', 'ab_h2', 'ab_h3', 'ab_p3', 'ab_by', 'ab_loves', 'ab_hi', 'ab_n1', 'ab_l1', 'ab_n2', 'ab_l2', 'ab_n3', 'ab_l3', 'ab_quote', 'ab_sig', 'ab_tag', 'ab_f1t', 'ab_f1d', 'ab_f2t', 'ab_f2d', 'ab_f3t', 'ab_f3d', 'ab_f4t', 'ab_f4d', 'ab_f5t', 'ab_f5d', 'soc_title', 'soc_handle', 'con_title']
const LONG_TEXT = ['about_text', 'con_msg']
const PICK_COLORS = [...TEXTS.slice(0, 7), ...ACCENTS.slice(0, 14), '#FFFFFF']

const POPUP_ON: boolean = false

function hexToHsv(hex: string): [number, number, number] {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) return [30, 0.2, 1]
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  let h = 0
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return [h, mx ? d / mx : 0, mx]
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const f = (t: number) => Math.round((t + m) * 255).toString(16).padStart(2, '0')
  return ('#' + f(r) + f(g) + f(b)).toUpperCase()
}

function ColorRow({ label, value, base, onLive, onSet, onReset }: { label: string; value?: string; base: string[]; onLive?: (c: string) => void; onSet: (c: string) => void; onReset?: () => void }) {
  const ok = /^#[0-9a-fA-F]{6}$/.test(value ?? '')
  const [open, setOpen] = useState(false)
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(ok ? (value as string) : (base[0] ?? '#F7EBDE')))
  const [hexT, setHexT] = useState(ok ? (value as string).toUpperCase() : '')
  const [recent, setRecent] = useState<string[]>([])
  const drag = useRef(false)
  const raf = useRef(0)
  const last = useRef('')
  const svRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    try { const j = JSON.parse(localStorage.getItem('cam_recent_colors') ?? '[]'); if (Array.isArray(j)) setRecent(j.filter((x) => typeof x === 'string')) } catch { /* ignore */ }
  }, [])
  useEffect(() => { if (!drag.current && ok) { setHsv(hexToHsv(value as string)); setHexT((value as string).toUpperCase()) } }, [value, ok])
  const hex = hsvToHex(hsv[0], hsv[1], hsv[2])
  const live = (c: string) => { last.current = c; if (!raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; onLive?.(last.current) }) }
  const finish = (c: string) => {
    const nx = [c.toUpperCase(), ...recent.filter((x) => x.toUpperCase() !== c.toUpperCase())].slice(0, 12)
    setRecent(nx)
    try { localStorage.setItem('cam_recent_colors', JSON.stringify(nx)) } catch { /* ignore */ }
    onSet(c)
  }
  const grab = (ref: React.RefObject<HTMLDivElement | null>, fn: (x: number, y: number) => [number, number, number]) => (e: React.PointerEvent) => {
    const el = ref.current
    if (!el) return
    e.preventDefault()
    el.setPointerCapture(e.pointerId)
    drag.current = true
    const move = (ev: { clientX: number; clientY: number }) => {
      const r = el.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
      const y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height))
      const nx = fn(x, y)
      setHsv(nx)
      const c = hsvToHex(nx[0], nx[1], nx[2])
      setHexT(c)
      live(c)
      return c
    }
    move(e)
    const onMove = (ev: PointerEvent) => { move(ev) }
    const onUp = (ev: PointerEvent) => {
      const c = move(ev)
      drag.current = false
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      finish(c)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }
  const pal = Array.from(new Set([...recent, ...base].map((c) => c.toUpperCase()))).slice(0, 12)
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
      <button type="button" onClick={() => setOpen(!open)} className="mt-2 flex w-full items-center justify-between rounded-xl border border-[#E4D3B6] bg-white px-3 py-2 text-left text-sm text-ink">
        <span className="flex items-center gap-2">
          <span className="h-5 w-5 rounded-full border border-black/15" style={{ background: ok ? (value as string) : 'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 50% / 8px 8px' }} />
          {ok ? (value as string).toUpperCase() : 'Default'}
        </span>
        <span className="text-xs text-ink-soft">{open ? 'Close' : 'Change'}</span>
      </button>
      {open && (
        <div className="mt-2 rounded-2xl border border-[#E4D3B6] p-3" style={{ background: 'linear-gradient(135deg,#FFFDF9 0%,#F8F0E3 100%)', boxShadow: 'inset 0 0 0 3px #FFFDF9, inset 0 0 0 4px #EBDDC3' }}>
          <div className="grid grid-cols-6 gap-2">
            {pal.map((c) => (
              <button key={c} type="button" aria-label={c} onClick={() => { setHsv(hexToHsv(c)); setHexT(c); onLive?.(c); finish(c) }} className={'h-8 w-8 rounded-full border border-[#DCCBA9] transition hover:scale-105 ' + (String(value ?? '').toUpperCase() === c ? 'ring-2 ring-[#8C6B3F] ring-offset-1' : '')} style={{ background: c }} />
            ))}
          </div>
          <div ref={svRef} onPointerDown={grab(svRef, (x, y) => [hsv[0], x, 1 - y])} className="relative mt-3 h-36 w-full cursor-crosshair touch-none rounded-xl" style={{ background: 'linear-gradient(to top,#000,rgba(0,0,0,0)),linear-gradient(to right,#fff,hsl(' + hsv[0] + ',100%,50%))' }}>
            <div className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: hsv[1] * 100 + '%', top: (1 - hsv[2]) * 100 + '%', background: hex }} />
          </div>
          <div ref={hueRef} onPointerDown={grab(hueRef, (x) => [x * 359.9, hsv[1], hsv[2]])} className="relative mt-3 h-4 w-full cursor-pointer touch-none rounded-full" style={{ background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}>
            <div className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow" style={{ left: (hsv[0] / 360) * 100 + '%', background: 'hsl(' + hsv[0] + ',100%,50%)' }} />
          </div>
          <input value={hexT} onChange={(e) => { const v = e.target.value.trim(); setHexT(v); const w = v.startsWith('#') ? v : '#' + v; if (/^#[0-9a-fA-F]{6}$/.test(w)) { setHsv(hexToHsv(w)); live(w.toUpperCase()) } }} onBlur={() => { const w = hexT.startsWith('#') ? hexT : '#' + hexT; if (/^#[0-9a-fA-F]{6}$/.test(w)) finish(w.toUpperCase()) }} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} maxLength={7} placeholder="#hex" className="mt-3 w-full rounded-xl border border-[#E4D3B6] bg-white px-3 py-2 font-fraunces text-sm uppercase text-ink outline-none focus:border-[#B08D57]" />
          <div className="mt-3 flex items-center justify-between">
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-semibold tracking-[0.2em] text-[#8C6B3F]">DONE</button>
            {onReset && <button type="button" onClick={onReset} className="text-xs font-medium text-[#6B4A2B] underline">Reset</button>}
          </div>
        </div>
      )}
    </div>
  )
}

function SliderRow({ label, value, min, max, step, unit, onLive, onDone }: { label: string; value: number; min: number; max: number; step: number; unit: string; onLive?: (v: number) => void; onDone: (v: number) => void }) {
  const [v, setV] = useState(value)
  const raf = useRef(0)
  const last = useRef(value)
  useEffect(() => { setV(value); last.current = value }, [value])
  const change = (n: number) => {
    setV(n)
    last.current = n
    if (onLive && !raf.current) raf.current = requestAnimationFrame(() => { raf.current = 0; onLive(last.current) })
  }
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
        <span className="text-xs text-ink-soft">{unit === 'x' ? v.toFixed(2) + 'x' : Math.round(v) + unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => change(Number(e.target.value))} onPointerUp={() => onDone(last.current)} onKeyUp={() => onDone(last.current)} className="mt-2 w-full accent-[#8C6B3F]" />
    </div>
  )
}
const rgbHex = (c: string) => { const m = c.match(/\d+/g); if (!m || m.length < 3) return '#2A1F24'; return '#' + m.slice(0, 3).map((x) => Number(x).toString(16).padStart(2, '0')).join('').toUpperCase() }

function Mock({ k, bg, tx }: { k: string; bg: string; tx: string }) {
  const dark = k === 'moody'
  const a = dark ? '#3a3340' : '#dcc7b5'
  const b = dark ? '#221e27' : '#b99d89'
  const L = (x: number, y: number, w: number, o = 0.8, h = 3, f = tx) => <rect x={x} y={y} width={w} height={h} rx={1.5} fill={f} opacity={o} />
  const nav = (
    <g>
      {L(10, 6, 24, 0.9)}
      {L(100, 6.5, 12, 0.4, 2)}{L(116, 6.5, 12, 0.4, 2)}{L(132, 6.5, 12, 0.4, 2)}
    </g>
  )
  const id = 'g' + k
  return (
    <svg viewBox="0 0 160 100" className="block w-full" role="img" aria-label={k}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect width="160" height="100" fill={bg} />
      {nav}
      {k === 'airy' && (<g>{L(52, 34, 56, 0.85, 4)}{L(64, 44, 32, 0.35, 2)}<rect x="66" y="52" width="28" height="8" fill={tx} />{<rect x="30" y="68" width="100" height="26" fill={`url(#${id})`} />}</g>)}
      {k === 'classic' && (<g><rect x="0" y="16" width="160" height="84" fill={`url(#${id})`} />{L(48, 48, 64, 0.95, 5, '#fff')}{L(60, 58, 40, 0.7, 2, '#fff')}<rect x="66" y="68" width="28" height="8" fill="none" stroke="#fff" strokeWidth="1" /></g>)}
      {k === 'romantic' && (<g><rect x="22" y="18" width="116" height="66" fill="none" stroke={tx} strokeWidth="0.8" opacity="0.5" /><rect x="27" y="23" width="106" height="56" fill={`url(#${id})`} />{L(56, 90, 48, 0.8, 3)}</g>)}
      {k === 'bold' && (<g>{L(10, 20, 140, 1, 10)}{L(10, 33, 96, 1, 10)}<rect x="10" y="50" width="140" height="44" fill={`url(#${id})`} /></g>)}
      {k === 'moody' && (<g><rect x="0" y="16" width="160" height="84" fill={`url(#${id})`} />{L(14, 64, 76, 0.95, 5)}{L(14, 74, 44, 0.45, 2)}<rect x="14" y="82" width="28" height="8" fill={tx} /></g>)}
      {k === 'mosaic' && (<g>{L(10, 17, 50, 0.85, 4)}<rect x="10" y="26" width="46" height="36" fill={`url(#${id})`} /><rect x="60" y="26" width="40" height="22" fill={`url(#${id})`} opacity="0.8" /><rect x="104" y="26" width="46" height="36" fill={`url(#${id})`} opacity="0.9" /><rect x="60" y="52" width="40" height="40" fill={`url(#${id})`} opacity="0.7" /><rect x="10" y="66" width="46" height="26" fill={`url(#${id})`} opacity="0.85" /><rect x="104" y="66" width="46" height="26" fill={`url(#${id})`} opacity="0.75" /></g>)}
      {k === 'clean' && (<g>{L(12, 36, 56, 0.85, 5)}{L(12, 46, 40, 0.35, 2)}<rect x="12" y="56" width="28" height="8" fill={tx} /><rect x="84" y="16" width="76" height="84" fill={`url(#${id})`} /></g>)}
    </svg>
  )
}

function FontPick({ label, hint, value, onPick }: { label: string; hint: string; value: string; onPick: (k: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-white/80 bg-white/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="text-xs text-ink-soft">{hint}</p>
      <button type="button" onClick={() => setOpen(!open)} className="mt-2 flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-lg text-ink" style={{ fontFamily: fam(value) }}>
        <span>{fname(value)}</span><span className="text-xs text-ink-soft">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-white/80 bg-white">
          {FONT_IDS.map((k) => (
            <button key={k} type="button" onClick={() => { onPick(k); setOpen(false) }} className={'block w-full px-3 py-2 text-left text-base text-ink hover:bg-paper ' + (k === value ? 'bg-paper' : '')} style={{ fontFamily: fam(k) }}>{fname(k)}</button>
          ))}
        </div>
      )}
    </div>
  )
}

const HOME_SECS: [string, string][] = [['explore', 'Explore'], ['portfolio', 'Portfolio'], ['testimonials', 'Testimonials'], ['contact', 'Contact']]

export default function CamiDesigner() {
  const ent = useEntitlements()
  const router = useRouter()
  const [form, setForm] = useState<Prof | null>(null)
  const [history, setHistory] = useState<Prof[]>([])
  const [tab, setTab] = useState<Tab>('style')
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [ig, setIg] = useState('')
  const [fb, setFb] = useState('')
  const [tt, setTt] = useState('')
  const [pin, setPin] = useState('')
  const [styleSel, setStyleSel] = useState<string | null>(null)
  const [typeSel, setTypeSel] = useState<string | null>(null)
  const [ownFonts, setOwnFonts] = useState(false)
  const [role, setRole] = useState<'accent' | 'bg' | 'text'>('accent')
  const [hexIn, setHexIn] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [pick, setPick] = useState<Pick | null>(null)
  const [selSec, setSelSec] = useState<string | null>(null)
  const [leftTab, setLeftTab] = useState<'design' | 'setup'>('design')
  const [slot, setSlot] = useState<{ key: string; idx: number } | null>(null)
  const [selPh, setSelPh] = useState<{ key: string; idx: number } | null>(null)
  const [selBtn, setSelBtn] = useState<{ id: string; tx: string; text: string } | null>(null)
  const [selBox, setSelBox] = useState<string | null>(null)
  const [lib, setLib] = useState<{ id: string; storage_path: string }[]>([])
  const [libBusy, setLibBusy] = useState(false)
  const [ptext, setPtext] = useState('')
  const [phex, setPhex] = useState('')
  const frameRef = useRef<HTMLIFrameElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const latest = useRef<Prof | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'cami', text: "Hi, I'm Camri. What should I change?" }])
  const [camBusy, setCamBusy] = useState(false)
  const [tour, setTour] = useState<number | null>(null)
  const TOUR_Q = ["Let's build your site together. First, what feeling do you want?", 'Now pick your colors.', 'Now your lettering.', 'How should your buttons look?', 'Last one. Tell me what you shoot and where, and I will write your headline.']
  const tourPick = async (label: string, fn: (n: any) => void, next: number) => {
    setMsgs((m) => [...m, { from: 'you', text: label }])
    await commit((n) => { n.site_settings = n.site_settings ?? {}; fn(n) })
    setMsgs((m) => [...m, { from: 'cami', text: TOUR_Q[next] }])
    setTour(next)
  }
  const chip = 'rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-ink transition hover:border-twilight'

  const [input, setInput] = useState('')
  const chatEnd = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<'pages' | 'design' | 'settings'>('pages')
  const [curPage, setCurPage] = useState('home')
  const [showSet, setShowSet] = useState(false)
  const [confirmRestart, setConfirmRestart] = useState(false)
  const [sub, setSub] = useState<Tab | null>(null)
  const [camiOpen, setCamiOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pubMsg, setPubMsg] = useState('')
  const [full, setFull] = useState(false)
  const [setupSkipped, setSetupSkipped] = useState(false)
  const [setupFinished, setSetupFinished] = useState(false)
  const [review, setReview] = useState(() => { try { return window.localStorage.getItem('camriReview') === '1' } catch { return false } })
  useEffect(() => {
    try {
      if (setupFinished) { ['camriReview', 'camriStep', 'camriDraft', 'camriStep2', 'camriDraft2', 'camriDsStep', 'camriArrCur'].forEach((k) => window.localStorage.removeItem(k)) }
      else if (review) window.localStorage.setItem('camriReview', '1')
      else window.localStorage.removeItem('camriReview')
    } catch {}
  }, [review, setupFinished])
  const [setupForce] = useState(() => typeof window !== 'undefined' && window.location.search.includes('setup=1'))
  const commitRef = useRef<((fn: (n: Prof) => void) => Promise<void>) | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) { router.push('/login'); return }
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.push('/login'); return }
      const { data, error } = await sb.from('profiles').select(COLS + ', site_draft').eq('id', sess.session.user.id).single()
      if (error) { setErr(error.message.includes('site_draft') ? 'Run the website draft SQL in Supabase first.' : error.message); return }
      const raw = data as unknown as Prof & { site_draft?: Partial<Prof> | null }
      const dr = raw.site_draft
      const p = (dr ? { ...raw, ...dr } : raw) as Prof
      latest.current = p
      setDirty(!!dr)
      setForm(p)
      setIg(p.instagram_url ?? ''); setFb(p.facebook_url ?? ''); setTt(p.tiktok_url ?? ''); setPin(p.pinterest_url ?? '')
    }
    load()
  }, [router])

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, tab])

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data
      if (d && d.type === 'camrhia-preview-ready' && e.source === frameRef.current?.contentWindow) { if (latest.current) pushPatch(latest.current); return }
      if (d && d.type === 'camrhia-section' && d.action === 'select' && e.source === frameRef.current?.contentWindow) { setPick(null); setSelPh(null); setSelBtn(null); setSelSec(String(d.key)); setLeftTab('design'); return }
      if (d && d.type === 'camrhia-section' && d.action === 'box' && e.source === frameRef.current?.contentWindow) { setSelBox(d.id ? String(d.id) : null); return }
      if (d && d.type === 'camrhia-section' && d.action === 'button' && e.source === frameRef.current?.contentWindow) { setPick(null); setSelPh(null); setSelSec(String(d.sec)); setSelBtn({ id: String(d.id), tx: String(d.tx ?? ''), text: String(d.text ?? '') }); setLeftTab('design'); return }
      if (d && d.type === 'camrhia-section' && d.action === 'photo' && e.source === frameRef.current?.contentWindow) { setPick(null); setSelBtn(null); setSelSec(String(d.key)); setSelPh({ key: String(d.key), idx: Number(d.idx) || 0 }); setLeftTab('design'); if (!d.again) setSlot({ key: String(d.key), idx: Number(d.idx) || 0 }); return }
      if (d && d.type === 'camrhia-section' && e.source === frameRef.current?.contentWindow) {
        commitRef.current?.((n) => {
          const s = (n.site_settings = n.site_settings ?? {})
          if (d.action === 'boxfx') {
            const bf: Record<string, any> = { ...(s.boxFx ?? {}) }
            bf[d.id] = { x: Number(d.x), y: Number(d.y), s: Number(d.s) }
            s.boxFx = bf
            return
          }
          if (d.action === 'photofx') {
            const pf: Record<string, any> = { ...(s.photoFx ?? {}) }
            pf[d.id] = { ...(pf[d.id] ?? {}), x: Number(d.x), y: Number(d.y) }
            s.photoFx = pf
            return
          }
          if (d.action === 'scale') {
            const sz: Record<string, number> = { ...(s.secZoom ?? {}) }
            const v = Number(d.s)
            if (!(v > 0.39) || v >= 0.995) delete sz[d.key]; else sz[d.key] = Math.round(v * 1000) / 1000
            s.secZoom = sz
            return
          }
          if (d.action === 'hide') {
            const h: string[] = Array.isArray(s.hiddenSecs) ? s.hiddenSecs : []
            if (!h.includes(d.key)) s.hiddenSecs = [...h, d.key]
            return
          }
          const ord: string[] = [...(d.order as string[])]
          const from = ord.indexOf(d.key)
          if (from < 0) return
          ord.splice(from, 1)
          ord.splice(Math.max(0, Math.min(ord.length, Number(d.to))), 0, d.key)
          s.order_home = ord.includes('explore') ? ord : ['explore', ...ord]
        })
        return
      }
      if (!d || d.type !== 'camrhia-pick' || e.source !== frameRef.current?.contentWindow) return
      const f = frameRef.current!.getBoundingClientRect()
      const b = boxRef.current?.getBoundingClientRect()
      if (!b) return
      const left = Math.max(8, Math.min(b.width - 348, f.left - b.left + d.x))
      const top = Math.max(8, Math.min(b.height - 140, f.top - b.top + d.y + d.h + 10))
      setSelSec(null); setSelPh(null); setSelBtn(null); setLeftTab('design'); setPick({ key: d.key, text: d.text ?? '', left, top, color: rgbHex(String(d.color ?? '')), size: Number(d.size) || 0, op: Number(d.op) || 1 })
      setPtext(d.text ?? '')
      setPhex('')
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function pushPatch(p: Prof) {
    latest.current = p
    try {
      frameRef.current?.contentWindow?.postMessage({ type: 'camrhia-preview', patch: { site_template: p.site_template, site_accent: p.site_accent, site_font_pair: p.site_font_pair, site_headline: p.site_headline, site_subhead: p.site_subhead, site_settings: p.site_settings, instagram_url: p.instagram_url, facebook_url: p.facebook_url, tiktok_url: p.tiktok_url, pinterest_url: p.pinterest_url } }, '*')
    } catch { /* ignore */ }
  }

  async function save(next: Prof) {
    const sb = supabase
    if (!sb) return
    pushPatch(next)
    setDirty(true)
    const draft = {
      site_template: next.site_template ?? 'editorial',
      site_accent: next.site_accent,
      site_font_pair: next.site_font_pair ?? 'serif',
      site_headline: next.site_headline?.trim() || null,
      site_subhead: next.site_subhead?.trim() || null,
      site_settings: next.site_settings ?? {},
      instagram_url: next.instagram_url,
      facebook_url: next.facebook_url,
      tiktok_url: next.tiktok_url,
      pinterest_url: next.pinterest_url,
    }
    const { error } = await sb.from('profiles').update({ site_draft: draft }).eq('id', next.id)
    if (error) { setErr(error.message.includes('site_draft') ? 'Run the website draft SQL in Supabase first.' : error.message); return }
    setErr(null)
  }

  async function publish() {
    if (ent.loading) return
    if (!ent.showcase) { window.location.href = '/upgrade/showcase'; return }
    const sb = supabase
    if (!sb || !form) return
    setBusy(true)
    const live = {
      site_template: form.site_template ?? 'editorial',
      site_accent: form.site_accent,
      site_font_pair: form.site_font_pair ?? 'serif',
      site_headline: form.site_headline?.trim() || null,
      site_subhead: form.site_subhead?.trim() || null,
      site_settings: form.site_settings ?? {},
      instagram_url: ig.trim() || null,
      facebook_url: fb.trim() || null,
      tiktok_url: tt.trim() || null,
      pinterest_url: pin.trim() || null,
    }
    const { error } = await sb.from('profiles').update({ ...live, site_draft: null }).eq('id', form.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setErr(null)
    setForm({ ...form, ...live })
    setDirty(false)
    setPubMsg('Published. Your site is live.')
    setTimeout(() => setPubMsg(''), 3000)
  }

  async function commit(fn: (n: Prof) => void) {
    if (!form) return
    const next = clone(form)
    fn(next)
    setHistory((h) => [...h, form])
    setForm(next)
    await save(next)
  }

  commitRef.current = commit

  function liveEdit(fn: (n: Prof) => void) {
    if (!form) return
    const nx = clone(form)
    fn(nx)
    pushPatch(nx)
  }

  function kitOf(n: Prof) {
    const x = (n.site_settings = n.site_settings ?? {}) as Record<string, any>
    if (!x.kit) x.kit = { done: true, layouts: [], palettes: [], fonts: [], pages: [], extra_pages: '', themes: [] }
    if (!Array.isArray(x.kit.themes)) x.kit.themes = []
    return x.kit as Record<string, any>
  }
  function snapTheme(n: Prof, name: string) {
    const { kit: _k, ...rest } = (n.site_settings ?? {}) as Record<string, any>
    return { name, site_template: n.site_template, site_accent: n.site_accent, site_font_pair: n.site_font_pair, site_headline: n.site_headline, site_subhead: n.site_subhead, settings: JSON.parse(JSON.stringify(rest)) }
  }
  function saveThemeAs(n: Prof, name: string) {
    const k = kitOf(n)
    const snap = snapTheme(n, name)
    const i = k.themes.findIndex((t: any) => t.name === name)
    if (i >= 0) k.themes[i] = snap
    else k.themes.push(snap)
  }
  const resetLook = (x: Record<string, any>) => {
    delete x.custom_css; delete x.custom_js; delete x.calendar; delete x.fonts; delete x.colors; delete x.button
    if (x.hero) { for (const k of Object.keys(x.hero)) if (/font|align|overlay|size|color|height|canvas|shape|weight|style|opacity/i.test(k)) delete x.hero[k] }
    if (x.menu) { for (const k of ['logoPos', 'bg', 'solid', 'none', 'icon']) delete x.menu[k] }
  }
  function applyKitOps(n: Prof, kc: Record<string, any>) {
    const k = kitOf(n)
    const x = n.site_settings as Record<string, any>
    if (kc.save_theme && !k.themes.some((t: any) => t.name === 'Main')) k.themes.push(snapTheme(n, 'Main'))
    if (kc.role_font) {
      const { role, font } = kc.role_font
      if (role === 'title') { x.fonts = { ...(x.fonts ?? {}), head: font }; x.hero = { ...(x.hero ?? {}), headline_font: font } }
      else if (role === 'subtitle') x.hero = { ...(x.hero ?? {}), subhead_font: font }
      else if (role === 'paragraph') { x.fonts = { ...(x.fonts ?? {}), body: font }; x.hero = { ...(x.hero ?? {}), para_font: font } }
    }
    if (kc.move_section || kc.add_page || kc.remove_page) {
      const stc: any = structureOf(n as any)
      const PG = ['home', 'about', 'galleries']
      const take = (sec: string) => { for (const pg of PG) stc[pg] = stc[pg].filter((q: string) => q !== sec); for (const e of stc.extra) e.sections = e.sections.filter((q: string) => q !== sec) }
      if (kc.add_page && stc.extra.length < 8 && !stc.extra.some((e: any) => e.id === kc.add_page.id)) {
        const secs: string[] = kc.add_page.sections ?? []
        secs.forEach(take)
        stc.extra.push({ id: kc.add_page.id, label: kc.add_page.label, sections: secs })
      }
      if (kc.move_section) {
        const { section, to } = kc.move_section
        take(section)
        if (PG.includes(to)) stc[to].push(section)
        else { const e = stc.extra.find((q: any) => q.id === to); if (e) e.sections.push(section) }
      }
      if (kc.remove_page) stc.extra = stc.extra.filter((e: any) => e.id !== kc.remove_page)
      x.structure = stc
    }
    if (kc.layout) {
      const L: string[] = k.layouts ?? []
      if (L.length) {
        let i = Number(k.layout_idx ?? 0)
        if (kc.layout === 'next') i = (i + 1) % L.length
        else if (kc.layout === 'prev') i = (i - 1 + L.length) % L.length
        else if (L.includes(kc.layout)) i = L.indexOf(kc.layout)
        k.layout_idx = i
        const st = STYLES.find((q) => q.key === L[i])
        if (st) { n.site_template = st.tpl; n.site_font_pair = st.pair; clearFontOverrides(x); resetLook(x); x.look = st.key; applyPalette(n, (st as any).acc ?? n.site_accent ?? '#C98A8D', st.bg, st.text); x.button = { ...(x.button ?? {}), shape: (st as any).shape ?? 'square' } }
      }
    }
    if (kc.button) {
      const { which, text, goes_to } = kc.button
      const key = which === 'closing' ? 'contactBtn' : which === 'gallery' ? 'galBtn' : which === 'about' || which === 'booking' ? 'aboutBtn' : ''
      if (key) {
        const b = { ...(x[key] ?? {}) }
        if (typeof text === 'string' && text.trim()) b.text = text.trim()
        if (typeof goes_to === 'string' && goes_to.trim()) b.link = goes_to.trim() === 'booking' ? '' : goes_to.trim()
        x[key] = b
      }
    }
    if (kc.design) { const dp = DESIGN_PATHS[kc.design.field]; if (dp) setPath(x, dp, String(kc.design.key)) }
    if (kc.palette) { const p = (k.palettes ?? []).find((q: any) => q.name === kc.palette); if (p) applyPalette(n, p.accent, p.bg, p.text) }
    if (kc.fonts) {
      const ts = TYPE_SETS.find((t) => t.key === kc.fonts)
      if (ts) {
        clearFontOverrides(x)
        if (ts.pair) n.site_font_pair = ts.pair
        else { x.fonts = { ...(x.fonts ?? {}), head: ts.head, body: ts.body }; x.hero = { ...(x.hero ?? {}), headline_font: ts.head, para_font: ts.body } }
      }
    }
    if (kc.heading_font) { x.fonts = { ...(x.fonts ?? {}), head: kc.heading_font }; x.hero = { ...(x.hero ?? {}), headline_font: kc.heading_font } }
    if (kc.body_font) { x.fonts = { ...(x.fonts ?? {}), body: kc.body_font }; x.hero = { ...(x.hero ?? {}), para_font: kc.body_font } }
    if (kc.theme) {
      const t = k.themes.find((q: any) => q.name === kc.theme)
      if (t) {
        n.site_template = t.site_template; n.site_accent = t.site_accent; n.site_font_pair = t.site_font_pair; n.site_headline = t.site_headline; n.site_subhead = t.site_subhead
        n.site_settings = { ...JSON.parse(JSON.stringify(t.settings)), kit: k }
      }
    }
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
    setCamBusy(true)
    try { await sendInner(text) } finally { setCamBusy(false) }
  }
  async function sendInner(text: string) {
    const t = text.trim()
    if (!t || !form) return
    setMsgs((m) => [...m, { from: 'you', text: t }])
    setInput('')
    if (/^\s*(undo|go back|revert|that was wrong|put it back)\b/i.test(t)) {
      const ok = await undo()
      setMsgs((m) => [...m, { from: 'cami', text: ok ? 'Undone.' : 'Nothing to undo yet.' }])
      return
    }
    if (tour === 4) setTour(null)
    let aiDone = false
    try {
      const sess = (await supabase?.auth.getSession())?.data.session
      const st0 = form.site_settings ?? {}
      const kk = (st0 as any).kit ?? {}
      const kitPayload = { layouts: (kk.layouts ?? []).map((key: string) => ({ key, name: STYLES.find((q) => q.key === key)?.name ?? key })), palettes: (kk.palettes ?? []).map((p: any) => ({ name: p.name })), fonts: (kk.fonts ?? []).map((key: string) => ({ key, name: TYPE_SETS.find((t) => t.key === key)?.name ?? key })), themes: (kk.themes ?? []).map((t: any) => t.name), type: kk.type ?? null }
      let planNote = ''
      let madeImgs: { name: string; edge: string; url: string }[] = []
      if (/christmas|halloween|holiday|valentine|thanksgiving|easter|fourth of july|seasonal|animat|snow|sparkle|confetti|effect|magic|wow|dramatic|glow|twinkl|scene|theme|vibe|season|beach|summer|winter|spring|autumn|tropical|ocean|forest|boho|desert|mountain|sunset|night sky/i.test(t)) {
        try {
          const pr = await fetch('/api/ai/camri-plan', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: t }) })
          const pj = pr.ok ? await pr.json() : null
          const planImgs0 = Array.isArray(pj?.images) ? pj.images : []
          if (pj?.text) {
            await sayTyped(pj.text + (planImgs0.length ? ' Making your decorative pieces now. This takes about 40 seconds.' : ''))
            planNote = '\\n\\n(You already told them this plan out loud and must build it: ' + pj.text + ' Use this fresh angle: ' + pj.twist + '.)'
          }
          const planImgs: { name: string; edge: string; prompt: string }[] = Array.isArray(pj?.images) ? pj.images : []
          if (!pr.ok) setMsgs((m) => [...m, { from: 'cami', text: 'My planning step did not answer (' + pr.status + '), so no pictures were made.' }])
          else if (!planImgs.length) setMsgs((m) => [...m, { from: 'cami', text: 'No picture prompts came back from my plan, so no pictures were made.' }])
          madeImgs = (await Promise.all(planImgs.map(async (im) => {
            try {
              const rr = await fetch('/api/ai/camri-image', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ name: im.name, prompt: im.prompt, shape: im.name === 'divider' || im.name === 'texture' ? 'wide' : 'square' }) })
              if (!rr.ok) {
                const tx = await rr.text().catch(() => '')
                console.error('camri-image status', rr.status, tx)
                let why = tx
                try { const pj2 = JSON.parse(tx); why = pj2.detail || pj2.error || tx } catch { /* plain text */ }
                setMsgs((m) => [...m, { from: 'cami', text: "I couldn't make the " + im.name + " picture. " + String(why).slice(0, 300) }])
                return null
              }
              const jj = await rr.json()
              return jj?.url ? { ...im, url: jj.url as string } : null
            } catch (e) {
              console.error('camri-image failed', e)
              setMsgs((m) => [...m, { from: 'cami', text: "I couldn't make the " + im.name + ' picture. The connection dropped: ' + String((e as any)?.message ?? e).slice(0, 120) }])
              return null
            }
          }))).filter(Boolean) as { name: string; edge: string; url: string }[]
          if (madeImgs.length) planNote += "\\n\\n(A set of small decorative pieces (a hero corner accent, a divider above each section, a sprig on the cards and a soft texture) was just generated and is already placed by the builder, so do not use any image in your css and do not draw scenery or decorations with emoji or css. Design the look around them: refined, 3 main colors at most, readable text, and a happy medium of decoration, not crowded and not plain.)"
        } catch (e) { console.error('camri-plan failed', e) }
      }
      const res = await fetch('/api/ai/camri-site', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: (tour === 4 ? 'Write my homepage headline and subhead. About me: ' + t : t) + planNote, history: msgs.slice(-10).map((m: any) => ({ from: m.from === 'cami' ? 'cami' : 'me', text: m.text })), site: { template: form.site_template, accent: form.site_accent, font_pair: form.site_font_pair, headline: form.site_headline, subhead: form.site_subhead, bg: st0.colors?.bg, text: st0.colors?.text, buttons: st0.button?.shape, css: st0.custom_css, js: st0.custom_js }, kit: kitPayload, structure: structureOf(form as any), page: curPage, fontList: FONT_IDS.slice(0, 150).map((id) => ({ id, label: fname(id) })) }) })
      if (!res.ok) console.error('camri-site status', res.status, await res.clone().text().catch(() => ''))
      const ai = res.ok ? await res.json() : null
      if (ai?.reply && ai.changes) {
        const ch = ai.changes
        if (madeImgs.length) {
          let extra = ''
          for (const im of madeImgs) {
            if (String(ch.css ?? '').includes(im.url)) continue
            const U = im.url
            if (im.name === 'corner') extra += ' #top{position:relative}#top::after{content:"";position:absolute;left:0;bottom:0;width:min(18vw,230px);aspect-ratio:1/1;background:url(' + U + ') left bottom/contain no-repeat;pointer-events:none;z-index:1}'
            else if (im.name === 'divider') extra += ' section[id]:not(#social)::before{content:"";display:block;height:64px;max-width:900px;margin:0 auto 12px;background:url(' + U + ') center/100% auto no-repeat;pointer-events:none}'
            else if (im.name === 'sprig') extra += ' #explore a{position:relative}#explore a::after{content:"";position:absolute;top:-10px;right:-4px;width:56px;height:56px;background:url(' + U + ') center/contain no-repeat;pointer-events:none}'
            else if (im.name === 'texture') extra += ' #footer{background:url(' + U + ') center/cover!important}'
          }
          if (extra) ch.css = String(typeof ch.css === 'string' ? ch.css : (st0.custom_css ?? '')).replace(/\/\*camri-backdrop\*\/[\s\S]*?\/\*camri-end\*\//g, '') + ' /*camri-backdrop*/' + extra + ' /*camri-end*/'
        }
        const stripDecor = /(remove|delete|get rid|take (it|them|that|those) (off|out|away)|without|no more|hate|stupid|ugly|dont want|don't want|too much)/i.test(t) && /(rose|corner|divider|sprig|texture|picture|art|decor|flower|floral|image)/i.test(t)
        if (stripDecor) ch.css = String(typeof ch.css === 'string' ? ch.css : (st0.custom_css ?? '')).replace(/\/\*camri-backdrop\*\/[\s\S]*?\/\*camri-end\*\//g, '')
        if (!stripDecor && !madeImgs.length && typeof ch.css === 'string' && ch.css && !ch.css.includes('camri-backdrop')) {
          const kept = String(st0.custom_css ?? '').match(/\/\*camri-backdrop\*\/[\s\S]*?\/\*camri-end\*\//)
          if (kept) ch.css += ' ' + kept[0]
        }
        if (Array.isArray(ch.images) && ch.images.length && typeof ch.css === 'string') {
          const made = await Promise.all(ch.images.map(async (im: any) => {
            try {
              const rr = await fetch('/api/ai/camri-image', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ name: im.name, prompt: im.prompt, shape: im.shape }) })
              if (!rr.ok) { console.error('camri-image status', rr.status, await rr.text().catch(() => '')); return null }
              const jj = await rr.json()
              return jj?.url ? { name: im.name, url: jj.url } : null
            } catch (e) { console.error('camri-image failed', e); return null }
          }))
          for (const d of made) if (d) ch.css = String(ch.css).split('IMG:' + d.name).join(d.url)
        }
        if (ch.style || ch.palette || ch.font_pair || ch.buttons || ch.headline || ch.subhead || typeof ch.css === 'string' || typeof ch.js === 'string' || ch.calendar || ch.kit) {
          await commit((n) => {
            n.site_settings = n.site_settings ?? {}
            if (ch.kit) applyKitOps(n, ch.kit)
            const sty = ch.style ? STYLES.find((x) => x.key === ch.style) : null
            if (sty) { n.site_template = sty.tpl; n.site_font_pair = sty.pair; applyPalette(n, n.site_accent ?? '#C98A8D', sty.bg, sty.text) }
            if (ch.palette) applyPalette(n, ch.palette.accent, ch.palette.bg, ch.palette.text)
            if (ch.font_pair) n.site_font_pair = ch.font_pair
            if (ch.buttons) setButtons(n.site_settings, ch.buttons)
            if (ch.headline) n.site_headline = ch.headline
            if (ch.subhead) n.site_subhead = ch.subhead
            if (typeof ch.css === 'string') { if (ch.css) n.site_settings.custom_css = ch.css; else delete n.site_settings.custom_css }
            if (typeof ch.js === 'string') { if (ch.js) n.site_settings.custom_js = ch.js; else delete n.site_settings.custom_js }
            if (ch.calendar && Object.keys(ch.calendar).length) n.site_settings.calendar = { ...(n.site_settings.calendar ?? {}), ...ch.calendar }
            if (ch.kit?.save_theme) saveThemeAs(n, ch.kit.save_theme)
          })
        }
        sayTyped(ai.reply)
        aiDone = true
        if (ai.next === 'js') {
          try {
            const r2 = await fetch('/api/ai/camri-site', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess?.access_token ?? ''}` }, body: JSON.stringify({ message: '[[JS]] ' + t + planNote, history: [], site: { template: form.site_template, accent: form.site_accent, font_pair: form.site_font_pair, headline: form.site_headline, subhead: form.site_subhead, css: typeof ch.css === 'string' ? ch.css : st0.custom_css, js: st0.custom_js }, kit: kitPayload, structure: structureOf(form as any), page: curPage, fontList: [] }) })
            if (!r2.ok) console.error('camri-site js status', r2.status)
            const ai2 = r2.ok ? await r2.json() : null
            if (typeof ai2?.changes?.js === 'string' && ai2.changes.js) {
              await (commitRef.current ?? commit)((n) => { n.site_settings = n.site_settings ?? {}; n.site_settings.custom_js = ai2.changes.js })
              sayTyped(ai2.reply)
            }
          } catch (e) { console.error('camri-site js step failed', e) }
        }
      }
    } catch (e) { console.error('camri-site failed', e) }
    const r = aiDone ? { changed: false, state: form, reply: '' } : camiSite(t, form)
    if (r.changed) await commit((n) => { n.site_template = r.state.site_template; n.site_accent = r.state.site_accent; n.site_font_pair = r.state.site_font_pair; n.site_headline = r.state.site_headline; n.site_subhead = r.state.site_subhead; n.site_settings = r.state.site_settings })
    if (!aiDone) setMsgs((m) => [...m, { from: 'cami', text: r.reply }])
  }

  // Camri's words appear one at a time, like she is thinking as she builds.
  async function sayTyped(text: string): Promise<void> {
    const full = String(text)
    const words = full.split(' ')
    setMsgs((m) => [...m, { from: 'cami', text: words[0] }])
    await (async () => {
      for (let wi = 2; wi <= words.length; wi++) {
        await new Promise((r) => setTimeout(r, 190))
        const part = words.slice(0, wi).join(' ')
        setMsgs((m) => {
          const k = [...m].reverse().findIndex((x) => x.from === 'cami' && full.startsWith(x.text) && part.startsWith(x.text) && x.text.length >= words[0].length)
          if (k < 0) return m
          const idx = m.length - 1 - k
          const c = [...m]
          c[idx] = { ...c[idx], text: part }
          return c
        })
      }
    })()
  }

  async function loadLib() {
    const sb = supabase
    if (!sb || !form) return
    const { data } = await sb.from('website_library').select('id, storage_path').eq('photographer_id', form.id).order('created_at', { ascending: false })
    setLib((data ?? []) as { id: string; storage_path: string }[])
  }
  useEffect(() => { if (slot) void loadLib() }, [slot])
  async function addLib(files: FileList | null) {
    const sb = supabase
    if (!files || !form || !sb || !slot) return
    setLibBusy(true)
    try {
      const section = slot.key === 'about' ? 'about' : slot.key === 'testimonials' ? 'testimonials' : 'hero'
      let i = 0
      for (const f of Array.from(files)) {
        const v = await makeVersions(f)
        const path = `${form.id}/lib_${Date.now()}_${i++}.jpg`
        const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
        if (up.error) throw up.error
        const ins = await sb.from('website_library').insert({ photographer_id: form.id, storage_path: path, section })
        if (ins.error) { await sb.storage.from('portfolio').remove([path]); throw ins.error }
      }
      await loadLib()
    } catch (e) {
      setErr((e as { message?: string })?.message ?? 'Upload failed.')
    } finally {
      setLibBusy(false)
    }
  }
  function chooseSlot(path: string | null) {
    if (!slot) return
    if (slot.key === 'hero') {
      const cur: string[] = [...(form?.site_settings?.hero?.photos ?? [])]
      let next = cur
      if (path === null) next = []
      else if (cur.includes(path)) next = cur.filter((x) => x !== path)
      else if (cur.length < 6) next = [...cur, path]
      void commit((n) => { const s = (n.site_settings = n.site_settings ?? {}); s.hero = { ...(s.hero ?? {}), photos: next, slideshow: next.length > 1 } })
      if (path === null) setSlot(null)
      return
    }
    const id = slot.key + ':' + slot.idx
    void commit((n) => { const s = (n.site_settings = n.site_settings ?? {}); const sp: Record<string, string> = { ...(s.slotPics ?? {}) }; if (path) sp[id] = path; else delete sp[id]; s.slotPics = sp })
    setSlot(null)
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

  async function saveSocial() {
    if (!form) return
    const patch = { instagram_url: ig.trim() || null, facebook_url: fb.trim() || null, tiktok_url: tt.trim() || null, pinterest_url: pin.trim() || null }
    const next = { ...form, ...patch }
    setHistory((h) => [...h, form])
    setForm(next)
    await save(next)
  }

  if (!form) return <p className="text-sm text-ink-soft">{err ?? 'Loading…'}</p>
  const kitDone = !!(form.site_settings as any)?.kit?.done
  const siteEmpty = !form.site_headline && Object.keys(form.site_settings ?? {}).length === 0
  if (!setupFinished && (setupForce || review || !kitDone)) {
    return (
      <CamriSetup
        styles={STYLES} palettes={PALETTES} typeSets={TYPE_SETS} pages={PAGES} fam={fam} structure={review ? structureOf(form as any) : { v: 1 as const, home: [], about: [], galleries: [], extra: [], off: [] }}
        links={{ instagram_url: String((form as any).instagram_url ?? ''), facebook_url: String((form as any).facebook_url ?? ''), tiktok_url: String((form as any).tiktok_url ?? ''), pinterest_url: String((form as any).pinterest_url ?? '') }}
        fontList={FONT_IDS.map((id) => ({ id, label: fname(id), family: fam(id), gf: String((FONT_OPTIONS[id] as any)?.gf ?? ''), cat: String((FONT_OPTIONS[id] as any)?.cat ?? (FONT_OPTIONS[id] as any)?.category ?? (FONT_OPTIONS[id] as any)?.kind ?? (FONT_OPTIONS[id] as any)?.group ?? '') }))}
        startStep={review ? 3 : 0}
        onCancel={review ? () => { setReview(false); setSetupFinished(true) } : undefined}
        initial={review ? (() => { const k0: any = (form.site_settings as any)?.kit ?? {}; return { layouts: (k0.layouts ?? []) as string[], palettes: ((k0.palettes ?? []) as any[]).map((q) => ({ name: String(q.name), accent: String(q.accent), bg: String(q.bg), text: String(q.text) })), fonts: (k0.fonts ?? []) as string[], type: k0.type ?? undefined } })() : undefined}
        onSkip={() => setSetupSkipped(true)}
        onFinish={async (kit, struct, links, designs) => {
          await commit((n) => {
            const x = (n.site_settings = n.site_settings ?? {})
            x.structure = struct
            if (designs?.nav) x.explore = { ...(x.explore ?? {}), layout: designs.nav }
            if (designs?.galleries) x.galindex = { ...(x.galindex ?? {}), layout: designs.galleries }
            if (designs?.photos) x.galpage = { ...(x.galpage ?? {}), layout: designs.photos }
            if (designs?.galcards) {
              try {
                const cards = (JSON.parse(designs.galcards) as { n: string; d: string }[]).filter((q) => q.n && q.n.trim())
                const byName: Record<string, string> = {}
                cards.forEach((q) => { if (q.d) byName[q.n.trim().toLowerCase()] = q.d })
                x.galpage = { ...(x.galpage ?? {}), byName, cards }
              } catch {}
            }
            if (designs?.social) x.socialDesign = designs.social
            if (designs?.faq) x.faqDesign = designs.faq
            if (designs?.contact) x.contactDesign = designs.contact
            if (designs?.testimonials) x.testiDesign = designs.testimonials
            if (designs?.pricing_page) x.pricing = { ...(x.pricing ?? {}), pageDesign: designs.pricing_page }
            if (designs?.pricing_section) x.pricing = { ...(x.pricing ?? {}), sectionDesign: designs.pricing_section }
            if (designs?.book) x.bookDesign = designs.book
            if (designs?.galleries_section) x.galSection = designs.galleries_section
            if (designs?.blog_list) x.blog = { ...(x.blog ?? {}), listDesign: designs.blog_list }
            if (designs?.blog_post) x.blog = { ...(x.blog ?? {}), postDesign: designs.blog_post }
            if (designs?.about_page || designs?.about_section) x.about = { ...(x.about ?? {}), ...(designs.about_page ? { pageDesign: designs.about_page } : {}), ...(designs.about_section ? { sectionDesign: designs.about_section } : {}) }
            const nn = n as any
            nn.instagram_url = links.instagram_url.trim() || null
            nn.facebook_url = links.facebook_url.trim() || null
            nn.tiktok_url = links.tiktok_url.trim() || null
            nn.pinterest_url = links.pinterest_url.trim() || null
            const prev: any = x.kit ?? null
            const same = (a: any, b: any) => JSON.stringify([a?.accent, a?.bg, a?.text]) === JSON.stringify([b?.accent, b?.bg, b?.text])
            const layoutNew = kit.layouts.length > 0 && (!prev || (prev.layouts?.[0] ?? null) !== kit.layouts[0])
            const palNew = !prev || !same(prev.palettes?.[0], kit.palettes[0])
            const fontNew = !prev || (['title', 'subtitle', 'paragraph'] as const).some((r) => (prev.type?.[r]?.[0] ?? null) !== (kit.type[r][0] ?? null))
            if (layoutNew) {
              const sty = STYLES.find((st) => st.key === kit.layouts[0])
              if (sty) { n.site_template = sty.tpl; n.site_font_pair = sty.pair; clearFontOverrides((n.site_settings = n.site_settings ?? {})); resetLook(n.site_settings); applyPalette(n, (sty as any).acc ?? n.site_accent ?? '#C98A8D', sty.bg, sty.text); const sx = (n.site_settings = n.site_settings ?? {}); sx.button = { ...(sx.button ?? {}), shape: (sty as any).shape ?? 'square' } }
            }
            const pal = kit.palettes[0]
            if (pal && (layoutNew || palNew)) applyPalette(n, pal.accent, pal.bg, pal.text)
            if (fontNew) {
              clearFontOverrides(x)
              const tt = kit.type.title[0]
              const sb = kit.type.subtitle[0]
              const pp = kit.type.paragraph[0]
              if (tt) { x.fonts = { ...(x.fonts ?? {}), head: tt }; x.hero = { ...(x.hero ?? {}), headline_font: tt } }
              if (pp) { x.fonts = { ...(x.fonts ?? {}), body: pp }; x.hero = { ...(x.hero ?? {}), para_font: pp } }
              if (sb) x.hero = { ...(x.hero ?? {}), subhead_font: sb }
            }
            x.kit = prev ? { ...kit, themes: prev.themes ?? [], layout_idx: prev.layout_idx } : kit
          })
          setSetupFinished(true)
        }}
      />
    )
  }


  const photos: string[] = form.site_settings?.hero?.photos ?? []
  const set = form.site_settings ?? {}
  const colors = set.colors ?? {}
  const accent: string = form.site_accent ?? '#C98A8D'
  const bg: string = colors.bg ?? '#FAF7F2'
  const txt: string = colors.text ?? '#2A1F24'
  const curShape: string = set.button?.shape ?? 'square'
  const hidden: string[] = Array.isArray(set.menu?.hidden) ? set.menu.hidden : []
  const pairs = PAIR_PRESETS as unknown as Record<string, { head: string; body: string }>
  const pr = pairs[form.site_font_pair ?? 'serif'] ?? pairs.serif
  const curHead: string = set.fonts?.head ?? pr.head
  const curBody: string = set.fonts?.body ?? pr.body
  const curSub: string = set.hero?.para_font ?? curBody
  const idx = TABS.indexOf(tab)
  const roleVal = role === 'accent' ? accent : role === 'bg' ? bg : txt
  const swatches = role === 'accent' ? ACCENTS : role === 'bg' ? BGS : TEXTS
  const hiddenSecs: string[] = Array.isArray(set.hiddenSecs) ? set.hiddenSecs : []
  const homeKnown = HOME_SECS.map(([k]) => k)
  const homeCustom: string[] = ((set.customs ?? []) as { id: string; page: string }[]).filter((c) => c.page === 'home').map((c) => c.id)
  const savedHome: string[] = Array.isArray(set.order_home) ? set.order_home : []
  const homeFull: string[] = [...savedHome.filter((k) => homeKnown.includes(k) || homeCustom.includes(k)), ...homeKnown.filter((k) => !savedHome.includes(k)), ...homeCustom.filter((k) => !savedHome.includes(k))]
  const homeOrder: string[] = homeFull.filter((k) => homeKnown.includes(k))

  function pickColor(v: string) {
    commit((n) => applyPalette(n, role === 'accent' ? v : n.site_accent ?? accent, role === 'bg' ? v : n.site_settings?.colors?.bg ?? bg, role === 'text' ? v : n.site_settings?.colors?.text ?? txt))
  }
  function moveSec(k: string, dir: number) {
    const i = homeOrder.indexOf(k)
    const j = i + dir
    if (i < 0 || j < 0 || j >= homeOrder.length) return
    const other = homeOrder[j]
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      const full = [...homeFull]
      const a = full.indexOf(k)
      const b = full.indexOf(other)
      full[a] = other
      full[b] = k
      s.order_home = full
    })
  }
  function toggleSec(k: string) {
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      const h: string[] = Array.isArray(s.hiddenSecs) ? s.hiddenSecs : []
      s.hiddenSecs = h.includes(k) ? h.filter((x) => x !== k) : [...h, k]
    })
  }
  function togglePage(k: string) {
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      const h: string[] = Array.isArray(s.menu?.hidden) ? s.menu.hidden : []
      s.menu = { ...(s.menu ?? {}), hidden: h.includes(k) ? h.filter((x) => x !== k) : [...h, k] }
    })
  }
  function clearFontOverrides(s: NonNullable<Prof['site_settings']>) {
    if (s.fonts) { delete s.fonts.head; delete s.fonts.body }
    if (s.hero) { delete s.hero.headline_font; delete s.hero.para_font }
  }
  function setOwn(which: 'head' | 'sub' | 'body', k: string) {
    setTypeSel('own')
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (which === 'head') { s.fonts = { ...(s.fonts ?? {}), head: k }; s.hero = { ...(s.hero ?? {}), headline_font: k } }
      if (which === 'sub') { s.hero = { ...(s.hero ?? {}), para_font: k } }
      if (which === 'body') { s.fonts = { ...(s.fonts ?? {}), body: k } }
    })
  }

  function setElProp(key: string, patch: { font?: string; color?: string; size?: number; op?: number }, live?: boolean) {
    (live ? liveEdit : commit)((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (key === 'hero_headline') {
        if (patch.font) s.hero = { ...(s.hero ?? {}), headline_font: patch.font }
        const rest: Record<string, any> = { ...patch }
        delete rest.font
        if (Object.keys(rest).length) s.el = { ...(s.el ?? {}), hero_headline: { ...(s.el?.hero_headline ?? {}), ...rest } }
        return
      }
      s.el = { ...(s.el ?? {}), [key]: { ...(s.el?.[key] ?? {}), ...patch } }
    })
  }
  function resetEl(key: string) {
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (key === 'hero_headline') { if (s.hero) delete s.hero.headline_font; if (s.el?.hero_headline) delete s.el.hero_headline; return }
      if (s.el?.[key]) { delete s.el[key].font; delete s.el[key].color; delete s.el[key].size; delete s.el[key].op }
    })
  }
  function applyText() {
    if (!pick || !TEXT_KEYS.includes(pick.key) || ptext === pick.text) return
    const v = ptext
    const key = pick.key
    setPick({ ...pick, text: v })
    commit((n) => {
      const s = (n.site_settings = n.site_settings ?? {})
      if (key === 'hero_headline') n.site_headline = v
      else if (key === 'menu_brand') s.menu = { ...(s.menu ?? {}), brand: v }
      else { const f = key === 'about_text' ? 'about' : key === 'con_msg' ? 'contact' : key === 'ft_line' ? 'footer' : ['feat_title', 'hero_btn', 'air_label', 'air_more', 'ls_title', 'rom_kicker', 'rom_story', 'rom_more', 'ea_kicker', 'ea_para', 'ea_follow', 'pe_tag', 'iv_kicker', 'iv_tag', 'wi_hi', 'ju_kicker', 'ju_para', 'ju_s1t', 'ju_s1d', 'ju_s2t', 'ju_s2d', 'ju_s3t', 'ju_s3d', 'ca_sub', 'ca_bar', 'ca_w1', 'ca_w2', 'ca_w3', 'ca_w4', 'ce_p1', 'ce_p2', 'ol_kicker', 'ol_c1', 'ol_c2', 'ol_c3', 'ol_c4', 'mg_story', 'mg_text', 'li_kicker', 'li_para', 'li_meet', 'li_more', 'as_kicker', 'as_para', 'as_kind', 'as_q1', 'as_n1', 'as_q2', 'as_n2', 'as_q3', 'as_n3', 'sg_tag', 'sg_recent', 'ro_script', 'ro_c1', 'ro_c2', 'ro_c3', 'hz_kicker', 'hz_para', 'hz_quote', 'hz_name', 'sf_n1', 'sf_n2', 'sf_n3', 'sf_n4', 'sf_c1', 'sf_c2', 'sf_c3', 'cy_tag', 'cy_s1', 'cy_s2', 'cy_s3', 'la_vert', 'la_para', 'ir_l', 'ir_r', 'ir_issue', 'ir_t1', 'ir_t2', 'ir_t3', 'pr_kicker', 'pr_c1', 'pr_c2', 'pr_c3', 'pr_c4', 'th_tag', 'cl_p1', 'cl_p2', 'cl_p3', 'cl_p4', 'cl_p5', 'cl_sub', 'cl_t1', 'cl_t2', 'cl_t3', 'mi_t1', 'mi_t2', 'mi_t3', 'mi_t4', 'ya_script', 'ya_month', 'ya_head', 'ya_para', 'ya_link', 'gs_title', 'gp_title', 'tes_title', 'faq_title', 'ab_h1', 'ab_h2', 'ab_h3', 'ab_p3', 'ab_by', 'ab_loves', 'ab_hi', 'ab_n1', 'ab_l1', 'ab_n2', 'ab_l2', 'ab_n3', 'ab_l3', 'ab_quote', 'ab_sig', 'ab_tag', 'ab_f1t', 'ab_f1d', 'ab_f2t', 'ab_f2d', 'ab_f3t', 'ab_f3d', 'ab_f4t', 'ab_f4d', 'ab_f5t', 'ab_f5d', 'soc_title', 'soc_handle', 'con_title'].includes(key) ? key : 'copyright'; s.text = { ...(s.text ?? {}), [f]: v } }
    })
  }

  function renderStep(k: Tab) {
    if (k === 'style') return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STYLES.map((st) => (
          <button key={st.key} type="button" onClick={async () => {
            setStyleSel(st.key)
            await commit((n) => { const x = (n.site_settings = n.site_settings ?? {}); n.site_template = st.tpl; n.site_font_pair = st.pair; x.look = st.key; clearFontOverrides(x); applyPalette(n, n.site_accent ?? '#C98A8D', st.bg, st.text) })
          }} className={'rounded-xl border bg-white/70 p-2.5 text-left transition hover:bg-white ' + (styleSel === st.key ? ringOn : 'border-white/80')}>
            <div className="overflow-hidden rounded-lg border border-black/5"><Mock k={(st as any).mock ?? st.key} bg={st.bg} tx={st.text} /></div>
            <p className="mt-2 text-sm font-semibold text-ink">{st.name}</p>
            <p className="text-xs text-ink-soft">{st.blurb}</p>
          </button>
        ))}
      </div>
    )
    if (k === 'pages') return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PAGES.map((pg) => {
          const on = pg.locked || (!pg.soon && !hidden.includes(pg.k))
          return (
            <button key={pg.k} type="button" disabled={pg.locked || pg.soon} onClick={() => togglePage(pg.k)} className={'flex h-24 flex-col justify-between rounded-xl border bg-white/70 p-3 text-left transition ' + (on ? ringOn : 'border-white/80') + (pg.soon ? ' opacity-50' : ' hover:bg-white')}>
              <span className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">{pg.label}</span>
                <span className={'flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white ' + (on ? 'bg-[color-mix(in_srgb,rgb(var(--scene-a,201_133_136))_65%,#e6e6e6)]' : 'bg-ink/20')}>{on ? '✓' : ''}</span>
              </span>
              <span className="text-xs text-ink-soft">{pg.soon ? 'Coming soon' : pg.locked ? 'Always on' : pg.blurb}</span>
            </button>
          )
        })}
      </div>
    )
    if (k === 'colors') return (
      <div>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
          {PALETTES.map((pl) => (
            <button key={pl.name} type="button" onClick={() => commit((n) => applyPalette(n, pl.accent, pl.bg, pl.text))} className="rounded-xl border border-white/80 bg-white/70 p-2.5 text-left transition hover:bg-white">
              <div className="flex gap-1">{[pl.accent, pl.bg, pl.text].map((c) => <span key={c} className="h-5 w-5 rounded-full border border-black/15" style={{ background: c }} />)}</div>
              <p className="mt-1.5 text-xs font-medium text-ink">{pl.name}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {([['accent', 'Main color', accent], ['bg', 'Background', bg], ['text', 'Text', txt]] as const).map(([rk, label, v]) => (
            <button key={rk} type="button" onClick={() => { setRole(rk); setHexIn('') }} className={'flex items-center gap-2 rounded-xl border bg-white/70 px-3 py-2 text-sm text-ink transition hover:bg-white ' + (role === rk ? ringOn : 'border-white/80')}>
              <span className="h-5 w-5 rounded-full border border-black/15" style={{ background: v }} />{label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          {swatches.map((c) => (
            <button key={c} type="button" aria-label={c} onClick={() => pickColor(c)} className={'h-8 w-8 rounded-full border border-black/15 transition hover:scale-110 ' + (roleVal.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-[rgb(var(--scene-b,201_133_136))]' : '')} style={{ background: c }} />
          ))}
          <input value={hexIn} onChange={(e) => { const v = e.target.value.trim(); setHexIn(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) pickColor(v) }} placeholder="#hex" maxLength={7} className="w-24 rounded-lg border border-white/80 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-twilight" />
          <EyeDropperButton onPick={(v) => { setHexIn(''); pickColor(v) }} />
        </div>
      </div>
    )
    if (k === 'type') return (
      <div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
          {TYPE_SETS.map((t) => (
            <div key={t.key} className="flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => {
                setTypeSel(t.key); setOwnFonts(false)
                commit((n) => {
                  const x = (n.site_settings = n.site_settings ?? {})
                  clearFontOverrides(x)
                  if (t.pair) n.site_font_pair = t.pair
                  else { x.fonts = { ...(x.fonts ?? {}), head: t.head, body: t.body }; x.hero = { ...(x.hero ?? {}), headline_font: t.head, para_font: t.body } }
                })
              }} className={'flex h-28 w-full flex-col justify-center rounded-xl border bg-white/80 px-4 text-left transition hover:bg-white ' + (typeSel === t.key ? ringOn : 'border-white/80')}>
                <span className="truncate text-2xl text-ink" style={{ fontFamily: fam(t.head) }}>Your Name</span>
                <span className="mt-1 truncate text-sm text-ink-soft" style={{ fontFamily: fam(t.body) }}>Wedding photography</span>
              </button>
              <span className="text-xs font-medium uppercase tracking-wider text-ink-soft">{t.name}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setOwnFonts(!ownFonts)} className={ghostBtn + ' mt-4'}>{ownFonts ? 'Hide my own fonts' : 'Choose my own fonts'}</button>
        {ownFonts && (
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <FontPick label="Headings" hint="Your name and big titles" value={curHead} onPick={(fk) => setOwn('head', fk)} />
            <FontPick label="Sub headings" hint="The line under your headline" value={curSub} onPick={(fk) => setOwn('sub', fk)} />
            <FontPick label="Paragraphs" hint="Everything else you write" value={curBody} onPick={(fk) => setOwn('body', fk)} />
          </div>
        )}
        <p className="mt-6 text-sm font-medium text-ink">Button shape</p>
        <div className="mt-2 grid max-w-xl grid-cols-3 gap-3">
          {SHAPES.map((sh) => (
            <button key={sh.k} type="button" onClick={() => commit((n) => { const x = (n.site_settings = n.site_settings ?? {}); setButtons(x, sh.k) })}
              className={'flex h-24 flex-col items-center justify-center gap-2 rounded-xl border bg-white/70 transition hover:bg-white ' + (curShape === sh.k ? ringOn : 'border-white/80')}>
              <span className="inline-block px-3 py-1.5 text-xs font-medium text-white" style={{ background: accent, borderRadius: sh.r }}>Book now</span>
              <span className="text-xs text-ink-soft">{sh.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
    if (k === 'photos') return (
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {photos.map((ph) => (
          <div key={ph} className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={BASE + ph} alt="" className="h-full w-full object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => removePhoto(ph)} className="absolute right-1 top-1 rounded-full bg-black/55 px-1.5 text-xs text-white">×</button>
          </div>
        ))}
        {photos.length < 6 && (
          <label className="flex aspect-[4/5] cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink/30 bg-white/50 text-center text-xs text-ink-soft hover:bg-white/80">
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
            {busy ? 'Uploading…' : '+ Add photos'}
          </label>
        )}
      </div>
    )
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {([['Instagram link', ig, setIg], ['Facebook link', fb, setFb], ['TikTok link', tt, setTt], ['Pinterest link', pin, setPin]] as const).map(([ph, v, fn]) => (
          <input key={ph} value={v} onChange={(e) => fn(e.target.value)} placeholder={ph} className="w-full rounded-xl border border-white/80 bg-white/70 px-4 py-3 text-base text-ink outline-none focus:border-twilight" />
        ))}
      </div>
    )
  }

  const PAGE_LABEL: Record<string, string> = { home: 'Home', booking: 'Booking', galleries: 'Galleries', about: 'About', blog: 'Blog', pricing: 'Pricing', faq: 'FAQ' }
  const kitNow = ((form.site_settings as any)?.kit ?? {}) as Record<string, any>
  const stNow = structureOf(form as any)
  const chosenPages: string[] = ['home', 'booking', ...(stNow.off.includes('galleries') ? [] : ['galleries']), ...(stNow.off.includes('about') ? [] : ['about']), ...stNow.extra.map((e) => e.id), ...(((form.site_settings ?? {}) as any).structure && !stNow.off.includes('blog') ? ['blog'] : [])]
  const pageLabel = (k: string) => PAGE_LABEL[k] ?? stNow.extra.find((e) => e.id === k)?.label ?? (k.charAt(0).toUpperCase() + k.slice(1))
  const PAGE_PATH: Record<string, string> = { home: '', about: '/about', galleries: '/galleries', booking: '/availability', blog: '/blog' }
  const previewBase = process.env.NODE_ENV === 'production' ? 'https://sites.camrhia.com' : ''
  const previewSrc = previewBase + '/site/' + form.public_token + (PAGE_PATH[curPage] ?? (curPage && curPage !== 'home' ? '/p/' + curPage : '')) + '?preview=1'
  const ACC = 'bg-[color-mix(in_srgb,rgb(var(--scene-a,204_138_140))_65%,#e6e6e6)]'
  const tabsDef: { k: 'pages' | 'design' | 'settings'; label: string; icon: string }[] = [
    { k: 'pages', label: 'Pages', icon: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5' },
    { k: 'design', label: 'Design', icon: 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 2-2 0-1.5-1-2-1-3s1-2 2-2h3a3 3 0 0 0 3-3c0-4.5-4-8-9-8z' },
    { k: 'settings', label: 'Settings', icon: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6' },
  ]
  const designRows: [Tab, string, string][] = [
    ['style', 'Layout', 'The look of your whole site'],
    ['colors', 'Colors', 'Accent, background and text'],
    ['type', 'Fonts & buttons', 'Your fonts and the shape of your buttons'],
  ]
  const siteUrl = form.slug ? `camrhia.com/${form.slug}` : form.public_token ? `camrhia.com/site/${form.public_token}` : ''

  return (
    <div className="bld fixed inset-0 z-[60] flex bg-[#efeae4] text-ink">
      <aside className={(full ? 'hidden' : 'flex') + ' w-[400px] shrink-0 flex-col border-r border-black/10 bg-white'}>
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Back to dashboard" onClick={() => router.push('/dashboard')} className="flex h-9 items-center gap-1 rounded-full px-3 text-sm text-ink-soft transition hover:bg-black/5 hover:text-ink">← Dashboard</button>
          </div>
          <div className="flex items-center gap-2">
            {siteUrl && <button type="button" onClick={() => { try { void navigator.clipboard.writeText('https://' + siteUrl) } catch { /* ignore */ } setPubMsg('Link copied.'); setTimeout(() => setPubMsg(''), 2000) }} className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:bg-black/5 hover:text-ink">Copy link</button>}
            <button type="button" onClick={() => { void undo() }} disabled={history.length === 0} className="rounded-lg px-3 py-1.5 text-sm text-ink-soft transition hover:bg-black/5 hover:text-ink disabled:opacity-40">Undo</button>
          </div>
        </div>

        <p className="px-5 pb-2 font-fraunces text-2xl font-semibold text-ink">Design your website</p>
        {err && <p className="mx-5 mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</p>}

        <div className="flex min-h-0 flex-1 flex-col">
          <button type="button" onClick={() => { setReview(true); setSetupFinished(false) }} className="mx-5 mb-2 mt-3 self-start rounded-full border border-black/15 bg-white px-4 py-1.5 text-xs font-medium text-ink transition hover:border-twilight">← Back to walkthrough</button>
          {kitNow.done && (
            <div className="min-h-0 flex-1 overflow-y-auto border-b border-black/10 bg-[#f1e9e0] px-5 py-4">
              <div className="inline-flex rounded-full border border-black/10 bg-white p-1">
                {([['design', 'Design tools'], ['setup', 'Your setup']] as const).map(([k, t]) => (
                  <button key={k} type="button" onClick={() => setLeftTab(k)} className={'rounded-full px-4 py-1.5 text-sm transition ' + (leftTab === k ? 'bg-[#8C6B3F] font-medium text-white' : 'text-ink hover:bg-black/5')}>{t}</button>
                ))}
              </div>
              {leftTab === 'design' && (() => {
                const SEC_NAME: Record<string, string> = { hero: 'Hero', stories: 'Love Stories', follow: 'Follow along', featured: 'Featured work', explore: 'Explore section', portfolio: 'Gallery section', galsec: 'Gallery section', about: 'About section', testimonials: 'Testimonials section', investment: 'Pricing section', pricesec: 'Pricing section', faq: 'FAQ section', contact: 'Booking section', social: 'Social links', aboutcta: 'About button' }
                const ss: Record<string, any> = set.secStyle ?? {}
                const okHex = (c: any) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
                const base: string[] = [form?.site_accent, set.colors?.bg, set.colors?.text, ...PICK_COLORS].filter(okHex) as string[]
                const secBgMut = (key: string, c: string | null) => (n: Prof) => { const x = (n.site_settings = n.site_settings ?? {}); const m: Record<string, any> = { ...(x.secStyle ?? {}) }; const cur = { ...(m[key] ?? {}) }; if (c) cur.bg = c; else delete cur.bg; m[key] = cur; x.secStyle = m }
                const setSecBg = (key: string, c: string | null) => { void commit(secBgMut(key, c)) }
                const liveSecBg = (key: string, c: string) => liveEdit(secBgMut(key, c))
                const boxReset = selBox && (set.boxFx ?? {})[selBox] ? <button type="button" onClick={() => { void commit((n) => { const x = (n.site_settings = n.site_settings ?? {}); const m: Record<string, any> = { ...(x.boxFx ?? {}) }; delete m[selBox]; x.boxFx = m }) }} className="mt-4 rounded-full border border-[#B08D57] bg-transparent px-4 py-1.5 text-sm font-medium text-[#6B4A2B] transition hover:bg-[#F3E7D3]">Reset position and size</button> : null
                const btn = 'rounded-full border border-[#B08D57] bg-transparent px-4 py-1.5 text-sm font-medium text-[#6B4A2B] transition hover:bg-[#F3E7D3]'
                const inp = 'mt-3 w-full rounded-xl border border-[#E4D3B6] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#B08D57]'
                if (selBtn) {
                  const bf = (set.btnFx ?? {})[selBtn.id] ?? {}
                  const bMut = (patch: Record<string, any>, del?: string[]) => (n: Prof) => { const x = (n.site_settings = n.site_settings ?? {}); const m: Record<string, any> = { ...(x.btnFx ?? {}) }; const cur: Record<string, any> = { ...(m[selBtn.id] ?? {}), ...patch }; (del ?? []).forEach((k) => { delete cur[k] }); m[selBtn.id] = cur; x.btnFx = m }
                  const setB = (patch: Record<string, any>, del?: string[]) => { void commit(bMut(patch, del)) }
                  const liveB = (patch: Record<string, any>) => liveEdit(bMut(patch))
                  const setBtnText = (v: string) => {
                    const tx = selBtn.tx
                    if (!tx || !v.trim() || v.trim() === selBtn.text) return
                    void commit((n) => {
                      const x = (n.site_settings = n.site_settings ?? {})
                      if (tx === 'contactBtn' || tx === 'aboutBtn' || tx === 'galBtn') x[tx] = { ...(x[tx] ?? {}), text: v.trim() }
                      else if (tx === 'hero_el') x.text = { ...(x.text ?? {}), hero_btn: v.trim() }
                      else if (tx === 'heroText') x.hero = { ...(x.hero ?? {}), btn_text: v.trim() }
                    })
                    setSelBtn({ ...selBtn, text: v.trim() })
                  }
                  return (
                    <div className="mt-4">
                      <p className="font-fraunces text-lg font-semibold text-ink">Button</p>
                      {selBtn.tx && <input key={selBtn.id + selBtn.tx} defaultValue={selBtn.text} onBlur={(e) => setBtnText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} className={inp} />}
                      <ColorRow label="Button color" value={bf.bg} base={base} onLive={(c) => liveB({ bg: c })} onSet={(c) => setB({ bg: c })} onReset={() => setB({}, ['bg'])} />
                      <ColorRow label="Button text color" value={bf.color} base={base} onLive={(c) => liveB({ color: c })} onSet={(c) => setB({ color: c })} onReset={() => setB({}, ['color'])} />
                      <div className="mt-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Button shape</p>
                        <div className="mt-2 flex gap-2">
                          {(['square', 'rounded', 'pill'] as const).map((sh) => (
                            <button key={sh} type="button" onClick={() => setB({ shape: sh })} className={'rounded-full border px-4 py-1.5 text-sm capitalize transition ' + (bf.shape === sh ? 'border-[#8C6B3F] bg-[#8C6B3F] text-white' : 'border-[#E4D3B6] bg-white text-ink hover:bg-[#F3E7D3]')}>{sh}</button>
                          ))}
                        </div>
                      </div>
                      <SliderRow label="Button text size" value={Number(bf.size) || 13} min={9} max={32} step={1} unit="px" onLive={(v) => liveB({ size: v })} onDone={(v) => setB({ size: v })} />
                      <SliderRow label="Button opacity" value={Math.round(Number(bf.op ?? 1) * 100)} min={10} max={100} step={1} unit="%" onLive={(v) => liveB({ op: v >= 100 ? 1 : v / 100 })} onDone={(v) => setB({ op: v >= 100 ? 1 : v / 100 })} />
                      <button type="button" onClick={() => { void commit((n) => { const x = (n.site_settings = n.site_settings ?? {}); const m: Record<string, any> = { ...(x.btnFx ?? {}) }; delete m[selBtn.id]; x.btnFx = m }) }} className={btn + ' mt-4'}>Reset button</button>
                      {boxReset}
                    </div>
                  )
                }
                if (pick) {
                  const el = set.el?.[pick.key] ?? {}
                  const nm = PICK_LABELS[pick.key] ?? 'Text'
                  return (
                    <div className="mt-4">
                      <p className="font-fraunces text-lg font-semibold text-ink">{nm}</p>
                      {TEXT_KEYS.includes(pick.key) && (LONG_TEXT.includes(pick.key)
                        ? <textarea value={ptext} onChange={(e) => setPtext(e.target.value)} onBlur={applyText} rows={4} className={inp} />
                        : <input value={ptext} onChange={(e) => setPtext(e.target.value)} onBlur={applyText} className={inp} />)}
                      <div className="mt-3">
                        <FontPick label="Font" hint="Just this text" value={set.el?.[pick.key]?.font ?? (pick.key === 'hero_headline' ? (set.hero?.headline_font ?? curHead) : curBody)} onPick={(fk) => setElProp(pick.key, { font: fk })} />
                      </div>
                      <ColorRow label={nm + ' color'} value={el.color ?? pick.color} base={base} onLive={(c) => setElProp(pick.key, { color: c }, true)} onSet={(c) => setElProp(pick.key, { color: c })} />
                      <SliderRow label={nm + ' size'} value={Math.round(Number(el.size) || pick.size || 16)} min={8} max={pick.key === 'hero_headline' ? 120 : 90} step={1} unit="px" onLive={(v) => setElProp(pick.key, { size: v }, true)} onDone={(v) => setElProp(pick.key, { size: v })} />
                      <SliderRow label={nm + ' opacity'} value={Math.round((Number(el.op) || pick.op || 1) * 100)} min={10} max={100} step={1} unit="%" onLive={(v) => setElProp(pick.key, { op: v >= 100 ? 1 : v / 100 }, true)} onDone={(v) => setElProp(pick.key, { op: v >= 100 ? 1 : v / 100 })} />
                      <button type="button" onClick={() => resetEl(pick.key)} className={btn + ' mt-4'}>Reset text</button>
                      {boxReset}
                    </div>
                  )
                }
                if (selPh) {
                  const id = selPh.key === 'hero' ? 'hero' : selPh.key + ':' + selPh.idx
                  const fx = (set.photoFx ?? {})[id] ?? {}
                  const secNm = SEC_NAME[selPh.key] ?? selPh.key
                  const nm = selPh.key === 'hero' ? 'Hero main photo' : secNm + ' photo ' + (selPh.idx + 1)
                  const fxMut = (patch: Record<string, any>, del?: string[]) => (n: Prof) => { const x = (n.site_settings = n.site_settings ?? {}); const m: Record<string, any> = { ...(x.photoFx ?? {}) }; const cur: Record<string, any> = { ...(m[id] ?? {}), ...patch }; (del ?? []).forEach((k) => { delete cur[k] }); m[id] = cur; x.photoFx = m }
                  const setFx = (patch: Record<string, any>, del?: string[]) => { void commit(fxMut(patch, del)) }
                  const liveFx = (patch: Record<string, any>) => liveEdit(fxMut(patch))
                  return (
                    <div className="mt-4">
                      <p className="font-fraunces text-lg font-semibold text-ink">{nm}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={() => setSlot({ key: selPh.key, idx: selPh.idx })} className={btn}>Change photo</button>
                        <button type="button" onClick={() => { void commit((n) => { const x = (n.site_settings = n.site_settings ?? {}); const m: Record<string, any> = { ...(x.photoFx ?? {}) }; delete m[id]; x.photoFx = m }) }} className={btn}>Reset photo</button>
                      </div>
                      <p className="mt-2 text-xs text-ink-soft">Drag the photo to move it inside its frame. Use the corners to resize the frame and the Move tab to place it.</p>
                      {boxReset}
                      <SliderRow label={nm + ' zoom'} value={Number(fx.z ?? 1)} min={1} max={3} step={0.02} unit="x" onLive={(v) => liveFx({ z: v })} onDone={(v) => setFx({ z: v })} />
                      <SliderRow label={nm + ' opacity'} value={Math.round(Number(fx.o ?? 1) * 100)} min={10} max={100} step={1} unit="%" onLive={(v) => liveFx({ o: v >= 100 ? 1 : v / 100 })} onDone={(v) => setFx({ o: v >= 100 ? 1 : v / 100 })} />
                      {selPh.key === 'hero'
                        ? <ColorRow label="Hero background color" value={ss.top?.bg} base={base} onLive={(c) => liveSecBg('top', c)} onSet={(c) => setSecBg('top', c)} onReset={() => setSecBg('top', null)} />
                        : <>
                            <ColorRow label={nm + ' background color'} value={fx.bg} base={base} onLive={(c) => liveFx({ bg: c })} onSet={(c) => setFx({ bg: c })} onReset={() => setFx({}, ['bg'])} />
                            <ColorRow label={secNm + ' background color'} value={ss[selPh.key]?.bg} base={base} onLive={(c) => liveSecBg(selPh.key, c)} onSet={(c) => setSecBg(selPh.key, c)} onReset={() => setSecBg(selPh.key, null)} />
                          </>}
                    </div>
                  )
                }
                if (!selSec) return <p className="mt-4 text-sm text-ink-soft">Click a section, photo or text on your site to design it.</p>
                const bgKey = selSec === 'hero' ? 'top' : selSec
                const secNm = SEC_NAME[selSec] ?? selSec
                return (
                  <div className="mt-4">
                    <p className="font-fraunces text-lg font-semibold text-ink">{secNm}</p>
                    <ColorRow label={secNm + ' background color'} value={ss[bgKey]?.bg} base={base} onLive={(c) => liveSecBg(bgKey, c)} onSet={(c) => setSecBg(bgKey, c)} onReset={() => setSecBg(bgKey, null)} />
                  </div>
                )
              })()}
              {leftTab === 'setup' && (() => {
                const lab = 'mt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-soft'
                const pill = 'rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-ink transition hover:border-twilight'
                const x0 = ((form.site_settings ?? {}) as Record<string, any>)
                const numPill = (on: boolean) => pill + ' inline-flex items-center gap-1.5' + (on ? ' !border-twilight !bg-[#f6ece3]' : '')
                const num = (i: number) => <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-twilight text-[11px] font-semibold text-white">{i + 1}</span>
                return (
                  <>
                    {curPage === 'home' && (kitNow.layouts ?? []).length > 0 && (
                      <div><p className={lab}>Layouts</p><div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(kitNow.layouts as string[]).map((key, i) => <button key={key} type="button" className={numPill(Number(kitNow.layout_idx ?? 0) === i)} onClick={() => { void commit((n) => applyKitOps(n, { layout: key })) }}>{num(i)}{STYLES.find((q) => q.key === key)?.name ?? key}</button>)}
                      </div></div>
                    )}
                    {(kitNow.palettes ?? []).length > 0 && (
                      <div><p className={lab}>Colors</p><div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(kitNow.palettes as any[]).map((p, i) => (
                          <button key={String(p.name) + i} type="button" className={numPill(form.site_accent === p.accent && x0.colors?.bg === p.bg)} onClick={() => { void commit((n) => applyKitOps(n, { palette: p.name })) }}>
                            {num(i)}
                            <span className="flex overflow-hidden rounded-full border border-black/10"><span className="h-4 w-4" style={{ background: p.accent }} /><span className="h-4 w-4" style={{ background: p.bg }} /><span className="h-4 w-4" style={{ background: p.text }} /></span>
                            {p.name}
                          </button>
                        ))}
                      </div></div>
                    )}
                    {(['title', 'subtitle', 'paragraph'] as const).some((r) => (kitNow.type?.[r] ?? []).length > 0) && (
                      <div><p className={lab}>Fonts</p>
                        {(['title', 'subtitle', 'paragraph'] as const).map((role) => {
                          const list = (kitNow.type?.[role] ?? []) as string[]
                          if (list.length === 0) return null
                          const cur = role === 'title' ? (x0.hero?.headline_font ?? x0.fonts?.head) : role === 'subtitle' ? x0.hero?.subhead_font : (x0.hero?.para_font ?? x0.fonts?.body)
                          return (
                            <div key={role} className="mt-1.5">
                              <p className="text-[11px] capitalize text-ink-soft">{role}</p>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {list.map((id, i) => <button key={id} type="button" className={numPill(cur === id)} style={{ fontFamily: fam(id) }} onClick={() => { void commit((n) => applyKitOps(n, { role_font: { role, font: id } })) }}>{num(i)}{fname(id)}</button>)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {Object.entries((kitNow.designAlts ?? {}) as Record<string, { label: string; items: { key: string; name: string }[] }>).filter(([field]) => {
                      const PG: Record<string, string> = { galleries: 'galleries', photos: 'galleries', book: 'booking', about_page: 'about', pricing_page: 'pricing', blog_list: 'blog', blog_post: 'blog' }
                      if (PG[field]) return PG[field] === curPage
                      const BK: Record<string, string> = { nav: 'explore', galleries_section: 'galsec', about_section: 'about', pricing_section: 'pricesec', testimonials: 'testimonials', faq: 'faq', social: 'social', contact: 'contact' }
                      const st: any = stNow
                      const lst: string[] = curPage === 'home' ? st.home : curPage === 'about' ? st.about : curPage === 'galleries' ? st.galleries : curPage === 'booking' ? (st.book ?? []) : ((st.extra ?? []).find((e: any) => e.id === curPage)?.sections ?? [])
                      if (BK[field] === 'about' && curPage !== 'home') return false
                      return (lst ?? []).includes(BK[field])
                    }).map(([field, d]) => (
                      <div key={field}><p className={lab}>{d.label}</p><div className="mt-1.5 flex flex-wrap gap-1.5">
                        {d.items.map((it, i) => <button key={it.key} type="button" className={numPill(DESIGN_PATHS[field] ? getPath(x0, DESIGN_PATHS[field]) === it.key : false)} onClick={() => { void commit((n) => applyKitOps(n, { design: { field, key: it.key } })) }}>{num(i)}{it.name}</button>)}
                      </div></div>
                    ))}
                    {(kitNow.themes ?? []).length > 0 && (
                      <div><p className={lab}>Saved themes</p><div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(kitNow.themes as any[]).map((t) => (
                          <span key={t.name} className="inline-flex items-center overflow-hidden rounded-full border border-black/10 bg-white text-xs text-ink">
                            <button type="button" className="px-3 py-1.5 transition hover:bg-black/5" onClick={() => { void commit((n) => applyKitOps(n, { theme: t.name })) }}>{t.name}</button>
                            <button type="button" aria-label={'Delete ' + t.name} className="px-2 py-1.5 text-ink-soft transition hover:text-red-600" onClick={() => { void commit((n) => { const k = kitOf(n); k.themes = k.themes.filter((q: any) => q.name !== t.name) }) }}>×</button>
                          </span>
                        ))}
                      </div></div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          <div className="relative flex h-[320px] shrink-0 flex-col bg-[#faf7f3]">
            <div className="flex items-center gap-2 px-5 pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/camri/13_face_avatar.png" alt="" className="h-9 w-9 rounded-full" />
              <p className="font-fraunces text-xl font-semibold text-ink">Camri</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/camri/02_sitting_waving.png" alt="" className="pointer-events-none absolute -top-[43px] right-6 z-10 h-14 w-auto" />
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-3">
              {msgs.map((m, i) => (
                <div key={i} className={'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm ' + (m.from === 'you' ? 'ml-auto ' + ACC + ' text-white' : 'bg-white text-ink shadow-sm')}>{m.text}</div>
              ))}
              {camBusy && <CamriTyping />}
              <div ref={chatEnd} />
            </div>
            <div className="border-t border-black/10 px-5 pb-3 pt-3">
              <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1">
                {['Switch layout', 'Make me a Christmas theme for December', 'Make my buttons glow on hover'].map((t) => <button key={t} type="button" className={chip + ' shrink-0'} onClick={() => send(t)}>{t}</button>)}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="mt-2 flex gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={'Tell Camri what to change on ' + pageLabel(curPage)} className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-twilight" />
                <button type="submit" className={accentBtn + ' !px-4 !py-2'}>Send</button>
              </form>
            </div>
          </div>
        </div>

        {pubMsg && <p className="px-4 pt-3 text-center text-xs text-ink-soft">{pubMsg}</p>}
        <div className="flex gap-3 border-t border-black/10 p-4">
          <button type="button" onClick={() => setFull(true)} className="flex-1 rounded-lg bg-black/5 py-3 text-sm font-medium text-ink transition hover:bg-black/10">Preview</button>
          <button type="button" onClick={publish} disabled={busy} className={'relative flex-1 rounded-lg py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60 ' + ACC}>
            {ent.showcase || ent.loading ? 'Publish' : 'Upgrade to publish'}
            {dirty && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-400" />}
          </button>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {full && <button type="button" onClick={() => setFull(false)} className={'rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ' + ACC}>← Back to editing</button>}
            <p className="text-xs text-ink-soft">{full ? 'Previewing your draft.' : 'Click any text on the page to change its words, font and color.'}</p>
          </div>
          <div className="flex overflow-hidden rounded-xl border border-black/10 bg-white text-sm">
            {(['desktop', 'phone'] as const).map((d) => (
              <button key={d} type="button" onClick={() => setDevice(d)} className={'px-4 py-2 font-medium transition ' + (device === d ? ACC + ' text-white' : 'text-ink-soft hover:text-ink')}>{d === 'desktop' ? 'Desktop' : 'Phone'}</button>
            ))}
          </div>
        </div>
        {!full && (
          <div className="mb-3 flex flex-wrap gap-2">
            {chosenPages.map((k) => (
              <button key={k} type="button" onClick={() => setCurPage(k)} className={'rounded-full px-4 py-1.5 text-sm font-medium transition ' + (curPage === k ? ACC + ' text-white' : 'bg-white text-ink-soft hover:text-ink')}>{pageLabel(k)}</button>
            ))}
          </div>
        )}
        <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-black/10 bg-[#e6e1da] shadow-sm">
          {form.public_token ? (
            <div className="flex h-full justify-center">
              <iframe ref={frameRef} src={previewSrc} title="Website preview" style={{ width: device === 'phone' ? 390 : '100%', height: '100%', border: 0, background: '#fff' }} />
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-ink-soft">Your website link isn&apos;t set up yet. Finish setting up your portfolio in the app first.</p>
          )}
          {slot && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4" onClick={() => setSlot(null)}>
              <div onClick={(e) => e.stopPropagation()} className="max-h-[85%] w-full max-w-xl overflow-y-auto rounded-2xl border border-[#E4D3B6] p-4" style={{ background: 'linear-gradient(135deg,#FFFDF9 0%,#F8F0E3 100%)', boxShadow: 'inset 0 0 0 4px #FFFDF9, inset 0 0 0 5px #EBDDC3, 0 18px 50px rgba(60,40,20,0.22)' }}>
                <div className="flex items-center justify-between border-b border-[#EFE4D8] pb-2">
                  <p className="font-fraunces text-lg font-semibold text-ink">{slot.key === 'hero' ? 'Choose your hero photos' : 'Choose a photo'}</p>
                  <button type="button" aria-label="Close" onClick={() => setSlot(null)} className="rounded-lg px-2 text-lg text-ink-soft hover:text-ink">×</button>
                </div>
                <div className="mt-3 grid max-h-[min(52vh,400px)] grid-cols-6 gap-1.5 overflow-y-auto pr-1">
                  {lib.map((ph) => (
                    <button key={ph.id} type="button" onClick={() => chooseSlot(ph.storage_path)} className={'relative aspect-square overflow-hidden rounded-md border transition hover:ring-2 hover:ring-[#B08D57] ' + (slot.key === 'hero' && (form?.site_settings?.hero?.photos ?? []).includes(ph.storage_path) ? 'border-[#8C6B3F] ring-2 ring-[#8C6B3F]' : 'border-[#E4D3B6]')}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={BASE + ph.storage_path} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                  <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md border border-dashed border-[#B08D57] bg-white/60 text-center text-[10px] text-[#6B4A2B] hover:bg-white">
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addLib(e.target.files); e.target.value = '' }} />
                    {libBusy ? 'Uploading…' : '+ Add photos'}
                  </label>
                </div>
                {lib.length === 0 && !libBusy && <p className="mt-3 text-xs text-ink-soft">No website photos yet. Add some here and they will also show up in Website photos.</p>}
                <div className="mt-4 flex gap-2">
                  <button type="button" className="rounded-full border border-[#B08D57] bg-transparent px-4 py-2 text-sm font-medium text-[#6B4A2B] transition hover:bg-[#F3E7D3]" onClick={() => chooseSlot(null)}>Use default</button>
                  <button type="button" className="rounded-full bg-[#8C6B3F] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90" onClick={() => setSlot(null)}>Done</button>
                </div>
              </div>
            </div>
          )}
          {POPUP_ON && pick && (
            <div className="absolute z-30 overflow-y-auto rounded-2xl border border-[#E4D3B6] p-4" style={{ left: pick.left, top: Math.max(8, Math.min(pick.top, (boxRef.current?.clientHeight ?? 700) - 460)), maxHeight: (boxRef.current?.clientHeight ?? 700) - Math.max(8, Math.min(pick.top, (boxRef.current?.clientHeight ?? 700) - 460)) - 8, width: 340, background: 'linear-gradient(135deg,#FFFDF9 0%,#F8F0E3 100%)', boxShadow: 'inset 0 0 0 4px #FFFDF9, inset 0 0 0 5px #EBDDC3, 0 18px 50px rgba(60,40,20,0.22)' }}>
              <div className="flex items-center justify-between border-b border-[#EFE4D8] pb-2">
                <p className="font-fraunces text-lg font-semibold text-ink">{PICK_LABELS[pick.key] ?? 'Text'}</p>
                <button type="button" aria-label="Close" onClick={() => { applyText(); setPick(null) }} className="rounded-lg px-2 text-lg text-ink-soft hover:text-ink">×</button>
              </div>
              {TEXT_KEYS.includes(pick.key) && (LONG_TEXT.includes(pick.key)
                ? <textarea value={ptext} onChange={(e) => setPtext(e.target.value)} onBlur={applyText} rows={4} className="mt-3 w-full rounded-xl border border-[#E4D3B6] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#B08D57]" />
                : <input value={ptext} onChange={(e) => setPtext(e.target.value)} onBlur={applyText} className="mt-3 w-full rounded-xl border border-[#E4D3B6] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-[#B08D57]" />)}
              <div className="mt-3">
                <FontPick label="Font" hint="Just this text" value={set.el?.[pick.key]?.font ?? (pick.key === 'hero_headline' ? (set.hero?.headline_font ?? curHead) : curBody)} onPick={(fk) => setElProp(pick.key, { font: fk })} />
              </div>
              {pick.key !== 'hero_headline' && (
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">Color</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {PICK_COLORS.map((c) => (
                      <button key={c} type="button" aria-label={c} onClick={() => setElProp(pick.key, { color: c })} className={'h-7 w-7 rounded-full border border-black/15 transition hover:scale-110 ' + (String(set.el?.[pick.key]?.color ?? pick.color).toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-1 ring-[rgb(var(--scene-b,201_133_136))]' : '')} style={{ background: c }} />
                    ))}
                    <input value={phex} onChange={(e) => { const v = e.target.value.trim(); setPhex(v); if (/^#[0-9a-fA-F]{6}$/.test(v)) setElProp(pick.key, { color: v }) }} placeholder="#hex" maxLength={7} className="w-20 rounded-lg border border-line bg-white px-2 py-1.5 text-xs text-ink outline-none focus:border-twilight" />
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button type="button" className="rounded-full border border-[#B08D57] bg-transparent px-4 py-2 text-sm font-medium text-[#6B4A2B] transition hover:bg-[#F3E7D3]" onClick={() => resetEl(pick.key)}>Reset</button>
                <button type="button" className="rounded-full bg-[#8C6B3F] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90" onClick={() => { applyText(); setPick(null) }}>Done</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
