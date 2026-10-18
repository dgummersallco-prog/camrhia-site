"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

const SESSION_TYPES = [
  'Wedding', 'Engagement', 'Proposal', 'Family', 'Maternity', 'Newborn', 'Senior',
  'Headshots', 'Branding', 'Graduation', 'Sports / Team', 'Boudoir', 'Other',
]
const APP_STORE_URL = 'https://apps.apple.com/app/id6800011162'

export interface MessageBtnStyle {
  bg?: string | null
  textColor?: string | null
  fontFamily?: string
  fontSize?: number | null
  bold?: boolean | null
  italic?: boolean | null
  text?: string | null
  showIcon?: boolean | null
  width?: number | null
  align?: string | null
  shadow?: boolean | null
  shadowColor?: string | null
  shadowX?: number | null
  shadowY?: number | null
  shadowBlur?: number | null
}

function readableOn(bg: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(bg.trim())
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return lum > 0.6 ? '#2B2B2B' : '#fff'
}

export function ContactButton({
  photographerId, studioName, accent = '#3A4A6B', btn,
}: { photographerId: string; studioName: string; accent?: string; btn?: MessageBtnStyle }) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [sessionType, setSessionType] = useState('')
  const [date, setDate] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [city, setCity] = useState('')
  const [isClient, setIsClient] = useState(false)
  const [inquiryId, setInquiryId] = useState<string | null>(null)

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

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Something went wrong. Please try again.'); return }
    setSending(true)
    setError(null)
    if (isClient) {
      const key = sessionType.toLowerCase().startsWith('sports') ? 'sports' : sessionType.toLowerCase()
      const { data: iid, error: ce } = await supabase.rpc('client_start_inquiry', {
        p_photographer_id: photographerId,
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
      p_photographer_id: photographerId,
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

  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px', fontSize: 16,
    border: '1px solid #DDD8D0', borderRadius: 10, background: '#fff', color: '#2B2B2B',
    fontFamily: 'system-ui, sans-serif',
  }
  const label: React.CSSProperties = { fontSize: 12, color: '#6B6B6B', marginBottom: 4, display: 'block', fontFamily: 'system-ui, sans-serif' }

  const bgCol = btn?.bg || accent
  const txtCol = btn?.textColor || readableOn(bgCol)
  const rawW = btn?.width ?? 0.8
  const widthPct = Math.round((rawW > 0 && rawW <= 1 ? rawW : 0.8) * 100)
  const justify = btn?.align === 'left' ? 'flex-start' : btn?.align === 'right' ? 'flex-end' : 'center'
  const btnLabel = (btn?.text && btn.text.trim()) || `Message ${studioName}`

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 50,
          width: `${widthPct}%`, maxWidth: 480, boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: justify, gap: 10,
          background: bgCol, color: txtCol, border: 'none', borderRadius: 999,
          padding: '17px 20px', cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
          fontFamily: btn?.fontFamily ?? 'system-ui, sans-serif',
          fontSize: btn?.fontSize ?? 15,
          fontWeight: btn?.bold ? 700 : 600,
          fontStyle: btn?.italic ? 'italic' : 'normal',
          letterSpacing: 0.2,
          textShadow: btn?.shadow ? `${btn.shadowX ?? 0}px ${btn.shadowY ?? 2}px ${btn.shadowBlur ?? 4}px ${btn.shadowColor ?? '#000'}` : undefined,
        }}
      >
        {(btn?.showIcon ?? true) && (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{btnLabel}</span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#FAF8F5', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px 20px 0 0', padding: 22 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Fraunces', serif", color: '#2B2B2B' }}>
                {sent ? 'Message sent' : `Message ${studioName}`}
              </h2>
              <button onClick={() => setOpen(false)} aria-label="Close" style={{ background: 'none', border: 'none', fontSize: 26, cursor: 'pointer', color: '#6B6B6B', lineHeight: 1 }}>×</button>
            </div>

            {sent ? (
              <div style={{ fontFamily: 'system-ui, sans-serif', color: '#4A4A4A', lineHeight: 1.55 }}>
                <p style={{ marginTop: 0 }}>Thanks, {name.split(' ')[0] || 'friend'}! {studioName} has your message and will reach out to you soon.</p>
                {inquiryId && (
                  <a href={`/my/inquiry/${inquiryId}?s=${encodeURIComponent(studioName)}`} style={{ display: 'block', textAlign: 'center', background: accent, color: '#fff', textDecoration: 'none', borderRadius: 999, padding: '14px 20px', fontWeight: 600, margin: '14px 0' }}>
                    Open your conversation
                  </a>
                )}
                <p>Want to message, book, sign contracts and get your photos all in one place? Get the free Camrhia app.</p>
                <a href={APP_STORE_URL} style={{ display: 'block', textAlign: 'center', background: accent, color: '#fff', textDecoration: 'none', borderRadius: 999, padding: '14px 20px', fontWeight: 600, marginTop: 14 }}>
                  Get the Camrhia app
                </a>
              </div>
            ) : (
              <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
                <div><label style={label}>Your name *</label>
                  <input style={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" /></div>
                <div><label style={label}>Email *</label>
                  <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" /></div>
                <div><label style={label}>Phone (optional)</label>
                  <input style={input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} autoComplete="tel" /></div>
                <div><label style={label}>What are you looking for?</label>
                  <select style={input} value={sessionType} onChange={(e) => setSessionType(e.target.value)}>
                    <option value="">Choose a session type</option>
                    {SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div><label style={label}>Preferred date (optional)</label>
                  <input style={input} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><label style={label}>Location (city)</label>
                  <input style={input} value={city} onChange={(e) => setCity(e.target.value)} maxLength={100} placeholder="Where would the session be?" /></div>
                <div><label style={label}>Message</label>
                  <textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Tell them a little about what you have in mind" /></div>

                {/* honeypot — hidden from people, filled by bots */}
                <input
                  tabIndex={-1} autoComplete="off" aria-hidden="true"
                  value={website} onChange={(e) => setWebsite(e.target.value)}
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />

                {error && <p style={{ margin: 0, color: '#B83232', fontSize: 14, fontFamily: 'system-ui, sans-serif' }}>{error}</p>}
                <button type="submit" disabled={sending} style={{ background: accent, color: '#fff', border: 'none', borderRadius: 999, padding: '15px 20px', fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                  {sending ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
