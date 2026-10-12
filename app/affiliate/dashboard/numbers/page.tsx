'use client'

import AffiliateShell from '../../components/AffiliateShell'
import { Tile, money, monthLabel, useTeamStats } from '../../components/teamShared'

function NumbersBody({ isMaster }: { isMaster: boolean }) {
  const { stats, loading } = useTeamStats(isMaster)
  if (!isMaster) return <p className="text-sm text-ink-soft">Team numbers are for master partners.</p>
  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!stats) return <p className="text-sm text-ink-soft">No numbers yet.</p>

  const teamActive = stats.recruits.reduce((s, r) => s + Number(r.active), 0)
  const lifetime = Number(stats.direct_total) + Number(stats.team_total)
  const maxBar = Math.max(1, ...stats.monthly.map((m) => Number(m.direct) + Number(m.team)))

  return (
    <section className="rounded-2xl border border-line bg-card p-6 space-y-6">
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
    </section>
  )
}

export default function NumbersPage() {
  return (
    <AffiliateShell title="Team numbers" subtitle="What you and your team have brought in.">
      {(a) => <NumbersBody isMaster={!!a.is_master} />}
    </AffiliateShell>
  )
}
