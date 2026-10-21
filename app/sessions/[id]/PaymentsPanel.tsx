"use client"

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Line = {
  id: string; label: string | null; amount: number; due_date: string | null
  status: string | null; paid_at: string | null; method: string | null
  sent_by_couple: boolean | null; requested_at: string | null
}
const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateOnly = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

export function PaymentsPanel({ weddingId, w }: { weddingId: string; w: Record<string, any> }) {
  const [lines, setLines] = useState<Line[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data } = await sb
      .from('payment_schedule')
      .select('id, label, amount, due_date, status, paid_at, method, sent_by_couple, requested_at')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })
    setLines((data ?? []) as Line[])
  }, [weddingId])

  useEffect(() => { load() }, [load])

  async function remind(l: Line) {
    const sb = supabase
    if (!sb) return
    const couple = (w.couple_user_id as string | null) ?? null
    if (!couple) { setMsg('This client has not joined yet, so there is nobody to notify.'); return }
    setBusy(l.id)
    setMsg(null)
    const overdue = !!l.due_date && l.due_date < today
    const when = overdue ? 'is overdue.' : l.due_date ? 'is due ' + dateOnly(l.due_date) + '.' : 'is waiting.'
    const body = money(l.amount) + ' (' + (l.label || 'Payment') + ') ' + when + ' Tap to view and pay.'
    const { error } = await sb.from('notifications').insert({ user_id: couple, type: 'payment', title: 'Payment reminder', body, wedding_id: weddingId })
    if (error) { setBusy(null); setMsg(error.message); return }
    await sb.from('payment_schedule').update({ requested_at: new Date().toISOString() }).eq('id', l.id)
    setBusy(null)
    setMsg('Reminder sent to your client.')
    load()
  }

  const paidTotal = lines.filter((l) => l.status === 'paid').reduce((a, l) => a + Number(l.amount || 0), 0)
  const total = lines.reduce((a, l) => a + Number(l.amount || 0), 0)

  return (
    <section id="payments" className="mt-6 rounded-2xl border border-line bg-card p-6">
      <p className="font-fraunces text-xl font-semibold text-ink">Payments</p>
      {lines.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">No payment schedule yet.</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-line">
            {lines.map((l) => {
              const isPaid = l.status === 'paid'
              const isOver = !isPaid && !!l.due_date && l.due_date < today
              const sentToday = !!l.requested_at && new Date(l.requested_at).toDateString() === new Date().toDateString()
              const note = isPaid
                ? 'Paid' + (l.paid_at ? ' ' + new Date(l.paid_at).toLocaleDateString() : '') + (l.method ? ' · ' + l.method : '')
                : l.sent_by_couple ? 'Client says they sent it. Confirm in the app.'
                : isOver ? 'Overdue since ' + dateOnly(l.due_date as string)
                : l.due_date ? 'Due ' + dateOnly(l.due_date) : 'Unpaid'
              return (
                <li key={l.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{l.label || 'Payment'}</span>
                      <span className={'block text-xs ' + (isOver ? 'text-red-700' : 'text-ink-soft')}>{note}</span>
                    </span>
                    <span className={isPaid ? 'text-emerald-700' : 'text-ink'}>{money(l.amount)}</span>
                  </div>
                  {!isPaid && (
                    <div className="mt-2 flex items-center gap-3">
                      <button type="button" disabled={busy === l.id || sentToday} onClick={() => remind(l)}
                        className="rounded-full border border-line px-4 py-1.5 text-xs text-ink disabled:opacity-50">
                        {busy === l.id ? 'Sending...' : 'Send payment reminder'}
                      </button>
                      {l.requested_at && (
                        <span className="text-xs text-ink-soft">Last reminder {new Date(l.requested_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
            <span className="text-ink-soft">Paid {money(paidTotal)}</span>
            <span className="text-ink-soft">Total {money(total)}</span>
          </div>
        </>
      )}
      {msg && <p className="mt-3 text-xs text-ink-soft">{msg}</p>}
    </section>
  )
}
