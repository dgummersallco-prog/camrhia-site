import Link from 'next/link'

export function GalleryTabs({ active }: { active: 'galleries' | 'storage' }) {
  const tab = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${on ? 'bg-twilight text-white' : 'text-ink-soft hover:bg-blush-wash hover:text-twilight'}`}
    >
      {label}
    </Link>
  )
  return (
    <div className="mb-6 inline-flex gap-1 rounded-full border border-line bg-card p-1">
      {tab('/galleries', 'Galleries', active === 'galleries')}
      {tab('/storage', 'Storage', active === 'storage')}
    </div>
  )
}
