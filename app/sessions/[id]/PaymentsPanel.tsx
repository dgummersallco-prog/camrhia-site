"use client"

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Line = {
  id: string; label: string | null; amount: number; due_date: string | null
  status: string | null; paid_at: string | null; method: string | null
  sent_by_couple: boolean | null; requested_at: string | null
  note: string | null; sort_order: number | null
}
type Form = { id: string | null; label: string; amount: string; due: string; note: string }

const money = (n: number) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateOnly = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const METHODS = ['Cash', 'Check', 'Zelle', 'Venmo', 'PayPal', 'Card', 'Other']

const inCls = 'w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25'
const lbl = 'mb-1 block text-xs uppercase tracking-wider text-ink-soft'
const ghost = 'rounded-full border border-line px-4 py-1.5 text-xs text-ink hover:bg-paper-deep disabled:opacity-50'

export function PaymentsPanel({ weddingId, w }: { weddingId: string; w: Record<string, any> }) {
  const [lines, setLines] = useState<Line[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [markId, setMarkId] = useState<string | null>(null)
  const [markMethod, setMarkMethod] = useState('')
  const [delId, setDelId] = useState<string | null>(null)
  const today = ymd(new Date())

  const load = useCallback(async (): Promise<Line[]> => {
    const sb = supabase
    if (!sb) return []
    const { data } = await sb
      .from('payment_schedule')
      .select('id, label, amount, due_date, status, paid_at, method, sent_by_couple, requested_at, note, sort_order')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })
    const rows = (data ?? []) as Line[]
    setLines(rows)
    setLoaded(true)
    return rows
  }, [weddingId])

  useEffect(() => { load() }, [load])

  async function ownerId(): Promise<string | null> {
    const sb = supabase
    if (!sb) return null
    if (w.owner_id) return w.owner_id as string
    const { data } = await sb.auth.getSession()
    return data.session?.user.id ?? null
  }

  async function syncBalance(rows: Line[]) {
    const sb = supabase
    if (!sb) return
    const paid = rows.filter((l) => l.status === 'paid').reduce((a, l) => a + Number(l.amount || 0), 0)
    const total = rows.reduce((a, l) => a + Number(l.amount || 0), 0)
    const rem = total - paid
    await sb.from('weddings').update({ balance: rem > 0 ? `$${Math.round(rem).toLocaleString()}` : null }).eq('id', weddingId)
  }

  async function afterChange() {
    const rows = await load()
    await syncBalance(rows)
  }

  async function quickSetup() {
    const sb = supabase
    if (!sb) return
    const owner = await ownerId()
    if (!owner) { setMsg('Could not tell who you are. Reload and try again.'); return }
    setBusy('setup'); setMsg(null)
    const total = Number(w.total_price) || 0
    const retainer = Math.round(total * 0.3)
    const balance = total - retainer
    let balDue: string | null = null
    if (w.wedding_date) {
      const d = new Date(String(w.wedding_date) + 'T00:00:00')
      d.setDate(d.getDate() - 30)
      balDue = ymd(d)
    }
    const { error } = await sb.from('payment_schedule').insert([
      { wedding_id: weddingId, owner_id: owner, label: 'Booking payment', amount: retainer, due_date: today, status: 'unpaid', sort_order: 0, note: total > 0 ? 'Holds your date · applied to your total · non-refundable' : null },
      { wedding_id: weddingId, owner_id: owner, label: 'Balance', amount: balance, due_date: balDue, status: 'unpaid', sort_order: 1 },
    ])
    if (error) { setBusy(null); setMsg(error.message); return }
    await sb.from('weddings').update({ payments_seeded: true }).eq('id', weddingId)
    await afterChange()
    setBusy(null)
    setMsg(total > 0 ? 'Schedule created. Edit any amount or date you like.' : 'Schedule created with $0. Set the session total in Details, or edit the amounts here.')
  }

  function openAdd() {
    setMarkId(null); setDelId(null)
    setForm({ id: null, label: '', amount: '', due: '', note: '' })
  }
  function openEdit(l: Line) {
    setMarkId(null); setDelId(null)
    setForm({ id: l.id, label: l.label ?? '', amount: l.amount > 0 ? String(l.amount) : '', due: l.due_date ?? '', note: l.note ?? '' })
  }

  async function saveForm() {
    const sb = supabase
    if (!sb || !form) return
    if (!form.label.trim()) { setMsg('Give the payment a name.'); return }
    const amount = Math.abs(parseFloat(form.amount.replace(/[^0-9.]/g, '')) || 0)
    setBusy('form'); setMsg(null)
    if (form.id) {
      const { error } = await sb.from('payment_schedule').update({
        label: form.label.trim(), amount, due_date: form.due || null, note: form.note.trim() || null,
      }).eq('id', form.id)
      if (error) { setBusy(null); setMsg(error.message); return }
    } else {
      const owner = await ownerId()
      if (!owner) { setBusy(null); setMsg('Could not tell who you are. Reload and try again.'); return }
      const maxOrder = lines.length > 0 ? Math.max(...lines.map((l) => l.sort_order ?? 0)) + 1 : 0
      const { error } = await sb.from('payment_schedule').insert({
        wedding_id: weddingId, owner_id: owner, label: form.label.trim(), amount,
        due_date: form.due || null, note: form.note.trim() || null, status: 'unpaid', sort_order: maxOrder,
      })
      if (error) { setBusy(null); setMsg(error.message); return }
      await sb.from('weddings').update({ payments_seeded: true }).eq('id', weddingId)
    }
    await afterChange()
    setBusy(null)
    setForm(null)
  }

  async function confirmPaid(l: Line) {
    const sb = supabase
    if (!sb) return
    setBusy(l.id); setMsg(null)
    const { error } = await sb.from('payment_schedule').update({
      status: 'paid', paid_at: new Date().toISOString(), method: markMethod || null,
    }).eq('id', l.id)
    if (error) { setBusy(null); setMsg(error.message); return }
    await afterChange()
    setBusy(null)
    setMarkId(null)
    setMarkMethod('')
  }

  async function removeLine(l: Line) {
    const sb = supabase
    if (!sb) return
    setBusy(l.id); setMsg(null)
    const { error } = await sb.from('payment_schedule').delete().eq('id', l.id)
    if (error) { setBusy(null); setMsg(error.message); return }
    await afterChange()
    setBusy(null)
    setDelId(null)
  }

  async function resolveReport(l: Line, confirm: boolean) {
    const sb = supabase
    if (!sb) return
    setBusy(l.id); setMsg(null)
    const { error } = await sb.rpc('resolve_payment_report', { p_line_id: l.id, p_confirm: confirm })
    if (error) { setBusy(null); setMsg(error.message); return }
    await afterChange()
    setBusy(null)
  }

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
  const remaining = Math.max(0, total - paidTotal)

  const formCard = form && (
    <div className="mt-3 rounded-2xl border border-twilight bg-paper p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={lbl}>Name</label>
          <input className={inCls} value={form.label} placeholder="Deposit, Second payment, Balance…" onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Amount</label>
          <div className="flex items-center gap-2">
            <span className="text-ink-soft">$</span>
            <input className={inCls} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={lbl}>Due date (optional)</label>
          <input type="date" className={inCls} value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className={lbl}>Note (optional)</label>
          <input className={inCls} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy === 'form'} onClick={saveForm} className="rounded-full bg-twilight px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy === 'form' ? 'Saving…' : form.id ? 'Save changes' : 'Add payment'}
        </button>
        <button type="button" onClick={() => setForm(null)} className="rounded-full border border-line px-5 py-2 text-sm text-ink">Cancel</button>
      </div>
    </div>
  )

  return (
    <section id="payments" className="mt-6 rounded-2xl border border-line bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-fraunces text-xl font-semibold text-ink">Payments</p>
        {!form && <button type="button" onClick={openAdd} className="text-sm text-twilight hover:underline">+ Add payment</button>}
      </div>

      {loaded && lines.length === 0 && !form && (
        <div className="mt-2">
          <p className="text-sm text-ink-soft">No payment schedule yet.</p>
          <button type="button" disabled={busy === 'setup'} onClick={quickSetup} className="mt-3 rounded-full bg-twilight px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy === 'setup' ? 'Setting up…' : 'Set up booking payment + balance'}
          </button>
          <p className="mt-2 text-xs text-ink-soft">30% booking payment due today, the rest due 30 days before the session. You can change any of it.</p>
        </div>
      )}

      {form && !form.id && formCard}

      {lines.length > 0 && (
        <>
          <ul className="mt-2 divide-y divide-line">
            {lines.map((l) => {
              const isPaid = l.status === 'paid'
              const isOver = !isPaid && !!l.due_date && l.due_date < today
              const sentToday = !!l.requested_at && new Date(l.requested_at).toDateString() === new Date().toDateString()
              const note = isPaid
                ? 'Paid' + (l.paid_at ? ' ' + new Date(l.paid_at).toLocaleDateString() : '') + (l.method ? ' · ' + l.method : '')
                : l.sent_by_couple ? 'Client says they sent it' + (l.method ? ' · ' + l.method : '') + '. Confirm once you have it.'
                : isOver ? 'Overdue since ' + dateOnly(l.due_date as string)
                : l.due_date ? 'Due ' + dateOnly(l.due_date) : 'Unpaid'
              if (form?.id === l.id) return <li key={l.id}>{formCard}</li>
              return (
                <li key={l.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-ink">{l.label || 'Payment'}</span>
                      <span className={'block text-xs ' + (isOver ? 'text-red-700' : 'text-ink-soft')}>{note}</span>
                    </span>
                    <span className={isPaid ? 'text-emerald-700' : 'text-ink'}>{money(l.amount)}</span>
                  </div>

                  {markId === l.id ? (
                    <div className="mt-2 rounded-xl border border-line bg-paper p-3">
                      <p className="mb-2 text-xs text-ink-soft">How did they pay?</p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {METHODS.map((m) => (
                          <button key={m} type="button" onClick={() => setMarkMethod(m)}
                            className={`rounded-full border px-3.5 py-1 text-xs transition ${markMethod === m ? 'border-twilight bg-blush-wash text-twilight' : 'border-line text-ink hover:border-twilight'}`}>{m}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={busy === l.id} onClick={() => confirmPaid(l)} className="rounded-full bg-twilight px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                          {busy === l.id ? 'Saving…' : 'Mark paid'}
                        </button>
                        <button type="button" onClick={() => { setMarkId(null); setMarkMethod('') }} className={ghost}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {!isPaid && l.sent_by_couple && (
                        <>
                          <button type="button" disabled={busy === l.id} onClick={() => resolveReport(l, true)} className="rounded-full bg-twilight px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50">Confirm received</button>
                          <button type="button" disabled={busy === l.id} onClick={() => resolveReport(l, false)} className={ghost}>Not received</button>
                        </>
                      )}
                      {!isPaid && !l.sent_by_couple && (
                        <button type="button" onClick={() => { setMarkId(l.id); setMarkMethod(''); setDelId(null) }} className="rounded-full bg-twilight px-4 py-1.5 text-xs font-medium text-white">Mark paid</button>
                      )}
                      {!isPaid && (
                        <button type="button" disabled={busy === l.id || sentToday} onClick={() => remind(l)} className={ghost}>
                          {busy === l.id ? 'Sending...' : 'Send payment reminder'}
                        </button>
                      )}
                      <button type="button" onClick={() => openEdit(l)} className={ghost}>Edit</button>
                      {delId === l.id ? (
                        <span className="flex items-center gap-2 text-xs text-ink-soft">
                          Delete this payment?
                          <button type="button" disabled={busy === l.id} onClick={() => removeLine(l)} className="text-red-700 hover:underline">Yes, delete</button>
                          <button type="button" onClick={() => setDelId(null)} className="hover:underline">No</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => { setDelId(l.id); setMarkId(null) }} className="text-xs text-ink-soft hover:text-red-700">Delete</button>
                      )}
                      {!isPaid && l.requested_at && (
                        <span className="text-xs text-ink-soft">Last reminder {new Date(l.requested_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-sm">
            <span className="text-ink-soft">Paid {money(paidTotal)}</span>
            <span className="text-ink-soft">Remaining {money(remaining)}</span>
            <span className="text-ink-soft">Total {money(total)}</span>
          </div>
        </>
      )}
      {msg && <p className="mt-3 text-xs text-ink-soft">{msg}</p>}
    </section>
  )
}
