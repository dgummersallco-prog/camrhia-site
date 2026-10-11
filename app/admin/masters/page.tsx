'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Recruit = {
  id: string
  name: string | null
  email: string | null
  active_referrals: number
  override_earned: number
}

type Master = {
  id: string
  name: string | null
  email: string | null
  referral_code: string | null
  own_active: number
  recruits: Recruit[]
  direct_earned: number
  override_earned: number
  unpaid: number
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

export default function AdminMastersPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [masters, setMasters] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!supabase) { router.replace('/admin/login'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
    }
    init()
  }, [router])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'masters' }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setMasters(json.masters ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-fraunces text-3xl text-ink">Master partners</h1>
        <p className="mt-1 text-sm text-ink-soft">Every master, their team and what they have earned. Promote or remove masters on the Affiliates page.</p>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-ink-soft animate-pulse">Loading…</p> : null}
        {!loading && masters.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">No masters yet.</p>
        ) : null}

        <div className="mt-6 space-y-5">
          {masters.map((m) => {
            const teamActive = m.recruits.reduce((s, r) => s + r.active_referrals, 0)
            return (
              <section key={m.id} className="rounded-2xl border border-line bg-card p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-fraunces text-xl text-ink">{m.name || 'Unnamed'}</p>
                    <p className="text-sm text-ink-soft">{m.email}</p>
                    <p className="text-xs text-ink-soft mt-1">Code {m.referral_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-widest text-ink-soft">Owed (unpaid)</p>
                    <p className="font-fraunces text-2xl text-ink">{money(m.unpaid)}</p>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <dt className="text-ink-soft">Own active</dt>
                    <dd className="text-ink font-semibold">{m.own_active}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Team</dt>
                    <dd className="text-ink font-semibold">{m.recruits.length} affiliates · {teamActive} active</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Direct earned</dt>
                    <dd className="text-ink font-semibold">{money(m.direct_earned)}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Team earned</dt>
                    <dd className="text-ink font-semibold">{money(m.override_earned)}</dd>
                  </div>
                </dl>

                {m.recruits.length > 0 ? (
                  <details className="mt-5">
                    <summary className="cursor-pointer text-sm text-twilight">View team ({m.recruits.length})</summary>
                    <ul className="mt-3 divide-y divide-line border-y border-line">
                      {m.recruits.map((r) => (
                        <li key={r.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                          <div>
                            <p className="text-ink font-medium">{r.name || r.email || 'Unnamed'}</p>
                            <p className="text-ink-soft">{r.active_referrals} active photographer{r.active_referrals === 1 ? '' : 's'}</p>
                          </div>
                          <p className="text-ink font-semibold">{money(r.override_earned)}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
