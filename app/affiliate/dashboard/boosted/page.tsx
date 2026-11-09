'use client'

import AffiliateShell from '../../components/AffiliateShell'

const STEPS = [
  'You post in the Team Hub with your link.',
  "Camrhia's ad team watches which posts perform best.",
  'The best ones get posted as ads on the Camrhia account, and Camrhia pays for the ad spend.',
  'The ads send people to your affiliate link and sign up, so those signups are credited to you.',
]

export default function BoostedPage() {
  return (
    <AffiliateShell title="Boosted posts" subtitle="How your best posts can become Camrhia ads.">
      {() => (
        <div className="max-w-3xl space-y-5">
          <div className="rounded-2xl border border-line bg-card p-6">
            <p className="font-fraunces text-xl font-semibold text-ink">The idea</p>
            <p className="mt-2 text-ink-soft">
              We want to take the best performing posts and run them as ads. That helps you, because more people see your post and your link. It helps Camrhia, because the ads are built on content that already works.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-card p-6">
            <p className="font-fraunces text-xl font-semibold text-ink">How it works</p>
            <ol className="mt-4 space-y-3">
              {STEPS.map((t, i) => (
                <li key={t} className="flex gap-3 text-ink">
                  <span className="font-fraunces text-xl leading-none text-[#3A4A6B]">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-line bg-card p-6">
              <p className="font-fraunces text-xl font-semibold text-ink">What you get</p>
              <p className="mt-2 text-sm text-ink-soft">More people see your content and land on your link, and you pay nothing for the ad spend.</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-6">
              <p className="font-fraunces text-xl font-semibold text-ink">What Camrhia gets</p>
              <p className="mt-2 text-sm text-ink-soft">Ads built on posts that already performed, and more photographers finding Camrhia.</p>
            </div>
          </div>

          <p className="text-sm text-ink-soft">Not every post gets boosted, and we can&apos;t promise how a boosted post will perform.</p>
        </div>
      )}
    </AffiliateShell>
  )
}
