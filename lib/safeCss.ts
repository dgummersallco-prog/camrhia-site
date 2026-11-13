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

export function sanitizeCss(input: unknown): string {
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
