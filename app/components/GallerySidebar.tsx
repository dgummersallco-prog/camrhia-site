'use client'

import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SceneSidebar from '@/app/components/SceneSidebar'

export function GallerySidebar({ active }: { active: 'galleries' | 'storage' }) {
  const router = useRouter()
  return (
    <SceneSidebar
      groups={[
        { items: [{ href: '/dashboard', label: '← Back to dashboard' }] },
        { label: 'Galleries', items: [{ href: '/galleries', label: 'All galleries' }, { href: '/storage', label: 'Storage' }] },
      ]}
      activeHref={active === 'storage' ? '/storage' : '/galleries'}
      homeHref="/galleries"
      onSignOut={async () => { if (supabase) await supabase.auth.signOut(); router.push('/login') }}
    />
  )
}
