export type AiJob = 'shortlist' | 'group_best' | 'highlights'
export type Tier = 'haiku' | 'sonnet'

// One place to decide which model does which job.
export const MODEL_ID: Record<Tier, string> = { haiku: 'claude-haiku-5-5', sonnet: 'claude-sonnet-5-5' }
export const JOB_TIER: Record<AiJob, Tier> = { shortlist: 'haiku', group_best: 'haiku', highlights: 'sonnet' }

// Dollars per million tokens.
const PRICE_PER_M: Record<Tier, { in: number; out: number }> = {
  haiku: { in: 0.1, out: 0.5 },
  sonnet: { in: 2, out: 10 },
}

export const MONTHLY_PHOTOS = 40000
export const MAX_IMAGES = 12

export function costUsd(tier: Tier, inTok: number, outTok: number): number {
  const p = PRICE_PER_M[tier]
  return (inTok * p.in + outTok * p.out) / 1_000_000
}

const RULES = 'Do not judge sharpness, focus or exposure; those are measured separately. '

export function promptFor(job: AiJob, n: number): string {
  if (job === 'group_best') {
    return `These ${n} photos are near-identical frames of the same moment from a professional photographer's shoot. Pick the single best one: open eyes, the best expression, good timing, nobody mid-blink or mid-motion. ${RULES}Reply with ONLY JSON like {"best":2,"note":"short reason"} where best is the photo number.`
  }
  const bar = job === 'highlights' ? 'Be strict: only the strongest frames of a shoot score 8 or higher.' : 'A 10 is a frame you would happily deliver to the client.'
  return `You are helping a professional photographer cull a shoot. There are ${n} photos. Score each from 1 to 10 as a keeper: expression and eyes, the moment, composition, and obvious misfires such as a lens cap, a pocket shot, a head cut off, or someone caught mid-blink. ${bar} ${RULES}Reply with ONLY JSON like {"scores":[{"n":1,"score":7,"note":"short reason"}]} with one entry per photo.`
}
