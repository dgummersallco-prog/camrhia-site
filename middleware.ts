import { NextResponse, type NextRequest } from 'next/server'

const cache = new Map<string, { token: string | null; at: number }>()
const slugCache = new Map<string, { token: string | null; at: number }>()

const SITES_HOST = 'sites.camrhia.com'
const MAIN_HOSTS = ['camrhia.com', 'www.camrhia.com']
const RESERVED = new Set([
  'admin', 'affiliate', 'api', 'billing', 'blog', 'calendar', 'clients', 'components', 'confirm-email', 'connect-done',
  'contract-review', 'contracts', 'dashboard', 'edit', 'faq', 'find', 'fonts', 'for-your-clients', 'g', 'galleries', 'go',
  'help', 'how-it-works', 'insights', 'login', 'messages', 'mini', 'minis', 'my', 'p', 'pay', 'payments', 'portfolio',
  'pricing', 'privacy', 'questionnaires', 'r', 'reminders', 'settings', 'signup', 'site', 'specials', 'start', 'storage',
  'support', 't', 'team', 'terms', 'website', 's', 'sessions',
])

async function rpc(name: string, args: Record<string, string>): Promise<string | null> {
  try {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const r = await fetch(`${base}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: anon ?? '', Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
    })
    if (!r.ok) return null
    const j = await r.json()
    return typeof j === 'string' ? j : null
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase()
  const { pathname, search } = req.nextUrl
  const first = pathname.split('/')[1] ?? ''

  // Photographer sites live on their own host so custom code can never touch the dashboard login.
  if (host === SITES_HOST) {
    if (!first || (RESERVED.has(first) && first !== 'site')) {
      return NextResponse.redirect('https://camrhia.com' + (first ? pathname + search : ''), 307)
    }
    return NextResponse.next()
  }

  if (MAIN_HOSTS.includes(host)) {
    if (process.env.SITES_REDIRECT === 'on' && first && !RESERVED.has(first)) {
      const key = first.toLowerCase()
      let hit = slugCache.get(key)
      if (!hit || Date.now() - hit.at > 60000) {
        hit = { token: await rpc('get_token_by_slug', { p_slug: first }), at: Date.now() }
        slugCache.set(key, hit)
      }
      if (hit.token) return NextResponse.redirect('https://' + SITES_HOST + pathname + search, 307)
    }
    return NextResponse.next()
  }

  if (!host || host === 'localhost' || host.endsWith('.camrhia.com') || host.endsWith('.netlify.app')) {
    return NextResponse.next()
  }

  // A photographer's own domain.
  let hit = cache.get(host)
  if (!hit || Date.now() - hit.at > 60000) {
    hit = { token: await rpc('resolve_custom_domain', { p_host: host }), at: Date.now() }
    cache.set(host, hit)
  }
  if (!hit.token) return NextResponse.next()
  if (pathname.startsWith('/site/')) return NextResponse.next()
  const url = req.nextUrl.clone()
  url.pathname = `/site/${hit.token}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] }
