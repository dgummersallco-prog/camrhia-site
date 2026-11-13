'use client'

import { useEffect, useState } from 'react'
import { DASH_BG_KEY } from '@/lib/dashBg'

const MONTH_SCENES = ['winter-pines', 'valentines', 'mountains', 'blossoms', 'peonies', 'lavender', 'beach-sunset', 'pampas', 'white-roses', 'fall-leaves', 'golden-grass', 'christmas']
const ALL = Array.from(new Set(MONTH_SCENES))

function dominant(img: HTMLImageElement): [number, number, number] | null {
  try {
    const w = 48
    const h = 48
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    const d = ctx.getImageData(0, 0, w, h).data
    const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i]
      const g = d[i + 1]
      const b = d[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 510
      if (l < 0.12 || l > 0.92) continue
      const dd = max - min
      const s = dd === 0 ? 0 : dd / (255 - Math.abs(max + min - 255))
      let hue = 0
      if (dd > 0) {
        if (max === r) hue = ((g - b) / dd) % 6
        else if (max === g) hue = (b - r) / dd + 2
        else hue = (r - g) / dd + 4
        hue *= 60
        if (hue < 0) hue += 360
      }
      const k = Math.min(11, Math.floor(hue / 30))
      const wgt = s * s + 0.02
      const bk = buckets[k]
      bk.w += wgt
      bk.r += r * wgt
      bk.g += g * wgt
      bk.b += b * wgt
    }
    let best = buckets[0]
    for (const bk of buckets) if (bk.w > best.w) best = bk
    if (best.w <= 0) return null
    return [Math.round(best.r / best.w), Math.round(best.g / best.w), Math.round(best.b / best.w)]
  } catch {
    return null
  }
}

function setAccent(rgb: number[]) {
  const root = document.documentElement
  const [r, g, b] = rgb
  root.style.setProperty('--scene-a', `${r} ${g} ${b}`)
  root.style.setProperty('--scene-b', `${Math.round(r * 0.72)} ${Math.round(g * 0.72)} ${Math.round(b * 0.72)}`)
}

export default function DashScenes() {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    try { localStorage.removeItem(DASH_BG_KEY) } catch {}
    let off = false
    const month = MONTH_SCENES[new Date().getMonth()]
    const order = [month, ...ALL.filter((s) => s !== month)]
    try {
      const cached = JSON.parse(localStorage.getItem('camrhia_scene') || 'null')
      if (cached && cached.s === month && Array.isArray(cached.rgb)) {
        setAccent(cached.rgb)
        setUrl(`/dash-scenes/${month}.jpg`)
      }
    } catch {}
    let idx = 0
    function tryNext() {
      if (off || idx >= order.length) return
      const s = order[idx++]
      const img = new Image()
      img.onload = () => {
        if (off) return
        setUrl(`/dash-scenes/${s}.jpg`)
        const rgb = dominant(img)
        if (rgb) {
          setAccent(rgb)
          try { localStorage.setItem('camrhia_scene', JSON.stringify({ s, rgb })) } catch {}
        }
      }
      img.onerror = () => tryNext()
      img.src = `/dash-scenes/${s}.jpg`
    }
    tryNext()
    return () => { off = true }
  }, [])

  if (!url) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />
      <div className="absolute inset-0 bg-white/45" />
    </div>
  )
}
