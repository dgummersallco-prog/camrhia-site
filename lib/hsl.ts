export const BANDS = [
  { id: 'red', label: 'Red', center: 0, hex: '#e5484d' },
  { id: 'orange', label: 'Orange', center: 30, hex: '#f08c3a' },
  { id: 'yellow', label: 'Yellow', center: 60, hex: '#f2cd3a' },
  { id: 'green', label: 'Green', center: 120, hex: '#4fb26a' },
  { id: 'aqua', label: 'Aqua', center: 180, hex: '#3cb8c4' },
  { id: 'blue', label: 'Blue', center: 240, hex: '#4c7bf0' },
  { id: 'purple', label: 'Purple', center: 275, hex: '#8e5cf0' },
  { id: 'magenta', label: 'Magenta', center: 320, hex: '#d45bbd' },
] as const

export type BandId = (typeof BANDS)[number]['id']
export type HslKey = `${'h' | 's' | 'l'}_${BandId}`
