'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

type Row = {
  id: string
  name: string | null
  email: string | null
  referral_code: string | null
  is_master: boolean
  commission_rate: number | null
  override_rate: number | null
  recruited_by: string | null
  active_referrals: number
  total_referrals: number
  created_at: string
}

export default function AdminAffiliatesPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!supabase) { router.replace('/admin/login'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      setToken(session.access_token)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/admin/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  const callApi = useCallback(
    (body: object) =>
      fetch('/api/admin/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      }),
    [token],
  )

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await callApi({ action: 'list' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to load')
      setRows(json.rows ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [token, callApi])

  useEffect(() => {
    load()
  }, [load])

  async function setMaster(row: Row, makeMaster: boolean) {
    const who = row.name || row.email || 'this affiliate'
    const ok = window.confirm(
      makeMaster
        ? `Make ${who} a master partner?\n\nThey earn 50% on their own referrals, plus half of what is left after a recruit's commission on every affiliate they sign.`
        : `Remove master status from ${who}?\n\nNew referrals go back to the normal 20-30% tiers. Referrals already locked at 50% keep that rate.`,
    )
    if (!ok) return
    setBusyId(row.id)
    try {
      const res = await callApi({ action: 'set_master', affiliateId: row.id, isMaster: makeMaster })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper/95">
        <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-fraunces text-lg font-semibold text-ink">
            {BRAND_NAME} <span className="text-ink-soft font-normal">/ admin</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/admin/dashboard" className="text-ink-soft hover:text-ink">Dashboard</Link>
            <Link href="/admin/metrics" className="text-ink-soft hover:text-ink">Metrics</Link>
            <Link href="/admin/users" className="text-ink-soft hover:text-ink">Users</Link>
            <Link href="/admin/affiliates" className="text-ink">Affiliates</Link>
            <button onClick={handleSignOut} className="text-ink-soft hover:text-ink">Sign out</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-fraunces text-3xl text-ink">Affiliates</h1>
        <p className="mt-1 text-sm text-ink-soft">Promote an affiliate to master partner with one click.</p>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-ink-soft animate-pulse">Loading…</p> : null}

        {!loading && rows.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">No affiliates yet.</p>
        ) : null}

        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{r.name || 'Unnamed'}</p>
                  {r.is_master ? (
                    <span className="rounded-full bg-brass/15 text-brass text-xs px-2 py-0.5">Master</span>
                  ) : null}
                </div>
                <p className="text-sm text-ink-soft">{r.email}</p>
                <p className="mt-1 text-xs text-ink-soft">
                  Code {r.referral_code} · {r.active_referrals} active / {r.total_referrals} referrals
                  {r.recruited_by ? ` · recruited by ${r.recruited_by}` : ''}
                </p>
              </div>
              <button
                onClick={() => setMaster(r, !r.is_master)}
                disabled={busyId === r.id}
                className={
                  r.is_master
                    ? 'rounded-full border border-line px-5 py-2 text-sm text-ink-soft hover:text-ink disabled:opacity-60'
                    : 'rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-60'
                }
                style={r.is_master ? undefined : { backgroundColor: '#3A4A6B' }}
              >
                {busyId === r.id ? 'Saving…' : r.is_master ? 'Remove master' : 'Promote to master'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
