import Link from "next/link"
import { BRAND_NAME } from "@/lib/brand"

export const metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
  description: "Read Camrhia's privacy policy to understand how we collect, use, and protect your personal information.",
}

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-ink-soft mb-12">
          Last updated: July 19, 2026
        </p>

        <div className="space-y-10 text-ink leading-relaxed">

          <p>
            This Privacy Policy explains how Camrhia (&ldquo;Camrhia,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) collects, uses, shares, and protects information when you use
            our mobile application and website (together, the &ldquo;Service&rdquo;).
          </p>
          <p>
            By using Camrhia, you agree to the collection and use of information
            as described in this policy. If you do not agree, please do not use
            the Service.
          </p>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              1. Who This Applies To
            </h2>
            <p>
              Camrhia is a two-sided platform connecting wedding photographers
              (&ldquo;Photographers&rdquo;) and the couples who hire them (&ldquo;Couples&rdquo;). This
              policy applies to both, as well as to visitors of our website and
              anyone who signs up for our affiliate program (&ldquo;Affiliates&rdquo;).
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              2. Information We Collect
            </h2>

            <h3 className="font-semibold text-ink mb-3">
              Information you provide directly
            </h3>
            <ul className="space-y-2 mb-6 list-none">
              {[
                <><strong>Account information</strong>: name, email address, password, account type (photographer or couple)</>,
                <><strong>Photographer profile information</strong>: studio name, bio, service location, travel radius, style tags, pricing packages, portfolio photos, social media links, website, FAQ content</>,
                <><strong>Couple information</strong>: names, wedding date, venue, guest count, partner details</>,
                <><strong>Wedding planning content</strong>: timeline/run-of-show entries, questionnaire answers, shot lists, key contacts, private notes (photographer-only)</>,
                <><strong>Messages</strong>: content of messages exchanged between photographers and couples within the app</>,
                <><strong>Photos</strong>: portfolio images, cover photos, profile photos, and wedding gallery photos uploaded to the Service</>,
                <><strong>Contracts and signatures</strong>: contract content and electronic signatures created within the app</>,
                <><strong>Reviews</strong>: ratings and written testimonials submitted by couples about photographers</>,
                <><strong>Payment-related information</strong>: once in-app payment processing is available, payment method details will be collected and processed by our third-party payment processor (see Section 5); we do not store full payment card numbers on our own servers</>,
                <><strong>Affiliate information</strong>: name, email, and payout details for anyone who joins our affiliate program</>,
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brass shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <h3 className="font-semibold text-ink mb-3">
              Information collected automatically
            </h3>
            <ul className="space-y-2 list-none">
              {[
                "Device information (device type, operating system)",
                "Usage data (features used, screens viewed, general app activity)",
                "Approximate location, if you enable location-based features (e.g., finding photographers near you)",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brass shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              3. How We Use Information
            </h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="space-y-2 mb-6 list-none">
              {[
                "Provide, operate, and maintain the Service",
                "Connect couples with photographers and facilitate bookings",
                "Enable the shared timeline, questionnaire, contract, payment tracking, messaging, and gallery features between a photographer and their couple",
                "Send notifications relevant to your account and active weddings (e.g., new messages, timeline updates, payment reminders)",
                "Process and track referrals through our affiliate program",
                "Improve, troubleshoot, and develop new features for the Service",
                "Communicate with you about your account, respond to support requests, and send service-related announcements",
                "Detect, prevent, and address fraud, abuse, and security issues",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brass shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              We do not sell your personal information to third parties, and we
              do not use your data to serve third-party advertising.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              4. How Information Is Shared
            </h2>

            <h3 className="font-semibold text-ink mb-2">
              Between Photographers and Couples
            </h3>
            <p className="text-sm mb-4">
              Camrhia is built around shared, collaborative data. When a
              photographer and couple are connected through a wedding, certain
              information is visible to both parties by design, including: the
              shared timeline, questionnaire answers, shot list, key contacts,
              contract, payment status, and messages. This sharing is a core
              function of the Service and is necessary for it to work as
              intended.
            </p>
            <p className="text-sm mb-6">
              A photographer&apos;s <strong>private notes</strong> on a wedding are never
              shared with the couple.
            </p>

            <h3 className="font-semibold text-ink mb-2">
              Public Profile Information
            </h3>
            <p className="text-sm mb-6">
              If a photographer chooses to list their profile publicly, certain
              information — studio name, bio, location, portfolio photos, pricing
              (if made public), FAQ, social links, and approved reviews — is
              visible to anyone browsing or visiting that public profile page,
              including people who are not logged into the Service.
            </p>

            <h3 className="font-semibold text-ink mb-2">Service Providers</h3>
            <p className="text-sm mb-6">
              We share information with third-party vendors who help us operate
              the Service, including our hosting and database provider (Supabase),
              and, once implemented, our payment processor (Stripe). These
              providers are only permitted to use your information to provide
              services to us.
            </p>

            <h3 className="font-semibold text-ink mb-2">Legal Requirements</h3>
            <p className="text-sm mb-6">
              We may disclose information if required to do so by law, or if we
              believe in good faith that disclosure is necessary to protect our
              rights, your safety, or the safety of others.
            </p>

            <h3 className="font-semibold text-ink mb-2">Business Transfers</h3>
            <p className="text-sm">
              If Camrhia is involved in a merger, acquisition, or sale of assets,
              your information may be transferred as part of that transaction. We
              will notify you of any such change.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              5. Payments
            </h2>
            <p className="text-sm">
              Once in-app payment processing is live, payments will be handled by
              a third-party payment processor (such as Stripe). Camrhia does not
              store your full payment card details on our own servers. Please
              refer to our payment processor&apos;s own privacy policy for details on
              how they handle your payment information.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              6. Affiliate Program
            </h2>
            <p className="text-sm">
              If you join our affiliate program, we collect your name, email, and
              payout information in order to track referrals and pay out
              commissions. Referral activity (which accounts were referred by
              which affiliate, and their subscription status) is visible to the
              referring affiliate through their dashboard, but we do not share
              the referred user&apos;s name or contact information with the affiliate
              — only anonymized status information.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              7. Data Retention
            </h2>
            <p className="text-sm">
              We retain your information for as long as your account is active,
              or as needed to provide the Service. If you delete your account, we
              will delete or anonymize your personal information within a
              reasonable time, except where we are required to retain it for
              legal, tax, or security purposes.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              8. Your Rights and Choices
            </h2>
            <p className="text-sm mb-4">
              Depending on where you live, you may have rights to:
            </p>
            <ul className="space-y-2 mb-4 list-none">
              {[
                "Access the personal information we hold about you",
                "Correct inaccurate information",
                "Request deletion of your account and associated data",
                "Object to or restrict certain processing of your information",
                "Request a copy of your data in a portable format",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brass shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm">
              You can delete your account at any time directly within the app
              (Settings → Delete Account). For any other privacy request, contact
              us at the email below.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-sm">
              Camrhia is not intended for use by anyone under the age of 18. We
              do not knowingly collect personal information from children. If we
              learn that we have collected information from a child under 18, we
              will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              10. Data Security
            </h2>
            <p className="text-sm">
              We take reasonable technical and organizational measures to protect
              your information, including encryption in transit and access
              controls on our database. However, no method of transmission or
              storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              11. International Users
            </h2>
            <p className="text-sm">
              Camrhia is based in the United States. If you use the Service from
              outside the United States, your information will be transferred to
              and processed in the United States, where data protection laws may
              differ from those in your country.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              12. Changes to This Policy
            </h2>
            <p className="text-sm">
              We may update this Privacy Policy from time to time. If we make
              material changes, we will notify you through the app or by email.
              The &ldquo;Last updated&rdquo; date at the top of this page reflects the most
              recent revision.
            </p>
          </section>

          <section>
            <h2 className="font-fraunces text-2xl font-semibold text-ink mb-4">
              13. Contact Us
            </h2>
            <p className="text-sm">
              If you have questions about this Privacy Policy or how we handle
              your information, contact us at:
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
