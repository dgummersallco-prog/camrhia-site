import Link from "next/link"
import { BRAND_NAME } from "@/lib/brand"

export const metadata = {
  title: `Terms of Service — ${BRAND_NAME}`,
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 list-none">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brass shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-line bg-paper px-6 py-4">
        <Link
          href="/"
          className="font-fraunces text-xl font-semibold text-ink hover:text-twilight transition-colors"
        >
          {BRAND_NAME}
        </Link>
      </header>

      <main className="flex-1 mx-auto max-w-2xl w-full px-6 py-20">
        <p className="font-mono text-xs tracking-widest uppercase text-brass mb-4">
          Legal
        </p>
        <h1 className="font-fraunces text-4xl font-semibold text-ink mb-3">
          Terms of Service
        </h1>
        <p className="text-sm text-ink-soft mb-12">
          Last updated: July 19, 2026
        </p>

        <div className="space-y-10 text-ink leading-relaxed">

          <p className="text-sm">
            Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using
            Camrhia. By creating an account or using our mobile application and
            website (together, the &ldquo;Service&rdquo;), you agree to be bound by these
            Terms. If you do not agree, do not use the Service.
          </p>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              1. Overview
            </h2>
            <p className="text-sm mb-4">
              Camrhia is a platform connecting wedding photographers
              (&ldquo;Photographers&rdquo;) and the couples who hire them (&ldquo;Couples&rdquo;) to
              plan, manage, and document a wedding together. Camrhia provides
              tools including messaging, booking, contracts, shared timelines,
              questionnaires, payment tracking, and photo galleries. Camrhia also
              offers an affiliate referral program to third parties
              (&ldquo;Affiliates&rdquo;).
            </p>
            <p className="text-sm">
              Camrhia is a software platform.{" "}
              <strong>
                We are not a party to the photography services agreement between
                a Photographer and a Couple.
              </strong>{" "}
              Any contract, payment arrangement, or service commitment made
              between a Photographer and Couple is solely between them; Camrhia
              provides tools to facilitate that relationship but does not
              guarantee the quality, availability, or performance of any
              Photographer&apos;s services, nor the accuracy of any Couple&apos;s
              information.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              2. Eligibility
            </h2>
            <p className="text-sm">
              You must be at least 18 years old and able to form a legally
              binding contract to use Camrhia. By creating an account, you
              represent that you meet these requirements.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              3. Accounts
            </h2>
            <p className="text-sm">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activity under your account. You
              agree to provide accurate information when creating your account
              and to keep it up to date. Notify us immediately if you suspect
              unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              4. Photographer Subscriptions
            </h2>
            <p className="text-sm mb-4">
              Photographer accounts require a paid subscription to access the
              Service. Current pricing is available within the app or on our
              website and may change from time to time; we will provide notice of
              any pricing changes before they take effect for existing
              subscribers. Subscriptions renew automatically unless canceled. You
              may cancel at any time; cancellation takes effect at the end of
              your current billing period, and no partial refunds are provided
              for unused time, except as required by law.
            </p>
            <p className="text-sm">Couple accounts are free to use.</p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              5. User Content
            </h2>
            <p className="text-sm mb-4">
              &ldquo;User Content&rdquo; includes anything you upload, submit, or create
              through the Service — including photos, portfolio content, profile
              information, messages, timeline entries, questionnaire answers,
              contracts, and reviews.
            </p>
            <p className="text-sm mb-4">
              You retain ownership of your User Content. By submitting User
              Content, you grant Camrhia a non-exclusive, worldwide, royalty-free
              license to host, store, display, and transmit that content as
              necessary to operate and provide the Service (for example,
              displaying a photographer&apos;s portfolio to a couple, or a couple&apos;s
              timeline to their photographer).
            </p>
            <p className="text-sm mb-4">
              You are solely responsible for the User Content you upload,
              including having the rights to upload it. You agree not to upload
              content that infringes on someone else&apos;s intellectual property,
              violates any law, or that you do not have permission to share (for
              example, wedding photos owned by a client without their consent,
              where applicable).
            </p>
            <p className="text-sm">
              We reserve the right to remove any User Content that violates these
              Terms or that we determine, in our discretion, is harmful to the
              Service or its users.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              6. Reviews
            </h2>
            <p className="text-sm">
              Couples may submit reviews of Photographers they have worked with
              through the Service. Reviews must be honest, based on genuine
              experience, and submitted by the actual couple associated with that
              wedding. Photographers may choose whether to publish an individual
              review to their public profile, but Photographers may not edit,
              rewrite, or fabricate the content of a review. We reserve the
              right to remove reviews that are fraudulent, abusive, or otherwise
              violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              7. Affiliate Program
            </h2>
            <p className="text-sm mb-4">
              Camrhia offers an optional affiliate program allowing Affiliates to
              earn a recurring commission for referring paying Photographer
              subscribers to the Service.
            </p>
            <Bullets
              items={[
                "Commission rates, payout schedules, and program terms are set by Camrhia and may be modified or discontinued at any time, with reasonable notice for existing Affiliates regarding previously earned commissions.",
                "Commissions are earned only on genuine, good-faith referrals. Self-referrals, fraudulent sign-ups, or any attempt to manipulate the referral system will result in forfeiture of commissions and may result in removal from the program.",
                "Affiliates are independent third parties and are not employees, agents, or representatives of Camrhia.",
                "Payouts are subject to any applicable minimum thresholds and processing timelines communicated within the affiliate dashboard.",
              ]}
            />
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              8. Payments (Photographer-Couple Transactions)
            </h2>
            <p className="text-sm">
              Camrhia may provide tools to track payment schedules between a
              Photographer and Couple. Until in-app payment processing is
              available, any actual exchange of payment for photography services
              occurs directly between the Photographer and Couple, outside of the
              Service, and Camrhia is not responsible for that transaction. Once
              in-app payments are available, they will be processed by a
              third-party payment processor, and additional terms specific to
              that feature will apply.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              9. Prohibited Conduct
            </h2>
            <p className="text-sm mb-4">You agree not to:</p>
            <Bullets
              items={[
                "Use the Service for any unlawful purpose",
                "Impersonate any person or entity, or misrepresent your affiliation with any person or entity",
                "Upload harmful, abusive, harassing, or infringing content",
                "Attempt to gain unauthorized access to any part of the Service, other accounts, or our systems",
                "Interfere with or disrupt the Service or its infrastructure",
                "Use the Service to send unsolicited communications or spam",
                "Scrape, harvest, or collect information from the Service without our consent",
              ]}
            />
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              10. Termination
            </h2>
            <p className="text-sm mb-4">
              We may suspend or terminate your access to the Service at any time,
              with or without notice, if we believe you have violated these
              Terms. You may delete your account at any time through the app.
            </p>
            <p className="text-sm">
              Upon termination, your right to use the Service ends immediately.
              Certain provisions of these Terms (including ownership, disclaimers,
              and limitation of liability) survive termination.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              11. Disclaimers
            </h2>
            <p className="text-sm mb-4 uppercase tracking-wide text-ink-soft">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
              warranties of any kind, whether express or implied, including but
              not limited to warranties of merchantability, fitness for a
              particular purpose, or non-infringement. We do not warrant that the
              Service will be uninterrupted, error-free, or secure.
            </p>
            <p className="text-sm uppercase tracking-wide text-ink-soft">
              Camrhia does not guarantee the quality, reliability, or conduct of
              any Photographer or Couple using the Service. Any dispute regarding
              photography services, payment, or the underlying wedding agreement
              is between the Photographer and Couple.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              12. Limitation of Liability
            </h2>
            <p className="text-sm mb-4 uppercase tracking-wide text-ink-soft">
              To the maximum extent permitted by law, Camrhia and its officers,
              employees, and affiliates will not be liable for any indirect,
              incidental, special, consequential, or punitive damages, or any
              loss of profits or data, arising from your use of the Service. Our
              total liability for any claim relating to the Service will not
              exceed the amount you paid to Camrhia in the twelve months
              preceding the claim, or $100, whichever is greater.
            </p>
            <p className="text-sm">
              Some jurisdictions do not allow certain limitations of liability,
              so some of the above limitations may not apply to you.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              13. Indemnification
            </h2>
            <p className="text-sm">
              You agree to indemnify and hold harmless Camrhia from any claims,
              damages, losses, or expenses (including reasonable attorneys&apos; fees)
              arising from your use of the Service, your violation of these
              Terms, or your violation of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              14. Governing Law and Disputes
            </h2>
            <p className="text-sm">
              These Terms are governed by the laws of the State of{" "}
              <strong>Idaho</strong>, without regard to its conflict of law
              principles. Any disputes arising from these Terms or the Service
              will be resolved in the state or federal courts located in that
              state, and you consent to the personal jurisdiction of those
              courts.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              15. Changes to These Terms
            </h2>
            <p className="text-sm">
              We may update these Terms from time to time. If we make material
              changes, we will provide notice through the app or by email before
              the changes take effect. Continued use of the Service after changes
              take effect constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              16. Contact Us
            </h2>
            <p className="text-sm">
              Questions about these Terms can be sent to:
            </p>
            <p className="mt-3">
              <a
                href="mailto:hello@camrhia.app"
                className="font-semibold text-twilight hover:text-twilight/80 underline underline-offset-2 transition-colors"
              >
                hello@camrhia.app
              </a>
            </p>
          </section>

        </div>
      </main>
    </div>
  )
}
