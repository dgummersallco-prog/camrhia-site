'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type Recruit = { id: string; name: string | null; joined: string; active: number; trial: number; churned: number; earned: number }
export type Month = { month: string; direct: number; team: number }
export type Stats = {
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

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n ?? 0))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym

export function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <p className="text-xs uppercase tracking-widest text-ink-soft">{label}</p>
      <p className="mt-1 font-fraunces text-2xl text-ink">{value}</p>
      {sub ? <p className="text-xs text-ink-soft mt-0.5">{sub}</p> : null}
    </div>
  )
}

export function useTeamStats(enabled: boolean) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const client = supabase
    if (!enabled || !client) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      const { data } = await client.rpc('my_team_stats')
      if (!cancelled && data) setStats(data as Stats)
      if (!cancelled) setLoading(false)
    })()
    return () => { cancelled = true }
  }, [enabled])
  return { stats, loading }
}
