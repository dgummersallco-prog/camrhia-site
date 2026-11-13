'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { TOOLS } from '@/lib/tools'
import type { Adjust } from '@/lib/enhance'

type Msg = { role: 'user' | 'cami'; text: string; changed?: string[] }

const STARTERS = ['I\u2019m new. Where do I start?', 'Why does my photo look dull?', 'Make it warmer and softer']

async function thumb(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const k = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.naturalWidth * k))
    c.height = Math.max(1, Math.round(img.naturalHeight * k))
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.7)
  } catch {
    return null
  }
}

export default function AskCami({
  value,
  onChange,
  lookName,
  strength,
  brief,
  previewUrl,
}: {
  value: Adjust
  onChange: (a: Adjust) => void
  lookName: string
  strength: number
  brief: unknown
  previewUrl: string | null
}) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [prev, setPrev] = useState<Adjust | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight
  }, [msgs, busy])

  async function send(raw: string) {
    const message = raw.trim()
    if (!message || busy) return
    const history = msgs.slice(-6).map((m) => ({ role: m.role, text: m.text }))
    setMsgs((m) => [...m, { role: 'user', text: message }])
    setText('')
    setBusy(true)
    try {
      const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } }
      const token = data.session?.access_token
      const dials = TOOLS.map((t) => ({ key: t.key as string, label: t.label, ui: Math.round((((value[t.key] ?? 0) as number) / t.scale) * 100) }))
      const image = await thumb(previewUrl)
      const res = await fetch('/api/ai/cami', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ message, history, dials, look: lookName, strength, brief, image }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMsgs((m) => [...m, { role: 'cami', text: j.error ?? 'Camri is unavailable right now.' }])
      } else {
        const set: Record<string, number> = j.set ?? {}
        const next: Adjust = { ...value }
        const changed: string[] = []
        for (const t of TOOLS) {
          const raw = set[t.key as string]
          if (typeof raw !== 'number' || !isFinite(raw)) continue
          const ui = Math.max(-100, Math.min(100, Math.round(raw)))
          if (ui === 0) delete next[t.key]
          else next[t.key] = (ui / 100) * t.scale
          changed.push(`${t.label} ${ui > 0 ? '+' : ''}${ui}`)
        }
        if (changed.length) {
          setPrev(value)
          onChange(next)
        }
        setMsgs((m) => [...m, { role: 'cami', text: j.reply ?? '', changed }])
      }
    } catch {
      setMsgs((m) => [...m, { role: 'cami', text: 'Camri is unavailable right now.' }])
    }
    setBusy(false)
  }

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-[#151518] p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">Ask Camri</p>
        {prev && (
          <button className="text-[11px] text-white/45 transition hover:text-white/80" onClick={() => { onChange(prev); setPrev(null) }}>
            Undo Camri&rsquo;s change
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-white/50">Not sure where to start? Ask a question, or tell me how you want it to feel and I&rsquo;ll set the sliders.</p>

      {msgs.length > 0 && (
        <div ref={boxRef} className="mt-3 max-h-60 space-y-3 overflow-y-auto pr-1">
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-8 rounded-xl bg-white/10 px-3 py-2 text-[13px] text-white">{m.text}</div>
            ) : (
              <div key={i} className="mr-4 text-[13px] leading-relaxed text-white/80">
                {m.text}
                {m.changed && m.changed.length > 0 && <p className="mt-1 text-[11px] text-white/40">Moved: {m.changed.join(' · ')}</p>}
              </div>
            ),
          )}
          {busy && <p className="animate-pulse text-[13px] text-white/45">Camri is thinking…</p>}
        </div>
      )}

      {msgs.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button key={s} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60 transition hover:border-white/30" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(text) }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask anything, or say how it should look"
          maxLength={600}
          className="min-w-0 flex-1 rounded-xl border border-white/10 px-3 py-2 text-[13px] outline-none"
        />
        <button type="submit" disabled={busy || !text.trim()} className="rounded-xl bg-twilight px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40">
          Send
        </button>
      </form>
    </div>
  )
}
