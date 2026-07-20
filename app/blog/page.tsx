import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { getAllPostMeta, formatPostDate } from '@/lib/posts'

export const metadata: Metadata = {
  title: `Blog — ${BRAND_NAME}`,
  description: 'Advice and insights for wedding photographers and couples from the Camrhia team.',
}

export default function BlogIndexPage() {
  const posts = getAllPostMeta()

  return (
    <div className="min-h-screen bg-paper">
      <main>
        <section className="mx-auto max-w-3xl px-6 pt-16 pb-10">
          <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
            Blog
          </p>
          <h1 className="font-fraunces text-4xl md:text-5xl font-semibold text-ink leading-tight mb-3">
            From the team
          </h1>
          <p className="text-base text-ink-soft leading-relaxed">
            Advice, insights, and updates for wedding photographers and couples.
          </p>
        </section>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          {posts.length === 0 ? (
            <p className="text-ink-soft py-12">No posts yet — check back soon.</p>
          ) : (
            <div className="divide-y divide-line">
              {posts.map((post) => (
                <article key={post.slug} className="py-10">
                  <p className="font-mono text-xs tracking-wide text-ink-soft/60 mb-3">
                    {formatPostDate(post.date)}
                  </p>
                  <h2 className="font-fraunces text-2xl md:text-3xl font-semibold text-ink leading-snug mb-3">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-twilight transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-ink-soft text-base leading-relaxed mb-5">
                    {post.excerpt}
                  </p>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="inline-flex items-center text-sm font-semibold text-twilight hover:underline gap-1"
                    style={{ color: '#3A4A6B' }}
                  >
                    Read more →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
