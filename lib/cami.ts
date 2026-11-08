import type { Adjust } from '@/lib/enhance'
import { BANDS } from '@/lib/hsl'

export type CamiReading = {
  median: number
  p1: number
  p5: number
  p95: number
  p99: number
  clipHi: number
  clipLo: number
  darkShare: number
  warmth: number
  greenCast: number
  sat: number
  neutralShare: number
  skinShare: number
  skinWarmth: number
  skinTint: number
  hueBins: number
  blueShare: number
}
export type Baseline = { median: number; warmth: number }
export type CamiFix = { adjust: Adjust; notes: string[]; reading: CamiReading; raw: Adjust }

const r2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
const lin = (v: number) => Math.pow(Math.max(1, v) / 255, 2.2)
const med = (a: number[]) => {
  const q = [...a].sort((x, y) => x - y)
  return q[Math.floor(q.length / 2)]
}

// Reads a photo the way an editor reads a histogram, a color cast and skin.
export async function camiRead(blob: Blob): Promise<CamiReading> {
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, 256 / Math.max(bmp.width, bmp.height))
    const w = Math.max(16, Math.round(bmp.width * scale))
    const h = Math.max(16, Math.round(bmp.height * scale))
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(bmp, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    const hist = new Array(256).fill(0)
    const hueCount = new Array(12).fill(0)
    const n = d.length / 4
    let nr = 0, ng = 0, nb = 0, nc = 0
    let skR = 0, skG = 0, skB = 0, skN = 0
    let hueTotal = 0
    let sat = 0, satN = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      hist[l]++
      const mx = Math.max(r, g, b)
      const mn = Math.min(r, g, b)
      if (mx > 20) { sat += (mx - mn) / mx; satN++ }
      if (mx - mn < 36 && l > 45 && l < 215) { nr += r; ng += g; nb += b; nc++ }
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
      if (cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173 && l > 50 && l < 235 && r > g && g > b) { skR += r; skG += g; skB += b; skN++ }
      if (mx > 40 && (mx - mn) / mx > 0.25) {
        const dl = mx - mn
        let hh: number
        if (mx === r) hh = ((g - b) / dl) % 6
        else if (mx === g) hh = (b - r) / dl + 2
        else hh = (r - g) / dl + 4
        if (hh < 0) hh += 6
        hueCount[Math.min(11, Math.floor(hh * 2))]++
        hueTotal++
      }
    }
    const pct = (p: number) => {
      let acc = 0
      for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * p) return v }
      return 255
    }
    let hi = 0, lo = 0, dark = 0
    for (let v = 0; v < 256; v++) {
      if (v >= 250) hi += hist[v]
      if (v <= 5) lo += hist[v]
      if (v < 30) dark += hist[v]
    }
    const mr = nc ? nr / nc : 0
    const mg = nc ? ng / nc : 0
    const mb = nc ? nb / nc : 0
    const avg = (mr + mg + mb) / 3
    const skAvg = skN ? (skR + skG + skB) / (3 * skN) : 0
    const bins = hueTotal > n * 0.01 ? hueCount.filter((x) => x > hueTotal * 0.08).length : 0
    return {
      median: pct(0.5), p1: pct(0.01), p5: pct(0.05), p95: pct(0.95), p99: pct(0.99),
      clipHi: hi / n, clipLo: lo / n, darkShare: dark / n,
      warmth: nc && mr + mb > 0 ? (mr - mb) / (mr + mb) : 0,
      greenCast: nc && avg > 0 ? (mg - (mr + mb) / 2) / avg : 0,
      sat: satN ? sat / satN : 0,
      neutralShare: nc / n,
      skinShare: skN / n,
      skinWarmth: skN && skR + skB > 0 ? (skR - skB) / (skR + skB) : 0,
      skinTint: skN && skAvg > 0 ? (skG / skN - (skR / skN + skB / skN) / 2) / skAvg : 0,
      hueBins: bins,
      blueShare: hueTotal > n * 0.01 ? (hueCount[7] + hueCount[8]) / hueTotal : 0,
    }
  } finally {
    bmp.close()
  }
}

