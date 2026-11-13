'use client'

import { useEffect, useRef, useState } from 'react'

export type FontPick = { title: string[]; subtitle: string[]; paragraph: string[] }
export type FontItem = { id: string; label: string; family: string; gf: string }
type Role = 'title' | 'subtitle' | 'paragraph'

const ROLES: { k: Role; label: string; sample: string }[] = [
  { k: 'title', label: 'Title', sample: 'Your Name' },
  { k: 'subtitle', label: 'Subtitle', sample: 'Wedding Photography' },
  { k: 'paragraph', label: 'Paragraph', sample: 'Candid, honest photos of the moments that matter most to you.' },
]
const MAX = 3

function Row({ f, role, picks, onPick }: { f: FontItem; role: Role; picks: FontPick; onPick: (id: string) => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !f.gf) return
    const load = () => {
      const id = 'fs-' + f.id
      if (document.getElementById(id)) return
      const l = document.createElement('link')
      l.id = id
      l.rel = 'stylesheet'
      l.href = 'https://fonts.googleapis.com/css2?family=' + f.gf + '&display=swap'
      document.head.appendChild(l)
    }
    if (typeof IntersectionObserver === 'undefined') { load(); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { load(); io.disconnect() } }, { rootMargin: '500px' })
    io.observe(el)
    return () => io.disconnect()
  }, [f.id, f.gf])

  const on = picks[role].includes(f.id)
  const cur = ROLES.find((r) => r.k === role)!
  const style: React.CSSProperties = { fontFamily: f.family }
  if (role === 'title') style.fontSize = 30
  if (role === 'subtitle') { style.fontSize = 17; style.letterSpacing = '0.18em'; style.textTransform = 'uppercase' }
  if (role === 'paragraph') style.fontSize = 15
  return (
    <button ref={ref} type="button" onClick={() => onPick(f.id)}
      className={'flex items-center gap-4 rounded-xl border bg-white/80 px-4 py-3 text-left transition hover:bg-white ' + (on ? 'border-twilight ring-2 ring-twilight' : 'border-black/10')}>
      <span className="min-w-0 flex-1">
        <span className={'block text-ink ' + (role === 'paragraph' ? '' : 'truncate')} style={style}>{cur.sample}</span>
        <span className="mt-0.5 block text-[11px] text-ink-soft">{f.label}</span>
      </span>
      <span className="flex shrink-0 flex-wrap justify-end gap-1">
        {ROLES.filter((r) => picks[r.k].includes(f.id)).map((r) => (
          <span key={r.k} className="rounded-full bg-twilight px-2 py-0.5 text-[11px] font-medium text-white">{r.label} {picks[r.k].indexOf(f.id) + 1}</span>
        ))}
      </span>
    </button>
  )
}

export default function FontStep({ fonts, picks, setPicks }: { fonts: FontItem[]; picks: FontPick; setPicks: (p: FontPick) => void }) {
  const [role, setRole] = useState<Role>('title')
  const onPick = (id: string) => {
    const cur = picks[role]
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX ? cur : [...cur, id]
    setPicks({ ...picks, [role]: next })
  }
  const first = (r: Role) => fonts.find((f) => f.id === picks[r][0])
  return (
    <div>
      <div className="sticky top-0 z-10 bg-paper/95 pb-3 pt-1 backdrop-blur">
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <button key={r.k} type="button" onClick={() => setRole(r.k)}
              className={'flex-1 rounded-full border px-3 py-2 text-sm transition ' + (role === r.k ? 'border-twilight bg-twilight text-white' : 'border-black/15 bg-white text-ink')}>
              {r.label} <span className="text-xs opacity-80">{picks[r.k].length}/{MAX}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 rounded-xl border border-black/10 bg-white/90 p-4">
          <p className="truncate text-3xl text-ink" style={{ fontFamily: first('title')?.family }}>Your Name</p>
          <p className="mt-1 truncate text-sm uppercase tracking-[0.2em] text-ink-soft" style={{ fontFamily: first('subtitle')?.family }}>Wedding Photography</p>
          <p className="mt-2 text-sm text-ink" style={{ fontFamily: first('paragraph')?.family }}>Candid, honest photos of the moments that matter most to you.</p>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Choosing: {ROLES.find((r) => r.k === role)!.label}. Pick up to three. The first one you pick is what I start with.</p>
      </div>
      <div className="grid gap-2">
        {fonts.map((f) => <Row key={f.id} f={f} role={role} picks={picks} onPick={onPick} />)}
      </div>
    </div>
  )
}
