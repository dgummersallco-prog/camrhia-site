'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

type Msg = { role: 'user' | 'camri'; text: string }

type Help = { tip?: string; chips: string[] }
const DEFAULT_HELP: Help = { chips: ['Who still owes me money?', 'What is coming up this week?', 'Which contracts are unsigned?'] }
const PAGE_HELP: [string, Help][] = [
  ['/galleries/', { tip: 'Tap Style this gallery and I will help with the cover and look.', chips: ['Which galleries are due soon?'] }],
  ['/galleries', { chips: ['Which galleries are due soon?', 'What sessions are coming up that will need a gallery?'] }],
  ['/edit', { chips: ['Which shoots should I edit first?', 'Which galleries are due this week?'] }],
  ['/website', { tip: 'I can restyle your site with you. Open my chat on this page and tap Walk me through it.', chips: [] }],
  ['/questionnaires', { tip: 'Use the Ask Camri box on this page to reword, add or remove questions.', chips: [] }],
  ['/specials', { tip: 'Use Design with Camri on this page to build your special.', chips: [] }],
  ['/calendar', { tip: 'Ask Camri on this page about any date, or tell me what to block.', chips: ['What is coming up this week?'] }],
  ['/contracts', { chips: ['Which contracts are unsigned?', 'Which unsigned contracts have a session coming up soon?'] }],
  ['/money', { chips: ['Who still owes me money?', 'What payments are due this month?'] }],
  ['/packages', { chips: ['Who still owes me money?', 'What is coming up this week?'] }],
  ['/clients', { chips: ['Who has a session coming up?', 'Who still owes me money?'] }],
  ['/sessions', { chips: ['What is coming up this week?', 'Which galleries are due soon?'] }],
]
function helpFor(p: string): Help {
  return PAGE_HELP.find(([k]) => p.startsWith(k))?.[1] ?? DEFAULT_HELP
}
const P = '/camri/'

function bold(t: string) {
  return t.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.length > 4 && part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

export default function CamriHelper() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [imgOk, setImgOk] = useState(true)
  const [hello, setHello] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const help = helpFor(pathname ?? '')
  const uidRef = useRef<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [asked, setAsked] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const sb = supabase
        if (!sb) return
        const { data: s } = await sb.auth.getSession()
        const uid = s.session?.user.id
        if (!uid) return
        uidRef.current = uid
        const { data } = await sb.from('camri_chats').select('messages').eq('owner_id', uid).maybeSingle()
        const saved = (data as { messages?: Msg[] } | null)?.messages
        if (alive && Array.isArray(saved) && saved.length) setMsgs(saved.filter((m) => m && (m.role === 'user' || m.role === 'camri') && typeof m.text === 'string'))
      } catch {} finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (!loaded || !dirty || busy) return
    const t = setTimeout(async () => {
      const sb = supabase
      const uid = uidRef.current
      if (!sb || !uid) return
      await sb.from('camri_chats').upsert({ owner_id: uid, messages: msgs.slice(-60), updated_at: new Date().toISOString() })
      setDirty(false)
    }, 600)
    return () => clearTimeout(t)
  }, [msgs, loaded, dirty, busy])

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
    setAsked(false)
    setOpen(true)
    setHello(false)
    try { localStorage.setItem('camri_hello', '1') } catch {}
  }

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || busy) return
    const history = msgs.slice(-12)
    setMsgs((m) => [...m, { role: 'user', text: message }])
    setText('')
    setAsked(true)
    setDirty(true)
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
            {msgs.length > 0 && (
              <button
                onClick={() => {
                  if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return }
                  setMsgs([]); setDirty(true); setConfirmClear(false)
                }}
                className="rounded-full px-2 py-1 text-[11px] text-[#3a2f2a]/50 transition hover:text-[#3a2f2a]"
              >
                {confirmClear ? 'Tap again to clear' : 'Clear chat'}
              </button>
            )}
            <button aria-label="Close" onClick={() => setOpen(false)} className="rounded-full px-2 py-1 text-lg leading-none text-[#3a2f2a]/50 transition hover:text-[#3a2f2a]">×</button>
          </div>

          <div ref={boxRef} className="min-h-[220px] flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {msgs.length === 0 && (
              <div className="flex flex-col items-center text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {imgOk && <img src={`${P}01_waving.png`} alt="" className="h-28 w-auto select-none" />}
                <p className="mt-2 text-[13px] leading-relaxed text-[#3a2f2a]/75">Hi! I can look at your sessions, payments and contracts. What would you like to know?</p>
                {help.tip && <p className="mt-2 text-[12px] italic text-[#3a2f2a]/60">{help.tip}</p>}
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {help.chips.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[12px] text-[#3a2f2a]/80 transition hover:border-black/25">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="ml-10 rounded-2xl rounded-br-sm bg-twilight px-3.5 py-2 text-[13px] leading-relaxed text-white">{m.text}</div>
              ) : (
                <div key={i} className="mr-8 flex items-end gap-2 text-[13px] leading-relaxed">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {imgOk && <img src={`${P}13_face_avatar.png`} alt="" className="mb-0.5 h-6 w-6 shrink-0 object-contain" />}
                  <p className="whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[#EBDDCF] px-3.5 py-2 text-[#3a2f2a]">{bold(m.text)}</p>
                </div>
              ),
            )}
            {msgs.length > 0 && !asked && !busy && (help.chips.length > 0 || help.tip) && (
              <div className="pt-1">
                <p className="mb-1.5 text-[11px] uppercase tracking-wider text-[#3a2f2a]/45">Need a hand with something else?</p>
                {help.tip && <p className="mb-2 text-[12px] italic text-[#3a2f2a]/60">{help.tip}</p>}
                <div className="flex flex-wrap gap-2">
                  {help.chips.map((c) => (
                    <button key={c} onClick={() => send(c)} className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[12px] text-[#3a2f2a]/80 transition hover:border-black/25">{c}</button>
                  ))}
                </div>
              </div>
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
