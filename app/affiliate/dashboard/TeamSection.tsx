'use client'

import { useEffect, useState } from 'react'

type Member = { affiliate_id: string; name: string; joined: string; active_referrals: number; earned: number }

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TeamSection({ client, userId, code }: { client: any; userId: string; code: string }) {
  const [isMaster, setIsMaster] = useState(false)
  const [team, setTeam] = useState<Member[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!client) return
    let cancelled = false
    ;(async () => {
      // If this person arrived through a master's recruit link, attach them (once).
      try {
        const pending = window.localStorage.getItem('camrhia_recruit')
        if (pending) {
          await client.rpc('claim_recruiter', { p_code: pending })
          window.localStorage.removeItem('camrhia_recruit')
        }
      } catch {}

      const { data: me } = await client.from('affiliates').select('is_master').eq('id', userId).maybeSingle()
      if (cancelled || !me?.is_master) return
      setIsMaster(true)
      const { data } = await client.rpc('my_team')
      if (!cancelled) {
        setTeam(((data ?? []) as Member[]).map((m) => ({ ...m, earned: Number(m.earned ?? 0) })))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, userId])

  if (!isMaster) return null

  const link = typeof window !== 'undefined' ? `${window.location.origin}/affiliate/signup?recruit=${code}` : ''
  const total = team.reduce((s, m) => s + m.earned, 0)

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <p className="font-mono text-xs tracking-widest uppercase text-ink-soft mb-1">Master partner</p>
      <h2 className="font-fraunces text-2xl text-ink">Your team</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Share this link to sign up your own affiliates. You earn on everything they bring in, on top of your own referrals.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <input
          readOnly
          value={link}
          className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
        />
        <button
          onClick={copy}
          className="rounded-full px-5 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: '#3A4A6B' }}
        >
          {copied ? 'Copied' : 'Copy recruit link'}
        </button>
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <p className="text-sm text-ink-soft">{team.length} affiliate{team.length === 1 ? '' : 's'} on your team</p>
        <p className="text-sm text-ink">Team earnings: <span className="font-semibold">{money(total)}</span></p>
      </div>

      {team.length > 0 ? (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {team.map((m) => (
            <li key={m.affiliate_id} className="py-3 flex items-center justify-between gap-4 text-sm">
              <div>
                <p className="text-ink font-medium">{m.name}</p>
                <p className="text-ink-soft">{m.active_referrals} active photographer{m.active_referrals === 1 ? '' : 's'}</p>
              </div>
              <p className="text-ink font-semibold">{money(m.earned)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
