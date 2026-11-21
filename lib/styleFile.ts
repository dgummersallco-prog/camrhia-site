import type { Signature } from '@/lib/brief'

export type StyleSnap = { at: string; name: string; strength: number; answers: Record<string, unknown> }

function stripVersions(a: Record<string, unknown>): Record<string, unknown> {
  const out = { ...a }
  delete out.versions
  return out
}

// The saved copy of a style as it is right now, put in front of its older copies (newest first, up to 10).
export function pushVersion(sig: Signature): StyleSnap[] {
  const a = sig.answers as unknown as Record<string, unknown>
  const prev = (Array.isArray(a.versions) ? a.versions : []) as StyleSnap[]
  return [{ at: new Date().toISOString(), name: sig.name, strength: sig.strength, answers: stripVersions(a) }, ...prev].slice(0, 10)
}

export function exportStyle(sig: Signature) {
  const a = stripVersions(sig.answers as unknown as Record<string, unknown>)
  delete a.learned
  delete a.learnedAt
  const body = JSON.stringify({ camrhiaStyle: 1, name: sig.name, strength: sig.strength, answers: a }, null, 2)
  const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${sig.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'style'}.camrhia-style.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const num = (v: string | undefined) => {
  const n = Number(v)
  return v !== undefined && v !== '' && Number.isFinite(n) ? n : null
}
const r3 = (n: number) => Math.round(n * 1000) / 1000

// Reads the common sliders from a Lightroom or Camera Raw preset (.xmp). The numbers are matched to Camrhia's dials as closely as they can be.
function fromXmp(text: string, fileName: string): { name: string; strength: number; answers: Record<string, unknown> } | { error: string } {
  const m: Record<string, string> = {}
  for (const x of text.matchAll(/crs:([A-Za-z0-9]+)="([^"]*)"/g)) m[x[1]] = x[2]
  const t: Record<string, number> = {}
  const put = (key: string, v: number | null, div: number, scale: number, lo = -1, hi = 1) => {
    if (v === null || v === 0) return
    t[key] = r3(Math.max(lo * scale, Math.min(hi * scale, (v / div) * scale)))
  }
  put('exposure', num(m.Exposure2012), 5, 1)
  put('contrast', num(m.Contrast2012), 100, 0.5)
  put('highlights', num(m.Highlights2012), 100, 1)
  put('shadows', num(m.Shadows2012), 100, 1)
  put('whites', num(m.Whites2012), 100, 1)
  put('blacks', num(m.Blacks2012), 100, 1)
  put('vibrance', num(m.Vibrance), 100, 0.5)
  put('saturation', num(m.Saturation), 100, 0.5)
  put('tint', num(m.Tint), 150, 0.3)
  put('sharpen', num(m.Sharpness), 150, 1, 0, 1)
  put('noise', num(m.LuminanceSmoothing), 100, 1, 0, 1)
  put('vignette', num(m.PostCropVignetteAmount), 100, 1)
  put('grain', num(m.GrainAmount), 100, 1, 0, 1)
  const temp = num(m.IncrementalTemperature)
  put('temp', temp, 100, 0.3)
  if (Object.keys(t).length === 0) return { error: 'I could not find any settings I know in that preset.' }
  const name = fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Imported preset'
  return { name, strength: 0.8, answers: { skin: 'yes', look: 'natural', tweak: t, about: 'Imported from a Lightroom preset', built: true } }
}

export function parseStyleFile(text: string, fileName: string): { name: string; strength: number; answers: Record<string, unknown> } | { error: string } {
  if (/\.xmp$/i.test(fileName)) return fromXmp(text, fileName)
  try {
    const o = JSON.parse(text) as { camrhiaStyle?: number; name?: unknown; strength?: unknown; answers?: unknown }
    if (o.camrhiaStyle !== 1 || typeof o.answers !== 'object' || o.answers === null) return { error: 'That file is not a Camrhia style.' }
    const strength = typeof o.strength === 'number' && o.strength > 0 && o.strength <= 1 ? o.strength : 0.8
    const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 80) : 'Imported style'
    return { name, strength, answers: o.answers as Record<string, unknown> }
  } catch {
    return { error: 'I could not read that file. Use a Camrhia style file or a Lightroom preset (.xmp).' }
  }
}
