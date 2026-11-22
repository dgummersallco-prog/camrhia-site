// The packages a photographer switched on in Packages, shaped for the website's pricing page and section.
export type SitePkg = { id: string; title: string; price: string | null; description: string | null; session_type: string | null }

/* eslint-disable @typescript-eslint/no-explicit-any */
export function sitePackagesOf(r: Record<string, any>): SitePkg[] {
  const list = ((r.packages ?? []) as any[])
    .filter((p) => p && p.show_public !== false && !p.is_mini)
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p) => ({
      id: String(p.id),
      title: String(p.name ?? ''),
      price: p.price ? String(p.price) : null,
      description: (String(p.detail ?? '').trim() || String(p.covers ?? '').trim() || null) as string | null,
      session_type: (p.session_type ?? null) as string | null,
    }))
  return list
}

export function groupBySession(pkgs: SitePkg[]): { label: string; items: SitePkg[] }[] {
  const order: string[] = []
  const map: Record<string, SitePkg[]> = {}
  for (const p of pkgs) {
    const k = p.session_type || ''
    if (!map[k]) { map[k] = []; order.push(k) }
    map[k].push(p)
  }
  if (order.length <= 1) return [{ label: '', items: pkgs }]
  return order.map((k) => ({
    label: k ? k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Other',
    items: map[k],
  }))
}
