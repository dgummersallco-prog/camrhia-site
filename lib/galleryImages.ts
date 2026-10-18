export type Version = { blob: Blob; width: number; height: number }
export type Versions = { web: Version; thumb: Version; width: number; height: number }

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

// Decodes a photo once and produces a web-size copy (2048px) and a thumbnail (480px).
export async function makeVersions(file: File): Promise<Versions> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const webCanvas = scaled(bmp, 2048)
    const thumbCanvas = scaled(bmp, 480)
    const web = { blob: await encode(webCanvas, 0.85), width: webCanvas.width, height: webCanvas.height }
    const thumb = { blob: await encode(thumbCanvas, 0.8), width: thumbCanvas.width, height: thumbCanvas.height }
    return { web, thumb, width: bmp.width, height: bmp.height }
  } finally {
    bmp.close()
  }
}
