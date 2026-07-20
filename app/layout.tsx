import type { Metadata } from "next"
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { BRAND_NAME } from "@/lib/brand"

const fraunces = Fraunces({
  subsets: ["latin"],
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
  title: `${BRAND_NAME} — The wedding day, planned together.`,
  description:
    "One shared app for the photographer and the couple — a real-time timeline you build together, a contract that signs itself into place, and a gallery waiting at the end of it all.",
  openGraph: {
    title: `${BRAND_NAME} — The wedding day, planned together.`,
    description:
      "One shared app for the photographer and the couple — a real-time timeline you build together, a contract that signs itself into place, and a gallery waiting at the end of it all.",
    url: "https://camrhia.com",
    siteName: "Camrhia",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — The wedding day, planned together.`,
    description:
      "One shared app for the photographer and the couple — a real-time timeline you build together, a contract that signs itself into place, and a gallery waiting at the end of it all.",
  },
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
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
