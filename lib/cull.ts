export type CullLabel = 'pick' | 'maybe' | 'reject'
export type CullInput = { id: string; url: string }
export type CullResult = { id: string; score: number; label: CullLabel; group: string | null }

type Analysis = { sharp: number; hash: boolean[] } | null

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

async function analyse(url: string): Promise<Analysis> {
  const res = await fetch(url)
  if (!res.ok) return null
  const bmp = await createImageBitmap(await res.blob(), { imageOrientation: 'from-image' })
  try {
    return { sharp: sharpness(bmp), hash: dhash(bmp) }
  } finally {
    bmp.close()
  }
}

// Photos must be passed in shoot order so bursts sit next to each other.
export async function cullPhotos(
  items: CullInput[],
  opts: { target?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<CullResult[]> {
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
      opts.onProgress?.(done, items.length)
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()))

  const valid = analyses.filter((a): a is NonNullable<Analysis> => !!a).map((a) => a.sharp).sort((a, b) => a - b)
  const median = valid.length ? valid[Math.floor(valid.length / 2)] : 1
  const med = median > 0 ? median : 1
  const single = (s: number): CullLabel => {
    const rel = s / med
    return rel < 0.35 ? 'reject' : rel < 0.6 ? 'maybe' : 'pick'
  }

  const labels: CullLabel[] = items.map(() => 'maybe')
  const scores: number[] = analyses.map((a) => (a ? a.sharp : 0))
  analyses.forEach((a, i) => { if (a) labels[i] = single(a.sharp) })

  // Group near-identical frames that sit next to each other.
  const groups: number[][] = []
  const st = { cur: [] as number[], ref: null as boolean[] | null }
  const flush = () => {
    if (st.cur.length > 1) groups.push(st.cur)
    st.cur = []
    st.ref = null
  }
  for (let i = 0; i < items.length; i++) {
    const a = analyses[i]
    if (!a) { flush(); continue }
    if (st.ref && hamming(st.ref, a.hash) <= 10) {
      st.cur.push(i)
    } else {
      flush()
      st.cur = [i]
      st.ref = a.hash
    }
  }
  flush()

  const groupId: (string | null)[] = items.map(() => null)
  groups.forEach((members, k) => {
    let best = members[0]
    for (const i of members) if (scores[i] > scores[best]) best = i
    for (const i of members) {
      groupId[i] = `g${k}`
      if (i !== best) labels[i] = 'reject'
    }
  })

  if (opts.target && opts.target > 0) {
    const picks = labels.map((l, i) => (l === 'pick' ? i : -1)).filter((i) => i >= 0).sort((a, b) => scores[b] - scores[a])
    for (const i of picks.slice(opts.target)) labels[i] = 'maybe'
  }

  return items.map((it, i) => ({ id: it.id, score: scores[i], label: labels[i], group: groupId[i] }))
}
