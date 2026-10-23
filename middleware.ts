import { NextResponse, type NextRequest } from 'next/server'

const cache = new Map<string, { token: string | null; at: number }>()

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase()
  if (!host || host === 'localhost' || host === 'camrhia.com' || host.endsWith('.camrhia.com') || host.endsWith('.netlify.app')) {
    return NextResponse.next()
  }
  let hit = cache.get(host)
  if (!hit || Date.now() - hit.at > 60000) {
    let token: string | null = null
    try {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const r = await fetch(`${base}/rest/v1/rpc/resolve_custom_domain`, {
        method: 'POST',
        headers: { apikey: anon ?? '', Authorization: `Bearer ${anon}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_host: host }),
        cache: 'no-store',
      })
      if (r.ok) {
        const j = await r.json()
        token = typeof j === 'string' ? j : null
      }
    } catch { /* fall through to the normal site */ }
    hit = { token, at: Date.now() }
    cache.set(host, hit)
  }
  if (!hit.token) return NextResponse.next()
  const { pathname } = req.nextUrl
  if (pathname.startsWith('/site/')) return NextResponse.next()
  const url = req.nextUrl.clone()
  url.pathname = `/site/${hit.token}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] }
