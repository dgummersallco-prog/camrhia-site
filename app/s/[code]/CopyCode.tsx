"use client"
import { useState } from "react"

export default function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <div className="rounded-2xl border border-line bg-paper-deep px-6 py-5 mb-8">
      <p className="text-xs uppercase tracking-widest text-ink-soft font-mono mb-2">Your session code</p>
      <p className="font-mono text-4xl font-semibold tracking-[0.25em] text-ink">{code}</p>
      <button onClick={copy} className="mt-3 text-sm font-semibold text-twilight hover:underline">
        {copied ? "Copied!" : "Copy code"}
      </button>
    </div>
  )
}