// What each scene looks like on average, so every photo in it can be matched to the same look.
export function camiBaselines(readings: Record<string, CamiReading>, sceneOf: Record<string, string>): Record<string, Baseline> {
  const by: Record<string, CamiReading[]> = {}
  for (const id of Object.keys(readings)) {
    const s = sceneOf[id]
    if (!s) continue
    if (!by[s]) by[s] = []
    by[s].push(readings[id])
  }
  const out: Record<string, Baseline> = {}
  for (const s of Object.keys(by)) {
    const list = by[s]
    if (list.length < 3) continue
    const neutrals = list.filter((r) => r.neutralShare > 0.03)
    out[s] = { median: med(list.map((r) => r.median)), warmth: neutrals.length >= 3 ? med(neutrals.map((r) => r.warmth)) : 0 }
  }
  return out
}

// How good a black and white candidate this photo is (0-4), or -1 if color is doing real work.
function bwScore(rd: CamiReading): number {
  if (rd.sat > 0.45 || rd.hueBins >= 5) return -1
  let s = 0
  if (rd.p95 - rd.p5 >= 170 && rd.clipHi < 0.03) s++
  if (rd.sat < 0.2) s++
  if (rd.hueBins <= 2) s++
  if (rd.skinShare > 0.03) s++
  if (Math.abs(rd.warmth) > 0.15 || Math.abs(rd.greenCast) > 0.06) s++
  return s
}

// Only the best few: about 3% of the shoot, and none on small shoots.
export function camiPickBW(readings: Record<string, CamiReading>, sceneOf: Record<string, string> = {}): Set<string> {
  const ids = Object.keys(readings)
  const cap = ids.length < 10 ? 0 : Math.max(1, Math.floor(ids.length * 0.03))
  const scored = ids.map((id) => ({ id, rd: readings[id], s: bwScore(readings[id]) })).filter((x) => x.s >= 3)
  scored.sort((a, b) => b.s - a.s || b.rd.p95 - b.rd.p5 - (a.rd.p95 - a.rd.p5))
  const perScene: Record<string, number> = {}
  const out = new Set<string>()
  for (const x of scored) {
    if (out.size >= cap) break
    const sc = sceneOf[x.id] ?? 'none'
    if ((perScene[sc] ?? 0) >= 2) continue
    perScene[sc] = (perScene[sc] ?? 0) + 1
    out.add(x.id)
  }
  return out
}

