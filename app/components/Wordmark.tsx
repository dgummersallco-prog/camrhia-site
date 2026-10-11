import { Dancing_Script } from "next/font/google"
import { BRAND_NAME } from "@/lib/brand"

const script = Dancing_Script({ subsets: ["latin"], weight: ["600", "700"] })

export default function Wordmark({ className = "text-3xl" }: { className?: string }) {
  return (
    <span className={`${script.className} ${className} text-ink leading-none`}>
      {BRAND_NAME}
    </span>
  )
}
