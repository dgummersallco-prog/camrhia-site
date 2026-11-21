export type ExportPreset = { id: string; label: string; note: string; maxEdge: number; quality: number; sharpen: number }

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: 'original', label: 'Full size', note: 'As edited, nothing changed', maxEdge: 0, quality: 0, sharpen: 0 },
  { id: 'print', label: 'Print', note: 'Full size, top quality', maxEdge: 0, quality: 0.95, sharpen: 0 },
  { id: 'gallery', label: 'Gallery', note: '2048 px, sharpened for screens', maxEdge: 2048, quality: 0.85, sharpen: 0.3 },
  { id: 'social', label: 'Instagram', note: '1350 px, sharpened', maxEdge: 1350, quality: 0.85, sharpen: 0.4 },
  { id: 'email', label: 'Email', note: '1200 px, small files', maxEdge: 1200, quality: 0.8, sharpen: 0.3 },
]

function sharpenData(d: Uint8ClampedArray, w: number, h: number, amt: number) {
  const src = new Uint8ClampedArray(d)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const v = src[i + c]
        const n = src[i + c - 4] + src[i + c + 4] + src[i + c - w * 4] + src[i + c + w * 4]
        d[i + c] = v + amt * (4 * v - n)
      }
    }
  }
}

export async function exportBlob(blob: Blob, presetId: string, mark: string): Promise<Blob> {
  const p = EXPORT_PRESETS.find((x) => x.id === presetId) ?? EXPORT_PRESETS[0]
  const text = mark.trim()
  if (p.id === 'original' && !text) return blob
  const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' })
  const long = Math.max(bmp.width, bmp.height)
  const k = p.maxEdge > 0 && long > p.maxEdge ? p.maxEdge / long : 1
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  try {
    const ctx = c.getContext('2d', { willReadFrequently: true })
    if (!ctx) return blob
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, w, h)
    if (k < 1 && p.sharpen > 0) {
      const img = ctx.getImageData(0, 0, w, h)
      sharpenData(img.data, w, h, p.sharpen)
      ctx.putImageData(img, 0, 0)
    }
    if (text) {
      const size = Math.max(14, Math.round(Math.max(w, h) * 0.02))
      ctx.font = `${size}px sans-serif`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0,0,0,0.55)'
      ctx.shadowBlur = size * 0.25
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillText(text, w - size, h - size)
    }
    const out: Blob | null = await new Promise((res) => c.toBlob(res, 'image/jpeg', p.quality || 0.92))
    return out ?? blob
  } finally {
    bmp.close()
    c.width = 0
    c.height = 0
  }
}
