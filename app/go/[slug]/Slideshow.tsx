'use client'

import { useEffect, useState } from 'react'

export default function Slideshow({ photos }: { photos: string[] }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (photos.length < 2) return
    const t = setInterval(() => setI((n) => (n + 1) % photos.length), 3500)
    return () => clearInterval(t)
  }, [photos.length])
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 5', overflow: 'hidden', borderRadius: 16, background: 'rgba(0,0,0,0.06)' }}>
      {photos.map((u, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u + k} src={u} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: k === i ? 1 : 0, transition: 'opacity 1s' }} />
      ))}
    </div>
  )
}
