'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { BRAND_NAME } from '@/lib/brand'

type Row = {
  id: string
  name: string | null
  email: string | null
  referral_code: string | null
  is_master: boolean
  approved: boolean
  commission_rate: number | null
  override_rate: number | null
  recruited_by: string | null
  active_referrals: number
  total_referrals: number
  created_at: string
  phone: string | null
  handle: string | null
  followers: string | null
  best_reach: string | null
}

type App = { id: string; name: string; email: string; phone: string | null; handle: string | null; followers: string | null; best_reach: string | null; created_at: string }

export default function AdminAffiliatesPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [apps, setApps] = useState<App[]>([])
  const [pay, setPay] = useState<Record<string, { m: string | null; e: string | null }>>({})
  const [docs, setDocs] = useState<Record<string, { file_path: string; verified_at: string | null }>>({})

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
      setApps(json.applications ?? [])
      if (supabase) {
        const [{ data: af }, { data: dc }] = await Promise.all([
          supabase.from('affiliates').select('id, payout_method, payout_email'),
          supabase.from('affiliate_tax_docs').select('affiliate_id, file_path, verified_at'),
        ])
        const pm: Record<string, { m: string | null; e: string | null }> = {}
        for (const x of (af ?? []) as { id: string; payout_method: string | null; payout_email: string | null }[]) pm[x.id] = { m: x.payout_method, e: x.payout_email }
        setPay(pm)
        const dm: Record<string, { file_path: string; verified_at: string | null }> = {}
        for (const x of (dc ?? []) as { affiliate_id: string; file_path: string; verified_at: string | null }[]) dm[x.affiliate_id] = { file_path: x.file_path, verified_at: x.verified_at }
        setDocs(dm)
      }
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

  async function setApproved(row: Row) {
    setBusyId(row.id)
    try {
      const res = await callApi({ action: 'set_approved', affiliateId: row.id, approved: true })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function appAction(a: App, action: 'approve_application' | 'decline_application') {
    if (action === 'decline_application' && !window.confirm(`Delete the application from ${a.name}?`)) return
    if (action === 'approve_application' && !window.confirm(`Approve ${a.name}? This creates their account and emails ${a.email} a link to set their password.`)) return
    setBusyId(a.id)
    setError(null)
    try {
      const res = await callApi({ action, applicationId: a.id })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function removeAffiliate(row: Row) {
    const who = row.name || row.email || 'this affiliate'
    if (!window.confirm(`Remove ${who} as an affiliate?\n\nTheir Camrhia login stays, but they lose their affiliate account.`)) return
    setBusyId(row.id)
    setError(null)
    try {
      const res = await callApi({ action: 'remove_affiliate', affiliateId: row.id })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Remove failed')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setBusyId(null)
    }
  }

  async function viewW9(path: string) {
    if (!supabase) return
    const { data, error: e } = await supabase.storage.from('affiliate-tax').createSignedUrl(path, 120)
    if (e || !data?.signedUrl) { setError(e?.message ?? 'Could not open the file'); return }
    window.open(data.signedUrl, '_blank')
  }

  async function verifyW9(id: string) {
    if (!supabase) return
    const { error: e } = await supabase.from('affiliate_tax_docs').update({ verified_at: new Date().toISOString() }).eq('affiliate_id', id)
    if (e) { setError(e.message); return }
    await load()
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="font-fraunces text-3xl text-ink">Affiliates</h1>
        <p className="mt-1 text-sm text-ink-soft">Promote an affiliate to master partner with one click.</p>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {loading ? <p className="mt-6 text-sm text-ink-soft animate-pulse">Loading…</p> : null}

        {!loading && rows.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">No affiliates yet.</p>
        ) : null}

        {apps.length > 0 ? (
          <div className="mt-6">
            <h2 className="font-fraunces text-xl text-ink">Applications <span className="text-sm text-ink-soft">· {apps.length}</span></h2>
            <div className="mt-3 space-y-3">
              {apps.map((a) => (
                <div key={a.id} className="rounded-2xl border border-line bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{a.name}</p>
                    <p className="text-sm text-ink-soft">{a.email}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink">
                      {a.phone ? <a href={`tel:${a.phone}`} className="font-medium underline">{a.phone}</a> : null}
                      {a.handle ? <span>{a.handle}</span> : null}
                      {a.followers ? <span>{a.followers} followers</span> : null}
                      {a.best_reach ? <span>best post reach {a.best_reach}</span> : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => appAction(a, 'approve_application')} disabled={busyId === a.id} className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-60" style={{ backgroundColor: '#8C6B3F' }}>
                      {busyId === a.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button onClick={() => appAction(a, 'decline_application')} disabled={busyId === a.id} className="rounded-full border border-line px-5 py-2 text-sm text-ink-soft hover:text-ink disabled:opacity-60">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                  {!r.approved ? (
                    <span className="rounded-full bg-black/5 text-ink-soft text-xs px-2 py-0.5">Pending</span>
                  ) : null}
                </div>
                <p className="text-sm text-ink-soft">{r.email}</p>
                {r.phone || r.handle || r.followers || r.best_reach ? (
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-ink">
                    {r.phone ? <a href={`tel:${r.phone}`} className="font-medium underline">{r.phone}</a> : null}
                    {r.handle ? <span>{r.handle}</span> : null}
                    {r.followers ? <span>{r.followers} followers</span> : null}
                    {r.best_reach ? <span>best post reach {r.best_reach}</span> : null}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-ink-soft">
                  Code {r.referral_code} · {r.active_referrals} active / {r.total_referrals} referrals
                  {r.recruited_by ? ` · recruited by ${r.recruited_by}` : ''}
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  Payout: {pay[r.id]?.m ? `${pay[r.id].m}${pay[r.id].e ? ' · ' + pay[r.id].e : ''}` : 'not set'} · W-9: {docs[r.id] ? (docs[r.id].verified_at ? 'verified' : 'uploaded') : 'not received'}
                  {docs[r.id] ? <button onClick={() => viewW9(docs[r.id].file_path)} className="ml-2 underline">View</button> : null}
                  {docs[r.id] && !docs[r.id].verified_at ? <button onClick={() => verifyW9(r.id)} className="ml-2 underline">Mark verified</button> : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
              {!r.approved ? (
                <button
                  onClick={() => setApproved(r)}
                  disabled={busyId === r.id}
                  className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: '#8C6B3F' }}
                >
                  {busyId === r.id ? 'Saving…' : 'Approve'}
                </button>
              ) : null}
              <button
                onClick={() => setMaster(r, !r.is_master)}
                disabled={busyId === r.id}
                className={
                  r.is_master
                    ? 'rounded-full border border-line px-5 py-2 text-sm text-ink-soft hover:text-ink disabled:opacity-60'
                    : 'rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-60'
                }
                style={r.is_master ? undefined : { backgroundColor: '#8C6B3F' }}
              >
                {busyId === r.id ? 'Saving…' : r.is_master ? 'Remove master' : 'Promote to master'}
              </button>
              <button
                onClick={() => removeAffiliate(r)}
                disabled={busyId === r.id}
                className="rounded-full border border-line px-5 py-2 text-sm text-ink-soft hover:text-ink disabled:opacity-60"
              >
                Remove
              </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
