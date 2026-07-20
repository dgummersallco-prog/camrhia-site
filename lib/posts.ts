import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const POSTS_DIR = path.join(process.cwd(), 'posts')

export type FaqItem = {
  question: string
  answer: string
}

export type PostMeta = {
  title: string
  slug: string
  description: string
  date: string
  excerpt: string
  faq?: FaqItem[]
}

export type Post = PostMeta & { content: string }

export function getAllPostMeta(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return []
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))
  return files
    .map((filename) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8')
      const { data } = matter(raw)
      return data as PostMeta
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): Post | null {
  if (!fs.existsSync(POSTS_DIR)) return null
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'))
  for (const filename of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8')
    const { data, content } = matter(raw)
    if (data.slug === slug) {
      return { ...(data as PostMeta), content }
    }
  }
  return null
}

export function formatPostDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
