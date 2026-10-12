'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Msg = {
  id: string
  sender_id: string
  sender_name: string | null
  sender_is_master: boolean
  body: string
  created_at: string
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function TeamChat({ userId, isMaster }: { userId: string; isMaster: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    const client = supabase
    if (!client) return
    const { data, error: err } = await client.rpc('aff_get_team_messages', { p_limit: 100 })
    if (err) { setError(err.message); return }
    setError(null)
    setMsgs(((data ?? []) as Msg[]).slice().reverse())
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [msgs.length])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const client = supabase
    const body = text.trim()
    if (!client || !body || sending) return
    setSending(true)
    const { error: err } = await client.rpc('aff_post_team_message', { p_body: body })
    setSending(false)
    if (err) { setError(err.message); return }
    setText('')
    load()
  }

  async function remove(id: string) {
    const client = supabase
    if (!client) return
    if (!window.confirm('Delete this message?')) return
    await client.rpc('aff_delete_team_message', { p_id: id })
    load()
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-6">
      <p className="text-sm font-medium text-ink">Team chat</p>
      <p className="text-xs text-ink-soft mt-0.5">Everyone on the team can see this.</p>

      <div ref={listRef} className="mt-4 h-80 overflow-y-auto rounded-xl bg-paper p-4 space-y-3">
        {msgs.length === 0 ? (
          <p className="text-sm text-ink-soft">No messages yet. Say hi to the team.</p>
        ) : (
          msgs.map((m) => {
            const mine = m.sender_id === userId
            return (
              <div key={m.id} className={mine ? 'flex flex-col items-end' : 'flex flex-col items-start'}>
                <p className="text-[11px] text-ink-soft mb-0.5">
                  {mine ? 'You' : m.sender_name || 'Affiliate'}
                  {m.sender_is_master ? ' · Master' : ''} · {when(m.created_at)}
                </p>
                <div
                  className={
                    mine
                      ? 'max-w-[85%] rounded-2xl rounded-br-md px-4 py-2 text-sm text-white whitespace-pre-wrap'
                      : 'max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-card px-4 py-2 text-sm text-ink whitespace-pre-wrap'
                  }
                  style={mine ? { backgroundColor: '#3A4A6B' } : undefined}
                >
                  {m.body}
                </div>
                {(mine || isMaster) && (
                  <button onClick={() => remove(m.id)} className="mt-0.5 text-[11px] text-ink-soft hover:text-ink">
                    Delete
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={send} className="mt-4 flex gap-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Write a message to the team…"
          className="flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: '#3A4A6B' }}
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </section>
  )
}
