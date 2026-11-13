// Sanitizes photographer-supplied (or Camri-written) CSS before it is injected into a published site.
// CSS only: no scripts, no external loads, no tag breakouts, no full-screen overlays.
export function sanitizeCss(input: unknown): string {
  if (typeof input !== 'string') return ''
  let s = input.slice(0, 20000)
  s = s.replace(/\/\*[\s\S]*?\*\//g, '')
  s = s.replace(/[<>\\]/g, '')
  s = s.replace(/@import[^;]*;?/gi, '')
  s = s.replace(/@(?!media\b|keyframes\b)[a-z-]+[^{;]*(\{(?:[^{}]|\{[^{}]*\})*\}|;)/gi, '')
  s = s.replace(/url\s*\([^)]*\)/gi, 'none')
  s = s.replace(/expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding\s*:/gi, '')
  s = s.replace(/position\s*:\s*fixed/gi, 'position:relative')
  return s.trim()
}
