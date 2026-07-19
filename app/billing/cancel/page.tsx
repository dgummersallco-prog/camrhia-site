import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = {
  title: `Checkout canceled — ${BRAND_NAME}`,
}

export default function BillingCancelPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link
          href="/"
          className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors"
        >
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-ink-soft/10 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 20 20" className="w-7 h-7 text-ink-soft" fill="none">
              <path
                d="M6 6l8 8M14 6l-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
            Checkout canceled
          </h1>
          <p className="text-ink-soft text-sm leading-relaxed mb-8">
            No charge was made. You can go back and subscribe whenever you&apos;re ready.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/billing"
              className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
              style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
            >
              Try again →
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-line px-6 py-3 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
