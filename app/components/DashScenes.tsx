'use client'

import { useEffect, useState } from 'react'
import { DASH_BG_KEY } from '@/lib/dashBg'

const SCENES = ['white-roses', 'blossoms', 'beach-sunset', 'fall-leaves', 'golden-grass', 'lavender', 'mountains', 'winter-pines', 'pampas', 'studio-dark']

export default function DashScenes() {
  const [urls, setUrls] = useState<string[]>([])
  const [i, setI] = useState(0)

  useEffect(() => {
    try { if (localStorage.getItem(DASH_BG_KEY)) return } catch {}
    let off = false
    const found: Record<string, boolean> = {}
    let pending = SCENES.length
    function done() {
      pending -= 1
      if (pending === 0 && !off) setUrls(SCENES.filter((s) => found[s]).map((s) => `/dash-scenes/${s}.jpg`))
    }
    SCENES.forEach((s) => {
      const img = new Image()
      img.onload = () => { found[s] = true; done() }
      img.onerror = () => { done() }
      img.src = `/dash-scenes/${s}.jpg`
    })
    return () => { off = true }
  }, [])

  useEffect(() => {
    if (urls.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % urls.length), 10000)
    return () => clearInterval(t)
  }, [urls])

  if (urls.length === 0) return null
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      {urls.map((u, n) => (
        <div key={u} className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms]" style={{ backgroundImage: `url(${u})`, opacity: n === i ? 1 : 0 }} />
      ))}
      <div className="absolute inset-0 bg-white/45" />
    </div>
  )
}
