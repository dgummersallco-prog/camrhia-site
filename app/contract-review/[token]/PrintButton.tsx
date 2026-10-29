'use client'

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
      Print or save as PDF
    </button>
  )
}
