'use client'

import { useState } from 'react'

const inputCls = 'mt-1 w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink outline-none focus:border-twilight'

export default function LeadForm({
  funnelId, label, thanks, disabled, accent, btnText, radius, textColor, labels, showPhone = true, showNote = true, labelStyle, boxStyle, btnExtra,
}: {
  funnelId: string
  label: string
  thanks: string
  disabled?: boolean
  accent?: string
  btnText?: string
  radius?: string
  textColor?: string
  labels?: { name?: string; email?: string; phone?: string; note?: string }
  showPhone?: boolean
  showNote?: boolean
  labelStyle?: React.CSSProperties
  boxStyle?: React.CSSProperties
  btnExtra?: React.CSSProperties
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')
  const [website, setWebsite] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/funnel-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funnel_id: funnelId, name, email, phone, note, website }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not send. Please try again.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (done) return <p className="text-lg font-medium" style={{ color: textColor }}>{thanks}</p>

  return (
    <form onSubmit={submit} className="space-y-4 text-left">
      <label className="block">
        <span className="text-sm font-medium" style={{ color: textColor, ...labelStyle }}>{labels?.name || 'Your name'}</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={boxStyle} />
      </label>
      <label className="block">
        <span className="text-sm font-medium" style={{ color: textColor, ...labelStyle }}>{labels?.email || 'Email'}</span>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={boxStyle} />
      </label>
      {showPhone && (
        <label className="block">
          <span className="text-sm font-medium" style={{ color: textColor, ...labelStyle }}>{labels?.phone || 'Phone (optional)'}</span>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} style={boxStyle} />
        </label>
      )}
      {showNote && (
        <label className="block">
          <span className="text-sm font-medium" style={{ color: textColor, ...labelStyle }}>{labels?.note || 'Anything you want us to know (optional)'}</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} style={boxStyle} />
        </label>
      )}
      <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} className="hidden" aria-hidden="true" />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={sending || disabled}
        className="w-full px-8 py-4 text-base font-medium transition hover:opacity-90 disabled:opacity-60"
        style={{ background: accent || '#A9545F', color: btnText || '#FFFFFF', borderRadius: radius || '999px', opacity: sending ? 0.6 : 1, ...btnExtra }}
      >
        {sending ? 'Sending…' : label}
      </button>
    </form>
  )
}
