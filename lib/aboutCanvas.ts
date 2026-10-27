export type CType = 'photo' | 'card' | 'heading' | 'button' | 'gallery' | 'menu' | 'logo' | 'title' | 'subtitle'
export type Dev = 'desktop' | 'phone'
export type CItem = {
  id: string; type: CType; x: number; y: number; w: number; h: number; z: number
  src?: string | null; radius?: number; title?: string; text?: string; fs?: number; bg?: boolean
  galleryId?: string; titleMode?: 'overlay' | 'below' | 'none'
  align?: 'left' | 'center' | 'right'; light?: boolean
  color?: string; font?: 'head' | 'body'
}
export type Board = { h: number; items: CItem[] }

export function starter(dev: Dev, photo2?: string | null): Board {
  if (dev === 'phone') {
    return {
      h: 150,
      items: [
        { id: 'p1', type: 'photo', src: 'about', x: 0, y: 0, w: 74, h: 92, z: 1, radius: 8 },
        { id: 'c1', type: 'card', x: 6, y: 66, w: 88, h: 76, z: 3, fs: 3.6, bg: true },
        { id: 'p2', type: 'photo', src: photo2 ?? null, x: 60, y: 104, w: 38, h: 44, z: 2, radius: 6 },
      ],
    }
  }
  return {
    h: 88,
    items: [
      { id: 'p1', type: 'photo', src: 'about', x: 2, y: 0, w: 42, h: 58, z: 1, radius: 4 },
      { id: 'c1', type: 'card', x: 30, y: 30, w: 62, h: 44, z: 3, fs: 1.45, bg: true },
      { id: 'p2', type: 'photo', src: photo2 ?? null, x: 66, y: 46, w: 30, h: 32, z: 2, radius: 3 },
    ],
  }
}

export function blank(dev: Dev): Board {
  const words = 'Add your story, a quote, or anything you like. Drag things to move them and use the corner square to resize.'
  if (dev === 'phone') {
    return {
      h: 150,
      items: [
        { id: 'h1', type: 'heading', text: 'Your heading', x: 6, y: 6, w: 88, h: 16, z: 1, fs: 9 },
        { id: 'c1', type: 'card', title: 'Write your words here', text: words, x: 6, y: 28, w: 88, h: 70, z: 2, fs: 3.6, bg: true },
      ],
    }
  }
  return {
    h: 88,
    items: [
      { id: 'h1', type: 'heading', text: 'Your heading', x: 6, y: 6, w: 50, h: 12, z: 1, fs: 4.6 },
      { id: 'c1', type: 'card', title: 'Write your words here', text: words, x: 6, y: 22, w: 46, h: 34, z: 2, fs: 1.45, bg: true },
      { id: 'p1', type: 'photo', src: null, x: 56, y: 8, w: 38, h: 48, z: 1, radius: 3 },
    ],
  }
}

export function getBoard(c: any, dev: Dev, photo2?: string | null, custom?: boolean): Board {
  const b = c?.[dev]
  if (b && Array.isArray(b.items) && typeof b.h === 'number') return b as Board
  return custom ? blank(dev) : starter(dev, photo2)
}

export function newItem(type: CType, dev: Dev, z: number): CItem {
  const ph = dev === 'phone'
  const id = 'n' + Date.now().toString(36)
  if (type === 'menu') return { id, type, x: 8, y: 8, w: 50, h: ph ? 8 : 6, z, align: 'right' }
  if (type === 'logo') return { id, type, x: 8, y: 8, w: ph ? 40 : 16, h: ph ? 8 : 7, z, align: 'left' }
  if (type === 'title') return { id, type, x: 8, y: 8, w: ph ? 88 : 56, h: ph ? 20 : 12, z, align: 'left' }
  if (type === 'subtitle') return { id, type, x: 8, y: 8, w: ph ? 88 : 56, h: ph ? 4 : 3, z, align: 'left' }
  if (type === 'photo') return { id, type, src: null, x: 8, y: 8, w: ph ? 40 : 24, h: ph ? 48 : 30, z, radius: 3 }
  if (type === 'card') return { id, type, x: 8, y: 8, w: ph ? 80 : 40, h: ph ? 40 : 24, z, fs: ph ? 3.6 : 1.45, bg: true, title: '', text: '' }
  if (type === 'heading') return { id, type, x: 8, y: 8, w: ph ? 80 : 50, h: ph ? 18 : 10, z, text: 'A little more about me', fs: ph ? 9 : 4.6 }
  if (type === 'gallery') return { id, type, x: 8, y: 8, w: ph ? 46 : 30, h: ph ? 60 : 36, z, radius: 0, fs: ph ? 3.4 : 1.8, titleMode: 'overlay' }
  return { id, type, x: 8, y: 8, w: ph ? 50 : 20, h: ph ? 10 : 5, z, text: '' }
}

