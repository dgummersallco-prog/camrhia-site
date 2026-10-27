'use client'

import { Select } from '@/app/components/Select'
import { useSiteBase } from '@/app/site/useSiteBase'
import { installPreviewGlow } from '@/lib/previewGlow'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { DateCheckWidget } from '../../../p/[token]/DateCheckWidget'
import { resolveTheme } from '@/lib/siteTheme'

const SESSION_TYPES = [
  'Wedding', 'Engagement', 'Proposal', 'Family', 'Maternity', 'Newborn', 'Senior',
  'Headshots', 'Branding', 'Graduation', 'Sports / Team', 'Boudoir', 'Other',
]
const APP_STORE_URL = 'https://apps.apple.com/app/id6800011162'
const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''

export function AvailabilityView({ initial, token }: { initial: Record<string, any>; token: string }) {
  const [r, setR] = useState<Record<string, any>>(initial)
  const [isPreview, setIsPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sessionType, setSessionType] = useState('')
  const [date, setDate] = useState('')
  const [city, setCity] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [inquiryId, setInquiryId] = useState<string | null>(null)
  const [count, setCount] = useState(5)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1') return
    setIsPreview(true)
    if (new URLSearchParams(window.location.search).get('sent') === '1') { setSent(true); setName('Alex'); setEmail('alex@example.com') }
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; patch?: Record<string, any> } | null
      if (d && d.type === 'camrhia-preview' && d.patch) setR((prev) => ({ ...prev, ...d.patch }))
    }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'camrhia-preview-ready', ...(() => { const seg = window.location.pathname.split('/').filter(Boolean); const base = seg[0] === 'site' ? 2 : 0; const rest = seg[base]; const page = rest === 'about' ? 'about' : rest === 'galleries' ? 'galleries' : rest === 'g' ? 'gallery' : rest === 'availability' ? 'availability' : !rest ? 'home' : null; return { page, gid: rest === 'g' ? seg[base + 1] ?? null : null } })() }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    async function prefill() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      const u = sess.session?.user
      if (!u) return
      const { data: p } = await sb.from('profiles').select('account_type, couple_names, first_name, last_name, display_name').eq('id', u.id).maybeSingle()
      const pr = p as { account_type?: string; couple_names?: string; first_name?: string; last_name?: string; display_name?: string } | null
      if (pr?.account_type !== 'couple') return
      setIsClient(true)
      setEmail(u.email ?? '')
      setName(pr.couple_names || [pr.first_name, pr.last_name].filter(Boolean).join(' ') || pr.display_name || '')
    }
    prefill()
  }, [])

  const t = resolveTheme(r)
  const { accent, ink, soft, line, bg } = t
  const studio: string = r.studio_name ?? r.display_name ?? 'Studio'
  const qs = isPreview ? '?preview=1' : ''
  const base = useSiteBase(token)
  const homeHref = base || '/'
  const logo = r.logo_path ? STORAGE_BASE + r.logo_path : null
  const photoPath: string | null = t.hero.photos[0] ?? ((Array.isArray(r.cover_paths) && r.cover_paths[0]) || r.cover_path || null)
  const photo = photoPath ? STORAGE_BASE + photoPath : null
  const L = t.availability.layout

  useEffect(() => installPreviewGlow(), [])

  useEffect(() => {
    if (!sent || isClient || isPreview || !t.availability.redirect) return
    if (count <= 0) { window.location.href = APP_STORE_URL; return }
    const id = setTimeout(() => setCount((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [sent, isClient, isPreview, count, t.availability.redirect])
  const head: React.CSSProperties = { fontFamily: t.head, fontWeight: 500, letterSpacing: '0.01em' }
  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16, border: `1px solid ${line}`,
    borderRadius: 10, background: '#fff', color: '#2A1F24', fontFamily: t.body,
  }
  const label: React.CSSProperties = {
    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: soft, marginBottom: 6, display: 'block', fontFamily: t.body,
  }
  const stepLabel: React.CSSProperties = { fontSize: 11, letterSpacing: '0.25em', textTransform: 'uppercase', color: accent, marginBottom: 14, fontFamily: t.body }
  const primary: React.CSSProperties = { background: accent, color: t.btnText, border: 'none', borderRadius: t.radius, padding: '15px 28px', fontSize: 12, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.body }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Something went wrong. Please try again.'); return }
    setSending(true)
    setError(null)
    if (isClient) {
      const key = sessionType.toLowerCase().startsWith('sports') ? 'sports' : sessionType.toLowerCase()
      const { data: iid, error: ce } = await supabase.rpc('client_start_inquiry', {
        p_photographer_id: r.photographer_id,
        p_names: name,
        p_phone: phone || null,
        p_session_type: key || null,
        p_date: date || null,
        p_city: city || null,
        p_state: null,
        p_note: message || null,
      })
      setSending(false)
      if (ce) { setError(ce.message); return }
      setInquiryId(iid as string)
      setSent(true)
      return
    }
    const { error: rpcError } = await supabase.rpc('submit_web_inquiry', {
      p_photographer_id: r.photographer_id,
      p_name: name,
      p_email: email,
      p_phone: phone || null,
      p_session_type: sessionType || null,
      p_preferred_date: date || null,
      p_message: [city ? `Location: ${city}` : '', message].filter(Boolean).join('\n\n') || null,
      p_website: website || null,
    })
    setSending(false)
    if (rpcError) { setError(rpcError.message); return }
    setSent(true)
  }

  const cal = t.calendar.sync
    ? {
        dayColor: r.openings_cal_day_color, selectedColor: r.openings_cal_selected_color, monthColor: r.openings_cal_month_color,
        availableColor: r.openings_cal_available_color, unavailableColor: r.openings_cal_unavailable_color,
        resultTextColor: r.openings_cal_result_text_color, bgColor: r.openings_cal_bg_color ?? '#FFFFFF',
      }
    : {
        dayColor: t.calendar.day, selectedColor: t.calendar.selected, monthColor: t.calendar.month,
        availableColor: t.calendar.available, unavailableColor: t.calendar.unavailable,
        resultTextColor: soft, bgColor: t.calendar.bg,
      }

  const showPhoto = t.availability.photo && !!photo
  const stacked = L === 'centered'
  const between = L === 'between' && t.calendar.show
  const photoPos: string = (r as any).site_settings?.availability?.photoPos ?? 'side'
  const photoSide = showPhoto && photoPos === 'side'
  const photoBack = showPhoto && photoPos === 'background'
  const photoAbove = showPhoto && photoPos === 'above'

  const headerBlock = (
    <div id="book-head">
      <h1 className="text-center" style={{ ...head, fontFamily: t.availability.family, fontSize: 'var(--book-h)', lineHeight: 1.1 }}>{t.availability.title}</h1>
      <p className="mx-auto mt-4 max-w-md whitespace-pre-line text-center text-[15px] leading-relaxed" style={{ color: soft }}>{t.availability.intro}</p>
    </div>
  )

  const sentBlock = (
    <div id="book-sent" className="rounded-2xl p-6" style={{ background: '#fff', border: `1px solid ${line}`, lineHeight: 1.6 }}>
      <h2 style={{ ...head, fontSize: 28 }}>Thank you{name ? `, ${name.split(' ')[0]}` : ''}.</h2>
      <p className="mt-3 whitespace-pre-line text-[15px]" style={{ color: soft }}>
        {t.availability.success ?? `${studio} has your request and will reach out soon.`}
      </p>
      {!isClient && (
        <div className="mt-5 text-[15px]" style={{ color: soft }}>
          <p><strong style={{ color: ink }}>One more step</strong> to get your request to {studio}:</p>
          <ol className="mt-3 grid gap-2 pl-5" style={{ listStyle: 'decimal' }}>
            <li>Download the free Camrhia app and create your account.</li>
            <li>Sign up with this exact email: <strong style={{ color: ink }}>{email}</strong></li>
            <li>The moment your account is ready, your message is sent to {studio} automatically.</li>
          </ol>
        </div>
      )}
      {!isClient && t.availability.redirect && count > 0 && (
        <p className="mt-5 text-[13px]" style={{ color: soft }}>Taking you to the app in {count}…</p>
      )}
      {inquiryId && (
        <a href={`/my/inquiry/${inquiryId}?s=${encodeURIComponent(studio)}`} className="mt-6 block text-center" style={primary}>Open your conversation</a>
      )}
      <a href={APP_STORE_URL} className="mt-4 block text-center" style={primary}>{isClient ? 'Get the Camrhia app' : 'Download the app and create your account'}</a>
    </div>
  )

  const calBlock = t.calendar.show ? (
    <section id="book-cal" style={{ zoom: 'var(--cal, 100%)' }}>
      <p style={stepLabel}>{between ? 2 : 1} · Pick a date</p>
      <DateCheckWidget photographerId={r.photographer_id} accent={accent} fontFamily={t.head} {...cal} onPick={(d) => setDate(d)} />
    </section>
  ) : null

  const sendBtn = (
    <button id="book-btn" form="book-form" type="submit" disabled={sending} className="cr-btn bk-btn" style={{ ...primary, opacity: sending ? 0.6 : 1 }}>{sending ? 'Sending…' : t.availability.button}</button>
  )

  const formBlock = (
    <form id="book-form" onSubmit={submit} className="grid gap-4">
      <p style={stepLabel}>{t.calendar.show && !between ? 2 : 1} · Tell me about your day</p>
      <div><label style={label}>Your name *</label>
        <input style={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" /></div>
      <div><label style={label}>Email *</label>
        <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" /></div>
      <div><label style={label}>Phone (optional)</label>
        <input style={input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} autoComplete="tel" /></div>
      <div><label style={label}>What are you looking for?</label>
        <Select style={input} value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
          <option value="">Choose a session type</option>
          {SESSION_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select></div>
      <div><label style={label}>Date</label>
        <input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div><label style={label}>Location (city)</label>
        <input style={input} value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} placeholder="Where would the session be?" /></div>
      <div><label style={label}>Message</label>
        <textarea style={{ ...input, minHeight: 100, resize: 'vertical' }} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Tell me a little about what you have in mind" /></div>
      <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
      {error && <p style={{ margin: 0, color: '#B83232', fontSize: 14 }}>{error}</p>}
      {!between && sendBtn}
    </form>
  )

  return (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      <style>{`${t.cssVars}html{font-size:var(--text)}html,body{background:${bg}}`}</style>
      <div id={photoBack ? 'book-photo' : undefined} style={{ background: photoBack ? `linear-gradient(color-mix(in srgb, ${bg} 82%, transparent), color-mix(in srgb, ${bg} 82%, transparent)), url("${photo}") center / cover fixed` : bg, color: ink, fontFamily: t.body, minHeight: '100vh' }}>
        <nav className={'mx-auto flex max-w-6xl px-6 py-4 ' + (t.menu.logoPos === 'center' ? 'flex-col items-center gap-3' : 'items-center justify-between' + (t.menu.logoPos === 'right' ? ' flex-row-reverse' : ''))}>
          <a href={`${homeHref}${qs}`} style={{ display: 'inline-flex', transform: 'translate(var(--nudge, 0px), var(--nudgey, 0px))', transition: 'transform 0.12s ease-out' }}>
            {logo && t.menu.show !== 'name' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={studio} style={{ height: 'var(--logo)', objectFit: 'contain' }} />
            ) : (
              <span className="el-menu_brand" style={{ ...head, fontSize: 24 }}>{t.menu.brand ?? studio}</span>
            )}
          </a>
          <a href={`${homeHref}${qs}`} className="el-menu_links text-[11px] uppercase tracking-[0.2em]" style={{ fontSize: 'var(--menu)' }}>← Back</a>
        </nav>

        {photoAbove && (
          <div id="book-photo" className="mx-auto max-w-5xl px-6 pt-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" className="w-full object-cover" style={{ aspectRatio: '21/9' }} />
          </div>
        )}

        <div className={photoSide ? 'mx-auto grid max-w-6xl gap-8 px-6 pt-4 md:grid-cols-[5fr_7fr] md:gap-12' : ''}>
          {photoSide && (
            <div id="book-photo" className="md:sticky md:top-6 md:self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo as string} alt="" className="aspect-[16/10] w-full object-cover md:aspect-[4/5]" />
            </div>
          )}
          <main id="book-main" className={photoSide ? 'mx-auto w-full max-w-xl pb-24 pt-4' : `mx-auto px-6 pb-24 pt-8 ${!stacked && !sent && calBlock ? 'max-w-5xl' : 'max-w-xl'}`}>
          {headerBlock}
          {sent ? (
            <div className="mt-10">{sentBlock}</div>
          ) : between ? (
            <div className="mt-10 grid gap-10">{formBlock}{calBlock}{sendBtn}</div>
          ) : !stacked && !photoSide && calBlock ? (
            <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-start md:gap-14">{calBlock}{formBlock}</div>
          ) : (
            <div className="mt-10 grid gap-10">{calBlock}{formBlock}</div>
          )}
        </main>
        </div>
      </div>
    </>
  )
}
