'use client'

import React, { useEffect, useState } from 'react'

type Props = {
  urls: string[]
  alt: string
  coverStyle?: string | null
  slideshow?: boolean
  scale?: number | null
}

export function CoverHero({ urls, alt, coverStyle, slideshow, scale }: Props) {
  const [idx, setIdx] = useState(0)
  const shown = slideshow ? urls : urls.slice(0, 1)
  // 1 = full width (default). Photographers can shrink down to 0.5 so more of
  // the portfolio background shows around the cover.
  const s = Math.min(1, Math.max(0.5, Number(scale ?? 1) || 1))
  const shrunk = s < 0.999

  useEffect(() => {
    if (!slideshow || shown.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setIdx((i) => (i + 1) % shown.length), 5000)
    return () => clearInterval(t)
  }, [slideshow, shown.length])

  const shape: React.CSSProperties =
    coverStyle === 'tall' ? { aspectRatio: '4/5', maxHeight: `${88 * s}vh` }
    : coverStyle === 'wide' ? { aspectRatio: '21/9' }
    : coverStyle === 'full' ? { height: `${92 * s}vh` }
    : { aspectRatio: '16/9' }

  return (
    <div style={{ width: '100%', paddingTop: shrunk ? 16 : 0 }}>
      <div
        style={{
          position: 'relative',
          width: shrunk ? `${s * 100}%` : '100%',
          margin: '0 auto',
          borderRadius: shrunk ? 14 : 0,
          overflow: 'hidden',
          backgroundColor: '#E5E1DB',
          ...shape,
        }}
      >
        {shown.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={u}
            src={u}
            alt={i === 0 ? alt : ''}
            loading={i === 0 ? 'eager' : 'lazy'}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              opacity: i === idx ? 1 : 0, transition: 'opacity 1.2s ease-in-out',
            }}
          />
        ))}
      </div>
    </div>
  )
}
