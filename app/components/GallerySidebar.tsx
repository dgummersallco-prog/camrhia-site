'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SceneSidebar from '@/app/components/SceneSidebar'

export function GallerySidebar({ active }: { active: 'galleries' | 'send' | 'storage' }) {
  const router = useRouter()
  return (
    <SceneSidebar
      groups={[
        { items: [{ href: '/dashboard', label: '← Back to dashboard' }] },
        { label: 'Galleries', items: [{ href: '/galleries', label: 'All galleries' }, { href: '/galleries/send', label: 'Design & send' }] },
        { label: 'Website', items: [{ href: '/website/galleries', label: 'Site galleries' }] },
        { label: 'Account', items: [{ href: '/storage', label: 'Storage' }] },
      ]}
      activeHref={active === 'storage' ? '/storage' : active === 'send' ? '/galleries/send' : '/galleries'}
      homeHref="/galleries"
      onSignOut={async () => { if (supabase) await supabase.auth.signOut(); router.push('/login') }}
    />
  )
}
