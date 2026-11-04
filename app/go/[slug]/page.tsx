import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Step = { title: string; body: string }
type Content = {
  hero_headline?: string
  hero_sub?: string
  image_url?: string
  problem_title?: string
  problem_body?: string
  guide_title?: string
  guide_body?: string
  steps?: Step[]
  stakes_title?: string
  stakes_body?: string
}

const DEFAULTS = {
  hero_headline: 'Run your whole photography business in one app. Your clients use it free.',
  hero_sub: 'Your website, contracts, questionnaires, payments and client sessions in one place. Try it free for 14 days.',
  problem_title: 'You are paying for five tools that do not talk to each other.',
  problem_body: 'A gallery tool, a contract tool, a booking tool, a questionnaire form and a website builder. $95 to $160 a month, and you still chase clients for signatures and deposits.',
  guide_title: 'We built Camrhia for photographers.',
  guide_body: 'Camrhia puts everything in one app, and your clients get their side free. No logins to juggle, no PDFs to chase.',
  steps: [
    { title: 'Download the app', body: 'Free to start, with a 14 day trial.' },
    { title: 'Set up your first session', body: 'Add your contract, questionnaire and payment in one place.' },
    { title: 'Send it to your client', body: 'They sign, answer and pay from their phone.' },
  ] as Step[],
  stakes_title: 'Or keep juggling five tools.',
  stakes_body: 'Your clients deserve one simple place, and you deserve your evenings back.',
}

async function getPage(slug: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await sb
    .from('funnel_pages')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  const c = (page?.content ?? {}) as Content
  return {
    title: c.hero_headline || page?.name || 'Camrhia',
    robots: { index: false, follow: false },
  }
}

export default async function FunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const c = (page.content ?? {}) as Content
  const hero = c.hero_headline || DEFAULTS.hero_headline
  const heroSub = c.hero_sub || DEFAULTS.hero_sub
  const steps = c.steps && c.steps.length ? c.steps : DEFAULTS.steps
  const href = page.cta_url || '#'
  const label = page.cta_label || 'Get the app'

  const Button = () => (
    <a
      href={href}
      className="inline-block rounded-full bg-twilight px-8 py-4 text-base font-medium text-white transition hover:opacity-90"
    >
      {label}
    </a>
  )

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-xl px-5 py-14 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Camrhia</p>
        <h1 className="mt-4 font-fraunces text-4xl font-semibold leading-tight sm:text-5xl">{hero}</h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">{heroSub}</p>
        {c.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.image_url} alt="" className="mt-8 w-full rounded-2xl" />
        ) : null}
        <div className="mt-8"><Button /></div>

        <section className="mt-16">
          <h2 className="font-fraunces text-2xl font-semibold">{c.problem_title || DEFAULTS.problem_title}</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">{c.problem_body || DEFAULTS.problem_body}</p>
        </section>

        <section className="mt-12">
          <h2 className="font-fraunces text-2xl font-semibold">{c.guide_title || DEFAULTS.guide_title}</h2>
          <p className="mt-3 leading-relaxed text-ink-soft">{c.guide_body || DEFAULTS.guide_body}</p>
        </section>

        <section className="mt-12">
          <h2 className="font-fraunces text-2xl font-semibold">Here is how it works</h2>
          <ol className="mt-4 space-y-4">
            {steps.map((st, i) => (
              <li key={i} className="flex gap-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-twilight text-sm font-medium text-white">{i + 1}</span>
                <div>
                  <p className="font-medium">{st.title}</p>
                  <p className="text-ink-soft">{st.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8"><Button /></div>
        </section>

        <section className="mt-16 rounded-2xl border border-line bg-card p-6">
          <h2 className="font-fraunces text-2xl font-semibold">{c.stakes_title || DEFAULTS.stakes_title}</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">{c.stakes_body || DEFAULTS.stakes_body}</p>
        </section>
      </div>
    </main>
  )
}
