import type { Adjust } from '@/lib/enhance'

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
}
export type CamiFix = { adjust: Adjust; notes: string[]; reading: CamiReading }

const r2 = (n: number) => Math.round(n * 100) / 100
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n))
const lin = (v: number) => Math.pow(Math.max(1, v) / 255, 2.2)

// Reads a photo the way an editor reads a histogram and a color cast.
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
    const n = d.length / 4
    let nr = 0, ng = 0, nb = 0, nc = 0
    let sat = 0, satN = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]
      const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
      hist[l]++
      const mx = Math.max(r, g, b)
      const mn = Math.min(r, g, b)
      if (mx > 20) { sat += (mx - mn) / mx; satN++ }
      if (mx - mn < 36 && l > 45 && l < 215) { nr += r; ng += g; nb += b; nc++ }
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
    return {
      median: pct(0.5), p1: pct(0.01), p5: pct(0.05), p95: pct(0.95), p99: pct(0.99),
      clipHi: hi / n, clipLo: lo / n, darkShare: dark / n,
      warmth: nc && mr + mb > 0 ? (mr - mb) / (mr + mb) : 0,
      greenCast: nc && avg > 0 ? (mg - (mr + mb) / 2) / avg : 0,
      sat: satN ? sat / satN : 0,
      neutralShare: nc / n,
    }
  } finally {
    bmp.close()
  }
}

// Turns a reading into slider changes, with a plain reason for each. Gentle on purpose: she fixes, she doesn't restyle.
export function camiFix(rd: CamiReading): CamiFix {
  const a: Adjust = {}
  const notes: string[] = []
  const set = (k: keyof Adjust, v: number) => { if (Math.abs(v) >= 0.03) (a as Record<string, number>)[k as string] = r2(v) }

  // Exposure: aim the middle of the photo into a healthy zone, only as far as needed.
  const target = clamp(rd.median, 108, 138)
  let ex = clamp(0.7 * Math.log2(lin(target) / lin(rd.median)), -0.5, 0.5)
  if (ex > 0 && rd.clipHi > 0.04) ex = 0
  if (Math.abs(ex) >= 0.08) {
    set('exposure', ex)
    notes.push(ex > 0 ? 'Brightened it, the photo was reading dark.' : 'Brought the brightness down, the photo was reading bright.')
  }

  // Highlights and whites
  if (rd.clipHi > 0.015) {
    set('highlights', -Math.min(0.7, rd.clipHi * 10 + 0.15))
    notes.push('Pulled back highlights that were blowing out.')
  } else if (rd.p99 < 235 && rd.median > 70) {
    set('whites', Math.min(0.3, ((245 - rd.p99) / 255) * 1.2))
    notes.push('Opened the whites so the brightest parts have some sparkle.')
  }

  // Shadows and blacks
  if (rd.darkShare > 0.15 && rd.median > 80) {
    set('shadows', Math.min(0.4, rd.darkShare))
    notes.push('Lifted the shadows to bring back detail.')
  }
  if (rd.clipLo > 0.04) {
    set('blacks', Math.min(0.3, rd.clipLo * 3))
    notes.push('Eased the darkest areas that were crushing to pure black.')
  } else if (rd.p1 > 28) {
    set('blacks', -Math.min(0.4, ((rd.p1 - 20) / 255) * 2.5))
    notes.push('Deepened the blacks, the photo looked flat and milky.')
  }

  // Contrast
  const spread = rd.p95 - rd.p5
  if (spread < 120) {
    set('contrast', Math.min(0.25, ((120 - spread) / 120) * 0.5))
    notes.push('Added contrast, the tones were bunched together.')
  } else if (spread > 215) {
    set('contrast', -0.1)
    notes.push('Softened contrast, the tones were stretched too far.')
  }

  // White balance, read from the neutral parts of the picture
  if (rd.neutralShare > 0.03) {
    if (Math.abs(rd.warmth) > 0.03) {
      set('temp', clamp(-rd.warmth * 1.2, -0.25, 0.25))
      notes.push(rd.warmth > 0 ? 'Cooled the white balance, whites were reading warm.' : 'Warmed the white balance, whites were reading cool.')
    }
    if (Math.abs(rd.greenCast) > 0.02) {
      set('tint', clamp(rd.greenCast * 1.5, -0.2, 0.2))
      notes.push(rd.greenCast > 0 ? 'Removed a green tint.' : 'Removed a magenta tint.')
    }
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

  if (notes.length === 0) notes.push('This one already looks good. Cami left it alone.')
  return { adjust: a, notes, reading: rd }
}
