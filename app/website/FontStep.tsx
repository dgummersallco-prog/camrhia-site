'use client'

import { useEffect, useRef, useState } from 'react'

export type FontPick = { title: string[]; subtitle: string[]; paragraph: string[] }
export type FontItem = { id: string; label: string; family: string; gf: string; cat: string }
type Role = 'title' | 'subtitle' | 'paragraph'

const ROLES: { k: Role; label: string }[] = [
  { k: 'title', label: 'Title' },
  { k: 'subtitle', label: 'Subtitle' },
  { k: 'paragraph', label: 'Paragraph' },
]
const GROUPS = [
  { k: 'serif', label: 'Serif' },
  { k: 'sans', label: 'Sans serif' },
  { k: 'script', label: 'Script' },
  { k: 'display', label: 'Display' },
  { k: 'other', label: 'More fonts' },
]
const MAX = 3
const groupOf = (cat: string) => {
  const c = cat.toLowerCase()
  if (/sans/.test(c)) return 'sans'
  if (/script|hand/.test(c)) return 'script'
  if (/display|decor/.test(c)) return 'display'
  if (/serif/.test(c)) return 'serif'
  return 'other'
}

function Item({ f, role, picks, onPick }: { f: FontItem; role: Role; picks: FontPick; onPick: (id: string) => void }) {
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
  const tags = ROLES.filter((r) => picks[r.k].includes(f.id))
  return (
    <button ref={ref} type="button" onClick={() => onPick(f.id)} className="min-w-0 py-1 text-left">
      <span className={'block truncate text-xl text-ink ' + (on ? 'underline decoration-twilight decoration-2 underline-offset-4' : '')} style={{ fontFamily: f.family }}>{f.label}</span>
      {tags.length > 0 && (
        <span className="mt-0.5 flex flex-wrap gap-1">
          {tags.map((r) => <span key={r.k} className="rounded-full bg-twilight px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">{r.label} {picks[r.k].indexOf(f.id) + 1}</span>)}
        </span>
      )}
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
  const groups = GROUPS.map((g) => ({ ...g, list: fonts.filter((f) => groupOf(f.cat) === g.k) })).filter((g) => g.list.length > 0)
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
        <div className="mt-3 rounded-xl border border-black/10 bg-white/90 px-4 py-3">
          <p className="truncate text-3xl text-ink" style={{ fontFamily: first('title')?.family }}>Your Name</p>
          <p className="mt-0.5 truncate text-sm uppercase tracking-[0.2em] text-ink-soft" style={{ fontFamily: first('subtitle')?.family }}>Wedding Photography</p>
          <p className="mt-1 truncate text-sm text-ink" style={{ fontFamily: first('paragraph')?.family }}>Candid, honest photos of the moments that matter most to you.</p>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Choosing your {ROLES.find((r) => r.k === role)!.label.toLowerCase()} font. Pick up to three. The first one you pick is what I start with.</p>
      </div>
      {groups.map((g) => (
        <div key={g.k}>
          <p className="mb-1 mt-4 text-xs uppercase tracking-wide text-ink-soft">{g.label}</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 sm:grid-cols-4">
            {g.list.map((f) => <Item key={f.id} f={f} role={role} picks={picks} onPick={onPick} />)}
          </div>
        </div>
      ))}
    </div>
  )
}
