'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { TOOLS } from '@/lib/tools'
import type { Adjust } from '@/lib/enhance'
import { PLAYBOOK, PLAY_CHIPS, matchPlay, type Play } from '@/lib/camiPlaybook'

/* eslint-disable @typescript-eslint/no-explicit-any */

type Change = { key: keyof Adjust; ui: number; label: string }
type Msg = { role: 'user' | 'cami'; text: string; changes?: Change[]; state?: 'open' | 'done' | 'no' }

const YES = /^\s*(yes|yeah|yep|yup|sure|ok|okay|do it|apply|apply it|go ahead|please|sounds good)\b/i

async function snap(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * k))
    c.height = Math.max(1, Math.round(img.naturalHeight * k))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.72)
  } catch {
    return null
  }
}

function fixName(t: string) {
  return t.replace(/\b(camri|camry|camrie|camree|cammy|kamri|kamry|cam ri|cam ree)\b/gi, 'Camri')
}

export default function CamiPanel({
  value,
  onChange,
  previewUrl,
  lookName,
  strength,
  brief,
  light,
  photoId,
  onBusyChange,
  children,
}: {
  value: Adjust
  onChange: (next: Adjust) => void
  previewUrl: string | null
  lookName: string
  strength: number
  brief: unknown
  light: string
  photoId: string
  onBusyChange?: (b: boolean) => void
  children?: ReactNode
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [prev, setPrev] = useState<Adjust | null>(null)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [listening, setListening] = useState(false)
  const [micOk, setMicOk] = useState(false)
  const recRef = useRef<any>(null)
  const sendRef = useRef<(m: string) => void>(() => {})

  useEffect(() => {
    const w = window as any
    setMicOk(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => {
      const r = recRef.current
      if (r) { r.onend = null; try { r.abort() } catch {} }
    }
  }, [])

  useEffect(() => {
    onBusyChange?.(busy)
    return () => onBusyChange?.(false)
  }, [busy, onBusyChange])

  // A new photo means old suggestions no longer fit it
  useEffect(() => {
    setMsgs((ms) => ms.map((m) => (m.state === 'open' ? { ...m, state: 'no' } : m)))
    setPrev(null)
  }, [photoId])

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [msgs, busy])

  function applyAt(i: number) {
    const m = msgs[i]
    if (!m?.changes || m.state !== 'open') return
    const next: Adjust = { ...value }
    for (const c of m.changes) {
      const t = TOOLS.find((x) => x.key === c.key)
      if (!t) continue
      if (c.ui === 0) delete next[c.key]
      else next[c.key] = (c.ui / 100) * t.scale
    }
    setPrev(value)
    onChange(next)
    setMsgs((ms) => ms.map((x, j) => (j === i ? { ...x, state: 'done' } : x)))
  }

  function playChanges(pl: Play): Change[] {
    const out: Change[] = []
    for (const t of TOOLS) {
      const v = pl.set[t.key as string]
      if (typeof v === 'number') out.push({ key: t.key, ui: v, label: t.label })
    }
    return out
  }

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || busy) return
    const openAt = msgs.map((m) => m.state === 'open').lastIndexOf(true)
    if (openAt >= 0 && YES.test(message) && message.length < 40) {
      setMsgs((ms) => [...ms, { role: 'user', text: message }])
      setText('')
      applyAt(openAt)
      return
    }
    const play = matchPlay(message)
    if (play) {
      setMsgs((ms) => [...ms.map((m) => (m.state === 'open' ? { ...m, state: 'no' as const } : m)), { role: 'user', text: message }, { role: 'cami', text: play.line, changes: playChanges(play), state: 'open' as const }])
      setText('')
      return
    }
    const history = msgs.slice(-6).map((m) => ({ role: m.role, text: m.text }))
    setMsgs((ms) => [...ms.map((m) => (m.state === 'open' ? { ...m, state: 'no' as const } : m)), { role: 'user', text: message }])
    setText('')
    setBusy(true)
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
      const token = data.session?.access_token
      const dials = TOOLS.map((t) => ({ key: t.key as string, label: t.label, ui: Math.round((((value[t.key] ?? 0) as number) / t.scale) * 100) }))
      const image = await snap(previewUrl)
      const res = await fetch('/api/ai/cami', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ message, history, dials, look: lookName, strength, brief, light, image }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsgs((ms) => [...ms, { role: 'cami', text: j.error ?? 'Camri is unavailable right now.' }])
      } else {
        const set: Record<string, number> = j.set ?? {}
        const changes: Change[] = []
        for (const t of TOOLS) {
          const v = set[t.key as string]
          if (typeof v !== 'number' || !isFinite(v)) continue
          changes.push({ key: t.key, ui: Math.max(-100, Math.min(100, Math.round(v))), label: t.label })
        }
        setMsgs((ms) => [...ms, { role: 'cami', text: j.reply ?? '', changes: changes.length ? changes : undefined, state: changes.length ? 'open' : undefined }])
      }
    } catch {
      setMsgs((ms) => [...ms, { role: 'cami', text: 'Camri is unavailable right now.' }])
    }
    setBusy(false)
  }

  sendRef.current = (m: string) => { void send(m) }

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return }
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = (e: any) => {
      let interim = ''
      for (let k = e.resultIndex; k < e.results.length; k++) {
        const t = e.results[k][0].transcript
        if (e.results[k].isFinal) finalText += t
        else interim += t
      }
      setText(fixName((finalText + interim).trim()))
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      const t = fixName(finalText.trim())
      if (t) sendRef.current(t)
    }
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  return (
    <div>
      <p className="text-xs text-white/50">Tap the light you shot in, or ask. I&rsquo;ll move the sliders when you say yes.</p>

      {msgs.length > 0 && (
        <div ref={boxRef} className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <p className={`inline-block max-w-[92%] rounded-xl px-3 py-2 text-left text-xs leading-relaxed ${m.role === 'user' ? 'bg-white/10 text-white/85' : 'bg-white/[0.05] text-white/75'}`}>{m.text}</p>
              {m.changes && (
                <div className="mt-1.5 text-left">
                  <div className="flex flex-wrap gap-1">
                    {m.changes.map((c) => (
                      <span key={c.key as string} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">{c.label} {c.ui > 0 ? '+' : ''}{c.ui}</span>
                    ))}
                  </div>
                  {m.state === 'open' && (
                    <div className="mt-1.5 flex gap-2">
                      <button className="rounded-full bg-[var(--color-twilight)] px-3 py-1 text-xs font-medium text-white transition hover:opacity-90" onClick={() => applyAt(i)}>Yes, apply it</button>
                      <button className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 transition hover:text-white" onClick={() => setMsgs((ms) => ms.map((x, j) => (j === i ? { ...x, state: 'no' } : x)))}>Not now</button>
                    </div>
                  )}
                  {m.state === 'done' && <p className="mt-1 text-[11px] text-emerald-300">Applied. The sliders moved.</p>}
                </div>
              )}
            </div>
          ))}
          {busy && <p className="text-xs text-white/45">Camri is looking at your photo&hellip;</p>}
        </div>
      )}

      {msgs.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PLAY_CHIPS.map((id) => PLAYBOOK.find((x) => x.id === id)).filter((x): x is Play => !!x).map((pl) => (
            <button key={pl.id} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 transition hover:border-twilight hover:text-white" disabled={busy} onClick={() => void send(pl.label)}>{pl.label}</button>
          ))}
        </div>
      )}

      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(text) }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? 'Listening...' : 'Ask a quick question'}
          maxLength={500}
          className="min-w-0 flex-1 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-white/30"
        />
        {micOk && (
          <button
            type="button"
            aria-label={listening ? 'Stop listening' : 'Talk to Camri'}
            onClick={toggleMic}
            disabled={busy}
            className={`flex w-8 shrink-0 items-center justify-center rounded-full border border-white/10 transition disabled:opacity-40 ${listening ? 'animate-pulse bg-[var(--color-twilight)] text-white' : 'bg-black/40 text-white/70 hover:border-white/30'}`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
        <button type="submit" disabled={busy || !text.trim()} className="rounded-full bg-[var(--color-twilight)] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40">Ask</button>
      </form>
      {prev && (
        <button className="mt-2 text-[11px] text-white/50 underline transition hover:text-white/80" onClick={() => { onChange(prev); setPrev(null) }}>
          Undo Camri&rsquo;s change
        </button>
      )}
      {children}
    </div>
  )
}
