import type { Adjust } from '@/lib/enhance'

export const TOOLS: { key: keyof Adjust; label: string; scale: number }[] = [
  { key: 'exposure', label: 'Exposure', scale: 1 },
  { key: 'contrast', label: 'Contrast', scale: 0.5 },
  { key: 'highlights', label: 'Highlights', scale: 1 },
  { key: 'shadows', label: 'Shadows', scale: 1 },
  { key: 'whites', label: 'Whites', scale: 1 },
  { key: 'blacks', label: 'Blacks', scale: 1 },
  { key: 'temp', label: 'Temperature', scale: 0.3 },
  { key: 'tint', label: 'Tint', scale: 0.3 },
  { key: 'vibrance', label: 'Vibrance', scale: 0.5 },
  { key: 'saturation', label: 'Saturation', scale: 0.5 },
  { key: 'sharpen', label: 'Sharpen', scale: 1 },
  { key: 'noise', label: 'Noise reduction', scale: 1 },
]

export function addAdj(a: Adjust | undefined, b: Adjust | undefined): Adjust {
  const out: Adjust = { ...(a ?? {}) }
  if (!b) return out
  for (const k of Object.keys(b) as (keyof Adjust)[]) out[k] = (out[k] ?? 0) + (b[k] ?? 0)
  return out
}

export function cleanAdj(a: Adjust): Adjust {
  const out: Adjust = {}
  for (const k of Object.keys(a) as (keyof Adjust)[]) if (a[k]) out[k] = a[k]
  return out
}
