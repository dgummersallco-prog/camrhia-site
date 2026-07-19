import Link from "next/link"
import { BRAND_NAME } from "@/lib/brand"

export const metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
}

export default function PrivacyPage() {
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

      <main className="flex-1 mx-auto max-w-2xl w-full px-6 py-20">
        <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
          Legal
        </p>
        <h1 className="font-fraunces text-4xl font-semibold text-ink mb-6">
          Privacy Policy
        </h1>
        <p className="text-ink-soft leading-relaxed">
          This page is coming soon. In the meantime, reach out at{" "}
          <a
            href="mailto:hello@camrhia.com"
            className="text-twilight underline underline-offset-2 hover:text-twilight/80 transition-colors"
          >
            hello@camrhia.com
          </a>{" "}
          with any questions.
        </p>
      </main>
    </div>
  )
}
