'use client'

import { useEffect, useState } from 'react'
import { supabaseAffiliate as supabase } from '@/lib/supabaseAffiliate'
import AffiliateShell, { type ShellAffiliate } from '../../components/AffiliateShell'

function RecruitBody({ a }: { a: ShellAffiliate }) {
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.rpc('get_my_invite_note').then(({ data }) => {
      if (typeof data === 'string') setNote(data)
    })
  }, [])

  if (!a.is_master) {
    return <p className="text-sm text-ink-soft">Recruiting is for master partners.</p>
  }

  const code = a.team_code || a.referral_code
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://camrhia.com'
  const link = `${origin}/t/${code}`
  const message = `Join my team at Camrhia, the app photographers use to run their whole business. Tap here to join: ${link}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  // Opens the phone's share sheet (Messages, email, WhatsApp...). Falls back to the email app on desktop.
  async function send() {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ text: message })
        return
      }
    } catch {
      return // person closed the share sheet
    }
    window.location.href = `mailto:?subject=${encodeURIComponent('Join my Camrhia team')}&body=${encodeURIComponent(message)}`
  }

  async function saveNote() {
    if (!supabase) return
    const { error } = await supabase.rpc('set_invite_note', { p_note: note })
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const btn = 'rounded-full px-5 py-2 text-sm font-medium'

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-card p-6 sm:p-8">
        <h2 className="font-fraunces text-2xl font-semibold text-ink">Your invite link</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Send it to anyone. They tap it, fill out one short form, and join your team.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <input readOnly value={link} className="flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink" />
          <button onClick={copy} className={`${btn} border border-line text-ink hover:bg-paper`}>
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button onClick={send} className={btn} style={{ backgroundColor: 'var(--aff-fill)', color: '#ffffff' }}>
            Send invite
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6 sm:p-8">
        <h2 className="font-fraunces text-xl font-semibold text-ink">Your personal note</h2>
        <p className="mt-2 text-sm text-ink-soft">
          One line that shows at the top of your invite page, in your name.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 160))}
          rows={2}
          placeholder="I will walk you through your first week."
          className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={saveNote} className={btn} style={{ backgroundColor: 'var(--aff-fill)', color: '#ffffff' }}>
            {saved ? 'Saved' : 'Save note'}
          </button>
          <span className="text-xs text-ink-soft">{note.length}/160</span>
        </div>
      </section>
    </div>
  )
}

export default function RecruitPage() {
  return (
    <AffiliateShell title="Recruit affiliates" subtitle="Build your team. You earn on everything they sell.">
      {(a) => <RecruitBody a={a} />}
    </AffiliateShell>
  )
}
