'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Msg = { role: 'user' | 'camri'; text: string }

const STARTERS = ['Who still owes me money?', 'What is coming up this week?', 'Which contracts are unsigned?']
const P = '/camri/'

export default function CamriHelper() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [imgOk, setImgOk] = useState(true)
  const [hello, setHello] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined
    try {
      if (!localStorage.getItem('camri_hello')) {
        setHello(true)
        t = setTimeout(() => { setHello(false); try { localStorage.setItem('camri_hello', '1') } catch {} }, 14000)
      }
    } catch {}
    return () => { if (t) clearTimeout(t) }
  }, [])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [msgs, busy, open])

  function openChat() {
    setOpen(true)
    setHello(false)
    try { localStorage.setItem('camri_hello', '1') } catch {}
  }

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || busy) return
    const history = msgs.slice(-6)
    setMsgs((m) => [...m, { role: 'user', text: message }])
    setText('')
    setBusy(true)
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
      const token = data.session?.access_token
      const res = await fetch('/api/ai/camri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ message, history, path: window.location.pathname }),
      })
      const j = await res.json().catch(() => ({}))
      setMsgs((m) => [...m, { role: 'camri', text: res.ok ? (j.reply ?? '') : (j.error ?? 'Camri is unavailable right now.') }])
    } catch {
      setMsgs((m) => [...m, { role: 'camri', text: 'Camri is unavailable right now.' }])
    }
    setBusy(false)
  }

  return (
    <>
      <style>{`@keyframes camriBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}.camri-bob{animation:camriBob 4s ease-in-out infinite}`}</style>

      {!open && (
        <div className="fixed bottom-5 right-0 z-40 flex items-end">
          {hello && (
            <div className="mb-20 mr-2 max-w-[220px] rounded-2xl rounded-br-sm bg-white/95 px-3.5 py-2.5 text-[13px] leading-snug text-[#3a2f2a] shadow-lg">
              Hi, I&rsquo;m Camri! Ask me anything about your business.
            </div>
          )}
          <button aria-label="Ask Camri" onClick={openChat} className="camri-bob block">
            {imgOk ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`${P}08_peeking.png`} alt="Camri" onError={() => setImgOk(false)} className="h-[150px] w-auto select-none drop-shadow-xl transition hover:-translate-x-1" />
            ) : (
              <span className="mb-1 mr-4 block rounded-full bg-twilight px-4 py-2 text-sm font-medium text-white shadow-lg">Ask Camri</span>
            )}
          </button>
        </div>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 flex max-h-[min(640px,calc(100vh-40px))] w-[380px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-3xl border border-white/60 bg-[#FBF7F2]/95 text-[#3a2f2a] shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {imgOk && <img src={`${P}13_face_avatar.png`} alt="" className="h-9 w-9 object-contain" />}
            <div className="min-w-0 flex-1">
              <p className="font-fraunces text-lg leading-none">Camri</p>
              <p className="mt-0.5 text-[11px] text-[#3a2f2a]/55">Your business helper</p>
            </div>
            <button aria-label="Close" onClick={() => setOpen(false)} className="rounded-full px-2 py-1 text-lg leading-none text-[#3a2f2a]/50 transition hover:text-[#3a2f2a]">×</button>
          </div>

          <div ref={boxRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.length === 0 && (
              <div className="flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imgOk && <img src={`${P}01_waving.png`} alt="" className="h-28 w-auto select-none" />}
                <p className="mt-2 text-[13px] leading-relaxed text-[#3a2f2a]/75">Hi! I can look at your sessions, payments and contracts. What would you like to know?</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[12px] text-[#3a2f2a]/80 transition hover:border-black/25">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-10 rounded-2xl rounded-br-sm bg-twilight px-3.5 py-2 text-[13px] leading-relaxed text-white">{m.text}</div>
              ) : (
                <div key={i} className="mr-6 flex gap-2 text-[13px] leading-relaxed">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {imgOk && <img src={`${P}13_face_avatar.png`} alt="" className="mt-0.5 h-6 w-6 shrink-0 object-contain" />}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              ),
            )}
            {busy && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imgOk && <img src={`${P}04_thinking.png`} alt="" className="h-14 w-auto" />}
                <p className="animate-pulse text-[13px] text-[#3a2f2a]/55">Camri is thinking…</p>
              </div>
            )}
          </div>

          <form className="flex gap-2 border-t border-black/5 px-3 py-3" onSubmit={(e) => { e.preventDefault(); send(text) }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask about your business"
              maxLength={600}
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-[13px] outline-none focus:border-black/30"
            />
            <button type="submit" disabled={busy || !text.trim()} className="rounded-xl bg-twilight px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40">Send</button>
          </form>
        </div>
      )}
    </>
  )
}