// Turns a reading into slider changes, with a plain reason for each.
// With a scene baseline, every photo in the scene is pulled toward the same brightness and color.
export function camiFix(rd: CamiReading, base: Baseline | null = null, bias: CamiBias | null = null, look: string | null = null): CamiFix {
  const soft = look === 'airy' || look === 'matte' || look === 'film' || look === 'bright'
  const zone: [number, number] = look === 'airy' || look === 'bright' ? [120, 175] : look === 'moody' ? [70, 125] : [108, 138]
  const a: Adjust = {}
  const notes: string[] = []
  const set = (k: keyof Adjust, v: number) => { if (Math.abs(v) >= 0.03) (a as Record<string, number>)[k as string] = r2(v) }

  // Exposure
  const target = clamp(base ? base.median : rd.median, zone[0], zone[1])
  let ex = clamp(0.7 * Math.log2(lin(target) / lin(rd.median)), -0.5, 0.5)
  if (ex > 0 && rd.clipHi > 0.04) ex = 0
  if (Math.abs(ex) >= 0.08) {
    set('exposure', ex)
    if (base && Math.abs(rd.median - base.median) > 12) notes.push('Matched the brightness to the rest of this scene.')
    else notes.push(ex > 0 ? 'Brightened it, the photo was reading dark.' : 'Brought the brightness down, the photo was reading bright.')
  }

  // Highlights and whites
  if (rd.clipHi > 0.015) {
    set('highlights', -Math.min(0.7, rd.clipHi * 10 + 0.15))
    notes.push('Pulled back highlights that were blowing out.')
  } else if (rd.p99 < 215 && rd.median > 70 && !soft) {
    set('whites', Math.min(0.3, ((245 - rd.p99) / 255) * 1.2))
    notes.push('Opened the whites so the brightest parts have some sparkle.')
  }

  // Shadows and blacks. Never lift shadows when the blacks are already milky.
  if (rd.darkShare > 0.15 && rd.median > 80 && rd.p1 <= 22) {
    set('shadows', Math.min(0.4, rd.darkShare))
    notes.push('Lifted the shadows to bring back detail.')
  }
  if (rd.clipLo > 0.04) {
    set('blacks', Math.min(0.3, rd.clipLo * 3))
    notes.push('Eased the darkest areas that were crushing to pure black.')
  } else if (rd.p1 > 28 && !soft) {
    set('blacks', -Math.min(0.4, ((rd.p1 - 20) / 255) * 2.5))
    notes.push('Deepened the blacks, the photo looked flat and milky.')
  }

  // Contrast
  const spread = rd.p95 - rd.p5
  if (spread < 120 && !soft) {
    set('contrast', Math.min(0.25, ((120 - spread) / 120) * 0.5))
    notes.push('Added contrast, the tones were bunched together.')
  } else if (spread > 215) {
    set('contrast', -0.1)
    notes.push('Softened contrast, the tones were stretched too far.')
  }

  // White balance: neutral parts first, matched to the scene, then checked against skin
  const tol = (w: number) => (w > 0.12 ? w - 0.12 : w < -0.03 ? w + 0.03 : 0)
  const hasNeutral = rd.neutralShare > 0.03
  const sceneWarm = base ? base.warmth : rd.warmth
  let temp = 0
  if (hasNeutral || base) {
    const dev = hasNeutral ? rd.warmth - sceneWarm : 0
    temp = -((base ? 0.6 : 1) * tol(sceneWarm) + dev) * 1.2
  }
  let skinActed = false
  if (rd.skinShare > 0.02) {
    if (rd.skinWarmth >= 0.15 && rd.skinWarmth <= 0.38) {
      if (temp !== 0) { temp *= 0.5; skinActed = true }
    } else if (rd.skinWarmth > 0.38) {
      temp -= (rd.skinWarmth - 0.38) * 0.8
      skinActed = true
    } else {
      temp += (0.15 - rd.skinWarmth) * 0.8
      skinActed = true
    }
  }
  temp = clamp(temp, -0.25, 0.25)
  if (Math.abs(temp) >= 0.03) {
    set('temp', temp)
    if (skinActed) notes.push('Adjusted the white balance to keep skin tones natural.')
    else if (base) notes.push(temp < 0 ? 'Cooled the white balance to match this scene.' : 'Warmed the white balance to match this scene.')
    else notes.push(temp < 0 ? 'Cooled the white balance, whites were reading warm.' : 'Warmed the white balance, whites were reading cool.')
  }

  let tint = 0
  if (hasNeutral && Math.abs(rd.greenCast) > 0.02) tint = clamp(rd.greenCast * 1.5, -0.2, 0.2)
  let tintOnSkin = false
  if (rd.skinShare > 0.02) {
    const dv = rd.skinTint + 0.09
    if (Math.abs(dv) > 0.05) { tint = clamp(tint * 0.5 + dv * 1.2, -0.2, 0.2); tintOnSkin = true }
    else tint *= 0.5
  }
  if (Math.abs(tint) >= 0.03) {
    set('tint', tint)
    if (tintOnSkin) notes.push('Corrected a color tint on skin tones.')
    else notes.push(tint > 0 ? 'Removed a green tint.' : 'Removed a magenta tint.')
  }

  // Color richness
  if (rd.sat > 0.03) {
    if (rd.sat < 0.14) {
      set('vibrance', 0.15)
      notes.push('Added a touch of vibrance, the color was dull.')
    } else if (rd.sat > 0.55) {
      set('saturation', -0.1)
      notes.push('Toned the color down a little, it was oversaturated.')
    }
  }

  const raw: Adjust = { ...a }
  const b = bias && Object.keys(a).length > 0 ? biasFor(bias, rd) : null
  if (b) {
    const am = a as Record<string, number>
    let used = false
    for (const k of Object.keys(b)) {
      if (Math.abs(b[k]) >= 0.03) used = true
      am[k] = r2(clamp((am[k] ?? 0) + b[k], -1, 1))
    }
    for (const k of Object.keys(am)) if (Math.abs(am[k]) < 0.03) delete am[k]
    if (used) notes.push('Adjusted to match how you usually edit.')
  }
  if (notes.length === 0) notes.push('Looks great. The exposure, color and tones are already well balanced, so Cami left it alone.')
  return { adjust: a, notes, reading: rd, raw }
}

// ---- Learning from the photographer's final edits ----
const LEARN_KEYS = ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks', 'temp', 'tint', 'vibrance', 'saturation']
export type CamiBias = Record<string, { n: number; sum: Record<string, number> }>
export type FeedbackRow = { features: CamiReading | null; suggested: Adjust | null; final: Adjust | null }

export function camiBucket(rd: CamiReading): string {
  return (rd.median < 90 ? 'dark' : rd.median > 150 ? 'bright' : 'mid') + '|' + (rd.skinShare > 0.02 ? 'skin' : 'noskin')
}

