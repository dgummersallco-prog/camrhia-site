'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

const card = 'rounded-2xl border border-line bg-card p-5'

export default function MyAccountPage() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace('/login?next=/my/account'); return }
      setUid(sess.session.user.id)
      setEmail(sess.session.user.email ?? '')
      const { data } = await sb.from('profiles').select('display_name').eq('id', sess.session.user.id).maybeSingle()
      setName(((data as { display_name?: string | null } | null)?.display_name) ?? '')
      setReady(true)
    }
    load()
  }, [router])

  async function saveName() {
    const sb = supabase
    if (!sb || !uid) return
    setSaving(true)
    setError(null)
    const { error: e } = await sb.from('profiles').update({ display_name: name.trim() || null }).eq('id', uid)
    setSaving(false)
    if (e) { setError(e.message); return }
    setNote('Saved.')
    setTimeout(() => setNote(null), 3000)
  }

  async function signOut() {
    await supabase?.auth.signOut()
    router.replace('/login')
  }

  async function deleteAccount() {
    const sb = supabase
    if (!sb) return
    if (!window.confirm('Delete your account? This removes your account and cannot be undone.')) return
    if (!window.confirm('Are you sure? Your sessions and messages will no longer be accessible to you.')) return
    const { error: e } = await sb.rpc('delete_my_account')
    if (e) { setError(e.message); return }
    await sb.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <ClientHeader active="account" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Account</p>
        <h1 className="font-fraunces text-3xl font-semibold text-ink md:text-4xl">Your account</h1>
        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="mt-8 space-y-6">
            <section className={card}>
              <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Your details</p>
              <label className="mb-1 block text-xs uppercase tracking-wider text-ink-soft">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
              />
              <label className="mb-1 mt-4 block text-xs uppercase tracking-wider text-ink-soft">Email</label>
              <p className="text-sm text-ink">{email}</p>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" disabled={saving} onClick={saveName} className="rounded-full bg-twilight px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
                {note && <span className="text-sm text-twilight">{note}</span>}
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </section>

            <section className={card}>
              <p className="mb-1 font-fraunces text-xl font-semibold text-ink">Payments</p>
              <p className="mb-3 text-sm text-ink-soft">See what you've paid, what's still due, and your receipts.</p>
              <a href="/my/payments" className="inline-block rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:border-twilight">View payments</a>
            </section>

            <section className={card}>
              <p className="mb-1 font-fraunces text-xl font-semibold text-ink">Camrhia app</p>
              <p className="text-sm text-ink-soft">Get notifications and manage your sessions on your phone. Sign in with the same email and password.</p>
            </section>

            <section className={card}>
              <button type="button" onClick={signOut} className="rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:border-twilight">Sign out</button>
              <p className="mb-1 mt-6 text-sm font-semibold text-ink">Delete account</p>
              <p className="mb-3 text-sm text-ink-soft">This removes your account. It cannot be undone.</p>
              <button type="button" onClick={deleteAccount} className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">Delete my account</button>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
