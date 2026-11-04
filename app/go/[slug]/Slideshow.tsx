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
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
      {photos.map((u, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u + k} src={u} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000" style={{ opacity: k === i ? 1 : 0 }} />
      ))}
    </div>
  )
}