// Averages how far the photographer moved each slider away from what Cami suggested.
export function camiLearn(rows: FeedbackRow[]): CamiBias {
  const out: CamiBias = {}
  const add = (key: string, sug: Record<string, number>, fin: Record<string, number>) => {
    if (!out[key]) out[key] = { n: 0, sum: {} }
    const e = out[key]
    e.n++
    for (const k of LEARN_KEYS) e.sum[k] = (e.sum[k] ?? 0) + ((fin[k] ?? 0) - (sug[k] ?? 0))
  }
  for (const r of rows) {
    if (!r.features || !r.final) continue
    const sug = (r.suggested ?? {}) as Record<string, number>
    const fin = r.final as Record<string, number>
    add(camiBucket(r.features), sug, fin)
    add('all', sug, fin)
  }
  return out
}

function biasFor(bias: CamiBias, rd: CamiReading): Record<string, number> | null {
  const own = bias[camiBucket(rd)]
  const e = own && own.n >= 5 ? own : bias['all']
  if (!e || e.n < 5) return null
  const out: Record<string, number> = {}
  for (const k of LEARN_KEYS) {
    const v = (0.7 * (e.sum[k] ?? 0)) / e.n
    if (Math.abs(v) >= 0.02) out[k] = v
  }
  return Object.keys(out).length > 0 ? out : null
}

// What the photographer changed on top of the starting point.
export function camiDelta(final: Adjust, before: Adjust): Adjust {
  const f = final as Record<string, number>
  const bf = before as Record<string, number>
  const out: Record<string, number> = {}
  for (const k of LEARN_KEYS) {
    const v = (f[k] ?? 0) - (bf[k] ?? 0)
    if (Math.abs(v) >= 0.005) out[k] = r2(v)
  }
  return out as Adjust
}

// A short label for the biggest problem Cami would fix, or null if the photo is fine.
export function camiFlag(adj: Adjust): string | null {
  const a = adj as Record<string, number>
  if ((a.exposure ?? 0) >= 0.3) return 'Too dark'
  if ((a.exposure ?? 0) <= -0.3) return 'Too bright'
  if ((a.highlights ?? 0) <= -0.5) return 'Blown highlights'
  if (Math.abs(a.temp ?? 0) >= 0.15) return (a.temp ?? 0) < 0 ? 'Looks too warm' : 'Looks too cool'
  if (Math.abs(a.tint ?? 0) >= 0.12) return 'Color tint'
  if ((a.blacks ?? 0) <= -0.3) return 'Flat and milky'
  if ((a.blacks ?? 0) >= 0.2) return 'Crushed shadows'
  if ((a.saturation ?? 0) <= -0.1) return 'Oversaturated'
  if ((a.contrast ?? 0) <= -0.1) return 'Too contrasty'
  return null
}

// A guess at the main light of a scene from a few of its photos. Empty when she is not sure.
export function camiGuessLight(rds: CamiReading[]): string {
  if (rds.length < 3) return ''
  const bright = med(rds.map((r) => r.median))
  const spread = med(rds.map((r) => r.p95 - r.p5))
  const clip = med(rds.map((r) => r.clipHi))
  const neutrals = rds.filter((r) => r.neutralShare > 0.03)
  const warm = neutrals.length >= 3 ? med(neutrals.map((r) => r.warmth)) : null
  if (bright < 80) return 'dark_flash'
  if (bright > 150 && spread > 185 && clip > 0.01) return 'harsh_sun'
  if (warm !== null && warm > 0.12 && spread > 140) return 'golden_hour'
  if (warm !== null && warm < 0 && bright >= 110 && bright <= 170) return 'open_shade'
  if (spread < 130 && bright >= 100 && (warm === null || Math.abs(warm) < 0.12)) return 'overcast'
  return ''
}

// The colour band whose centre is closest to this hue, as a brightness key.
function lKey(hue: number): string {
  let best = BANDS[0]
  let bd = 999
  for (const b of BANDS) {
    const d = Math.abs(((hue - b.center + 540) % 360) - 180)
    if (d < bd) { bd = d; best = b }
  }
  return 'l_' + best.id
}

// A proper black and white conversion: brighter, smoother skin and darker blue skies.
export function camiBWAdjust(rd: CamiReading): Adjust {
  const a: Record<string, number> = { bw: 1 }
  if (rd.skinShare > 0.03) {
    a[lKey(0)] = 0.4
    a[lKey(30)] = 0.6
  }
  if (rd.blueShare > 0.25) {
    a[lKey(230)] = -0.6
    a[lKey(190)] = -0.3
  }
  return a as Adjust
}
