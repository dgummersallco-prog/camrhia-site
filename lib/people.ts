/* eslint-disable @typescript-eslint/no-explicit-any */
// Finds the same faces across a shoot and groups them into people. Runs in the browser; nothing is uploaded.

export type Person = { id: string; name: string; face: string }
export type PeopleInput = { id: string; webUrl?: string }

declare global {
  interface Window { faceapi?: any }
}

let loading: Promise<any | null> | null = null

function loadApi(): Promise<any | null> {
  if (!loading) {
    loading = (async () => {
      try {
        if (!window.faceapi) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement('script')
            s.src = '/face-api/face-api.js'
            s.onload = () => res()
            s.onerror = () => rej(new Error('face-api'))
            document.head.appendChild(s)
          })
        }
        const f = window.faceapi
        if (!f) return null
        await f.nets.tinyFaceDetector.loadFromUri('/face-api/models')
        await f.nets.faceLandmark68TinyNet.loadFromUri('/face-api/models')
        await f.nets.faceRecognitionNet.loadFromUri('/face-api/models')
        return f
      } catch {
        return null
      }
    })().then((f) => {
      if (!f) loading = null
      return f
    })
  }
  return loading
}

type Det = { photo: number; desc: Float32Array; size: number; thumb: string }
type Cluster = { sum: Float32Array; cen: Float32Array; members: Det[] }

const dist = (a: Float32Array, b: Float32Array) => {
  let s = 0
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d }
  return Math.sqrt(s)
}

async function fetchBitmap(url: string | undefined): Promise<ImageBitmap | null> {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await createImageBitmap(await res.blob(), { imageOrientation: 'from-image' })
  } catch {
    return null
  }
}

export async function findPeople(
  items: PeopleInput[],
  onProgress?: (done: number, total: number) => void,
): Promise<{ people: Person[]; photoPeople: string[][] } | null> {
  const f = await loadApi()
  if (!f) return null
  const opts = new f.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 })
  const dets: Det[] = []

  let pending = fetchBitmap(items[0]?.webUrl)
  for (let i = 0; i < items.length; i++) {
    const bmp = await pending
    pending = fetchBitmap(items[i + 1]?.webUrl)
    if (bmp) {
      try {
        const scale = Math.min(1, 900 / Math.max(bmp.width, bmp.height))
        const c = document.createElement('canvas')
        c.width = Math.max(1, Math.round(bmp.width * scale))
        c.height = Math.max(1, Math.round(bmp.height * scale))
        const ctx = c.getContext('2d')
        if (ctx) {
          ctx.drawImage(bmp, 0, 0, c.width, c.height)
          const found: any[] = await f.detectAllFaces(c, opts).withFaceLandmarks(true).withFaceDescriptors()
          for (const r of found) {
            const b = r.detection.box
            if (b.width / c.width < 0.05) continue
            const pad = 0.35
            const side = Math.max(b.width, b.height) * (1 + pad)
            const cx = b.x + b.width / 2
            const cy = b.y + b.height / 2
            const t = document.createElement('canvas')
            t.width = 72
            t.height = 72
            const tctx = t.getContext('2d')
            let thumb = ''
            if (tctx) {
              tctx.drawImage(c, cx - side / 2, cy - side / 2, side, side, 0, 0, 72, 72)
              thumb = t.toDataURL('image/jpeg', 0.7)
            }
            dets.push({ photo: i, desc: r.descriptor as Float32Array, size: b.width / c.width, thumb })
          }
        }
      } catch { /* skip this photo */ }
      bmp.close()
    }
    onProgress?.(i + 1, items.length)
    await new Promise((r) => setTimeout(r, 0))
  }

  // Group faces that look like the same person. Biggest faces go first so each group starts from a clear one.
  const TH = 0.5
  const clusters: Cluster[] = []
  for (const d of [...dets].sort((a, b) => b.size - a.size)) {
    let best = -1
    let bd = TH
    clusters.forEach((cl, k) => {
      const dd = dist(d.desc, cl.cen)
      if (dd < bd) { bd = dd; best = k }
    })
    if (best < 0) {
      clusters.push({ sum: Float32Array.from(d.desc), cen: Float32Array.from(d.desc), members: [d] })
    } else {
      const cl = clusters[best]
      cl.members.push(d)
      for (let j = 0; j < cl.sum.length; j++) { cl.sum[j] += d.desc[j]; cl.cen[j] = cl.sum[j] / cl.members.length }
    }
  }
  // Join groups that ended up very close together.
  for (let a = 0; a < clusters.length; a++) {
    for (let b = clusters.length - 1; b > a; b--) {
      if (dist(clusters[a].cen, clusters[b].cen) < 0.4) {
        const A = clusters[a]
        const B = clusters[b]
        A.members.push(...B.members)
        for (let j = 0; j < A.sum.length; j++) { A.sum[j] += B.sum[j]; A.cen[j] = A.sum[j] / A.members.length }
        clusters.splice(b, 1)
      }
    }
  }

  const withCount = clusters
    .map((cl) => ({ cl, photos: Array.from(new Set(cl.members.map((m) => m.photo))) }))
    .filter((x) => x.photos.length >= 2)
    .sort((a, b) => b.photos.length - a.photos.length)
    .slice(0, 30)

  const photoPeople: string[][] = items.map(() => [])
  const people: Person[] = withCount.map((x, k) => {
    const id = 'p' + (k + 1)
    x.photos.forEach((ph) => photoPeople[ph].push(id))
    const big = x.cl.members.reduce((m, d) => (d.size > m.size ? d : m), x.cl.members[0])
    return { id, name: 'Person ' + (k + 1), face: big.thumb }
  })
  return { people, photoPeople }
}
