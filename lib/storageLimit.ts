const GB = 1000 * 1000 * 1000

// One add-on pack adds this much room on top of the plan's base storage.
export const PACK_GB = 250

export function storageLimitBytes(plan: string | null | undefined, packs: number): number {
  const base = plan === 'studio' ? 1000 : 250
  return (base + PACK_GB * Math.max(0, packs)) * GB
}

export function formatBytes(n: number): string {
  if (n >= GB) return `${(n / GB).toFixed(n >= 100 * GB ? 0 : 1)} GB`
  if (n >= 1e6) return `${Math.round(n / 1e6)} MB`
  return `${Math.round(n / 1e3)} KB`
}
