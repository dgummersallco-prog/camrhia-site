'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Msg = { id: string; sender_id: string; body: string; created_at: string; message_type: string | null }

const SPECIAL: Record<string, string> = {
  packages: 'Shared pricing packages',
  package_selected: 'Selected a package',
  package_change: 'Updated the package',
  questionnaire: 'Sent a questionnaire',
}

export default function ClientInquiryThread() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [studio, setStudio] = useState('Your photographer')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(0)

  const fetchThread = useCallback(async (userId: string) => {
    const sb = supabase
    if (!sb) return
    const { data, error: e } = await sb
      .from('inquiry_messages')
      .select('id, sender_id, body, created_at, message_type')
      .eq('inquiry_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (e) { setError('Could not load messages.'); return }
    setMsgs((data ?? []) as Msg[])
    await sb.from('thread_reads').delete().eq('user_id', userId).eq('inquiry_id', id)
    await sb.from('thread_reads').insert({ user_id: userId, inquiry_id: id, read_at: new Date().toISOString() })
    window.dispatchEvent(new Event('camrhia-unread'))
  }, [id])

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get('s')
    if (s) setStudio(s)
    let timer: ReturnType<typeof setInterval> | undefined
    async function start() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace(`/login?next=/my/inquiry/${id}`); return }
      const userId = sess.session.user.id
      setUid(userId)
      fetchThread(userId)
      timer = setInterval(() => fetchThread(userId), 8000)
    }
    start()
    return () => { if (timer) clearInterval(timer) }
  }, [id, router, fetchThread])

  useEffect(() => {
    if (msgs.length !== lastCount.current) {
      lastCount.current = msgs.length
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [msgs])

  async function send() {
    const body = text.trim()
    const sb = supabase
    if (!body || !sb || !uid || sending) return
    setSending(true)
    setError(null)
    const { error: e } = await sb.rpc('client_send_inquiry_message', { p_inquiry_id: id, p_body: body })
    setSending(false)
    if (e) { setError('Message did not send. Try again.'); return }
    setText('')
    fetchThread(uid)
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper xl:pl-60">
      <div className="print:hidden"><ClientHeader active="messages" /></div>
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
          <a href="/my" className="text-sm text-ink-soft underline hover:text-ink">Back</a>
          <h1 className="font-fraunces text-lg font-semibold text-ink">{studio}</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 space-y-3 px-6 py-6">
        {msgs.length === 0 && <p className="text-sm text-ink-soft">No messages yet.</p>}
        {msgs.map((m) => {
          const mine = m.sender_id === uid
          const special = m.message_type && SPECIAL[m.message_type]
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-twilight text-white' : 'border border-line bg-card text-ink'}`}>
                {special ? (
                  <p className="italic">{special}. Open the Camrhia app to view and respond.</p>
                ) : (
                  <p className="whitespace-pre-wrap">{m.body}</p>
                )}
                <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-ink-soft'}`}>
                  {new Date(m.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </main>

      <footer className="sticky bottom-0 border-t border-line bg-card">
        <div className="mx-auto flex max-w-2xl items-end gap-3 px-6 py-3">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Write a message"
            className="max-h-32 flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
          />
          <button onClick={send} disabled={sending || !text.trim()} className="rounded-full bg-twilight px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
            Send
          </button>
        </div>
        {error && <p className="px-6 pb-3 text-center text-xs text-red-600">{error}</p>}
      </footer>
    </div>
  )
}
