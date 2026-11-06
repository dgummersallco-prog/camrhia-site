'use client'

import { useMemo, useState } from 'react'
import type { MiniInfo } from './SpecialView'

type Slot = { id: string; starts_at: string; taken: boolean }

const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })
const slash = 'linear-gradient(to top right, transparent calc(50% - 1px), currentColor calc(50% - 1px), currentColor calc(50% + 1px), transparent calc(50% + 1px))'

export default function SlotPicker({ mini, preview, label, btnStyle }: { mini: MiniInfo; preview?: boolean; label: string; btnStyle: React.CSSProperties }) {
  const [pick, setPick] = useState<string | null>(null)
  const [lost, setLost] = useState<string[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const slots: Slot[] = useMemo(() => {
    const all: Slot[] = [
      ...mini.slots.map((s) => ({ ...s, taken: lost.includes(s.id) })),
      ...(mini.taken_slots ?? []).map((s) => ({ ...s, taken: true })),
    ]
    return all.sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
  }, [mini, lost])

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of slots) {
      const key = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: mini.tz }).format(new Date(s.starts_at))
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return Array.from(map.entries())
  }, [slots, mini.tz])

  const time = (iso: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: mini.tz }).format(new Date(iso))
  const openCount = slots.filter((s) => !s.taken).length

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    if (!pick) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/mini/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: pick, miniId: mini.id, name, email, phone }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.url) {
        const msg = j.error || 'Could not start the payment. Please try again.'
        if (/taken/i.test(msg)) { setLost((l) => [...l, pick]); setPick(null) }
        setErr(msg)
        setBusy(false)
        return
      }
      window.location.href = j.url
    } catch {
      setErr('Could not start the payment. Please try again.')
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border px-4 py-3 text-sm outline-none'
  const inputStyle = { background: '#FFFFFF', color: '#2A1F24', borderColor: '#E5DCD5' }

  return (
    <div>
      <p className="mb-3 text-sm opacity-80">{openCount === 0 ? 'All spots are booked.' : `${openCount} of ${slots.length} ${slots.length === 1 ? 'time' : 'times'} left`}</p>
      {days.map(([day, list]) => (
        <div key={day} className="mb-3">
          {days.length > 1 ? <p className="mb-2 text-sm font-medium">{day}</p> : null}
          <div className="flex flex-wrap gap-2">
            {list.map((s) =>
              s.taken ? (
                <span key={s.id} aria-disabled="true" title="Taken" className="cursor-not-allowed select-none rounded-full border border-current px-4 py-2 text-sm opacity-35" style={{ backgroundImage: slash, filter: 'grayscale(1)' }}>{time(s.starts_at)}</span>
              ) : (
                <button
                  key={s.id}
                  type="button"
                  disabled={preview}
                  onClick={() => { setPick(s.id); setErr(null) }}
                  className="rounded-full border border-current px-4 py-2 text-sm transition hover:opacity-80"
                  style={pick === s.id ? { background: btnStyle.background, color: btnStyle.color, borderColor: String(btnStyle.background) } : undefined}
                >
                  {time(s.starts_at)}
                </button>
              ),
            )}
          </div>
        </div>
      ))}

      {preview ? (
        <span className="mt-5 block px-8 py-4 text-center font-medium" style={btnStyle}>{label}</span>
      ) : pick ? (
        <form onSubmit={pay} className="mt-5 space-y-3">
          <input className={input} style={inputStyle} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
          <input className={input} style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" />
          <input className={input} style={inputStyle} type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} autoComplete="tel" />
          {err && <p className="text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className="w-full px-8 py-4 font-medium transition hover:opacity-90 disabled:opacity-50" style={btnStyle}>{busy ? 'One moment…' : `Pay ${money(mini.price)} to reserve`}</button>
          <p className="text-center text-xs opacity-70">Your time is held for 30 minutes while you pay.</p>
        </form>
      ) : err ? (
        <p className="mt-4 text-sm text-red-700">{err}</p>
      ) : null}
    </div>
  )
}
