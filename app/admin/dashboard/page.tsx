'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { BRAND_NAME } from '@/lib/brand'

// ── Types ─────────────────────────────────────────────────────────────────────

type Message = {
  id: string
  name: string | null
  email: string | null
  body: string | null
  kind: string | null
  source: string | null
  status: string | null
  created_at: string
}

type WaitlistSignup = {
  id: string
  email: string
  created_at: string
}

type ChurnEntry = {
  id: string
  user_id: string | null
  email: string | null
  reason: string | null
  feedback: string | null
  canceled_at: string
}

type AdminView = 'support' | 'waitlist' | 'churn'
type SourceFilter = 'all' | 'website' | 'app'
type StatusFilter = 'all' | 'new' | 'read' | 'resolved'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const KIND_STYLES: Record<string, string> = {
  support: 'bg-twilight/10 text-twilight',
  bug: 'bg-red-50 text-red-600',
  feedback: 'bg-brass/10 text-brass',
}

const SOURCE_STYLES: Record<string, string> = {
  website: 'bg-sage/10 text-sage',
  app: 'bg-twilight/10 text-twilight',
}

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-brass/15 text-brass',
  read: 'bg-twilight/10 text-twilight',
  resolved: 'bg-sage/15 text-sage',
}

function Badge({ value, styleMap }: { value: string | null; styleMap: Record<string, string> }) {
  if (!value) return <span className="text-ink-soft/40 text-xs">—</span>
  const cls = styleMap[value] ?? 'bg-ink-soft/10 text-ink-soft'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {value}
    </span>
  )
}

// ── Filter / view tabs ────────────────────────────────────────────────────────

function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-1 bg-paper-deep rounded-full px-1 py-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-ink text-white shadow-sm'
              : 'text-ink-soft hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Status select ─────────────────────────────────────────────────────────────

