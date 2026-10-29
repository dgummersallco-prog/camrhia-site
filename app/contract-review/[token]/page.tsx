import { supabase } from '@/lib/supabase'
import { CONTRACT_TYPE_CONFIG } from '@/lib/contractDefaults'
import { PrintButton } from './PrintButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Contract for review', robots: { index: false, follow: false } }

export default async function ContractReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  let data: { template: string; studio: string | null; session_type: string } | null = null
  if (supabase && /^[0-9a-f-]{36}$/i.test(token)) {
    const r = await supabase.rpc('get_contract_review', { p_token: token })
    data = (r.data as { template: string; studio: string | null; session_type: string } | null) ?? null
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
  const isMaster = data.session_type === '_master'
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

        {isMaster && (
          <section className="mt-8 rounded-2xl border border-line bg-card p-6 print:break-before-page print:border-0 print:p-0">
            <h2 className="font-fraunces text-lg font-semibold text-ink">Values that change by session type</h2>
            <p className="mt-1 text-sm text-ink-soft">This one agreement is used for every session type. The words in braces above are replaced with these values, and nothing else in the contract changes.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-line uppercase tracking-[0.08em] text-ink-soft">
                    <th className="py-2 pr-3 font-medium">{'{contract_title}'}</th>
                    <th className="py-2 pr-3 font-medium">{'{service_label}'}</th>
                    <th className="py-2 pr-3 font-medium">{'{event_label}'}</th>
                    <th className="py-2 pr-3 font-medium">{'{location_label}'}</th>
                    <th className="py-2 pr-3 font-medium">Delivery</th>
                    <th className="py-2 font-medium">{'{cancellation_days}'}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(CONTRACT_TYPE_CONFIG).map(([k, c]) => (
                    <tr key={k} className="border-b border-line/60 align-top text-ink">
                      <td className="py-2 pr-3">{c.title}</td>
                      <td className="py-2 pr-3">{c.serviceLabel}</td>
                      <td className="py-2 pr-3">{c.eventLabel}</td>
                      <td className="py-2 pr-3">{c.locationLabel}</td>
                      <td className="py-2 pr-3">{c.deliveryWeeks} week{c.deliveryWeeks === 1 ? '' : 's'}</td>
                      <td className="py-2">{c.cancellationDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="mt-4 text-xs text-ink-soft print:hidden">Other words in braces, like {'{client_names}'} or {'{total_price}'}, are filled in for each client.</p>
      </main>
    </div>
  )
}
