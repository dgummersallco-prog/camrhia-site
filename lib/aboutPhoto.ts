import type { CSSProperties } from 'react'

export const ABOUT_SHAPES = [
  { key: 'portrait', label: 'Portrait', aspect: 4 / 5, radius: 12 },
  { key: 'square', label: 'Square', aspect: 1, radius: 12 },
  { key: 'circle', label: 'Circle', aspect: 1, radius: 9999 },
  { key: 'landscape', label: 'Landscape', aspect: 3 / 2, radius: 12 },
]

export const ABOUT_SIZES: { key: string; label: string; maxWidth?: number }[] = [
  { key: 'small', label: 'Small', maxWidth: 180 },
  { key: 'medium', label: 'Medium', maxWidth: 240 },
  { key: 'large', label: 'Large', maxWidth: 300 },
  { key: 'full', label: 'Full' },
]

export function aboutPhotoStyle(shape?: string | null, size?: string | null): CSSProperties {
  const sh = ABOUT_SHAPES.find((x) => x.key === shape) ?? ABOUT_SHAPES[0]
  const sz = ABOUT_SIZES.find((x) => x.key === size) ?? ABOUT_SIZES[2]
  return {
    display: 'block',
    width: '100%',
    ...(sz.maxWidth ? { maxWidth: sz.maxWidth } : {}),
    aspectRatio: sh.aspect,
    objectFit: 'cover',
    borderRadius: sh.radius,
    margin: '0 auto 18px',
  }
}
