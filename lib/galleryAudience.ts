export type Audience = 'picks' | 'picks_maybe' | 'all'

// Which photos a client may see. Photos with no label count as picks.
export function isVisible(label: string | null | undefined, audience: string | null | undefined): boolean {
  if (audience === 'picks') return label !== 'reject' && label !== 'maybe'
  if (audience === 'picks_maybe') return label !== 'reject'
  return true
}
