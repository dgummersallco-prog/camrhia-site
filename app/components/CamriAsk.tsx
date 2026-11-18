'use client'

import { useEffect, useRef, useState } from 'react'

type Msg = { from: 'user' | 'camri'; text: string }
const CHIPS = ['What does the app help me do?', 'Can you help me edit photos?', 'Is the website included?', 'Can clients pay me through the app?', 'What plan is right for me?', 'Does my calendar connect to Apple or Google?']
const LINK = /(\/(?:support|upgrade\/(?:showcase|retouch|cull)|affiliate\/signup|faq))/g

function Text({ t }: { t: string }) {
  return <>{t.split(LINK).map((p, i) => (i % 2 ? <a key={i} href={p} className="underline text-twilight">{p}</a> : <span key={i}>{p}</span>))}</>
}

export default function CamriAsk() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([{ from: 'camri', text: 'Hi, I am Camri! Ask me anything about Camrhia, like what it does, what it costs, or which plan fits you.' }])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy, open])
  useEffect(() => {
    const f = () => setOpen(true)
    window.addEventListener('camri-ask', f)
    return () => window.removeEventListener('camri-ask', f)
  }, [])

  async function send(q: string) {
    const m = q.trim()
    if (!m || busy) return
    const history = msgs.slice(1)
    setMsgs((x) => [...x, { from: 'user', text: m }])
    setText('')
    setBusy(true)
    try {
      const r = await fetch('/api/camri/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: m, history }) })
      const j = await r.json()
      setMsgs((x) => [...x, { from: 'camri', text: j.reply || 'Try asking me again?' }])
    } catch {
      setMsgs((x) => [...x, { from: 'camri', text: 'I could not connect. Please try again, or visit /support.' }])
    }
    setBusy(false)
  }

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-twilight py-2 pl-2 pr-5 text-sm font-medium text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.45)] transition hover:opacity-90">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/camri/13_face_avatar.png" alt="" className="h-10 w-10 rounded-full bg-white object-cover" />
          Ask Camri
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex h-[34rem] max-h-[85vh] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[0_30px_70px_-20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 bg-twilight px-4 py-3 text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/camri/13_face_avatar.png" alt="" className="h-10 w-10 rounded-full bg-white object-cover" />
            <div className="flex-1">
              <p className="font-fraunces text-lg leading-tight">Camri</p>
              <p className="text-xs text-white/75">Ask me about Camrhia</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none text-white/80 hover:text-white">&times;</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => (
              <div key={i} className={m.from === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <p className={'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-snug ' + (m.from === 'user' ? 'bg-twilight text-white' : 'bg-paper-deep text-ink')}><Text t={m.text} /></p>
              </div>
            ))}
            {busy && <p className="text-xs text-ink-soft">Camri is typing...</p>}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {CHIPS.map((c) => (
                  <button key={c} type="button" onClick={() => send(c)} className="rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs text-ink hover:border-twilight">{c}</button>
                ))}
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="flex gap-2 border-t border-line p-3">
            <input value={text} onChange={(e) => setText(e.target.value)} maxLength={400} placeholder="Ask Camri anything" className="flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm outline-none focus:border-twilight" />
            <button type="submit" disabled={busy || !text.trim()} className="rounded-full bg-twilight px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Send</button>
          </form>
        </div>
      )}
    </>
  )
}
