'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/metrics', label: 'Metrics' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/affiliates', label: 'Affiliates' },
  { href: '/admin/masters', label: 'Masters' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  if (pathname.startsWith('/admin/login')) return <>{children}</>

  return (
    <>
      <div className="bg-ink">
        <nav className="mx-auto max-w-5xl px-4 py-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          {TABS.map((t) => {
            const active = pathname.startsWith(t.href)
            return (
              <Link
                key={t.href}
                href={t.href}
                className={
                  active
                    ? 'rounded-full bg-white px-4 py-1.5 text-sm font-medium text-ink'
                    : 'rounded-full px-4 py-1.5 text-sm text-white/70 hover:text-white'
                }
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>
      {children}
    </>
  )
}
