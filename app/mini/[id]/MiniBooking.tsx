'use client'

import { useMemo, useState } from 'react'

type Slot = { id: string; starts_at: string }
type Mini = {
  id: string; title: string; description: string | null; location: string | null
  price: number; duration_min: number | null; tz: string; studio: string | null; ready: boolean; slots: Slot[]
}

const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function MiniBooking({ mini }: { mini: Mini }) {
  const [slotId, setSlotId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const days = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of mini.slots) {
      const key = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: mini.tz }).format(new Date(s.starts_at))
      map.set(key, [...(map.get(key) ?? []), s])
    }
    return Array.from(map.entries())
  }, [mini])

  const time = (iso: string) => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: mini.tz }).format(new Date(iso))
  const tzName = new Intl.DateTimeFormat('en-US', { timeZone: mini.tz, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? mini.tz

  async function pay(e: React.FormEvent) {
    e.preventDefault()
    if (!slotId) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/mini/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, miniId: mini.id, name, email, phone }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok || !j.url) { setErr(j.error || 'Could not start the payment. Please try again.'); setBusy(false); return }
      window.location.href = j.url
    } catch {
      setErr('Could not start the payment. Please try again.')
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-twilight'

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-xl px-6 py-12">
        {mini.studio && <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">{mini.studio}</p>}
        <h1 className="mt-2 font-fraunces text-3xl font-semibold text-ink">{mini.title}</h1>
        <p className="mt-3 text-sm text-ink">
          {money(mini.price)}
          {mini.duration_min ? ' · ' + mini.duration_min + ' min' : ''}
          {mini.location ? ' · ' + mini.location : ''}
        </p>
        {mini.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{mini.description}</p>}

        {!mini.ready ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-5 text-sm text-ink-soft">Booking isn&apos;t open yet. Please check back soon.</p>
        ) : days.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-line bg-card p-5 text-sm text-ink-soft">All times are booked. Thank you for your interest!</p>
        ) : (
          <>
            <h2 className="mt-10 font-fraunces text-lg font-semibold text-ink">Pick a time</h2>
            <p className="text-xs text-ink-soft">Times shown in {tzName}</p>
            <div className="mt-4 space-y-5">
              {days.map(([day, slots]) => (
                <div key={day}>
                  <p className="mb-2 text-sm font-medium text-ink">{day}</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button key={s.id} type="button" onClick={() => setSlotId(s.id)} className={'rounded-xl border px-4 py-2 text-sm transition ' + (slotId === s.id ? 'border-twilight bg-twilight text-white' : 'border-line bg-white text-ink hover:border-ink')}>{time(s.starts_at)}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {slotId && (
              <form onSubmit={pay} className="mt-8 space-y-3 rounded-2xl border border-line bg-card p-6">
                <h2 className="font-fraunces text-lg font-semibold text-ink">Your details</h2>
                <input className={input} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" />
                <input className={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" />
                <input className={input} type="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} autoComplete="tel" />
                {err && <p className="text-sm text-red-700">{err}</p>}
                <button type="submit" disabled={busy} className="w-full rounded-xl bg-twilight px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{busy ? 'One moment…' : 'Pay ' + money(mini.price) + ' to reserve'}</button>
                <p className="text-center text-xs text-ink-soft">Your time is held for 30 minutes while you pay.</p>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  )
}
