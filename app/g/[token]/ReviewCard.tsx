'use client'
import { useEffect, useState } from 'react'

export default function ReviewCard({
  access, visitorId, studio, accent,
}: { access: string; visitorId: string; studio: string | null; accent: string | null }) {
  const key = `camrhia-review-${access.slice(0, 16)}`
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const color = accent || '#2A1F24'

  useEffect(() => {
    try { if (localStorage.getItem(key)) setDone(true) } catch { /* ignore */ }
  }, [key])

  async function submit() {
    if (!rating) { setErr('Tap a star to rate your experience.'); return }
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/gallery/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access, visitorId, rating, body: text, name }),
      })
      if (!res.ok) throw new Error()
      try { localStorage.setItem(key, '1') } catch { /* ignore */ }
      setDone(true)
    } catch {
      setErr('Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  return (
    <section className="mx-auto my-12 w-full max-w-xl rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm">
      {done ? (
        <>
          <p className="text-lg font-semibold text-[#2A1F24]">Thank you!</p>
          <p className="mt-1 text-sm text-black/60">Your feedback means a lot{studio ? ` to ${studio}` : ''}.</p>
        </>
      ) : (
        <>
          <p className="text-lg font-semibold text-[#2A1F24]">How was your experience{studio ? ` with ${studio}` : ''}?</p>
          <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                className="text-3xl leading-none transition-transform hover:scale-110"
                style={{ color: n <= rating ? color : '#d4d0cc' }}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a few words (optional)"
            rows={3}
            className="mt-4 w-full rounded-lg border border-black/15 p-3 text-sm text-[#2A1F24] outline-none focus:border-black/40"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name (optional)"
            className="mt-2 w-full rounded-lg border border-black/15 p-3 text-sm text-[#2A1F24] outline-none focus:border-black/40"
          />
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="mt-4 rounded-full px-6 py-2 text-sm font-medium text-white disabled:opacity-60"
            style={{ background: color }}
          >
            {busy ? 'Sending…' : 'Send'}
          </button>
        </>
      )}
    </section>
  )
}
