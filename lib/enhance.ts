import { encode, scaled, type Version } from '@/lib/galleryImages'

export type Enhanced = { full: Blob; web: Version; thumb: Version }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// A gentle automatic first-pass edit: levels, exposure, contrast, white balance and a touch of color.
export async function enhancePhoto(source: Blob, path: string): Promise<Enhanced> {
  let blob = source
  if (/\.(heic|heif)$/i.test(path)) {
    const mod = await import('heic2any')
    const out = await mod.default({ blob: source, toType: 'image/jpeg', quality: 0.95 })
    blob = Array.isArray(out) ? out[0] : out
  }
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const canvas = document.createElement('canvas')
  try {
    const w = bmp.width
    const h = bmp.height
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Your browser cannot process photos.')
    ctx.drawImage(bmp, 0, 0)
    const img = ctx.getImageData(0, 0, w, h)
    const d = img.data

    // Measure the photo from a sample of its pixels.
    const hist = new Uint32Array(256)
    let n = 0
    let sr = 0
    let sg = 0
    let sb = 0
    let nm = 0
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 90000)))
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4
        const r = d[i]
        const g = d[i + 1]
        const b = d[i + 2]
        const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
        hist[l]++
        n++
        if (l >= 50 && l <= 205) { sr += r; sg += g; sb += b; nm++ }
      }
    }
    const pct = (p: number) => {
      const t = n * p
      let c = 0
      for (let i = 0; i < 256; i++) {
        c += hist[i]
        if (c >= t) return i
      }
      return 255
    }
    const lo = Math.min(pct(0.005), 24)
    const hi = Math.max(pct(0.995), 215)
    const black = lo * 0.8
    const white = hi + (255 - hi) * 0.2
    const span = Math.max(1, white - black)
    const m = clamp((pct(0.5) - black) / span, 0.05, 0.95)
    const gammaFull = Math.log(0.46) / Math.log(m)
    const gamma = 1 + (clamp(gammaFull, 0.65, 1.35) - 1) * 0.75

    let gainR = 1
    let gainB = 1
    if (nm > 1000) {
      const mr = sr / nm
      const mg = sg / nm
      const mb = sb / nm
      const avg = (mr + mg + mb) / 3
      gainR = 1 + (clamp(avg / mr, 0.92, 1.08) - 1) * 0.6
      gainB = 1 + (clamp(avg / mb, 0.92, 1.08) - 1) * 0.6
    }

    const lut = (gain: number) => {
      const t = new Uint8ClampedArray(256)
      for (let x = 0; x < 256; x++) {
        let v = clamp((x * gain - black) / span, 0, 1)
        v = Math.pow(v, gamma)
        const s = v * v * (3 - 2 * v)
        v = v + (s - v) * 0.35
        t[x] = Math.round(clamp(v, 0, 1) * 255)
      }
      return t
    }
    const lutR = lut(gainR)
    const lutG = lut(1)
    const lutB = lut(gainB)
    const sat = 1.07

    for (let i = 0; i < d.length; i += 4) {
      const r = lutR[d[i]]
      const g = lutG[d[i + 1]]
      const b = lutB[d[i + 2]]
      const l = 0.299 * r + 0.587 * g + 0.114 * b
      d[i] = l + (r - l) * sat
      d[i + 1] = l + (g - l) * sat
      d[i + 2] = l + (b - l) * sat
    }
    ctx.putImageData(img, 0, 0)

    const full = await encode(canvas, 0.92)
    const eb = await createImageBitmap(canvas)
    try {
      const wc = scaled(eb, 2048)
      const tc = scaled(eb, 480)
      const web = { blob: await encode(wc, 0.85), width: wc.width, height: wc.height }
      const thumb = { blob: await encode(tc, 0.8), width: tc.width, height: tc.height }
      return { full, web, thumb }
    } finally {
      eb.close()
    }
  } finally {
    bmp.close()
    canvas.width = 0
    canvas.height = 0
  }
}
