export type CType = 'photo' | 'card' | 'heading' | 'button'
export type Dev = 'desktop' | 'phone'
export type CItem = {
  id: string; type: CType; x: number; y: number; w: number; h: number; z: number
  src?: string | null; radius?: number; title?: string; text?: string; fs?: number; bg?: boolean
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

export function getBoard(c: any, dev: Dev, photo2?: string | null): Board {
  const b = c?.[dev]
  if (b && Array.isArray(b.items) && typeof b.h === 'number') return b as Board
  return starter(dev, photo2)
}

export function newItem(type: CType, dev: Dev, z: number): CItem {
  const ph = dev === 'phone'
  const id = 'n' + Date.now().toString(36)
  if (type === 'photo') return { id, type, src: null, x: 8, y: 8, w: ph ? 40 : 24, h: ph ? 48 : 30, z, radius: 3 }
  if (type === 'card') return { id, type, x: 8, y: 8, w: ph ? 80 : 40, h: ph ? 40 : 24, z, fs: ph ? 3.6 : 1.45, bg: true, title: '', text: '' }
  if (type === 'heading') return { id, type, x: 8, y: 8, w: ph ? 80 : 50, h: ph ? 18 : 10, z, text: 'A little more about me', fs: ph ? 9 : 4.6 }
  return { id, type, x: 8, y: 8, w: ph ? 50 : 20, h: ph ? 10 : 5, z, text: '' }
}
