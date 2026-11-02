export type Crop = { angle: number; aspect: number | null; zoom: number; x: number; y: number }
export type CropRect = { cw: number; ch: number; dx: number; dy: number }

// Does a crop box centered (dx, dy) from the photo's middle, tilted by rad, stay inside the photo?
function fits(W: number, H: number, rad: number, dx: number, dy: number, cw: number, ch: number): boolean {
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  const hw = W / 2 + 0.01
  const hh = H / 2 + 0.01
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const X = dx + (sx * cw) / 2
      const Y = dy + (sy * ch) / 2
      const px = X * c + Y * s
      const py = -X * s + Y * c
      if (Math.abs(px) > hw || Math.abs(py) > hh) return false
    }
  }
  return true
}

// The biggest box of the chosen shape that fits inside the straightened photo, then zoomed and moved (never past the edge).
export function cropRect(W: number, H: number, crop: Crop): CropRect {
  const rad = (crop.angle * Math.PI) / 180
  const A = crop.aspect ?? W / H
  let lo = 0
  let hi = Math.max(W, H) * 2
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2
    if (fits(W, H, rad, 0, 0, mid, mid / A)) lo = mid
    else hi = mid
  }
  const zoom = Math.max(1, crop.zoom)
  const cw = lo / zoom
  const ch = lo / A / zoom
  const tx = crop.x * (W / 2)
  const ty = crop.y * (H / 2)
  let a = 0
  let b = 1
  for (let i = 0; i < 20; i++) {
    const m = (a + b) / 2
    if (fits(W, H, rad, tx * m, ty * m, cw, ch)) a = m
    else b = m
  }
  return { cw, ch, dx: tx * a, dy: ty * a }
}

export function drawCropped(ctx: CanvasRenderingContext2D, bmp: ImageBitmap, crop: Crop, r: CropRect, outW: number, outH: number, s: number) {
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(outW / 2 - r.dx * s, outH / 2 - r.dy * s)
  ctx.rotate((crop.angle * Math.PI) / 180)
  ctx.scale(s, s)
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2)
  ctx.restore()
}