function StatusSelect({
  messageId,
  current,
  onUpdate,
}: {
  messageId: string
  current: string | null
  onUpdate: (id: string, status: string) => Promise<void>
}) {
  const [saving, setSaving] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    setSaving(true)
    await onUpdate(messageId, e.target.value)
    setSaving(false)
  }

  return (
    <select
      value={current ?? 'new'}
      onChange={handleChange}
      disabled={saving}
      onClick={(e) => e.stopPropagation()}
      className={`rounded-lg border border-line bg-paper px-2 py-1 text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-twilight/25 disabled:opacity-50 transition cursor-pointer ${
        STATUS_STYLES[current ?? 'new'] ?? ''
      }`}
    >
      <option value="new">New</option>
      <option value="read">Read</option>
      <option value="resolved">Resolved</option>
    </select>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter()

  const [view, setView] = useState<AdminView>('support')
  const [messages, setMessages] = useState<Message[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistSignup[]>([])
  const [churnLog, setChurnLog] = useState<ChurnEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const loadData = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.')
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/admin/login')
      return
    }

    try {
      const [messagesResult, waitlistResult, churnResult] = await Promise.all([
        supabase
          .from('support_messages')
          .select('id, name, email, body, kind, source, status, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('waitlist_signups')
          .select('id, email, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('churn_log')
          .select('id, user_id, email, reason, feedback, canceled_at')
          .order('canceled_at', { ascending: false }),
      ])

      if (messagesResult.error) throw messagesResult.error
      setMessages(messagesResult.data ?? [])
      // waitlist and churn_log tables may not exist yet — fail silently
      if (!waitlistResult.error) setWaitlist(waitlistResult.data ?? [])
      if (!churnResult.error) setChurnLog(churnResult.data ?? [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadData() }, [loadData])

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

  async function updateStatus(id: string, newStatus: string) {
    if (!supabase) return
    const { error } = await supabase
      .from('support_messages')
      .update({ status: newStatus })
      .eq('id', id)
    if (!error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      )
    }
  }

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtered = messages.filter((m) => {
    if (sourceFilter !== 'all' && m.source !== sourceFilter) return false
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    return true
  })

  const newCount = messages.filter((m) => m.status === 'new').length

  // ── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-soft text-sm animate-pulse">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-fraunces text-xl text-ink">Could not load dashboard</p>
        <p className="text-sm text-ink-soft">{error}</p>
        <Link href="/admin/login" className="text-sm text-twilight hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="font-fraunces text-lg font-semibold text-ink hover:text-twilight transition-colors"
            >
              {BRAND_NAME}{' '}
              <span className="text-ink-soft font-normal">/ admin</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm font-medium">
              <Link href="/admin/dashboard" className="text-ink">
                Messages
              </Link>
              {newCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-brass/15 px-2 py-0.5 text-xs font-medium text-brass">
                  {newCount} new
                </span>
              )}
              <Link href="/admin/metrics" className="text-ink-soft hover:text-ink transition-colors">
                Metrics
              </Link>
              <Link href="/admin/users" className="text-ink-soft hover:text-ink transition-colors">
                Users
              </Link>
            </nav>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-ink-soft hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">

        {/* View toggle */}
        <div className="flex items-center gap-3 mb-8">
          <Tabs<AdminView>
            value={view}
            onChange={setView}
            options={[
              { label: `Support messages${newCount > 0 ? ` (${newCount} new)` : ''}`, value: 'support' },
              { label: `Waitlist${waitlist.length > 0 ? ` (${waitlist.length})` : ''}`, value: 'waitlist' },
              { label: `Churn log${churnLog.length > 0 ? ` (${churnLog.length})` : ''}`, value: 'churn' },
            ]}
          />
        </div>

        {/* ── Support messages view ── */}
        {view === 'support' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="font-fraunces text-2xl font-semibold text-ink">Support messages</h1>
                <p className="text-sm text-ink-soft mt-0.5">
                  {filtered.length} of {messages.length} message{messages.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Tabs<SourceFilter>
                  value={sourceFilter}
                  onChange={setSourceFilter}
                  options={[
                    { label: 'All sources', value: 'all' },
                    { label: 'Website', value: 'website' },
                    { label: 'App', value: 'app' },
                  ]}
                />
                <Tabs<StatusFilter>
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { label: 'All', value: 'all' },
                    { label: 'New', value: 'new' },
                    { label: 'Read', value: 'read' },
                    { label: 'Resolved', value: 'resolved' },
                  ]}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-line bg-card p-12 text-center">
                <p className="font-fraunces text-xl italic text-ink-soft mb-1">No messages here.</p>
                <p className="text-sm text-ink-soft">
                  {messages.length > 0 ? 'Try adjusting the filters.' : 'Messages will appear here when submitted.'}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-paper-deep">
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">From</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">Message</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft hidden md:table-cell">Kind</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft hidden md:table-cell">Source</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">Status</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft hidden lg:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-card">
                    {filtered.map((msg) => {
                      const isExpanded = expanded.has(msg.id)
                      return (
                        <>
                          <tr
                            key={msg.id}
                            onClick={() => toggleRow(msg.id)}
                            className="hover:bg-paper-deep/60 transition-colors cursor-pointer"
                          >
                            <td className="px-5 py-3.5 align-top">
                              <p className="font-medium text-ink leading-snug">
                                {msg.name ?? <span className="text-ink-soft/50 italic">unnamed</span>}
                              </p>
                              <p className="text-xs text-ink-soft mt-0.5 break-all">{msg.email ?? '—'}</p>
                            </td>
                            <td className="px-5 py-3.5 align-top max-w-xs lg:max-w-sm">
                              <p className={`text-ink leading-snug ${isExpanded ? '' : 'line-clamp-2'}`}>
                                {msg.body ?? <span className="text-ink-soft/50 italic">no message</span>}
                              </p>
                            </td>
                            <td className="px-5 py-3.5 align-top hidden md:table-cell">
                              <Badge value={msg.kind} styleMap={KIND_STYLES} />
                            </td>
                            <td className="px-5 py-3.5 align-top hidden md:table-cell">
                              <Badge value={msg.source} styleMap={SOURCE_STYLES} />
                            </td>
                            <td className="px-5 py-3.5 align-top">
                              <StatusSelect messageId={msg.id} current={msg.status} onUpdate={updateStatus} />
                            </td>
                            <td className="px-5 py-3.5 align-top hidden lg:table-cell">
                              <span className="font-mono text-xs text-ink-soft whitespace-nowrap">
                                {fmtDate(msg.created_at)}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${msg.id}-expanded`} className="bg-paper-deep/40">
                              <td colSpan={6} className="px-5 py-4">
                                <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                    <Badge value={msg.kind} styleMap={KIND_STYLES} />
                                    <Badge value={msg.source} styleMap={SOURCE_STYLES} />
                                    <span className="font-mono text-xs text-ink-soft">{fmtDate(msg.created_at)}</span>
                                  </div>
                                  <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap rounded-xl bg-card border border-line px-4 py-3">
                                    {msg.body ?? <span className="text-ink-soft italic">No message body.</span>}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Waitlist view ── */}
        {view === 'waitlist' && (
          <>
            <div className="mb-6">
              <h1 className="font-fraunces text-2xl font-semibold text-ink">Waitlist signups</h1>
              <p className="text-sm text-ink-soft mt-0.5">
                {waitlist.length} signup{waitlist.length !== 1 ? 's' : ''} total
              </p>
            </div>

            {waitlist.length === 0 ? (
              <div className="rounded-2xl border border-line bg-card p-12 text-center">
                <p className="font-fraunces text-xl italic text-ink-soft mb-1">No signups yet.</p>
                <p className="text-sm text-ink-soft">Waitlist signups will appear here.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-paper-deep">
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">#</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">Email</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">Signed up</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-card">
                    {waitlist.map((signup, i) => (
                      <tr key={signup.id} className="hover:bg-paper-deep/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-ink-soft">{waitlist.length - i}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <a
                            href={`mailto:${signup.email}`}
                            className="text-ink hover:text-twilight transition-colors"
                          >
                            {signup.email}
                          </a>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-ink-soft whitespace-nowrap">
                            {fmtDate(signup.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Churn log view ── */}
        {view === 'churn' && (
          <>
            <div className="mb-6">
              <h1 className="font-fraunces text-2xl font-semibold text-ink">Churn log</h1>
              <p className="text-sm text-ink-soft mt-0.5">
                {churnLog.length} cancellation{churnLog.length !== 1 ? 's' : ''} recorded
              </p>
            </div>

            {churnLog.length === 0 ? (
              <div className="rounded-2xl border border-line bg-card p-12 text-center">
                <p className="font-fraunces text-xl italic text-ink-soft mb-1">No cancellations recorded yet.</p>
                <p className="text-sm text-ink-soft">Entries appear here when a Stripe subscription is deleted.</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-paper-deep">
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">Email</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft hidden md:table-cell">Reason</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft">Feedback</th>
                      <th className="text-left px-5 py-3 font-medium text-ink-soft hidden lg:table-cell">Canceled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-card">
                    {churnLog.map((entry) => (
                      <tr key={entry.id} className="hover:bg-paper-deep/40 transition-colors">
                        <td className="px-5 py-3.5 align-top">
                          {entry.email ? (
                            <a
                              href={`mailto:${entry.email}`}
                              className="text-ink hover:text-twilight transition-colors break-all"
                            >
                              {entry.email}
                            </a>
                          ) : (
                            <span className="text-ink-soft/40 italic text-xs">unknown</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 align-top hidden md:table-cell">
                          {entry.reason ? (
                            <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 capitalize">
                              {entry.reason.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-ink-soft/40 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 align-top max-w-xs lg:max-w-sm">
                          {entry.feedback ? (
                            <p className="text-ink text-sm leading-snug line-clamp-2">
                              {entry.feedback.replace(/_/g, ' ')}
                            </p>
                          ) : (
                            <span className="text-ink-soft/40 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 align-top hidden lg:table-cell">
                          <span className="font-mono text-xs text-ink-soft whitespace-nowrap">
                            {fmtDate(entry.canceled_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}
