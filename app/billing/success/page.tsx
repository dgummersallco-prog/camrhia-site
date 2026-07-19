import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = {
  title: `Subscribed — ${BRAND_NAME}`,
}

export default function BillingSuccessPage() {
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
          <div className="w-14 h-14 rounded-full bg-sage/15 flex items-center justify-center mx-auto mb-6">
            <svg viewBox="0 0 20 20" className="w-7 h-7 text-sage" fill="none">
              <path
                d="M4 10l5 5 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <h1 className="font-fraunces text-3xl font-semibold text-ink mb-3">
            You&apos;re subscribed!
          </h1>
          <p className="text-ink-soft text-sm leading-relaxed mb-8">
            Welcome to {BRAND_NAME}. It may take a moment for your account to
            fully activate — if anything looks off, give it a minute and refresh.
          </p>

          <Link
            href="/"
            className="inline-flex items-center rounded-full bg-twilight px-6 py-3 text-sm font-semibold text-white hover:bg-twilight/90 transition-colors"
            style={{ backgroundColor: '#3A4A6B', color: '#ffffff' }}
          >
            Go to homepage →
          </Link>
        </div>
      </main>
    </div>
  )
}
