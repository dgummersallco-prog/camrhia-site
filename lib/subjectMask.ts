// Finds the person, or whatever the photographer clicks on, in the browser with Google's MediaPipe.
// Nothing is uploaded: the models run on the photographer's own computer.
const BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14'
const SELFIE = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite'
const TOUCH = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite'

export type AiMask = { w: number; h: number; d: string }

/* eslint-disable @typescript-eslint/no-explicit-any */
let modP: Promise<any> | null = null
function mod(): Promise<any> {
  if (!modP) {
    modP = (async () => {
      const imp = new Function('u', 'return import(u)') as (u: string) => Promise<any>
      const m = await imp(BASE + '/vision_bundle.mjs')
      const fs = await m.FilesetResolver.forVisionTasks(BASE + '/wasm')
      return { m, fs }
    })().catch((e) => { modP = null; throw e })
  }
  return modP
}
let selfieP: Promise<any> | null = null
function selfie(): Promise<any> {
  if (!selfieP) {
    selfieP = mod().then(({ m, fs }) => m.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: SELFIE }, runningMode: 'IMAGE', outputCategoryMask: true, outputConfidenceMasks: false })).catch((e) => { selfieP = null; throw e })
  }
  return selfieP
}
let touchP: Promise<any> | null = null
function touch(): Promise<any> {
  if (!touchP) {
    touchP = mod().then(({ m, fs }) => m.InteractiveSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: TOUCH }, outputCategoryMask: false, outputConfidenceMasks: true })).catch((e) => { touchP = null; throw e })
  }
  return touchP
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function small(bmp: ImageBitmap): HTMLCanvasElement {
  const k = Math.min(1, 1024 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(bmp.width * k))
  c.height = Math.max(1, Math.round(bmp.height * k))
  const g = c.getContext('2d')
  if (!g) throw new Error('no canvas')
  g.drawImage(bmp, 0, 0, c.width, c.height)
  return c
}

// Packs a category mask (any non-zero value counts as "on") into bits for storage.
function pack(u8: Uint8Array, w: number, h: number, allowFlip: boolean): AiMask {
  const on = new Uint8Array(w * h)
  let count = 0
  let edge = 0
  let edgeN = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = u8[y * w + x] ? 1 : 0
      on[y * w + x] = v
      count += v
      if (x < 3 || y < 3 || x >= w - 3 || y >= h - 3) { edgeN++; edge += v }
    }
  }
  // Some model builds mark the background instead of the subject. If the border is mostly "on", flip it.
  const flip = allowFlip && edgeN > 0 && edge / edgeN > 0.6 && count / (w * h) > 0.5
  const bytes = new Uint8Array(Math.ceil((w * h) / 8))
  for (let i = 0; i < w * h; i++) {
    const v = flip ? 1 - on[i] : on[i]
    if (v) bytes[i >> 3] |= 1 << (i & 7)
  }
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return { w, h, d: btoa(bin) }
}

export async function findSubject(bmp: ImageBitmap): Promise<AiMask> {
  const seg = await selfie()
  const res = seg.segment(small(bmp))
  const m = res.categoryMask
  if (!m) throw new Error('no mask')
  const out = pack(m.getAsUint8Array(), m.width, m.height, true)
  try { m.close?.(); res.close?.() } catch {}
  return out
}

// x and y are 0 to 1 across the photo. Uses the model's confidence mask (0 to 1 per pixel),
// keeps only pixels over 0.5, makes sure the clicked spot is inside, and refuses a pick that covers nearly the whole photo.
export async function findObject(bmp: ImageBitmap, x: number, y: number): Promise<AiMask> {
  const seg = await touch()
  const c = small(bmp)
  let out: AiMask | null = null
  let why = 'no mask'
  seg.segment(c, { keypoint: { x, y } }, (res: any) => {
    const list: any[] = res.confidenceMasks || []
    let best: Uint8Array | null = null
    let bw = 0
    let bh = 0
    let bestCover = 2
    for (const m of list) {
      const f: Float32Array = m.getAsFloat32Array()
      const w = m.width
      const h = m.height
      const bin = new Uint8Array(w * h)
      let n = 0
      for (let i = 0; i < w * h; i++) { if (f[i] > 0.5) { bin[i] = 1; n++ } }
      const px = Math.min(w - 1, Math.max(0, Math.round(x * (w - 1))))
      const py = Math.min(h - 1, Math.max(0, Math.round(y * (h - 1))))
      const inside = bin[py * w + px] === 1
      const cover = n / (w * h)
      if (inside && cover < bestCover) { best = bin; bw = w; bh = h; bestCover = cover }
    }
    if (!best) { why = 'nothing there'; return }
    if (bestCover > 0.85) { why = 'too big'; return }
    if (bestCover < 0.0005) { why = 'too small'; return }
    out = pack(best, bw, bh, false)
  })
  if (!out) throw new Error(why)
  return out
}
