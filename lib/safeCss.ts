// Sanitizes photographer-supplied (or Camri-written) CSS before it is injected into a published site.
// CSS only: no scripts, no outside images, no tag breakouts. Images are allowed only from our own
// /seasonal/ art pack and from this project's public storage bucket. Fixed-position decoration is
// allowed but can never take clicks.
const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')

function safeUrl(raw: string): string {
  const u = raw.trim().replace(/^['"]|['"]$/g, '').trim()
  if (u.includes('..')) return 'none'
  if (/^\/seasonal\/[a-z0-9_\-./]+$/i.test(u)) return 'url("' + u + '")'
  if (SUPA && u.startsWith(SUPA + '/storage/v1/object/public/') && /^[a-z0-9_\-./:%~+]+$/i.test(u)) return 'url("' + u + '")'
  return 'none'
}

function sanitizeCssCore(input: unknown): string {
  if (typeof input !== 'string') return ''
  let s = input.slice(0, 40000)
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  s = s.replace(/[<>\\]/g, '')
  s = s.replace(/@import[^;]*;?/gi, '')
  s = s.replace(/@(?!media\b|keyframes\b|supports\b)[a-z-]+[^{;]*(\{(?:[^{}]|\{[^{}]*\})*\}|;)/gi, '')
  s = s.replace(/\b(?:-webkit-)?image-set\s*\(|\bsrc\s*\(|\belement\s*\(|\bpaint\s*\(|\bcross-fade\s*\(/gi, 'none(')
  s = s.replace(/url\s*\(([^)]*)\)/gi, (_m, g: string) => safeUrl(g))
  s = s.replace(/expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding\s*:/gi, '')
  s = s.replace(/position\s*:\s*fixed/gi, 'position:fixed;pointer-events:none')
  s = s.replace(/pointer-events\s*:\s*(?!none\b)[^;}]*/gi, 'pointer-events:none')
  return s.trim()
}

// Camri writes symbols as content:'\2744'. Backslashes are stripped for safety, so turn those
// codes into the real character first.
function unescapeContent(css: string): string {
  return css.replace(/content\s*:\s*(["'])((?:\\[0-9a-fA-F]{1,6}\s?|[^"'\\\n])*)\1/g, (_m, q: string, body: string) => {
    const out = body.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_x, hex: string) => {
      const cp = parseInt(hex, 16)
      return cp >= 0x20 && cp <= 0x10ffff && ![0x22, 0x27, 0x3c, 0x3e, 0x5c].includes(cp) ? String.fromCodePoint(cp) : ''
    })
    return 'content:' + q + out + q
  })
}

export function sanitizeCss(input: unknown): string {
  return sanitizeCssCore(typeof input === 'string' ? unescapeContent(input) : input)
}
