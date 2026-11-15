export type BlogPostT = { id: string; slug: string; title: string; date: string; cover: string | null; excerpt: string; body: string; published?: boolean }
export function blogPosts(ss: any): BlogPostT[] {
  const a = ss?.blog?.posts
  if (!Array.isArray(a)) return []
  return (a as BlogPostT[])
    .filter((p) => p && p.slug && p.title && p.published !== false)
    .sort((x, y) => String(y.date ?? '').localeCompare(String(x.date ?? '')))
}
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post'
}
export function fmtDate(d: string): string {
  const x = new Date(d)
  return isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
export function blogBlocks(body: string): { t: 'h' | 'p'; s: string }[] {
  return String(body ?? '').split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).map((x) => x.startsWith('## ') ? { t: 'h' as const, s: x.slice(3) } : { t: 'p' as const, s: x })
}
