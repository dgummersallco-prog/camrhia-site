'use client'

import CamiPanel from '@/app/edit/CamiPanel'
import type { Adjust } from '@/lib/enhance'

export default function AskCami({
  value,
  onChange,
  lookName,
  strength,
  brief,
  previewUrl,
}: {
  value: Adjust
  onChange: (a: Adjust) => void
  lookName: string
  strength: number
  brief: unknown
  previewUrl: string | null
}) {
  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-[#151518] p-4">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">Ask Camri</p>
      <CamiPanel value={value} onChange={onChange} previewUrl={previewUrl} lookName={lookName} strength={strength} brief={brief} light="" photoId="shoot" />
    </div>
  )
}
