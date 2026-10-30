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
