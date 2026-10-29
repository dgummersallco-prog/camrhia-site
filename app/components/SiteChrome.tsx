import Link from "next/link"
import Wordmark from "@/app/components/Wordmark"

import { APP_STORE_URL } from "@/lib/appStore"
export { APP_STORE_URL }

function BrandLockup() {
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/camrhia-logo.png" alt="" className="h-9 w-9 rounded-xl object-cover" />
      <Wordmark className="text-3xl" />
    </span>
  )
}

export { Nav } from "@/app/components/NavBar"

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-deep">
      <div className="mx-auto max-w-6xl px-6 py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <BrandLockup />
          <p className="mt-2 text-sm text-ink-soft">Your portfolio, bookings, clients and photo delivery. One app.</p>
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-ink-soft">
          <Link href="/find" className="hover:text-ink">Find a photographer</Link>
          <Link href="/blog" className="hover:text-ink">Blog</Link>
          <Link href="/faq" className="hover:text-ink">FAQ</Link>
          <Link href="/affiliate/signup" className="hover:text-ink">Become an affiliate</Link>
          <Link href="/support" className="hover:text-ink">Support</Link>
          <Link href="/login" className="hover:text-ink">Photographer log in</Link>
          <Link href="/affiliate/login" className="hover:text-ink">Affiliate log in</Link>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-ink-soft">
        &copy; {new Date().getFullYear()} Camrhia. All rights reserved.
      </div>
    </footer>
  )
}

export function AppStoreButton({ label = "Start your free 14 days" }: { label?: string }) {
  return (
    <a
      href={APP_STORE_URL}
      className="inline-flex items-center justify-center rounded-full bg-twilight px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-twilight/90 transition-colors"
    >
      {label}
    </a>
  )
}
