'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'

type Kind = { key: string; label: string; when: string; body: string }

const KINDS: Kind[] = [
  { key: 'pre_session', label: 'Before the session', when: 'Up to 3 days before the session', body: 'Your session with {studio} is on {date}. Tap for your timeline.' },
  { key: 'gallery_expiring', label: 'Gallery closing soon', when: '7 days before the gallery expires', body: 'Your gallery closes on {date}. Download your favorites before then.' },
  { key: 'gallery_unopened', label: 'Gallery not opened', when: '5 days after you send it, if it has not been opened', body: 'Your photos from {studio} are ready whenever you are. Tap to view your gallery.' },
  { key: 'review_request', label: 'Review request', when: '5 days after delivery, once they have opened the gallery', body: 'Loved your photos? Leave {studio} a quick review.' },
  { key: 'rebook_annual', label: 'Yearly photos', when: '11 months after family, headshot and branding sessions', body: "It's almost time for this year's photos with {studio}. Tap to get on the calendar." },
  { key: 'holiday', label: 'Holiday photos', when: 'Early September, to clients from the last 2 years', body: 'Holiday photos are booking up. Reserve your spot with {studio}.' },
  { key: 'anniversary', label: 'Wedding anniversary', when: '2 weeks before their anniversary', body: "Your anniversary is coming up. Celebrate with a couple's session with {studio}?" },
  { key: 'newborn_milestone', label: 'Newborn milestones', when: 'At 3, 6 and 12 months after a newborn session', body: 'Baby is 3 months old! Time for new photos with {studio}?' },
  { key: 'maternity_to_newborn', label: 'Maternity to newborn', when: '6 months after a maternity session', body: 'Congratulations! Ready to book newborn photos with {studio}?' },
]

type Setting = { enabled: boolean; custom: string }

const card = 'rounded-2xl border border-line bg-card p-5'

export default function RemindersPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [studio, setStudio] = useState('Your Studio')
  const [settings, setSettings] = useState<Record<string, Setting>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/reminders'); return }
      const id = sess.session.user.id
      setUid(id)
      const since = new Date(Date.now() - 90 * 86400000).toISOString()
      const [prof, rs, log] = await Promise.all([
        sb.from('profiles').select('studio_name, display_name').eq('id', id).single(),
        sb.from('reminder_settings').select('kind, enabled, custom_body').eq('owner_id', id),
        sb.from('reminder_log').select('kind').eq('owner_id', id).gte('created_at', since).limit(5000),
      ])
      if (prof.data) setStudio((prof.data.studio_name as string) || (prof.data.display_name as string) || 'Your Studio')
      const map: Record<string, Setting> = {}
      const dr: Record<string, string> = {}
      ;((rs.data ?? []) as { kind: string; enabled: boolean; custom_body: string | null }[]).forEach((r) => {
        map[r.kind] = { enabled: r.enabled, custom: r.custom_body ?? '' }
        dr[r.kind] = r.custom_body ?? ''
      })
      setSettings(map)
      setDrafts(dr)
      const counts: Record<string, number> = {}
      ;((log.data ?? []) as { kind: string }[]).forEach((r) => { counts[r.kind] = (counts[r.kind] ?? 0) + 1 })
      setSent(counts)
      setReady(true)
    }
    load()
  }, [router])

  function flash(t: string) {
    setMessage(t)
    setTimeout(() => setMessage((m) => (m === t ? null : m)), 2000)
  }

  async function persist(key: string, patch: Partial<Setting>) {
    const sb = supabase
    if (!sb || !uid) return
    const cur = settings[key] ?? { enabled: true, custom: '' }
    const next = { ...cur, ...patch }
    setSettings((s) => ({ ...s, [key]: next }))
    const { error } = await sb.from('reminder_settings').upsert(
      {
        owner_id: uid,
        kind: key,
        enabled: next.enabled,
        custom_body: next.custom.trim() ? next.custom.trim() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,kind' },
    )
    if (error) setMessage(error.message)
    else flash('Saved')
  }

  const fill = (text: string) => text.replace(/\{studio\}/g, studio).replace(/\{date\}/g, 'June 14')

  return (
    <div className="min-h-screen bg-paper lg:pl-60">
      <DashboardHeader active="reminders" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Studio</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Client reminders</h1>
        <p className="mt-2 max-w-xl text-ink-soft">
          Camrhia keeps in touch with your clients for you, and brings past clients back to book again. Turn each reminder on or off and make the wording yours.
          Use <code className="rounded bg-line px-1">{'{studio}'}</code> for your studio name and <code className="rounded bg-line px-1">{'{date}'}</code> for the date.
        </p>
        <p className="mt-3 rounded-xl bg-brass/10 px-4 py-3 text-sm text-ink">
          Reminders go to clients who have joined their session in the Camrhia app. They start sending with the next app update.
        </p>
        {message && <p className="mt-4 text-sm text-twilight">{message}</p>}

        {!ready ? (
          <p className="mt-8 text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="mt-8 space-y-4">
            {KINDS.map((k) => {
              const st = settings[k.key] ?? { enabled: true, custom: '' }
              const draft = drafts[k.key] ?? ''
              const shown = st.custom.trim() ? st.custom : k.body
              return (
                <section key={k.key} className={`${card} ${st.enabled ? '' : 'opacity-70'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-fraunces text-lg font-semibold text-ink">{k.label}</p>
                      <p className="text-xs text-ink-soft">{k.when}</p>
                    </div>
                    <label className="flex shrink-0 items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={st.enabled}
                        onChange={(e) => persist(k.key, { enabled: e.target.checked })}
                        className="h-5 w-5"
                      />
                      {st.enabled ? 'On' : 'Off'}
                    </label>
                  </div>

                  <div className="mt-4 rounded-xl bg-paper-deep p-4">
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-ink-soft">What your client sees</p>
                    <p className="text-sm text-ink">{fill(shown)}</p>
                  </div>

                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [k.key]: e.target.value }))}
                    onBlur={() => { if (draft !== st.custom) persist(k.key, { custom: draft }) }}
                    placeholder="Write your own wording (optional)"
                    className="mt-3 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
                    <span>Sent {sent[k.key] ?? 0} time{(sent[k.key] ?? 0) === 1 ? '' : 's'} in the last 90 days</span>
                    {st.custom.trim() && (
                      <button
                        onClick={() => { setDrafts((d) => ({ ...d, [k.key]: '' })); persist(k.key, { custom: '' }) }}
                        className="underline hover:text-ink"
                      >
                        Reset to default
                      </button>
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
