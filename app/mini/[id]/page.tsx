import { supabase } from '@/lib/supabase'
import { MiniBooking } from './MiniBooking'

export const dynamic = 'force-dynamic'

async function load(id: string) {
  if (!supabase) return null
  const { data } = await supabase.rpc('get_mini_page', { p_mini_id: id })
  return (data as any) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await load(id)
  return { title: m ? m.title + (m.studio ? ' · ' + m.studio : '') : 'Not available' }
}

export default async function MiniPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mini = await load(id)
  if (!mini) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <div>
          <h1 className="font-fraunces text-2xl font-semibold text-ink">This booking page isn&apos;t available.</h1>
          <p className="mt-2 text-sm text-ink-soft">It may have ended or been removed.</p>
        </div>
      </div>
    )
  }
  return <MiniBooking mini={mini} />
}