export function hasBoard(c: any, dev: Dev): boolean {
  const b = c?.[dev]
  return !!(b && Array.isArray(b.items) && typeof b.h === 'number')
}

export function galleryStarter(dev: Dev, ids: string[]): Board {
  const ph = dev === 'phone'
  const cols = ph ? 2 : 3
  const w = ph ? 46 : 30
  const gx = ph ? 48 : 33
  const h = ph ? 60 : 36
  const gy = ph ? 64 : 40
  const items: CItem[] = ids.map((id, i) => ({
    id: 'g' + i, type: 'gallery', galleryId: id,
    x: 2 + (i % cols) * gx, y: Math.floor(i / cols) * gy, w, h, z: 1, radius: 0, fs: ph ? 3.4 : 1.8, titleMode: 'overlay',
  }))
  const rows = Math.max(1, Math.ceil(ids.length / cols))
  return { h: Math.max(rows * gy, 88), items }
}

export function heroStarter(dev: Dev, srcs: string[]): Board {
  const ph = dev === 'phone'
  const list: (string | null)[] = srcs.length > 0 ? srcs.slice(0, 3) : [null]
  const n = list.length
  const d: number[][][] = [
    [[2, 38, 96, 40]],
    [[2, 38, 58, 40], [62, 38, 36, 40]],
    [[2, 38, 56, 40], [62, 38, 36, 19], [62, 59, 36, 19]],
  ]
  const p: number[][][] = [
    [[0, 54, 100, 60]],
    [[0, 54, 100, 56], [0, 112, 100, 56]],
    [[0, 54, 100, 62], [0, 120, 48, 48], [52, 120, 48, 48]],
  ]
  const rects = (ph ? p : d)[n - 1]
  const photos: CItem[] = list.map((src, i) => ({ id: 'p' + (i + 1), type: 'photo' as const, src, x: rects[i][0], y: rects[i][1], w: rects[i][2], h: rects[i][3], z: i + 1, radius: ph ? 6 : 3 }))
  const text: CItem[] = ph
    ? [
        { id: 'logo', type: 'logo', x: 4, y: 1, w: 40, h: 7, z: 10, align: 'left' },
        { id: 'menu', type: 'menu', x: 50, y: 1, w: 46, h: 7, z: 10, align: 'right' },
        { id: 'sub', type: 'subtitle', x: 4, y: 14, w: 92, h: 4, z: 10, align: 'left' },
        { id: 'title', type: 'title', x: 4, y: 19, w: 92, h: 20, z: 10, align: 'left' },
        { id: 'btn', type: 'button', x: 4, y: 42, w: 50, h: 8, z: 10 },
      ]
    : [
        { id: 'logo', type: 'logo', x: 2, y: 1, w: 16, h: 7, z: 10, align: 'left' },
        { id: 'menu', type: 'menu', x: 36, y: 2, w: 62, h: 5, z: 10, align: 'right' },
        { id: 'sub', type: 'subtitle', x: 2, y: 12, w: 56, h: 3, z: 10, align: 'left' },
        { id: 'title', type: 'title', x: 2, y: 16, w: 56, h: 12, z: 10, align: 'left' },
        { id: 'btn', type: 'button', x: 2, y: 30, w: 20, h: 5, z: 10 },
      ]
  return { h: ph ? 172 : 88, items: [...photos, ...text] }
}

export function galleryPhotosStarter(dev: Dev, paths: string[]): Board {
  const ph = dev === 'phone'
  const list = paths.slice(0, 60)
  const cols = ph ? 2 : 3
  const w = ph ? 48 : 31
  const gx = ph ? 50 : 33
  const h = ph ? 60 : 38.75
  const gy = ph ? 62 : 40.5
  const top = ph ? 30 : 22
  const rows = Math.max(1, Math.ceil(list.length / cols))
  const bh = Math.max(88, top + rows * gy + (ph ? 18 : 10))
  const items: CItem[] = list.map((src, i) => ({ id: 'g' + i, type: 'photo' as const, src, x: 2 + (i % cols) * gx, y: top + Math.floor(i / cols) * gy, w, h, z: 1, radius: ph ? 4 : 2 }))
  const text: CItem[] = ph
    ? [
        { id: 'title', type: 'title', x: 4, y: 2, w: 92, h: 16, z: 5, align: 'center' },
        { id: 'sub', type: 'subtitle', x: 4, y: 19, w: 92, h: 6, z: 5, align: 'center' },
        { id: 'btn', type: 'button', x: 4, y: bh - 14, w: 50, h: 8, z: 5 },
      ]
    : [
        { id: 'title', type: 'title', x: 2, y: 2, w: 96, h: 12, z: 5, align: 'center' },
        { id: 'sub', type: 'subtitle', x: 2, y: 14, w: 96, h: 4, z: 5, align: 'center' },
        { id: 'btn', type: 'button', x: 40, y: bh - 8, w: 20, h: 5, z: 5 },
      ]
  return { h: bh, items: [...text, ...items] }
}
