import { promises as dns } from 'dns'

const API = 'https://api.netlify.com/api/v1'
export const NETLIFY_LB_IP = '75.2.60.5'

const hdr = () => ({ Authorization: 'Bearer ' + process.env.CAMRHIA_NETLIFY_TOKEN, 'Content-Type': 'application/json' })
const siteId = () => process.env.CAMRHIA_NETLIFY_SITE_ID

export const configured = () => !!(process.env.CAMRHIA_NETLIFY_TOKEN && process.env.CAMRHIA_NETLIFY_SITE_ID)

export function normalizeDomain(raw: string): string | null {
  const d = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '')
  if (!/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d)) return null
  if (d === 'camrhia.com' || d.endsWith('.camrhia.com') || d.endsWith('.netlify.app')) return null
  return d
}

export function isApex(d: string): boolean {
  const p = d.split('.')
  if (p.length <= 2) return true
  return p.length === 3 && ['co', 'com', 'org', 'net', 'ac', 'gov'].includes(p[1]) && p[2].length === 2
}

async function getSite() {
  const r = await fetch(`${API}/sites/${siteId()}`, { headers: hdr(), cache: 'no-store' })
  if (!r.ok) throw new Error('Could not reach the hosting service.')
  return r.json()
}

export async function dnsTarget(): Promise<string> {
  const s = await getSite()
  return s.default_domain || (s.name ? `${s.name}.netlify.app` : '')
}

async function setAliases(list: string[]) {
  const r = await fetch(`${API}/sites/${siteId()}`, { method: 'PATCH', headers: hdr(), body: JSON.stringify({ domain_aliases: list }) })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    console.error('Netlify refused domain_aliases', r.status, text.slice(0, 500))
    if (r.status === 401 || r.status === 403) throw new Error('Our connection to the hosting service was refused. This is a setup problem on our side, not yours.')
    if (r.status === 422 || /already|in use|taken|exists|duplicate/i.test(text)) throw new Error('That address is already set up on another website host, so it cannot be added here yet. Try a different address, like book.yourstudio.com.')
    throw new Error('The hosting service could not add that domain (error ' + r.status + '). Please try again in a minute.')
  }
}

export async function addAlias(d: string) {
  const s = await getSite()
  const list: string[] = s.domain_aliases ?? []
  if (!list.includes(d)) await setAliases([...list, d])
}

export async function removeAlias(d: string) {
  const s = await getSite()
  const list: string[] = s.domain_aliases ?? []
  if (list.includes(d)) await setAliases(list.filter((x) => x !== d))
}

export async function provisionSsl() {
  try { await fetch(`${API}/sites/${siteId()}/ssl`, { method: 'POST', headers: hdr() }) } catch { /* ignore */ }
}

export async function dnsOk(d: string, target: string): Promise<boolean> {
  const mine = new Set<string>()
  try { (await dns.resolve4(d)).forEach((ip) => mine.add(ip)) } catch { /* not found yet */ }
  const good = new Set<string>([NETLIFY_LB_IP])
  try { (await dns.resolve4(target)).forEach((ip) => good.add(ip)) } catch { /* ignore */ }
  return Array.from(mine).some((ip) => good.has(ip))
}

export async function httpsLive(d: string): Promise<boolean> {
  try {
    const r = await fetch(`https://${d}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(6000) })
    return r.status < 500
  } catch {
    return false
  }
}

export async function describe(d: string) {
  const apex = isApex(d)
  const target = await dnsTarget()
  return {
    apex,
    record: apex
      ? { type: 'A', name: '@', value: NETLIFY_LB_IP }
      : { type: 'CNAME', name: d.split('.')[0], value: target },
  }
}
