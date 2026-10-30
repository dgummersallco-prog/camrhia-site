export type Version = { blob: Blob; width: number; height: number }
export type Versions = { web: Version; thumb: Version; width: number; height: number; full?: Blob }

export function isHeic(f: File): boolean {
  return /image\/hei[cf]/i.test(f.type) || /\.(heic|heif)$/i.test(f.name)
}

const RAW_EXT = /\.(cr2|cr3|crw|nef|nrw|arw|srf|sr2|dng|orf|rw2|raf|pef|3fr|erf|kdc|mrw|raw|rwl|iiq)$/i
export function isRaw(f: File): boolean {
  return RAW_EXT.test(f.name)
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not process this photo.'))),
      'image/jpeg',
      quality,
    )
  })
}

function scaled(bmp: ImageBitmap, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale))
  const h = Math.max(1, Math.round(bmp.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot process photos.')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bmp, 0, 0, w, h)
  return canvas
}

// ---- RAW support: pull the full-size JPEG that cameras store inside every RAW file ----

function findSeq(b: Uint8Array, seq: number[], from = 0, to = b.length): number {
  const end = Math.min(to, b.length) - seq.length
  for (let i = from; i <= end; i++) {
    if (b[i] !== seq[0]) continue
    let ok = true
    for (let k = 1; k < seq.length; k++) {
      if (b[i + k] !== seq[k]) { ok = false; break }
    }
    if (ok) return i
  }
  return -1
}

// Reads the "Orientation" tag from a TIFF block that starts at `start`. Returns 0 if not found.
function tiffOrientation(b: Uint8Array, start: number): number {
  try {
    if (start < 0 || start + 8 > b.length) return 0
    const le = b[start] === 0x49 && b[start + 1] === 0x49
    const be = b[start] === 0x4d && b[start + 1] === 0x4d
    if (!le && !be) return 0
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
    if (dv.getUint16(start + 2, le) !== 42) return 0
    const ifd = start + dv.getUint32(start + 4, le)
    if (ifd + 2 > b.length) return 0
    const n = dv.getUint16(ifd, le)
    for (let k = 0; k < n && k < 200; k++) {
      const e = ifd + 2 + k * 12
      if (e + 12 > b.length) break
      if (dv.getUint16(e, le) === 0x0112) {
        const v = dv.getUint16(e + 8, le)
        return v >= 1 && v <= 8 ? v : 0
      }
    }
  } catch { /* ignore */ }
  return 0
}

function rawOrientation(b: Uint8Array): number {
  const tiffLE = b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0
  const tiffBE = b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a
  let start = 0
  if (!tiffLE && !tiffBE) {
    const limit = 512 * 1024
    const a = findSeq(b, [0x49, 0x49, 0x2a, 0x00], 0, limit)
    const m = findSeq(b, [0x4d, 0x4d, 0x00, 0x2a], 0, limit)
    start = a >= 0 && (m < 0 || a < m) ? a : m
    if (start < 0) return 0
  }
  return tiffOrientation(b, start)
}

// Finds where a JPEG that starts at `start` ends, walking its segments properly. -1 if it is not a normal JPEG.
function jpegEnd(b: Uint8Array, start: number): number {
  let i = start + 2
  while (i < b.length - 1) {
    if (b[i] !== 0xff) return -1
    const m = b[i + 1]
    if (m === 0xff) { i++; continue }
    if (m === 0x00) return -1
    if (m === 0xd9) return i + 2
    if (m === 0x01 || m === 0xd8 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue }
    if (i + 4 > b.length) return -1
    const len = (b[i + 2] << 8) | b[i + 3]
    if (len < 2) return -1
    // lossless / arithmetic JPEGs (the RAW data itself) cannot be shown by browsers
    if (m === 0xc3 || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) return -1
    i += 2 + len
    if (m === 0xda) {
      while (i < b.length - 1) {
        if (b[i] === 0xff) {
          const n = b[i + 1]
          if (n === 0x00 || (n >= 0xd0 && n <= 0xd7)) { i += 2; continue }
          if (n === 0xff) { i++; continue }
          break
        }
        i++
      }
    }
  }
  return -1
}

function embeddedJpegs(b: Uint8Array): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  let i = 0
  while (i < b.length - 3) {
    const k = b.indexOf(0xff, i)
    if (k < 0 || k > b.length - 4) break
    if (b[k + 1] === 0xd8 && b[k + 2] === 0xff) {
      const end = jpegEnd(b, k)
      if (end > 0 && end - k > 30000) {
        out.push({ start: k, end })
        i = end
        continue
      }
    }
    i = k + 1
  }
  return out.sort((x, y) => y.end - y.start - (x.end - x.start))
}

async function rotated(bmp: ImageBitmap, o: number): Promise<Blob> {
  const w = bmp.width
  const h = bmp.height
  const swap = o >= 5
  const canvas = document.createElement('canvas')
  canvas.width = swap ? h : w
  canvas.height = swap ? w : h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot process photos.')
  const t: Record<number, [number, number, number, number, number, number]> = {
    2: [-1, 0, 0, 1, w, 0],
    3: [-1, 0, 0, -1, w, h],
    4: [1, 0, 0, -1, 0, h],
    5: [0, 1, 1, 0, 0, 0],
    6: [0, 1, -1, 0, h, 0],
    7: [0, -1, -1, 0, h, w],
    8: [0, -1, 1, 0, 0, w],
  }
  const m = t[o]
  if (m) ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5])
  ctx.drawImage(bmp, 0, 0)
  return encode(canvas, 0.95)
}

// Returns the biggest viewable JPEG inside a RAW file, turned the right way up.
async function rawPreview(file: File): Promise<Blob> {
  const b = new Uint8Array(await file.arrayBuffer())
  const rawOri = rawOrientation(b)
  for (const c of embeddedJpegs(b).slice(0, 6)) {
    const bytes = b.subarray(c.start, c.end)
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    let probe: ImageBitmap
    try {
      probe = await createImageBitmap(blob, { imageOrientation: 'none' })
    } catch {
      continue
    }
    try {
      if (Math.max(probe.width, probe.height) < 1000) continue
      const ex = findSeq(bytes, [0x45, 0x78, 0x69, 0x66, 0, 0], 0, 65536)
      const ownTag = ex >= 0 ? tiffOrientation(bytes, ex + 6) : 0
      if (ownTag > 0 || rawOri <= 1) return blob
      return await rotated(probe, rawOri)
    } finally {
      probe.close()
    }
  }
  throw new Error('Could not read a preview from this RAW file.')
}

// Decodes a photo once and produces a web-size copy (2048px) and a thumbnail (480px).
// For RAW files it also returns `full`: the full-size JPEG that clients download.
export async function makeVersions(file: File): Promise<Versions> {
  let source: Blob = file
  let full: Blob | undefined
  if (isRaw(file)) {
    full = await rawPreview(file)
    source = full
  } else if (isHeic(file)) {
    const mod = await import('heic2any')
    const out = await mod.default({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    source = Array.isArray(out) ? out[0] : out
  }
  const bmp = await createImageBitmap(source, { imageOrientation: 'from-image' })
  try {
    const webCanvas = scaled(bmp, 2048)
    const thumbCanvas = scaled(bmp, 480)
    const web = { blob: await encode(webCanvas, 0.85), width: webCanvas.width, height: webCanvas.height }
    const thumb = { blob: await encode(thumbCanvas, 0.8), width: thumbCanvas.width, height: thumbCanvas.height }
    return { web, thumb, width: bmp.width, height: bmp.height, full }
  } finally {
    bmp.close()
  }
}
