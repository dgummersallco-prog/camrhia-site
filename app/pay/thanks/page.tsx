import Link from 'next/link'

export default function PayThanks() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl text-ink">Payment received</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Thank you. Your payment is on its way to your photographer, and it will show as paid in a moment.
      </p>
      <Link href="/my" className="mt-6 rounded-full bg-ink px-6 py-3 text-sm text-white">Back to my home</Link>
    </main>
  )
}
