import type { SceneDef } from '@/lib/brief'

export const SCENE_IDEAS = ['Getting ready', 'First look', 'Ceremony', 'Family formals', 'Portraits', 'Cocktail hour', 'Reception', 'Send-off']

// Reads only the first part of a file, so big RAW files are not fully downloaded.
export async function readHead(url: string, n = 131072): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { Range: `bytes=0-${n - 1}` } })
    if (!res.ok || !res.body) return null
    const reader = res.body.getReader()
    const chunks: Uint8Array[] = []
    let got = 0
    while (got < n) {
      const { done, value } = await reader.read()
      if (done || !value) break
      chunks.push(value)
      got += value.length
    }
    reader.cancel().catch(() => {})
    const out = new Uint8Array(Math.min(got, n))
    let off = 0
    for (const c of chunks) {
      const take = Math.min(c.length, out.length - off)
      out.set(c.subarray(0, take), off)
      off += take
      if (off >= out.length) break
    }
    return out
  } catch {
    return null
  }
}

// Finds the camera's capture time (EXIF "YYYY:MM:DD HH:MM:SS") near the start of a file.
export function exifTime(bytes: Uint8Array): number | null {
  const text = new TextDecoder('latin1').decode(bytes)
  const re = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const [y, mo, d, h, mi, s] = m.slice(1).map(Number)
    if (y >= 1990 && y <= 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h < 24 && mi < 60 && s < 60) {
      return Date.UTC(y, mo - 1, d, h, mi, s)
    }
  }
  return null
}

export function orderPhotos<T extends { id: string; filename?: string | null }>(list: T[], times: Record<string, number>): T[] {
  return [...list].sort((a, b) => {
    const ta = times[a.id]
    const tb = times[b.id]
    if (ta !== undefined && tb !== undefined && ta !== tb) return ta - tb
    if (ta !== undefined && tb === undefined) return -1
    if (ta === undefined && tb !== undefined) return 1
    return (a.filename ?? '').localeCompare(b.filename ?? '', undefined, { numeric: true })
  })
}

export function normalizeScenes(scenes: SceneDef[], ordered: { id: string }[]): SceneDef[] {
  if (ordered.length === 0) return []
  const pos = new Map<string, number>(ordered.map((p, i) => [p.id, i]))
  const seen = new Set<number>()
  const list = scenes
    .filter((s) => pos.has(s.startId))
    .sort((a, b) => (pos.get(a.startId) ?? 0) - (pos.get(b.startId) ?? 0))
    .filter((s) => {
      const i = pos.get(s.startId) ?? 0
      if (seen.has(i)) return false
      seen.add(i)
      return true
    })
  if (!seen.has(0)) list.unshift({ id: 'first', name: '', startId: ordered[0].id, light: '' })
  return list
}

export function buildLightMap(ordered: { id: string }[], scenes: SceneDef[]): Record<string, string> {
  const out: Record<string, string> = {}
  const startAt = new Map(scenes.map((s) => [s.startId, s]))
  let cur = scenes[0]?.light ?? ''
  for (const p of ordered) {
    const s = startAt.get(p.id)
    if (s) cur = s.light
    out[p.id] = cur
  }
  return out
}

export function countByScene(ordered: { id: string }[], scenes: SceneDef[]): Record<string, number> {
  const out: Record<string, number> = {}
  const startAt = new Map(scenes.map((s) => [s.startId, s]))
  let cur = scenes[0]?.id ?? ''
  for (const p of ordered) {
    const s = startAt.get(p.id)
    if (s) cur = s.id
    out[cur] = (out[cur] ?? 0) + 1
  }
  return out
}

// Suggests a break wherever there is a long gap between two photos.
export function autoSplit(ordered: { id: string }[], times: Record<string, number>, gapMs = 45 * 60 * 1000, max = 8): string[] {
  const gaps: { i: number; gap: number }[] = []
  for (let i = 1; i < ordered.length; i++) {
    const a = times[ordered[i - 1].id]
    const b = times[ordered[i].id]
    if (a !== undefined && b !== undefined && b - a >= gapMs) gaps.push({ i, gap: b - a })
  }
  return gaps.sort((x, y) => y.gap - x.gap).slice(0, max - 1).map((g) => ordered[g.i].id)
}

export function groupByScene<T extends { id: string }>(ordered: T[], scenes: SceneDef[]): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  const startAt = new Map(scenes.map((s) => [s.startId, s]))
  let cur = scenes[0]?.id ?? ''
  for (const p of ordered) {
    const s = startAt.get(p.id)
    if (s) cur = s.id
    if (!out[cur]) out[cur] = []
    out[cur].push(p)
  }
  return out
}

// Brightness and warmth of each photo, from its small thumbnail.
export async function lightStats<T extends { id: string }>(
  list: T[],
  urlOf: (p: T) => string | undefined,
): Promise<{ luma: number; warm: number }[]> {
  const out: { luma: number; warm: number }[] = list.map(() => ({ luma: 0.5, warm: 0 }))
  let next = 0
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      const c = document.createElement('canvas')
      c.width = 24
      c.height = 24
      const ctx = c.getContext('2d', { willReadFrequently: true })
      if (!ctx) return
      while (true) {
        const i = next++
        if (i >= list.length) return
        const u = urlOf(list[i])
        if (!u) continue
        try {
          const blob = await (await fetch(u)).blob()
          const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
          ctx.drawImage(bmp, 0, 0, 24, 24)
          bmp.close()
          const d = ctx.getImageData(0, 0, 24, 24).data
          let r = 0
          let g = 0
          let b = 0
          const n = 24 * 24
          for (let k = 0; k < d.length; k += 4) {
            r += d[k]
            g += d[k + 1]
            b += d[k + 2]
          }
          out[i] = { luma: (0.299 * r + 0.587 * g + 0.114 * b) / (n * 255), warm: (r - b) / (n * 255) }
        } catch {
          /* leave neutral */
        }
      }
    }),
  )
  return out
}

// Finds where the light changes the most. Returns the index where each new part starts.
export function lightingBreaks(stats: { luma: number; warm: number }[], minSize = 12, max = 7, threshold = 0.12): number[] {
  const n = stats.length
  const win = 6
  if (n < minSize * 2) return []
  const med = (a: number[]) => {
    const s = [...a].sort((x, y) => x - y)
    return s[Math.floor(s.length / 2)]
  }
  const scored: { i: number; v: number }[] = []
  for (let i = win; i <= n - win; i++) {
    const left = stats.slice(i - win, i)
    const right = stats.slice(i, i + win)
    const v =
      Math.abs(med(right.map((s) => s.luma)) - med(left.map((s) => s.luma))) +
      Math.abs(med(right.map((s) => s.warm)) - med(left.map((s) => s.warm))) * 0.8
    if (v >= threshold) scored.push({ i, v })
  }
  scored.sort((a, b) => b.v - a.v)
  const picks: number[] = []
  for (const { i } of scored) {
    if (picks.length >= max - 1) break
    if (i < minSize || n - i < minSize) continue
    if (picks.some((p) => Math.abs(p - i) < minSize)) continue
    picks.push(i)
  }
  return picks.sort((a, b) => a - b)
}
