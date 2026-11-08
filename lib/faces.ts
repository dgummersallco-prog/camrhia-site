import type { FaceLandmarker } from '@mediapipe/tasks-vision'

let ready: Promise<FaceLandmarker | null> | null = null

function load(): Promise<FaceLandmarker | null> {
  if (!ready) {
    ready = (async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
        return await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
          runningMode: 'IMAGE',
          numFaces: 6,
          outputFaceBlendshapes: true,
        })
      } catch {
        return null
      }
    })()
  }
  return ready
}

export async function faceEyesReady(): Promise<boolean> {
  return (await load()) !== null
}

// true = at least one face has closed eyes, false = faces found with eyes open, null = no face found
export async function eyesClosed(bmp: ImageBitmap): Promise<boolean | null> {
  const lm = await load()
  if (!lm) return null
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bmp.width * scale))
  canvas.height = Math.max(1, Math.round(bmp.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const res = lm.detect(canvas)
  const faces = res.faceBlendshapes ?? []
  if (faces.length === 0) return null
  let closed = false
  for (const f of faces) {
    const get = (n: string) => f.categories.find((c) => c.categoryName === n)?.score ?? 0
    if ((get('eyeBlinkLeft') + get('eyeBlinkRight')) / 2 >= 0.6) closed = true
  }
  return closed
}

export type FaceReport = { count: number; closed: number; faceSharp: number | null }

// Faces found, how many have closed eyes, and how sharp the biggest face is (null if no face is big enough).
export async function faceReport(bmp: ImageBitmap): Promise<FaceReport | null> {
  const lm = await load()
  if (!lm) return null
  const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bmp.width * scale))
  canvas.height = Math.max(1, Math.round(bmp.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const res = lm.detect(canvas)
  const shapes = res.faceBlendshapes ?? []
  const marks = res.faceLandmarks ?? []
  if (shapes.length === 0) return { count: 0, closed: 0, faceSharp: null }
  let closed = 0
  for (const f of shapes) {
    const get = (n: string) => f.categories.find((c) => c.categoryName === n)?.score ?? 0
    if ((get('eyeBlinkLeft') + get('eyeBlinkRight')) / 2 >= 0.6) closed++
  }
  let bestW = 0
  let box: { x0: number; y0: number; x1: number; y1: number } | null = null
  for (const pts of marks) {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0
    for (const p of pts) {
      if (p.x < x0) x0 = p.x
      if (p.x > x1) x1 = p.x
      if (p.y < y0) y0 = p.y
      if (p.y > y1) y1 = p.y
    }
    if (x1 - x0 > bestW) { bestW = x1 - x0; box = { x0, y0, x1, y1 } }
  }
  let faceSharp: number | null = null
  if (box && bestW >= 0.12) {
    const pad = 0.15
    const bw = box.x1 - box.x0
    const bh = box.y1 - box.y0
    const sx = Math.max(0, (box.x0 - bw * pad) * canvas.width)
    const sy = Math.max(0, (box.y0 - bh * pad) * canvas.height)
    const sw = Math.min(canvas.width - sx, bw * (1 + 2 * pad) * canvas.width)
    const sh = Math.min(canvas.height - sy, bh * (1 + 2 * pad) * canvas.height)
    if (sw > 8 && sh > 8) {
      const S = 128
      const fc = document.createElement('canvas')
      fc.width = S
      fc.height = S
      const fctx = fc.getContext('2d', { willReadFrequently: true })
      if (fctx) {
        fctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, S, S)
        const d = fctx.getImageData(0, 0, S, S).data
        const g = new Float32Array(S * S)
        for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
        let sum = 0
        let sum2 = 0
        let n = 0
        for (let y = 1; y < S - 1; y++) {
          for (let x = 1; x < S - 1; x++) {
            const i = y * S + x
            const l = g[i - S] + g[i + S] + g[i - 1] + g[i + 1] - 4 * g[i]
            sum += l
            sum2 += l * l
            n++
          }
        }
        const m = sum / n
        faceSharp = sum2 / n - m * m
      }
    }
  }
  return { count: shapes.length, closed, faceSharp }
}
