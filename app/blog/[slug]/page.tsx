import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { remark } from 'remark'
import remarkHtml from 'remark-html'
import { BRAND_NAME } from '@/lib/brand'
import { getAllPostMeta, getPostBySlug, formatPostDate } from '@/lib/posts'

export async function generateStaticParams() {
  return getAllPostMeta().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return {}
  return {
    title: `${post.title} — ${BRAND_NAME}`,
    description: post.description,
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  const result = await remark().use(remarkHtml).process(post.content)
  const contentHtml = result.toString()

  const faqJsonLd = post.faq && post.faq.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      }
    : null

  return (
    <div className="min-h-screen bg-paper">
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <main className="mx-auto max-w-2xl px-6 pt-12 pb-24">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink transition-colors mb-12"
        >
          ← Blog
        </Link>

        <p className="font-mono text-xs tracking-wide text-ink-soft/60 mb-4">
          {formatPostDate(post.date)}
        </p>

        <h1 className="font-fraunces text-4xl md:text-5xl font-semibold text-ink leading-tight mb-10">
          {post.title}
        </h1>

        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </main>
    </div>
  )
}
