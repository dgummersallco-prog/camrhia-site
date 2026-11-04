'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import SpecialView from '@/app/go/[slug]/SpecialView'

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`

type Funnel = {
  id: string
  slug: string
  name: string
  content: Record<string, unknown> | null
  cta_label: string
  published: boolean
}
type Lead = { id: string; funnel_id: string; name: string; email: string; phone: string | null; note: string | null; created_at: string }
type Form = { id: string; slug: string; published: boolean; cta_label: string; text: Record<string, string>; photos: string[] }

const FIELDS: { key: string; label: string; hint?: string; area?: boolean }[] = [
  { key: 'hero_headline', label: 'Offer title', hint: 'Holiday mini sessions' },
  { key: 'brand_name', label: 'Your name or studio', hint: 'Shown at the top of the page' },
  { key: 'hero_sub', label: 'One line about the offer', hint: 'Family portraits by the lake, 20 minutes each', area: true },
  { key: 'price_line', label: 'Price line', hint: '$250 · 20 minutes · 6 spots' },
  { key: 'when_where', label: 'When and where', hint: 'Saturday, December 6 · Ross Park, Pocatello' },
  { key: 'details_body', label: 'What is included', hint: 'One line per item', area: true },
  { key: 'spots_note', label: 'Limited spots note (optional)', hint: 'Only 6 spots available' },
  { key: 'terms', label: 'Good to know (optional)', hint: 'Bookings are final and non-refundable', area: true },
  { key: 'thanks_message', label: 'Message after they sign up', hint: 'Thank you! I will email you within a day.' },
]

const inputCls = 'mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-twilight'
const rand = () => Math.random().toString(36).slice(2, 8)
const makeSlug = () => `special-${rand()}`

function toForm(f: Funnel | null): Form {
  const c = (f?.content ?? {}) as Record<string, unknown>
  const text: Record<string, string> = {}
  FIELDS.forEach((x) => { text[x.key] = String(c[x.key] ?? '') })
  return {
    id: f?.id ?? '',
    slug: f?.slug ?? makeSlug(),
    published: f?.published ?? false,
    cta_label: f?.cta_label ?? 'Claim my spot',
    text,
    photos: Array.isArray(c.photos) ? (c.photos as string[]) : [],
  }
}

type Example = { name: string; cta_label: string; text: Record<string, string> }

const EXAMPLES: Example[] = [
  {
    name: 'Holiday',
    cta_label: 'Claim my spot',
    text: {
      hero_headline: 'Holiday Mini Sessions',
      hero_sub: 'Twenty minutes by the tree, and your holiday cards are done.',
      price_line: '$225 · 20 minutes · 8 edited photos',
      when_where: 'Saturday, [date] · [your location]',
      details_body: '20 minute session for your family\n8 edited photos in an online gallery\nA cozy holiday set with lights\nExtra photos and prints available',
      spots_note: 'Only 6 spots available',
      terms: 'Bookings are final and non-refundable, but you can pass your spot to a friend.',
      thanks_message: 'Thank you! I will email you within a day to lock in your time.',
    },
  },
  {
    name: 'Fall family',
    cta_label: 'Save my spot',
    text: {
      hero_headline: 'Fall Family Minis',
      hero_sub: 'Golden light, a short session, and no stress.',
      price_line: '$195 · 15 minutes · 8 edited photos',
      when_where: 'Two Saturdays in October · [your location]',
      details_body: '15 minute outdoor session\n8 edited photos in an online gallery\nKids and pets welcome\nPrints and albums available',
      spots_note: 'Only 8 spots per day',
      terms: 'Rain date included. Bookings are final and non-refundable.',
      thanks_message: 'You are on the list! Watch your email for next steps.',
    },
  },
  {
    name: 'Spring blossom',
    cta_label: 'Book my time',
    text: {
      hero_headline: 'Spring Blossom Minis',
      hero_sub: 'Soft light, fresh blooms, and photos you will want on your wall.',
      price_line: '$175 · 15 minutes · 6 edited photos',
      when_where: '[date] · [garden or park name]',
      details_body: '15 minute session among the blossoms\n6 edited photos in an online gallery\nGreat for families, couples and moms\nExtra photos available',
      spots_note: 'Blossoms are short lived, so spots are limited',
      terms: 'Bookings are final and non-refundable. Weather dates are announced by email.',
      thanks_message: 'Thank you! I will be in touch soon with your time.',
    },
  },
  {
    name: 'Back to school',
    cta_label: 'Reserve a time',
    text: {
      hero_headline: 'Back-to-School Portraits',
      hero_sub: 'A quick portrait to remember this grade.',
      price_line: '$85 · 10 minutes · 5 edited photos',
      when_where: '[date] · [your location]',
      details_body: '10 minute portrait session per child\n5 edited photos in an online gallery\nSiblings can share one slot\nPrints ready for grandparents',
      spots_note: 'Limited time slots',
      terms: 'Bookings are final and non-refundable.',
      thanks_message: 'Thank you! I will email you to confirm your time.',
    },
  },
  {
    name: 'Couples',
    cta_label: 'Claim my spot',
    text: {
      hero_headline: 'Valentine Couples Minis',
      hero_sub: 'A short, relaxed session just for the two of you.',
      price_line: '$150 · 20 minutes · 8 edited photos',
      when_where: '[date] · [your location]',
      details_body: '20 minute couples session\n8 edited photos in an online gallery\nPosing help, so no experience needed\nPrints available',
      spots_note: 'Only 5 spots',
      terms: 'Bookings are final and non-refundable, but can be gifted.',
      thanks_message: 'Thank you! I will email you shortly to pick your time.',
    },
  },
  {
    name: 'Branding',
    cta_label: 'Book my branding mini',
    text: {
      hero_headline: 'Branding Mini Sessions',
      hero_sub: 'Fresh photos for your website and social media, in one short visit.',
      price_line: '$250 · 30 minutes · 10 edited photos',
      when_where: '[date] · [your location]',
      details_body: '30 minute session with two outfit changes\n10 edited photos for web and social\nPlanning call before the session\nFull usage for your business',
      spots_note: 'Only 4 spots this month',
      terms: 'Bookings are final and non-refundable.',
      thanks_message: 'Thank you! I will email you to plan your session.',
    },
  },
]

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-twilight text-sm font-medium text-white">{n}</span>
        <h2 className="font-fraunces text-xl font-semibold text-ink">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export default function SpecialsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<Funnel[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async (uid: string) => {
    const sb = supabase
    if (!sb) return
    const { data } = await sb.from('funnel_pages').select('*').eq('owner_id', uid).order('created_at', { ascending: false })
    const rows = (data ?? []) as Funnel[]
    setItems(rows)
    if (rows.length) {
      const { data: l } = await sb.from('funnel_leads').select('*').in('funnel_id', rows.map((r) => r.id)).order('created_at', { ascending: false })
      setLeads((l ?? []) as Lead[])
    } else {
      setLeads([])
    }
  }, [])

  useEffect(() => {
    async function init() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/specials'); return }
      setUserId(sess.session.user.id)
      load(sess.session.user.id)
    }
    init()
  }, [router, load])

  const flash = (m: string) => { setMessage(m); setTimeout(() => setMessage(null), 2500) }

  async function save() {
    const sb = supabase
    if (!sb || !form || !userId) return
    setSaving(true)
    try {
      const content: Record<string, unknown> = {}
      Object.entries(form.text).forEach(([k, v]) => { if (v.trim()) content[k] = v.trim() })
      content.photos = form.photos
      const row = {
        name: form.text.hero_headline.trim() || 'Special',
        style: 'special',
        content,
        cta_label: form.cta_label.trim() || 'Claim my spot',
        cta_url: null,
        published: form.published,
        updated_at: new Date().toISOString(),
      }
      let saved: Funnel | null = null
      if (form.id) {
        const { data, error } = await sb.from('funnel_pages').update(row).eq('id', form.id).select().single()
        if (error) throw error
        saved = data as Funnel
      } else {
        let slug = form.slug
        for (let i = 0; i < 3 && !saved; i++) {
          const { data, error } = await sb.from('funnel_pages').insert({ ...row, slug, owner_id: userId }).select().single()
          if (error && error.code !== '23505') throw error
          if (data) saved = data as Funnel
          else slug = makeSlug()
        }
        if (!saved) throw new Error('Could not create the page. Try again.')
      }
      setForm(toForm(saved))
      flash('Saved')
      await load(userId)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function addPhoto(file: File) {
    const sb = supabase
    if (!sb || !form || !userId) return
    setUploading(true)
    try {
      const v = await makeVersions(file)
      const path = `${userId}/special_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
      if (up.error) throw up.error
      setForm((f) => (f ? { ...f, photos: [...f.photos, STORAGE_BASE + path].slice(0, 3) } : f))
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not upload that photo.')
    } finally {
      setUploading(false)
    }
  }

  async function removePhoto(url: string) {
    const sb = supabase
    setForm((f) => (f ? { ...f, photos: f.photos.filter((p) => p !== url) } : f))
    if (sb && url.startsWith(STORAGE_BASE)) await sb.storage.from('portfolio').remove([url.slice(STORAGE_BASE.length)])
  }

  async function remove(id: string) {
    const sb = supabase
    if (!sb || !userId) return
    if (!window.confirm('Delete this special and its sign-ups for good?')) return
    await sb.from('funnel_pages').delete().eq('id', id)
    setForm(null)
    await load(userId)
  }

  function applyExample(ex: Example) {
    setForm((f) => {
      const base = f ?? toForm(null)
      return { ...base, cta_label: ex.cta_label, text: { ...base.text, ...ex.text } }
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const linkFor = (slug: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://camrhia.com'}/go/${slug}`

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="specials" />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Specials</p>
            <h1 className="font-fraunces text-3xl font-semibold text-ink">Specials</h1>
            <p className="mt-1 text-sm text-ink-soft">A simple page for an offer, like holiday minis. Sign-ups land here.</p>
          </div>
          {!form && <button type="button" onClick={() => setForm(toForm(null))} className="rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ New special</button>}
        </div>

        {message && <p className="mb-4 text-sm text-ink-soft">{message}</p>}

        {form && (
          <div className="mb-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <StepCard n={1} title="Design a post for Instagram, TikTok or Facebook">
                <p className="text-sm leading-relaxed text-ink-soft">Make your post in any app you like, such as Canva, CapCut or Instagram itself. Keep it to three things:</p>
                <ul className="mt-3 space-y-2 text-sm text-ink">
                  <li>• A photo that stops the scroll</li>
                  <li>• Your offer in one line, like “Holiday mini sessions, $250”</li>
                  <li>• A call to action: “Tap the link to claim your spot”</li>
                </ul>
              </StepCard>

              <StepCard n={2} title="Send your ad to this address">
                <p className="text-sm text-ink-soft">Use this link as the button on your ad, or put it in your bio.</p>
                <p className="mt-3 break-all rounded-xl bg-paper px-4 py-3 text-sm font-medium text-ink">{linkFor(form.slug)}</p>
                <button type="button" onClick={() => { navigator.clipboard.writeText(linkFor(form.slug)); flash('Link copied') }} className="mt-3 rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:border-twilight">Copy link</button>
                {!form.id && <p className="mt-2 text-xs text-ink-soft">The link starts working once you save and publish in step 4.</p>}
              </StepCard>

              <StepCard n={3} title="Build your special page">
                <p className="mb-4 text-sm text-ink-soft">Watch it take shape on the right as you type.</p>
                <div className="grid gap-4">
                  {FIELDS.map((f) => (
                    <label key={f.key} className="block">
                      <span className="text-sm font-medium text-ink">{f.label}</span>
                      {f.area ? (
                        <textarea rows={3} placeholder={f.hint} value={form.text[f.key]} onChange={(e) => setForm({ ...form, text: { ...form.text, [f.key]: e.target.value } })} className={inputCls} />
                      ) : (
                        <input placeholder={f.hint} value={form.text[f.key]} onChange={(e) => setForm({ ...form, text: { ...form.text, [f.key]: e.target.value } })} className={inputCls} />
                      )}
                    </label>
                  ))}
                  <label className="block">
                    <span className="text-sm font-medium text-ink">Button words</span>
                    <input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className={inputCls} />
                  </label>
                </div>

                <p className="mt-6 text-sm font-medium text-ink">Photos (up to 3)</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  {form.photos.map((u) => (
                    <div key={u} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="" className="h-28 w-28 rounded-xl object-cover" />
                      <button type="button" onClick={() => removePhoto(u)} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-white">×</button>
                    </div>
                  ))}
                  {form.photos.length < 3 && (
                    <button type="button" disabled={uploading} onClick={() => fileInput.current?.click()} className="flex h-28 w-28 items-center justify-center rounded-xl border border-dashed border-line text-2xl text-ink-soft hover:border-twilight disabled:opacity-50">
                      {uploading ? '…' : '+'}
                    </button>
                  )}
                  <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.target.value = '' }} />
                </div>
              </StepCard>

              <StepCard n={4} title="Publish">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-twilight" />
                  Published (anyone with the link can see it)
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={save} disabled={saving} className="rounded-full bg-twilight px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                  <button type="button" onClick={() => setForm(null)} className="text-sm text-ink-soft underline">Close</button>
                  {form.id && <button type="button" onClick={() => remove(form.id)} className="ml-auto text-xs text-ink-soft underline hover:text-red-700">Delete</button>}
                </div>
              </StepCard>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-soft/60">Live preview</p>
              <div className="mx-auto h-[720px] w-[390px] max-w-full overflow-y-auto rounded-[2rem] border-4 border-ink/80 bg-paper">
                <div className="px-5 py-10 text-ink">
                  <SpecialView
                    preview
                    funnelId={form.id || 'preview'}
                    d={{
                      brand: form.text.brand_name,
                      headline: form.text.hero_headline,
                      sub: form.text.hero_sub,
                      price: form.text.price_line,
                      photos: form.photos,
                      details: form.text.details_body,
                      spots: form.text.spots_note,
                      whenWhere: form.text.when_where,
                      terms: form.text.terms,
                      label: form.cta_label || 'Claim my spot',
                      thanks: form.text.thanks_message,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {items.length > 0 && (
        <section className="mb-8 rounded-2xl border border-line bg-card p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Your specials</p>
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">None yet. Press “New special” to make your first one.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-fraunces text-xl font-semibold text-ink">{it.name}</p>
                    <p className="text-sm text-ink-soft">{leads.filter((l) => l.funnel_id === it.id).length} sign-ups</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${it.published ? 'bg-sage/15 text-sage' : 'bg-line text-ink-soft'}`}>{it.published ? 'Published' : 'Draft'}</span>
                  <button type="button" onClick={() => setForm(toForm(it))} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Edit</button>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}

        {leads.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Sign-ups</p>
          {leads.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">No sign-ups yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {leads.map((l) => (
                <li key={l.id} className="py-4 text-sm">
                  <p className="font-medium text-ink">{l.name} <span className="font-normal text-ink-soft">· {items.find((i) => i.id === l.funnel_id)?.name ?? 'Special'} · {new Date(l.created_at).toLocaleDateString()}</span></p>
                  <p className="text-ink-soft">{l.email}{l.phone ? ` · ${l.phone}` : ''}</p>
                  {l.note ? <p className="mt-1 text-ink">{l.note}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
        )}

        <section className="mt-8 rounded-2xl border border-line bg-card p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Examples</p>
          <p className="mt-2 text-sm text-ink-soft">Ready-made specials to start from. Pick one and it fills the builder above. Change anything you like.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <div key={ex.name} className="flex flex-col rounded-2xl border border-line bg-paper p-5">
                <p className="font-fraunces text-xl font-semibold text-ink">{ex.text.hero_headline}</p>
                <p className="mt-1 text-sm text-ink-soft">{ex.text.hero_sub}</p>
                <p className="mt-3 font-fraunces text-lg font-semibold text-twilight">{ex.text.price_line}</p>
                <p className="mt-1 text-xs text-ink-soft">{ex.text.spots_note}</p>
                <button type="button" onClick={() => applyExample(ex)} className="mt-4 self-start rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Use this example</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
