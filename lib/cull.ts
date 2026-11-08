import { faceReport, faceEyesReady, type FaceReport } from '@/lib/faces'

export type CullLabel = 'pick' | 'maybe' | 'reject'
export type CullInput = { id: string; url: string; webUrl?: string }
export type CullResult = { id: string; score: number; label: CullLabel; group: string | null; reason: string | null }

type Analysis = { sharp: number; hash: boolean[]; mean: number; clipHi: number } | null

// How sharp the sharpest part of the picture is. Uses the 90th-percentile block, so a sharp
// subject with a soft background still scores well.
function sharpness(bmp: ImageBitmap): number {
  const scale = Math.min(1, 320 / Math.max(bmp.width, bmp.height))
  const w = Math.max(40, Math.round(bmp.width * scale))
  const h = Math.max(40, Math.round(bmp.height * scale))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Your browser cannot process photos.')
  ctx.drawImage(bmp, 0, 0, w, h)
  const d = ctx.getImageData(0, 0, w, h).data
  const g = new Float32Array(w * h)
  for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  const B = 16
  const vars: number[] = []
  for (let by = 1; by + B < h; by += B) {
    for (let bx = 1; bx + B < w; bx += B) {
      let sum = 0
      let sum2 = 0
      let n = 0
      for (let y = by; y < by + B; y++) {
        for (let x = bx; x < bx + B; x++) {
          const i = y * w + x
          const l = g[i - w] + g[i + w] + g[i - 1] + g[i + 1] - 4 * g[i]
          sum += l
          sum2 += l * l
          n++
        }
      }
      const m = sum / n
      vars.push(sum2 / n - m * m)
    }
  }
  if (vars.length === 0) return 0
  vars.sort((a, b) => a - b)
  return vars[Math.floor(vars.length * 0.9)]
}

// A tiny 64-bit fingerprint of how the picture looks, used to spot near-identical frames.
function dhash(bmp: ImageBitmap): boolean[] {
  const c = document.createElement('canvas')
  c.width = 9
  c.height = 8
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Your browser cannot process photos.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, 9, 8)
  const d = ctx.getImageData(0, 0, 9, 8).data
  const gray = (x: number, y: number) => {
    const i = (y * 9 + x) * 4
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  }
  const bits: boolean[] = []
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits.push(gray(x, y) > gray(x + 1, y))
  return bits
}

function hamming(a: boolean[], b: boolean[]): number {
  let n = 0
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++
  return n
}

// Average brightness and how much of the picture is blown out to pure white.
function lumaStats(bmp: ImageBitmap): { mean: number; clipHi: number } {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Your browser cannot process photos.')
  ctx.drawImage(bmp, 0, 0, 64, 64)
  const d = ctx.getImageData(0, 0, 64, 64).data
  let sum = 0
  let hi = 0
  const n = d.length / 4
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    sum += l
    if (l >= 250) hi++
  }
  return { mean: sum / n, clipHi: hi / n }
}

async function analyse(url: string): Promise<Analysis> {
  const res = await fetch(url)
  if (!res.ok) return null
  const bmp = await createImageBitmap(await res.blob(), { imageOrientation: 'from-image' })
  try {
    return { sharp: sharpness(bmp), hash: dhash(bmp), ...lumaStats(bmp) }
  } finally {
    bmp.close()
  }
}

async function fetchBlob(url: string | undefined): Promise<Blob | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    return res.ok ? await res.blob() : null
  } catch {
    return null
  }
}

const median = (a: number[]) => {
  const q = [...a].sort((x, y) => x - y)
  return q.length ? q[Math.floor(q.length / 2)] : 0
}

