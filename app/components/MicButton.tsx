'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'

function fixName(t: string) {
  return t.replace(/\b(camri|camry|camrie|camree|cammy|kamri|kamry|cam ri|cam ree)\b/gi, 'Camri')
}

// Talk instead of type. Shows the words as you speak, then hands the final text to onDone.
export default function MicButton({
  onText,
  onDone,
  disabled,
  className,
}: {
  onText: (t: string) => void
  onDone: (t: string) => void
  disabled?: boolean
  className?: string
}) {
  const [ok, setOk] = useState(false)
  const [listening, setListening] = useState(false)
  const recRef = useRef<any>(null)
  const textRef = useRef(onText)
  const doneRef = useRef(onDone)
  textRef.current = onText
  doneRef.current = onDone

  useEffect(() => {
    const w = window as any
    setOk(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    return () => {
      const r = recRef.current
      if (r) { r.onend = null; try { r.abort() } catch {} }
    }
  }, [])

  function toggle() {
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
      textRef.current(fixName((finalText + interim).trim()))
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      const t = fixName(finalText.trim())
      if (t) doneRef.current(t)
    }
    recRef.current = rec
    setListening(true)
    try { rec.start() } catch { setListening(false) }
  }

  if (!ok) return null
  return (
    <button
      type="button"
      aria-label={listening ? 'Stop listening' : 'Talk to Camri'}
      onClick={toggle}
      disabled={disabled}
      className={className ?? `flex w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 transition disabled:opacity-40 ${listening ? 'animate-pulse bg-twilight text-white' : 'bg-white text-ink-soft hover:border-black/25'}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  )
}
