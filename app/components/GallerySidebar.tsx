'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SceneSidebar from '@/app/components/SceneSidebar'

export function GallerySidebar({ active }: { active: 'galleries' | 'send' | 'site' | 'photos' | 'storage' }) {
  const router = useRouter()
  return (
    <SceneSidebar
      groups={[
        { items: [{ href: '/dashboard', label: '← Back to dashboard' }] },
        { label: 'Galleries', items: [{ href: '/galleries', label: 'All galleries' }] },
        { label: 'Website', items: [{ href: '/galleries/site', label: 'Website galleries' }, { href: '/galleries/photos', label: 'Website photos' }] },
        { label: 'Account', items: [{ href: '/storage', label: 'Storage' }] },
      ]}
      activeHref={active === 'storage' ? '/storage' : active === 'send' ? '/galleries/send' : active === 'site' ? '/galleries/site' : active === 'photos' ? '/galleries/photos' : '/galleries'}
      homeHref="/galleries"
      onSignOut={async () => { if (supabase) await supabase.auth.signOut(); router.push('/login') }}
    />
  )
}
