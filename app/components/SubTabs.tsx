import Link from 'next/link'

const GROUPS: Record<string, { key: string; href: string; label: string }[]> = {
  money: [
    { key: 'payments', href: '/payments', label: 'Payments' },
    { key: 'insights', href: '/insights', label: 'Insights' },
  ],
  packages: [
    { key: 'packages', href: '/portfolio/packages', label: 'Packages' },
    { key: 'minis', href: '/minis', label: 'Mini-sessions' },
  ],
  contracts: [
    { key: 'contracts', href: '/contracts', label: 'Contracts' },
    { key: 'templates', href: '/contracts/templates', label: 'Master contract' },
  ],
  account: [
    { key: 'settings', href: '/settings', label: 'Settings' },
    { key: 'billing', href: '/billing', label: 'Billing' },
  ],
}

export function SubTabs({ group, active }: { group: 'money' | 'packages' | 'account' | 'contracts'; active: string }) {
  return (
    <div className="flex justify-center px-6 pt-8">
      <nav className="inline-flex rounded-full border border-line bg-white p-1">
        {GROUPS[group].map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={'rounded-full px-4 py-1.5 text-sm font-medium transition ' + (t.key === active ? 'bg-twilight text-white' : 'text-ink-soft hover:text-ink')}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
