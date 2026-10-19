import type { Metadata } from "next"
import { Cormorant_Garamond, Instrument_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { BRAND_NAME } from "@/lib/brand"

const fraunces = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--ff-fraunces",
  display: "swap",
})

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--ff-instrument-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--ff-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: `${BRAND_NAME} | Your photography website, bookings and client app in one`,
  description:
    "A live portfolio website, bookings, contracts, payments and gallery delivery for photographers. Free for clients. Try it free for 14 days.",
  openGraph: {
    title: `${BRAND_NAME} | Your photography website, bookings and client app in one`,
    description:
      "A live portfolio website, bookings, contracts, payments and gallery delivery for photographers. Free for clients. Try it free for 14 days.",
    url: "https://camrhia.com",
    siteName: "Camrhia",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} | Your photography website, bookings and client app in one`,
    description:
      "A live portfolio website, bookings, contracts, payments and gallery delivery for photographers. Free for clients. Try it free for 14 days.",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://camrhia.com/#org",
      "name": "Camrhia",
      "url": "https://camrhia.com",
      "logo": "https://camrhia.com/camrhia-logo.png",
    },
    {
      "@type": "SoftwareApplication",
      "name": "Camrhia",
      "url": "https://camrhia.com",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "iOS",
      "downloadUrl": "https://apps.apple.com/app/id6800011162",
      "description":
        "Camrhia is an app for photographers with a live portfolio website, a marketplace where clients browse photographers in their area, bookings, contracts, payment tracking, client messaging, a calendar and gallery link delivery. Free for clients. 14-day free trial for photographers.",
      "publisher": { "@id": "https://camrhia.com/#org" },
      "offers": [
        { "@type": "Offer", "name": "Solo, monthly", "price": "59.99", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Solo, yearly", "price": "590.00", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Studio, monthly", "price": "149.00", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Studio, yearly", "price": "999.99", "priceCurrency": "USD" },
      ],
    },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
