import { supabase } from '@/lib/supabase'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contract for review', robots: { index: false, follow: false } }

export default async function ContractReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let data: { template: string; studio: string | null } | null = null
  if (supabase && /^[0-9a-f-]{36}$/i.test(token)) {
    const r = await supabase.rpc('get_contract_review', { p_token: token })
    data = (r.data as { template: string; studio: string | null } | null) ?? null
  }
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <div>
          <h1 className="font-fraunces text-2xl font-semibold text-ink">This link isn&apos;t available.</h1>
          <p className="mt-2 text-sm text-ink-soft">The person who shared it may have turned it off.</p>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-paper">
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">Contract for review</p>
            {data.studio && <h1 className="mt-1 font-fraunces text-2xl font-semibold text-ink">{data.studio}</h1>}
          </div>
          <PrintButton />
        </div>
        <article className="mt-6 whitespace-pre-wrap rounded-2xl border border-line bg-card p-8 text-[14px] leading-relaxed text-ink print:border-0 print:p-0">{data.template}</article>
        <p className="mt-4 text-xs text-ink-soft print:hidden">Words in braces, like {'{couple_names}'}, are filled in automatically for each client.</p>
      </main>
    </div>
  )
}
