'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const COPY: Record<string, { title: string; blurb: string; includes: string[]; month: number; year: number; trial: boolean }> = {
  showcase: {
    title: 'Camrhia Showcase',
    blurb: 'Launch your professional website, publish your ad specials, and deliver galleries your clients keep forever.',
    includes: [
      'Your website live on your own domain',
      'Ad specials published and ready to share',
      'Custom, beautiful gallery delivery that never expires',
      'The Camrhia app included',
    ],
    month: 33,
    year: 330,
    trial: true,
  },
  retouch: {
    title: 'Camri Retouch',
    blurb: 'AI editing with Camri guiding every step: saving your style, giving advice, and applying settings in one click.',
    includes: ['AI editing in your style', 'Camri guidance on every step', 'One-click settings', 'Camri Cull included'],
    month: 22,
    year: 220,
    trial: true,
  },
  cull: {
    title: 'Camri Cull',
    blurb: 'AI culling that picks your best shots from every session, so you start editing faster.',
    includes: ['AI culling for every session', 'Best shots picked for you', 'Already included with Camri Retouch'],
    month: 11,
    year: 110,
    trial: false,
  },
}

export default function UpgradePage() {
  const params = useParams<{ product: string }>()
  const router = useRouter()
  const product = String(params?.product || '')
  const c = COPY[product]
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!c) return <div style={{ padding: 48 }}>That plan doesn&apos;t exist.</div>

  async function go() {
    setBusy(true)
    setErr('')
    try {
      const sb = supabase
      const { data } = sb ? await sb.auth.getSession() : { data: { session: null } }
      const token = data.session?.access_token
      if (!token) { router.push('/login'); return }
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ product, interval }),
      })
      const j = await res.json()
      if (j.url) { window.location.href = j.url; return }
      setErr(j.error || 'Something went wrong. Please try again.')
    } catch {
      setErr('Something went wrong. Please try again.')
    }
    setBusy(false)
  }

  const price = interval === 'month' ? c.month : c.year

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '56px 24px' }}>
      <h1 style={{ fontSize: 30, margin: '0 0 8px' }}>{c.title}</h1>
      <p style={{ opacity: 0.75, margin: '0 0 24px' }}>{c.blurb}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['month', 'year'] as const).map((i) => (
          <button
            key={i}
            onClick={() => setInterval(i)}
            style={{
              flex: 1, padding: '12px 0', borderRadius: 10, cursor: 'pointer', fontSize: 15,
              border: interval === i ? '2px solid currentColor' : '1px solid rgba(0,0,0,0.2)',
              background: 'transparent', fontWeight: interval === i ? 700 : 500,
            }}
          >
            {i === 'month' ? 'Monthly' : 'Yearly · 2 months free'}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4 }}>
        ${price}<span style={{ fontSize: 16, fontWeight: 500, opacity: 0.6 }}>/{interval === 'month' ? 'mo' : 'yr'}</span>
      </div>
      {c.trial && <div style={{ opacity: 0.7, marginBottom: 20 }}>14 days free. Cancel anytime.</div>}

      <ul style={{ padding: 0, listStyle: 'none', margin: '20px 0 28px' }}>
        {c.includes.map((t) => (
          <li key={t} style={{ padding: '6px 0' }}>✓ {t}</li>
        ))}
      </ul>

      <button
        onClick={go}
        disabled={busy}
        style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, background: '#111', color: '#fff' }}
      >
        {busy ? 'One moment…' : c.trial ? 'Start 14-day free trial' : 'Subscribe'}
      </button>
      {err && <div style={{ color: '#b00020', marginTop: 12 }}>{err}</div>}
    </div>
  )
}
