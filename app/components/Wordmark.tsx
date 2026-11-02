import localFont from "next/font/local"
import { BRAND_NAME } from "@/lib/brand"

const script = localFont({
  src: [
    { path: "../fonts/dancing-script-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../fonts/dancing-script-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
})

export default function Wordmark({ className = "text-3xl" }: { className?: string }) {
  return (
    <span className={`${script.className} ${className} text-ink leading-none`}>
      {BRAND_NAME}
    </span>
  )
}
