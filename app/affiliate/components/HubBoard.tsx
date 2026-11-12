'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Avatar, fetchAvatars } from './Avatar'

type Thread = { id: string; author_id: string; author_name: string; body: string; created_at: string; pinned?: boolean }
type Reply = { id: string; thread_id: string; author_id: string; author_name: string; body: string; created_at: string }

const ROSE = 'var(--aff-fill)'
const field = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-[var(--aff-fill)]/25 focus:border-[var(--aff-fill)]'

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function HubBoard({ client, uid, admin }: { client: SupabaseClient | null; uid: string; admin: boolean }) {
  const [threads, setThreads] = useState<Thread[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [body, setBody] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!client) return
    const { data: t } = await client.from('hub_threads').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(100)
    const tl = (t ?? []) as Thread[]
    setThreads(tl)
    let rl: Reply[] = []
    if (tl.length) {
      const { data: r } = await client.from('hub_replies').select('*').in('thread_id', tl.map((x) => x.id)).order('created_at', { ascending: true })
      rl = (r ?? []) as Reply[]
    }
    setReplies(rl)
    setAvatars(await fetchAvatars(client, Array.from(new Set([uid, ...tl.map((x) => x.author_id), ...rl.map((x) => x.author_id)]))))
  }, [client, uid])

  useEffect(() => { load() }, [load])

  async function post() {
    if (!client || !body.trim()) return
    setBusy(true)
    setErr(null)
    const { error } = await client.from('hub_threads').insert({ author_id: uid, body: body.trim() })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setBody('')
    load()
  }

  async function reply(t: Thread) {
    const text = (drafts[t.id] ?? '').trim()
    if (!client || !text) return
    const { error } = await client.from('hub_replies').insert({ thread_id: t.id, author_id: uid, body: text })
    if (error) { setErr(error.message); return }
    setDrafts((d) => ({ ...d, [t.id]: '' }))
    load()
  }

  async function togglePin(t: Thread) {
    if (!client) return
    await client.from('hub_threads').update({ pinned: !t.pinned }).eq('id', t.id)
    load()
  }
  async function removeThread(t: Thread) {
    if (!client || !window.confirm('Delete this message and its replies?')) return
    await client.from('hub_threads').delete().eq('id', t.id)
    load()
  }
  async function removeReply(r: Reply) {
    if (!client) return
    await client.from('hub_replies').delete().eq('id', r.id)
    load()
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex gap-3">
          <Avatar url={avatars[uid]} name="Me" size={40} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder="Ask a question, share what is working, give advice, or pitch an idea…" className={field} />
        </div>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <div className="mt-3 flex justify-end">
          <button onClick={post} disabled={busy || !body.trim()} className="rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ROSE }}>
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      {threads.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <p className="font-fraunces text-lg italic text-ink-soft">No messages yet. Start the conversation.</p>
        </div>
      )}

      {threads.map((t) => {
        const rs = replies.filter((r) => r.thread_id === t.id)
        return (
          <article key={t.id} className="rounded-2xl border border-line bg-card p-5" style={t.pinned ? { borderColor: ROSE } : undefined}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar url={avatars[t.author_id]} name={t.author_name} size={40} />
                <div>
                  <p className="text-sm font-semibold text-ink">{t.author_name}{t.pinned && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: ROSE }}>Pinned</span>}</p>
                  <p className="text-xs text-ink-soft">{ago(t.created_at)}</p>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-ink-soft">
                {admin && <button onClick={() => togglePin(t)} className="hover:text-ink">{t.pinned ? 'Unpin' : 'Pin'}</button>}
                {(admin || t.author_id === uid) && <button onClick={() => removeThread(t)} className="hover:text-red-700">Delete</button>}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{t.body}</p>

            {rs.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {rs.map((r) => (
                  <div key={r.id} className="flex gap-3">
                    <Avatar url={avatars[r.author_id]} name={r.author_name} size={28} />
                    <div className="min-w-0 flex-1 rounded-xl bg-paper-deep px-4 py-3 text-sm">
                      <p className="text-ink"><span className="font-semibold">{r.author_name}</span> <span className="text-xs text-ink-soft">{ago(r.created_at)}</span></p>
                      <p className="mt-1 whitespace-pre-wrap text-ink">{r.body}</p>
                      {(admin || r.author_id === uid) && <button onClick={() => removeReply(r)} className="mt-1 text-xs text-ink-soft hover:text-red-700">Delete</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-3">
              {open[t.id] ? (
                <div className="flex gap-2">
                  <input autoFocus value={drafts[t.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [t.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') reply(t) }} placeholder="Write a reply" maxLength={1000} className={field} />
                  <button onClick={() => reply(t)} className="rounded-full px-5 text-sm font-semibold text-white" style={{ backgroundColor: ROSE }}>Reply</button>
                </div>
              ) : (
                <button onClick={() => setOpen((o) => ({ ...o, [t.id]: true }))} className="text-sm font-semibold" style={{ color: ROSE }}>Reply{rs.length ? ` · ${rs.length}` : ''}</button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
