'use client'

import AffiliateShell from '../../components/AffiliateShell'
import { money, useTeamStats } from '../../components/teamShared'

function TeamBody({ isMaster, hasParent }: { isMaster: boolean; hasParent: boolean }) {
  const { stats, loading } = useTeamStats(isMaster)

  if (!isMaster && !hasParent) {
    return <p className="text-sm text-ink-soft">You aren&apos;t on a team yet. Use a team code when you sign up to join one.</p>
  }
  if (!isMaster) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="text-ink font-medium">You&apos;re part of a team.</p>
        <p className="mt-1 text-sm text-ink-soft">Your master partner earns a bonus on your sales, and it never reduces your commission.</p>
      </div>
    )
  }
  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <p className="text-sm font-medium text-ink">Your affiliates</p>
      {!stats || stats.recruits.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">
          No one yet. Open the Recruit tab to grab your team code and a ready-made message.
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
                <p className="text-xs text-ink-soft mt-0.5">{r.active} active · {r.trial} trial · {r.churned} canceled</p>
              </div>
              <p className="text-ink font-semibold">{money(r.earned)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function TeamPage() {
  return (
    <AffiliateShell title="Your team" subtitle="The affiliates on your team.">
      {(a) => <TeamBody isMaster={!!a.is_master} hasParent={!!a.parent_affiliate_id} />}
    </AffiliateShell>
  )
}
