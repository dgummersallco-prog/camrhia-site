'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Member = { id: string; member_id: string | null; invited_email: string | null; role: string; status: string; hourly_rate: number | null; requested_role: string | null; pay_type: string | null; per_shoot_rate: number | null; title: string | null }
type Prof = { id: string; display_name: string | null; email: string; phone: string | null; avatar_path: string | null }
const ROLE_LABEL: Record<string, string> = { admin: 'Admin', photographer: 'Photographer', assistant: 'Assistant' }

const input = 'w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-twilight'
const btn = 'rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'
const btnGhost = 'rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink disabled:opacity-50'

function MemberRow({ m, prof, roles, onAct }: { m: Member; prof?: Prof; roles: string[]; onAct: (name: string, args: Record<string, unknown>, ok: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState(m.role)
  const [title, setTitle] = useState(m.title ?? '')
  const [payType, setPayType] = useState(m.pay_type === 'per_shoot' ? 'per_shoot' : 'hourly')
  const [hourly, setHourly] = useState(m.hourly_rate != null ? String(m.hourly_rate) : '')
  const [perShoot, setPerShoot] = useState(m.per_shoot_rate != null ? String(m.per_shoot_rate) : '')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const name = prof?.display_name || prof?.email || m.invited_email || 'Team member'
  const pay = payType === 'per_shoot' ? (m.per_shoot_rate != null ? '$' + m.per_shoot_rate + ' per shoot' : 'No rate set') : (m.hourly_rate != null ? '$' + m.hourly_rate + ' per hour' : 'No rate set')
  return (
    <div className="rounded-xl border border-line bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{name}</span>
          <span className="block truncate text-xs text-ink-soft">{prof?.email ?? m.invited_email}{m.title ? ' · ' + m.title : ''} · {pay}</span>
        </span>
        <span className="shrink-0 rounded-full bg-blush-wash px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-twilight">{ROLE_LABEL[m.role] ?? m.role}</span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink">Role</label>
            <div className="flex gap-2">
              <select className={input} value={role} onChange={(e) => setRole(e.target.value)}>
                {Array.from(new Set([m.role, ...roles])).map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
              </select>
              <button type="button" className={btnGhost} disabled={role === m.role} onClick={() => onAct('update_studio_member_role', { p_member_row_id: m.id, p_new_role: role }, 'Role updated.')}>Save</button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink">Title</label>
            <div className="flex gap-2">
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lead photographer" />
              <button type="button" className={btnGhost} onClick={() => onAct('update_studio_member_title', { p_member_row_id: m.id, p_title: title.trim() || null }, 'Title updated.')}>Save</button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink">Pay</label>
            <div className="mb-2 flex gap-2">
              {(['hourly', 'per_shoot'] as const).map((t) => (
                <button key={t} type="button" onClick={() => setPayType(t)} className={'rounded-xl border px-4 py-2 text-sm font-medium ' + (payType === t ? 'border-twilight bg-blush-wash text-twilight' : 'border-line bg-white text-ink-soft')}>{t === 'hourly' ? 'Hourly' : 'Per shoot'}</button>
              ))}
            </div>
            <div className="flex gap-2">
              {payType === 'hourly'
                ? <input className={input} inputMode="decimal" value={hourly} onChange={(e) => setHourly(e.target.value)} placeholder="Hourly rate, e.g. 25" />
                : <input className={input} inputMode="decimal" value={perShoot} onChange={(e) => setPerShoot(e.target.value)} placeholder="Rate per shoot, e.g. 150" />}
              <button type="button" className={btnGhost} onClick={() => onAct('update_studio_member_pay', { p_member_row_id: m.id, p_pay_type: payType, p_hourly_rate: parseFloat(hourly) || null, p_per_shoot_rate: parseFloat(perShoot) || null }, 'Pay updated.')}>Save</button>
            </div>
          </div>
          <div className="pt-1">
            {!confirmRemove
              ? <button type="button" className="text-sm text-red-700 hover:underline" onClick={() => setConfirmRemove(true)}>Remove from team</button>
              : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-ink-soft">They will no longer appear as a team member.</span>
                  <button type="button" className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white" onClick={() => onAct('remove_studio_member', { p_member_row_id: m.id }, 'Member removed.')}>Confirm remove</button>
                  <button type="button" className={btnGhost} onClick={() => setConfirmRemove(false)}>Cancel</button>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeamPage() {
  const router = useRouter()
  const [state, setState] = useState<'loading' | 'locked' | 'ready'>('loading')
  const [viewer, setViewer] = useState<'owner' | 'admin'>('owner')
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [profs, setProfs] = useState<Record<string, Prof>>({})
  const [code, setCode] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [approveRole, setApproveRole] = useState<Record<string, string>>({})

  const fetchTeam = useCallback(async (oid: string) => {
    const sb = supabase!
    const { data: rows } = await sb.from('studio_members')
      .select('id, member_id, invited_email, role, status, hourly_rate, requested_role, pay_type, per_shoot_rate, title')
      .eq('studio_owner_id', oid).order('created_at', { ascending: true })
    setMembers((rows ?? []) as unknown as Member[])
    const { data: tp } = await sb.rpc('get_studio_team_profiles', { p_owner_id: oid })
    const map: Record<string, Prof> = {}
    for (const p of (tp ?? []) as Prof[]) map[p.id] = p
    setProfs(map)
    const { data: c } = await sb.from('studio_codes').select('code').eq('studio_owner_id', oid).maybeSingle()
    setCode((c as { code?: string } | null)?.code ?? null)
  }, [])

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push('/login'); return }
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.push('/login'); return }
      const uid = data.session.user.id
      const [{ data: prof }, { data: mem }] = await Promise.all([
        supabase.from('profiles').select('plan_tier').eq('id', uid).maybeSingle(),
        supabase.from('studio_members').select('studio_owner_id, role').eq('member_id', uid).eq('status', 'active').maybeSingle(),
      ])
      let oid: string | null = null
      if ((mem as { role?: string } | null)?.role === 'admin') { oid = (mem as { studio_owner_id: string }).studio_owner_id; setViewer('admin') }
      else if ((prof as { plan_tier?: string } | null)?.plan_tier === 'studio') { oid = uid; setViewer('owner') }
      if (!oid) { setState('locked'); return }
      setOwnerId(oid)
      await fetchTeam(oid)
      setState('ready')
    }
    load()
  }, [router, fetchTeam])

  async function act(name: string, args: Record<string, unknown>, ok: string): Promise<boolean> {
    setMsg(null)
    const { data, error } = await supabase!.rpc(name, args)
    if (error || !data?.success) {
      setMsg({ ok: false, text: data?.error ?? error?.message ?? 'Something went wrong.' })
      return false
    }
    setMsg({ ok: true, text: ok })
    if (ownerId) await fetchTeam(ownerId)
    return true
  }

  const roles = viewer === 'owner' ? ['photographer', 'assistant', 'admin'] : ['photographer', 'assistant']
  const pending = members.filter((m) => m.status === 'pending')
  const active = members.filter((m) => m.status === 'active')

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="team" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Team</h1>
        {state === 'loading' && <p className="mt-8 text-sm text-ink-soft">Loading…</p>}
        {state === 'locked' && (
          <section className="mt-8 rounded-2xl border border-line bg-card p-6">
            <h2 className="font-fraunces text-lg font-semibold text-ink">Team is part of the Studio plan</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">Add photographers and assistants, assign sessions, and track hourly or per-shoot pay.</p>
            <Link href="/billing" className={btn + ' mt-5 inline-block'}>See the Studio plan</Link>
          </section>
        )}
        {state === 'ready' && (
          <div className="mt-8 space-y-6">
            {msg && <p className={'rounded-xl px-4 py-3 text-sm ' + (msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{msg.text}</p>}

            {code && (
              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="font-fraunces text-lg font-semibold text-ink">Your team code</h2>
                <p className="mt-1 text-sm text-ink-soft">Share this with people joining your studio. You approve each request below.</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="rounded-xl bg-blush-wash px-5 py-3 font-mono text-lg font-semibold tracking-[0.2em] text-twilight">{code}</span>
                  <button type="button" className={btnGhost} onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? 'Copied' : 'Copy'}</button>
                </div>
              </section>
            )}

            {pending.length > 0 && (
              <section className="rounded-2xl border border-line bg-card p-6">
                <h2 className="font-fraunces text-lg font-semibold text-ink">Requests to join</h2>
                <div className="mt-4 space-y-3">
                  {pending.map((m) => {
                    const p = m.member_id ? profs[m.member_id] : undefined
                    const r = approveRole[m.id] ?? (m.requested_role && roles.includes(m.requested_role) ? m.requested_role : 'photographer')
                    return (
                      <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink">{p?.display_name || p?.email || m.invited_email || 'New request'}</span>
                          <span className="block truncate text-xs text-ink-soft">{p?.email ?? m.invited_email}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <select className="rounded-xl border border-line bg-white px-3 py-2 text-sm" value={r} onChange={(e) => setApproveRole({ ...approveRole, [m.id]: e.target.value })}>
                            {roles.map((x) => <option key={x} value={x}>{ROLE_LABEL[x]}</option>)}
                          </select>
                          <button type="button" className={btn} onClick={() => act('approve_studio_member', { p_member_row_id: m.id, p_role: r }, 'Member approved.')}>Approve</button>
                          <button type="button" className={btnGhost} onClick={() => act('deny_studio_member', { p_member_row_id: m.id }, 'Request removed.')}>Deny</button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-line bg-card p-6">
              <h2 className="font-fraunces text-lg font-semibold text-ink">Your team</h2>
              {active.length === 0
                ? <p className="mt-3 text-sm text-ink-soft">No team members yet. Share your team code to add people.</p>
                : <div className="mt-4 space-y-3">{active.map((m) => <MemberRow key={m.id + m.role + (m.title ?? '') + (m.pay_type ?? '') + (m.hourly_rate ?? '') + (m.per_shoot_rate ?? '')} m={m} prof={m.member_id ? profs[m.member_id] : undefined} roles={roles} onAct={act} />)}</div>}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
