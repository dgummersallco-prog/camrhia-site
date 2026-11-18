'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { analyzeFiles, deriveStyle, mergeFingerprints, type Fingerprint } from '@/lib/styleLearn'
import type { Signature } from '@/lib/brief'

const primary = 'rounded-full bg-[var(--color-twilight)] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
const quiet = 'rounded-full border border-white/15 px-4 py-2 text-sm text-ink-soft transition hover:border-white/35 hover:text-ink disabled:opacity-40'

type Learned = { fp?: Fingerprint; base?: Record<string, number> }

export default function TeachStyle({
  userId,
  target,
  onCreated,
  onUpdated,
  onClose,
}: {
  userId: string
  target?: Signature
  onCreated?: (s: Signature) => void
  onUpdated?: (s: Signature) => void
  onClose?: () => void
}) {
  const [name, setName] = useState('')
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'ready' | 'saving' | 'saved'>('idle')
  const [prog, setProg] = useState({ done: 0, total: 0, failed: 0 })
  const [fp, setFp] = useState<Fingerprint | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const old = (target?.answers as unknown as { learned?: Learned } | undefined)?.learned
  const merged = fp && old?.fp ? mergeFingerprints(old.fp, fp) : fp
  const derived = merged ? deriveStyle(merged) : null

  async function take(list: FileList | File[] | null) {
    const files = Array.from(list ?? [])
    if (files.length === 0) return
    setError(null)
    setPhase('analyzing')
    setProg({ done: 0, total: 0, failed: 0 })
    const { fp: found, failed } = await analyzeFiles(files, (done, total, f) => setProg({ done, total, failed: f }))
    if (!found || found.n < 3) {
      setPhase('idle')
      setError(failed > 0 ? 'I could not open those photos. JPEG or PNG files work best.' : 'I need at least 3 photos to learn from. Add a few more.')
      return
    }
    setFp(found)
    setPhase('ready')
  }

  async function save() {
    const sb = supabase
    if (!sb || !merged || !derived) return
    setPhase('saving')
    if (target) {
      const prevDerived = old?.fp ? deriveStyle(old.fp) : null
      const a = target.answers as unknown as Record<string, unknown>
      const cur = { ...((a.tweak ?? {}) as Record<string, number>) }
      // Keep any fixes the photographer already added: only move the style by what the new photos changed.
      for (const k of new Set([...Object.keys(derived.tweak), ...Object.keys(prevDerived?.tweak ?? {})])) {
        const d = ((derived.tweak as Record<string, number>)[k] ?? 0) - ((prevDerived?.tweak as Record<string, number> | undefined)?.[k] ?? 0)
        cur[k] = Math.round(((cur[k] ?? 0) + (prevDerived ? d : (derived.tweak as Record<string, number>)[k] ?? 0)) * 1000) / 1000
        if (!cur[k]) delete cur[k]
      }
      const answers = { ...a, look: derived.look, tweak: cur, about: derived.about, learned: { fp: merged } }
      const { error: e } = await sb.from('edit_signatures').update({ answers }).eq('id', target.id)
      if (e) { setError(e.message); setPhase('ready'); return }
      onUpdated?.({ ...target, answers: answers as unknown as Signature['answers'] })
    } else {
      const n = name.trim()
      if (!n) { setPhase('ready'); return }
      const answers = { look: derived.look, tweak: derived.tweak, skin: 'yes', about: derived.about, learned: { fp: merged } }
      const { data: row, error: e } = await sb.from('edit_signatures').insert({ owner_id: userId, name: n, answers, strength: 0.8 }).select('id, name, answers, strength').maybeSingle()
      if (e || !row) { setError(e?.message ?? 'Could not save this style.'); setPhase('ready'); return }
      onCreated?.({ ...(row as Signature), strength: Number((row as Signature).strength) })
    }
    setPhase('saved')
    setFp(null)
    setName('')
  }

  const camri = phase === 'analyzing' ? '/camri/03_working_laptop.png' : phase === 'ready' || phase === 'saved' ? '/camri/05_celebrating.png' : '/camri/10_holding_sliders.png'

  return (
    <div className={target ? 'mt-5 border-t border-white/60 pt-5' : 'rounded-2xl border border-white/70 bg-white/60 p-6'}>
      <div className="flex items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={camri} alt="" className="h-28 w-auto shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-fraunces text-xl text-ink">{target ? `Teach Camri more about ${target.name}` : 'Teach Camri a new style'}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {phase === 'analyzing'
              ? `Looking at your photos… ${prog.done} of ${prog.total}`
              : phase === 'ready'
                ? `I looked at ${fp?.n} of your photos. Here is the look I found.`
                : phase === 'saved'
                  ? 'Saved. Pick it at the start of your next shoot.'
                  : 'Add finished photos that have the look you want. The more the better, 20 or more works great. They never leave your computer.'}
          </p>

          {(phase === 'idle' || phase === 'saved') && (
            <div
              onDragOver={(e) => { e.preventDefault(); setOver(true) }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files) }}
              onClick={() => input.current?.click()}
              className={`mt-4 cursor-pointer rounded-xl border border-dashed px-4 py-6 text-center text-sm transition ${over ? 'border-twilight bg-white/70 text-ink' : 'border-ink/25 text-ink-soft hover:border-twilight'}`}
            >
              Drop photos here, or tap to choose them
              <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void take(e.target.files); e.target.value = '' }} />
            </div>
          )}

          {phase === 'analyzing' && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
              <div className="h-full bg-twilight transition-all" style={{ width: `${prog.total ? Math.round((prog.done / prog.total) * 100) : 0}%` }} />
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

          {(phase === 'ready' || phase === 'saving') && derived && (
            <div className="mt-4">
              <p className="font-fraunces text-lg text-ink">{derived.about}</p>
              {!target && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name this style, like Senior girls or Team Flames"
                  className="mt-4 w-full rounded-lg border border-white/70 bg-white/70 px-3 py-2 text-sm text-ink outline-none focus:border-twilight"
                />
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={primary} disabled={phase === 'saving' || (!target && !name.trim())} onClick={save}>
                  {phase === 'saving' ? 'Saving…' : target ? 'Update this style' : 'Save style'}
                </button>
                <button className={quiet} disabled={phase === 'saving'} onClick={() => { setPhase('idle'); setFp(null) }}>Choose different photos</button>
              </div>
            </div>
          )}

          {target && onClose && phase !== 'analyzing' && <button className="mt-3 text-sm text-ink-soft underline" onClick={onClose}>Close</button>}
        </div>
      </div>
    </div>
  )
}
