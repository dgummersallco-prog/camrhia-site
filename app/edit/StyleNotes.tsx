'use client'

import type { Signature } from '@/lib/brief'
import { LOOKS } from '@/lib/enhance'
import type { Fingerprint } from '@/lib/styleLearn'

export type StyleUse = { shoots: number; checked: number; fixed: number }

const WORDS: Record<string, [string, string]> = {
  exposure: ['Brightens', 'Darkens'],
  contrast: ['Adds contrast', 'Softens contrast'],
  highlights: ['Brightens highlights', 'Pulls highlights back'],
  shadows: ['Lifts shadows', 'Deepens shadows'],
  whites: ['Brightens whites', 'Tames whites'],
  blacks: ['Lifts blacks', 'Deepens blacks'],
  fade: ['Fades the blacks for a matte feel', 'Deepens the blacks'],
  temp: ['Warms it up', 'Cools it down'],
  tint: ['Adds magenta', 'Adds green'],
  vibrance: ['Boosts vibrance', 'Tones vibrance down'],
  saturation: ['Boosts color', 'Mutes color'],
}

const strengthWord = (v: number) => (Math.abs(v) < 0.08 ? 'slightly' : Math.abs(v) < 0.2 ? 'moderately' : 'strongly')
const pct = (v: number) => `${Math.round(v * 100)}%`

function read(fp: Fingerprint): { label: string; text: string }[] {
  return [
    { label: 'Brightness', text: `${fp.L > 0.56 ? 'Bright' : fp.L < 0.34 ? 'Dark' : 'Balanced'} (${pct(fp.L)})` },
    { label: 'Contrast', text: fp.S > 0.27 ? 'Punchy' : fp.S < 0.17 ? 'Soft and gentle' : 'Natural' },
    { label: 'Blacks', text: fp.p1 > 0.09 ? 'Lifted and matte' : fp.p1 < 0.02 ? 'Deep and rich' : 'Normal' },
    { label: 'Shadows', text: fp.p10 > 0.2 ? 'Open and light' : fp.p10 < 0.06 ? 'Dark and heavy' : 'Balanced' },
    { label: 'Highlights', text: fp.p95 > 0.95 ? 'Bright and glowing' : fp.p95 < 0.8 ? 'Held back and soft' : 'Balanced' },
    { label: 'Color', text: fp.bw > 0.8 ? 'Black and white' : fp.sat < 0.2 ? 'Muted' : fp.sat > 0.4 ? 'Rich and saturated' : 'True to life' },
    { label: 'Temperature', text: fp.bw > 0.8 ? 'Not applicable' : fp.warm > 0.12 ? 'Warm' : fp.warm < -0.01 ? 'Cool' : 'Neutral' },
  ]
}

export default function StyleNotes({ sigs, use, onTeach }: { sigs: Signature[] | null; use: Record<string, StyleUse>; onTeach: () => void }) {
  if (sigs === null) return <p className="mt-4 text-sm text-ink-soft">Loading…</p>
  if (sigs.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-white/70 bg-white/60 p-6">
        <p className="text-ink-soft">I have not learned any of your styles yet. Show me photos you have edited and I will learn the look.</p>
        <button className="mt-4 rounded-full bg-[var(--color-twilight)] px-5 py-2 text-sm font-medium text-white transition hover:opacity-90" onClick={onTeach}>Teach Camri a style</button>
      </div>
    )
  }
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {sigs.map((s) => {
        const a = s.answers as unknown as { look?: string; tweak?: Record<string, number>; about?: string; learned?: { fp?: Fingerprint } }
        const fp = a.learned?.fp
        const look = LOOKS.find((l) => l.id === a.look)
        const lines = Object.entries(a.tweak ?? {})
          .filter(([k, v]) => WORDS[k] && v)
          .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
          .map(([k, v]) => `${WORDS[k][v > 0 ? 0 : 1]} · ${strengthWord(v)}`)
        const u = use[s.id]
        return (
          <div key={s.id} className="rounded-2xl border border-white/70 bg-white/60 p-6">
            <p className="font-fraunces text-xl text-ink">{s.name}</p>
            {a.about && <p className="mt-2 text-sm text-ink">{a.about}</p>}
            <p className="mt-2 text-xs text-ink-soft">
              {fp ? `Learned from ${fp.n} of your photos` : 'Set up by hand'}
              {look ? ` · Starts from ${look.label}` : ''}
            </p>

            {lines.length > 0 && (
              <>
                <p className="mt-4 text-xs uppercase tracking-[0.14em] text-ink-soft">What I do to your photos</p>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
              </>
            )}

            {fp && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-ink-soft">How I read your photos</summary>
                <ul className="mt-2 space-y-1 text-sm text-ink-soft">
                  {read(fp).map((r) => <li key={r.label}><span className="text-ink">{r.label}</span> · {r.text}</li>)}
                </ul>
              </details>
            )}

            <p className="mt-4 text-sm text-ink-soft">
              {u && u.checked > 0
                ? `Used on ${u.shoots} ${u.shoots === 1 ? 'shoot' : 'shoots'} · you left ${u.checked - u.fixed} of ${u.checked} photos as I edited them`
                : 'Not used on a shoot yet'}
            </p>
            <button className="mt-4 text-sm text-ink-soft underline" onClick={onTeach}>Teach me more in My styles</button>
          </div>
        )
      })}
    </div>
  )
}
