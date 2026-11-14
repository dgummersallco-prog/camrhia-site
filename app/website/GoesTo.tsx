"use client"

const OPTS = [
  { v: '', label: 'Booking page' },
  { v: 'galleries', label: 'Galleries page' },
  { v: 'about', label: 'About page' },
  { v: 'home', label: 'Home page' },
]

export function GoesTo({ value, onChange, inputCls }: { value: string; onChange: (v: string) => void; inputCls: string }) {
  const v = value ?? ''
  const isG = v.startsWith('g:')
  const known = OPTS.some((o) => o.v === v)
  const sel = known || isG ? v : '__url'
  return (
    <div className="mt-3">
      <label className="mb-1 block text-xs font-medium text-ink">Goes to</label>
      <select value={sel} onChange={(e) => onChange(e.target.value === '__url' ? 'https://' : e.target.value)} className={inputCls}>
        {OPTS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
        {isG && <option value={v}>A specific gallery</option>}
        <option value="__url">Another link…</option>
      </select>
      {sel === '__url' && <input value={v} onChange={(e) => onChange(e.target.value)} placeholder="https://" className={inputCls + ' mt-2'} />}
    </div>
  )
}
