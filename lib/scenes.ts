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