// Photos must be passed in shoot order so bursts sit next to each other.
export async function cullPhotos(
  items: CullInput[],
  opts: {
    target?: number
    eyes?: boolean
    onProgress?: (done: number, total: number, phase: 'sharp' | 'eyes') => void
  } = {},
): Promise<{ results: CullResult[]; eyesOk: boolean }> {
  const analyses: Analysis[] = new Array(items.length).fill(null)
  let done = 0
  let next = 0
  async function worker() {
    while (true) {
      const i = next++
      if (i >= items.length) return
      try {
        analyses[i] = await analyse(items[i].url)
      } catch {
        analyses[i] = null
      }
      done++
      opts.onProgress?.(done, items.length, 'sharp')
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()))

  // Face check on the bigger web copies: closed eyes and how sharp the main face is.
  const reports: (FaceReport | null)[] = items.map(() => null)
  let eyesOk = false
  if (opts.eyes) {
    eyesOk = await faceEyesReady()
    if (eyesOk) {
      let pending = fetchBlob(items[0]?.webUrl)
      for (let i = 0; i < items.length; i++) {
        const blob = await pending
        pending = fetchBlob(items[i + 1]?.webUrl)
        if (blob) {
          try {
            const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
            try {
              reports[i] = await faceReport(bmp)
            } finally {
              bmp.close()
            }
          } catch { /* skip this photo */ }
        }
        opts.onProgress?.(i + 1, items.length, 'eyes')
        await new Promise((r) => setTimeout(r, 0))
      }
    }
  }
  const closedN = reports.map((r) => (r ? r.closed : 0))
  const faceN = reports.map((r) => (r ? r.count : 0))
  const closed = closedN.map((n) => n > 0)
  const faceVals = reports.map((r) => (r ? r.faceSharp : null))

  const valid = analyses.filter((a): a is NonNullable<Analysis> => !!a)
  const med = median(valid.map((a) => a.sharp)) > 0 ? median(valid.map((a) => a.sharp)) : 1
  const medMean = median(valid.map((a) => a.mean))
  const medFace = median(faceVals.filter((v): v is number => v !== null))
  const single = (s: number): CullLabel => {
    const rel = s / med
    return rel < 0.35 ? 'reject' : rel < 0.6 ? 'maybe' : 'pick'
  }

  const labels: CullLabel[] = items.map(() => 'maybe')
  const reasons: (string | null)[] = items.map(() => null)
  const scores: number[] = analyses.map((a) => (a ? a.sharp : 0))
  analyses.forEach((a, i) => {
    if (!a) return
    let l = single(a.sharp)
    let why: string | null = l === 'reject' ? 'Soft' : l === 'maybe' ? 'Slightly soft' : null
    // The face matters most: a sharp face rescues a soft frame, a soft face sinks a sharp one.
    const fs = faceVals[i]
    if (fs !== null && medFace > 0) {
      const rel = fs / medFace
      if (rel >= 0.8 && l !== 'pick') { l = 'pick'; why = null }
      else if (rel < 0.25) { l = 'reject'; why = 'Face is soft' }
      else if (rel < 0.5 && l === 'pick') { l = 'maybe'; why = 'Face slightly soft' }
    }
    if (l === 'pick' && a.clipHi > 0.2) { l = 'maybe'; why = 'Blown out' }
    else if (l === 'pick' && medMean > 0 && a.mean < 40 && a.mean < medMean * 0.5) { l = 'maybe'; why = 'Very dark' }
    labels[i] = l
    reasons[i] = why
  })
  items.forEach((_, i) => {
    if (closed[i] && labels[i] !== 'reject') {
      labels[i] = 'maybe'
      reasons[i] = faceN[i] > 1 ? `${closedN[i]} of ${faceN[i]} people have closed eyes` : 'Eyes closed'
    }
  })

  // Group near-identical frames anywhere in the shoot. Close neighbors can differ a bit more than far-apart ones.
  const parent = items.map((_, i) => i)
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  for (let i = 0; i < items.length; i++) {
    const a = analyses[i]
    if (!a) continue
    for (let j = Math.max(0, i - 60); j < i; j++) {
      const b = analyses[j]
      if (!b) continue
      const lim = i - j <= 4 ? 10 : 6
      if (hamming(a.hash, b.hash) <= lim) {
        const ra = find(j)
        const rb = find(i)
        if (ra !== rb) parent[rb] = ra
      }
    }
  }
  const buckets = new Map<number, number[]>()
  items.forEach((_, i) => {
    if (!analyses[i]) return
    const r = find(i)
    const arr = buckets.get(r) ?? []
    arr.push(i)
    buckets.set(r, arr)
  })
  const groups = Array.from(buckets.values()).filter((g) => g.length > 1).map((g) => g.sort((x, y) => x - y))

  const groupId: (string | null)[] = items.map(() => null)
  groups.forEach((members, k) => {
    const open = members.filter((i) => !closed[i])
    const pool = open.length ? open : members
    let best = pool[0]
    for (const i of pool) if (scores[i] > scores[best]) best = i
    for (const i of members) {
      groupId[i] = `g${k}`
      if (i !== best) {
        labels[i] = 'reject'
        reasons[i] = closed[i] ? 'Eyes closed' : 'Near-duplicate of a better frame'
      }
    }
  })

  if (opts.target && opts.target > 0) {
    const picks = labels.map((l, i) => (l === 'pick' ? i : -1)).filter((i) => i >= 0).sort((a, b) => scores[b] - scores[a])
    for (const i of picks.slice(opts.target)) {
      labels[i] = 'maybe'
      reasons[i] = 'Over your target'
    }
  }

  return {
    results: items.map((it, i) => ({ id: it.id, score: scores[i], label: labels[i], group: groupId[i], reason: reasons[i] })),
    eyesOk,
  }
}
