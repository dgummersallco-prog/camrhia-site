import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

function BlogNav() {
  return (
    <nav className="sticky top-0 z-50 bg-paper border-b border-line">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors tracking-tight"
        >
          {BRAND_NAME}
        </Link>
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-soft">
          <Link href="/blog" className="hover:text-ink transition-colors">
            Blog
          </Link>
          <Link href="/support" className="hover:text-ink transition-colors">
            Support
          </Link>
          <Link href="/login" className="hover:text-ink transition-colors">
            Log in
          </Link>
        </div>
        <Link
          href="/#waitlist"
          className="inline-flex items-center rounded-full bg-twilight px-4 py-2 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
          style={{ backgroundColor: '#3A4A6B' }}
        >
          Get early access
        </Link>
      </div>
    </nav>
  )
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BlogNav />
      {children}
    </>
  )
}
