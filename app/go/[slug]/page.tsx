import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type Step = { title: string; body: string }
type Item = { title: string; value?: string }
type Content = Record<string, unknown> & {
  steps?: Step[]
  items?: Item[]
}

const T = {
  headline: 'Run your whole photography business in one app. Your clients use it free.',
  sub: 'Your website, contracts, questionnaires, payments and client sessions in one place. Try it free for 14 days.',
  steps: [
    { title: 'Download the app', body: 'Free to start, with a 14 day trial.' },
    { title: 'Set up your first session', body: 'Add your contract, questionnaire and payment in one place.' },
    { title: 'Send it to your client', body: 'They sign, answer and pay from their phone.' },
  ] as Step[],
  items: [
    { title: 'Your photography website' },
    { title: 'Contracts clients sign on their phone' },
    { title: 'Questionnaires clients answer in the app' },
    { title: 'Payments and deposits through Stripe' },
    { title: 'Client sessions, with a free client side' },
  ] as Item[],
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
    title: (c.hero_headline as string) || page?.name || 'Camrhia',
    robots: { index: false, follow: false },
  }
}

function Section({ title, children, boxed }: { title?: string; children: React.ReactNode; boxed?: boolean }) {
  return (
    <section className={boxed ? 'mt-14 rounded-2xl border border-line bg-card p-6' : 'mt-12'}>
      {title ? <h2 className="font-fraunces text-2xl font-semibold">{title}</h2> : null}
      <div className={title ? 'mt-3' : ''}>{children}</div>
    </section>
  )
}

const P = ({ children }: { children: React.ReactNode }) => <p className="leading-relaxed text-ink-soft">{children}</p>

export default async function FunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const c = (page.content ?? {}) as Content
  const s = (k: string) => (typeof c[k] === 'string' ? (c[k] as string).trim() : '')
  const style: string = page.style || 'miller'
  const href = page.cta_url || '#'
  const label = page.cta_label || 'Get the app'
  const steps = c.steps && c.steps.length ? c.steps : T.steps
  const items = c.items && c.items.length ? c.items.filter((i) => i.title) : T.items

  const Button = () => (
    <a href={href} className="inline-block rounded-full bg-twilight px-8 py-4 text-base font-medium text-white transition hover:opacity-90">
      {label}
    </a>
  )

  const Hero = ({ big }: { big?: boolean }) => (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Camrhia</p>
      <h1 className={`mt-4 font-fraunces font-semibold leading-tight ${big ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}`}>{s('hero_headline') || T.headline}</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-soft">{s('hero_sub') || T.sub}</p>
      {s('image_url') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s('image_url')} alt="" className="mt-8 w-full rounded-2xl" />
      ) : null}
      <div className="mt-8"><Button /></div>
    </>
  )

  const Stack = ({ heading }: { heading: string }) => (
    <Section title={heading}>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-bold text-white">✓</span>
            <span className="flex-1 font-medium">{it.title}</span>
            {it.value ? <span className="text-ink-soft">{it.value}</span> : null}
          </li>
        ))}
      </ul>
      {s('stack_total') || true ? (
        <p className="mt-5 font-fraunces text-xl font-semibold">{s('stack_total') || 'Replaces $95 to $160 a month in separate tools.'}</p>
      ) : null}
    </Section>
  )

  const Steps = ({ heading }: { heading: string }) => (
    <Section title={heading}>
      <ol className="space-y-4">
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
    </Section>
  )

  const Scarcity = () =>
    s('scarcity_body') || s('scarcity_title') ? (
      <Section boxed title={s('scarcity_title') || undefined}>
        <P>{s('scarcity_body')}</P>
      </Section>
    ) : null

  let body: React.ReactNode

  if (style === 'hormozi') {
    body = (
      <>
        <Hero big />
        <Stack heading="Here is everything you get" />
        <Section boxed title={s('guarantee_title') || 'Try it free for 14 days.'}>
          <P>{s('guarantee_body') || 'If it is not for you, cancel before the trial ends and you pay nothing. Your clients never pay for their side.'}</P>
        </Section>
        <Scarcity />
        <div className="mt-10"><Button /></div>
      </>
    )
  } else if (style === 'brunson') {
    body = (
      <>
        <Hero />
        <Section title={s('story_title') || 'Why we built it'}>
          <P>{s('story_body') || 'Most photographers do not start a business to manage software. They start it to take photos. Then the tools pile up: one for the website, one for contracts, one for questionnaires, one for payments. Camrhia puts it all in one app.'}</P>
        </Section>
        <Steps heading="Three things that change everything" />
        <Stack heading="What you get" />
        <div className="mt-10"><Button /></div>
        <p className="mt-8 leading-relaxed text-ink-soft">{s('ps') || 'P.S. It is free to try for 14 days, and your clients never pay.'}</p>
      </>
    )
  } else if (style === 'priestley') {
    body = (
      <>
        <Hero />
        <Section title="Who this is for">
          <P>{s('for_body') || 'Photographers who book clients, sign contracts, collect deposits and want one place to run all of it.'}</P>
        </Section>
        <Section title="Who it is not for">
          <P>{s('not_for_body') || 'Hobbyists who only need a place to share a gallery link.'}</P>
        </Section>
        {s('proof_body') ? (
          <Section title={s('proof_title') || 'Proof'}>
            <P>{s('proof_body')}</P>
          </Section>
        ) : null}
        <Steps heading="How it works" />
        <Scarcity />
        <div className="mt-10"><Button /></div>
      </>
    )
  } else {
    body = (
      <>
        <Hero />
        <Section title={s('problem_title') || 'You are paying for five tools that do not talk to each other.'}>
          <P>{s('problem_body') || 'A gallery tool, a contract tool, a booking tool, a questionnaire form and a website builder. $95 to $160 a month, and you still chase clients for signatures and deposits.'}</P>
        </Section>
        <Section title={s('guide_title') || 'We built Camrhia for photographers.'}>
          <P>{s('guide_body') || 'Camrhia puts everything in one app, and your clients get their side free. No logins to juggle, no PDFs to chase.'}</P>
        </Section>
        <Steps heading="Here is how it works" />
        <div className="mt-8"><Button /></div>
        <Section boxed title={s('stakes_title') || 'Or keep juggling five tools.'}>
          <P>{s('stakes_body') || 'Your clients deserve one simple place, and you deserve your evenings back.'}</P>
        </Section>
      </>
    )
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-xl px-5 py-14 sm:py-20">{body}</div>
    </main>
  )
}
