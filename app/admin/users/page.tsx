'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

type UserResult = {
  userId: string
  email: string
  subscriptionStatus: string | null
}

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-sage/15 text-sage',
  comped:   'bg-twilight/10 text-twilight',
  inactive: 'bg-ink-soft/10 text-ink-soft',
  trial:    'bg-brass/15 text-brass',
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [searching, setSearching] = useState(false)
  const [result, setResult] = useState<UserResult | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

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

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  async function callApi(body: object) {
    return fetch('/api/admin/user-access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearching(true)
    setResult(null)
    setSearchError(null)
    setActionMsg(null)
    try {
      const res = await callApi({ action: 'lookup', email })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Search failed')
      setResult(data)
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSearching(false)
    }
  }

  async function handleAccess(action: 'grant' | 'revoke') {
    if (!result) return
    setActionLoading(true)
    setActionMsg(null)
    try {
      const res = await callApi({ action, userId: result.userId })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Action failed')
      setResult({ ...result, subscriptionStatus: data.newStatus })
      setActionMsg(action === 'grant' ? 'Free access granted.' : 'Access revoked — status set to inactive.')
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link href="/" className="font-fraunces text-lg font-semibold text-ink hover:text-twilight transition-colors">
              {BRAND_NAME}{' '}
              <span className="text-ink-soft font-normal">/ admin</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
              <Link href="/admin/dashboard" className="text-ink-soft hover:text-ink transition-colors">Messages</Link>
              <Link href="/admin/metrics"   className="text-ink-soft hover:text-ink transition-colors">Metrics</Link>
              <Link href="/admin/users"     className="text-ink">Users</Link>
            </nav>
          </div>
          <button onClick={handleSignOut} className="text-sm text-ink-soft hover:text-ink transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-2xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-fraunces text-2xl font-semibold text-ink">Grant free access</h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Search by email to find a user and comp their account.
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex items-stretch gap-2 mb-6">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="user@example.com"
            className="flex-1 rounded-xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight transition"
          />
          <button
            type="submit"
            disabled={searching || !token}
            className="rounded-xl bg-twilight px-5 py-2.5 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4">
            {searchError}
          </div>
        )}

        {/* Result card */}
        {result && (
          <div className="rounded-2xl border border-line bg-card p-6">
            {/* User info */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="font-medium text-ink text-sm">{result.email}</p>
                <p className="font-mono text-xs text-ink-soft/60 mt-0.5 break-all">{result.userId}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize shrink-0 ${
                  STATUS_STYLES[result.subscriptionStatus ?? ''] ?? 'bg-ink-soft/10 text-ink-soft'
                }`}
              >
                {result.subscriptionStatus ?? 'no profile'}
              </span>
            </div>

            {/* Action */}
            <div className="border-t border-line pt-4 flex flex-wrap items-center gap-3">
              {result.subscriptionStatus !== 'comped' ? (
                <button
                  onClick={() => handleAccess('grant')}
                  disabled={actionLoading}
                  className="rounded-full bg-twilight px-4 py-2 text-sm font-semibold text-white hover:bg-twilight/90 disabled:opacity-50 transition-colors"
                  style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
                >
                  {actionLoading ? 'Updating…' : 'Grant free access for life'}
                </button>
              ) : (
                <button
                  onClick={() => handleAccess('revoke')}
                  disabled={actionLoading}
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink hover:border-ink/30 disabled:opacity-50 transition-colors"
                >
                  {actionLoading ? 'Updating…' : 'Revoke access'}
                </button>
              )}
              {actionMsg && (
                <p className="text-sm text-ink-soft">{actionMsg}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
