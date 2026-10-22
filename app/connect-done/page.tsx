'use client'
import { useEffect } from 'react'

export default function ConnectDone() {
  useEffect(() => {
    const t = setTimeout(() => { window.location.href = 'camrhia://' }, 600)
    return () => clearTimeout(t)
  }, [])
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl">Thanks, you're all set</h1>
      <p className="mt-3 text-ink-soft">Stripe is finishing your payout setup. Head back to the Camrhia app to see your status.</p>
      <a href="camrhia://" className="mt-8 inline-block rounded-full bg-twilight px-6 py-3 text-white">Open the Camrhia app</a>
    </main>
  )
}
