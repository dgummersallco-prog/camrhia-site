export type CType = 'photo' | 'card' | 'heading' | 'button' | 'gallery'
export type Dev = 'desktop' | 'phone'
export type CItem = {
  id: string; type: CType; x: number; y: number; w: number; h: number; z: number
  src?: string | null; radius?: number; title?: string; text?: string; fs?: number; bg?: boolean
  galleryId?: string; titleMode?: 'overlay' | 'below' | 'none'
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
    h: 78,
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
      h: 110,
      items: [
        { id: 'h1', type: 'heading', text: 'Your heading', x: 6, y: 6, w: 88, h: 16, z: 1, fs: 9 },
        { id: 'c1', type: 'card', title: 'Write your words here', text: words, x: 6, y: 28, w: 88, h: 70, z: 2, fs: 3.6, bg: true },
      ],
    }
  }
  return {
    h: 60,
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
  return { h: rows * gy, items }
}
