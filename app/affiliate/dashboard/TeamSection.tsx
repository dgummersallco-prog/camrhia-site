'use client'

import { useEffect, useState } from 'react'

type Recruit = { id: string; name: string | null; joined: string; active: number; trial: number; churned: number; earned: number }
type Month = { month: string; direct: number; team: number }
type Stats = {
  own_active: number
  own_trial: number
  own_churned: number
  direct_total: number
  team_total: number
  unpaid: number
  this_month: number
  monthly: Month[]
  recruits: Recruit[]
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n ?? 0))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-xs uppercase tracking-widest text-ink-soft">{label}</p>
      <p className="mt-1 font-fraunces text-2xl text-ink">{value}</p>
      {sub ? <p className="text-xs text-ink-soft mt-0.5">{sub}</p> : null}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function TeamSection({ client, userId, code }: { client: any; userId: string; code: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedPitch, setCopiedPitch] = useState(false)

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
      const { data } = await client.rpc('my_team_stats')
      if (!cancelled && data) setStats(data as Stats)
    })()
    return () => {
      cancelled = true
    }
  }, [client, userId])

  if (!stats) return null

  const link = typeof window !== 'undefined' ? `${window.location.origin}/affiliate/signup?recruit=${code}` : ''
  const pitch =
    `Hey! I'm a partner with Camrhia, an app that gives photographers their own portfolio website plus bookings, contracts, payments and client messaging in one place. ` +
    `You earn recurring commission for every photographer you refer. Sign up as an affiliate here: ${link}`

  const teamActive = stats.recruits.reduce((s, r) => s + Number(r.active), 0)
  const lifetime = Number(stats.direct_total) + Number(stats.team_total)
  const maxBar = Math.max(1, ...stats.monthly.map((m) => Number(m.direct) + Number(m.team)))

  async function copy(text: string, which: 'link' | 'pitch') {
    try {
      await navigator.clipboard.writeText(text)
      if (which === 'link') {
        setCopiedLink(true)
        setTimeout(() => setCopiedLink(false), 2000)
      } else {
        setCopiedPitch(true)
        setTimeout(() => setCopiedPitch(false), 2000)
      }
    } catch {}
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6 space-y-6">
      <div>
        <p className="font-mono text-xs tracking-widest uppercase text-ink-soft mb-1">Master partner</p>
        <h2 className="font-fraunces text-2xl text-ink">Your team</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Sign up your own affiliates and earn on everything they bring in, on top of your own referrals.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile label="Affiliates" value={String(stats.recruits.length)} sub="on your team" />
        <Tile label="Your active" value={String(stats.own_active)} sub={`${stats.own_trial} in trial`} />
        <Tile label="Team active" value={String(teamActive)} sub="photographers" />
        <Tile label="This month" value={money(stats.this_month)} />
        <Tile label="Pending payout" value={money(stats.unpaid)} />
        <Tile label="Lifetime" value={money(lifetime)} sub={`${money(stats.direct_total)} yours · ${money(stats.team_total)} team`} />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-ink">Last 6 months</p>
          <p className="text-xs text-ink-soft">
            <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ backgroundColor: '#3A4A6B' }} />Yours
            <span className="inline-block w-2 h-2 rounded-sm ml-3 mr-1" style={{ backgroundColor: '#A9853F' }} />Team
          </p>
        </div>
        <div className="mt-3 flex items-end gap-3 h-32">
          {stats.monthly.map((m) => {
            const total = Number(m.direct) + Number(m.team)
            const h = (total / maxBar) * 100
            const teamH = total > 0 ? (Number(m.team) / total) * 100 : 0
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="w-full flex flex-col justify-end rounded-t-md overflow-hidden" style={{ height: `${Math.max(h, total > 0 ? 4 : 0)}%` }}>
                  <div style={{ height: `${teamH}%`, backgroundColor: '#A9853F' }} />
                  <div style={{ height: `${100 - teamH}%`, backgroundColor: '#3A4A6B' }} />
                </div>
                <p className="mt-1 text-[11px] text-ink-soft">{monthLabel(m.month)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-ink">Recruit affiliates</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input readOnly value={link} className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
          <button
            onClick={() => copy(link, 'link')}
            className="rounded-full px-5 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: '#3A4A6B' }}
          >
            {copiedLink ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={() => copy(pitch, 'pitch')}
            className="rounded-full border border-line px-5 py-2 text-sm text-ink hover:bg-paper"
          >
            {copiedPitch ? 'Copied' : 'Copy message'}
          </button>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Your affiliates</p>
        {stats.recruits.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            No one yet. Send your recruit link or the ready-made message to a photographer friend or anyone with an audience of photographers.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {stats.recruits.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="text-ink font-medium">{r.name || 'New affiliate'}</p>
                  <p className="text-ink-soft text-xs">
                    Joined {new Date(r.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {r.active} active · {r.trial} trial · {r.churned} canceled
                  </p>
                </div>
                <p className="text-ink font-semibold">{money(r.earned)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
