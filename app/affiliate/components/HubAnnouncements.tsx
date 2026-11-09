'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar, fetchAvatars } from './Avatar'

type Ann = { id: string; kind: string; title: string | null; body: string; author_id: string; author_name: string; created_at: string }

const ROSE = '#3A4A6B'
const field = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-[#3A4A6B]/25 focus:border-[#3A4A6B]'

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function HubAnnouncements({ client, admin }: { client: SupabaseClient | null; uid: string; admin: boolean }) {
  const [items, setItems] = useState<Ann[]>([])
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [kind, setKind] = useState<'announcement' | 'shoutout'>('announcement')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!client) return
    const { data } = await client.from('hub_announcements').select('*').order('created_at', { ascending: false }).limit(8)
    const list = (data ?? []) as Ann[]
    setItems(list)
    setAvatars(await fetchAvatars(client, Array.from(new Set(list.map((x) => x.author_id)))))
  }, [client])

  useEffect(() => { load() }, [load])

  async function post() {
    if (!client || !body.trim()) return
    setBusy(true)
    setErr(null)
    const { error } = await client.from('hub_announcements').insert({ kind, title: title.trim() || null, body: body.trim() })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setTitle('')
    setBody('')
    load()
  }

  async function remove(a: Ann) {
    if (!client || !window.confirm('Delete this?')) return
    await client.from('hub_announcements').delete().eq('id', a.id)
    load()
  }

  if (!admin && items.length === 0) return null

  return (
    <section className="space-y-3">
      {admin && (
        <div className="max-w-2xl rounded-2xl border border-line bg-card p-5">
          <p className="mb-3 font-fraunces text-lg font-semibold text-ink">Post to the whole team</p>
          <div className="mb-3 flex gap-2 text-sm">
            {([['announcement', 'Announcement'], ['shoutout', 'Shoutout']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-full border px-4 py-1.5 transition ${kind === k ? 'text-white' : 'border-line text-ink hover:border-[#3A4A6B]'}`} style={kind === k ? { backgroundColor: ROSE, borderColor: ROSE } : undefined}>
                {label}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={kind === 'shoutout' ? 'Who are you celebrating? (optional)' : 'Title (optional)'} className={field} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder={kind === 'shoutout' ? 'What did they do?' : 'What does the team need to know?'} className={`${field} mt-3`} />
          {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
          <div className="mt-3 flex justify-end">
            <button onClick={post} disabled={busy || !body.trim()} className="rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ROSE }}>
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((a) => {
          const shout = a.kind === 'shoutout'
          return (
            <article key={a.id} className="rounded-2xl border p-5" style={shout ? { background: 'linear-gradient(135deg, #F4F6FA 0%, #DCE3F0 100%)', borderColor: ROSE } : { backgroundColor: '#fff', borderColor: ROSE }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar url={avatars[a.author_id]} name={a.author_name} size={32} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: ROSE }}>{shout ? 'Shoutout' : 'Announcement'}</p>
                    <p className="text-xs text-ink-soft">{a.author_name} · {ago(a.created_at)}</p>
                  </div>
                </div>
                {admin && <button onClick={() => remove(a)} className="text-xs text-ink-soft hover:text-red-700">Delete</button>}
              </div>
              {a.title && <p className="mt-3 font-fraunces text-xl font-semibold text-ink">{a.title}</p>}
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{a.body}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}
