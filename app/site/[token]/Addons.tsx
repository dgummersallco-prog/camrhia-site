'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { roots, rootKey } from '@/lib/photoFx'

type Addon = { id: string; sec: string; t: 'text' | 'photo' | 'button' | 'line'; k?: string; text?: string; url?: string; z?: number; o?: number; ls?: number }

const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="190" viewBox="0 0 260 190"><rect width="260" height="190" fill="#E9E2D6"/><g fill="none" stroke="#9C8F7A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="95" y="68" width="70" height="52" rx="8"/><circle cx="130" cy="94" r="14"/></g><text x="130" y="152" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9C8F7A">Click to add your photo</text></svg>')

const okUrl = (u?: string) => (u && /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u.trim()) ? u.trim() : '#')

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/` : ''
const picUrl = (p?: string) => (p ? (/^(data:|https?:)/.test(p) ? p : p.startsWith('/') ? p : BASE + p) : '')

export function Addons({ list, accent, pics }: { list: unknown; accent: string; pics?: Record<string, string> | null }) {
  const [mounted, setMounted] = useState(false)
  const [, setTick] = useState(0)
  const arr: Addon[] = (Array.isArray(list) ? list : []).filter((a: any) => a && typeof a.id === 'string' && typeof a.sec === 'string' && (a.t === 'text' || a.t === 'photo' || a.t === 'button' || a.t === 'line'))
  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!arr.length) return
    const id = setInterval(() => setTick((n) => n + 1), 600)
    return () => clearInterval(id)
  }, [arr.length])
  if (!mounted || !arr.length || typeof document === 'undefined') return null
  const byKey = new Map<string, HTMLElement>()
  for (const r of roots()) { const k = rootKey(r); if (k && !byKey.has(k)) byKey.set(k, r) }
  const count: Record<string, number> = {}
  return (
    <>
      {arr.map((a) => {
        const root = byKey.get(a.sec)
        if (!root) return null
        if (getComputedStyle(root).position === 'static') root.style.position = 'relative'
        const i = (count[a.sec] = (count[a.sec] ?? -1) + 1)
        const top = 'calc(28% + ' + (i % 6) * 30 + 'px)'
        let node: React.ReactNode
        if (a.t === 'photo') {
          const pu = picUrl(pics?.['addon-' + a.id + ':0'])
          const zz = Number(a.z) > 1 ? Math.min(4, Number(a.z)) : 1
          const oo = Number(a.o) >= 0.1 && Number(a.o) < 1 ? Number(a.o) : 1
          node = <div data-addon={a.id} data-addp={a.id} className="el-axp" role="img" aria-label="" style={{ position: 'absolute', left: 'calc(50% - 130px)', top, width: 260, height: 190, borderRadius: 12, zIndex: 6, overflow: 'hidden', opacity: oo }}><div style={{ position: 'absolute', inset: 0, backgroundImage: pu ? 'url("' + pu.replace(/"/g, '%22') + '")' : 'url("' + PH + '")', backgroundSize: 'cover', backgroundPosition: 'center', transform: zz > 1 ? 'scale(' + zz + ')' : undefined }} /></div>
        } else if (a.t === 'line') {
          node = <div data-addon={a.id} data-cam-rule="1" style={{ position: 'absolute', left: 'calc(50% - 100px)', top, width: 200, height: 2, background: accent, zIndex: 6 }} />
        } else if (a.t === 'button') {
          const u = okUrl(a.url)
          node = <a data-addon={a.id} data-ls={a.ls ? '1' : undefined} className={a.k ? 'el-' + a.k : undefined} href={u} {...(/^https?:/i.test(u) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} style={{ position: 'absolute', left: 'calc(50% - 70px)', top, display: 'inline-block', ...(a.ls ? { padding: '4px 6px', borderRadius: 0, background: 'transparent', color: accent, fontSize: 16, fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: '0.2em' } : { padding: '14px 30px', borderRadius: 999, background: accent, color: '#fff', fontSize: 15, fontWeight: 600, textDecoration: 'none' }), whiteSpace: 'nowrap', textAlign: 'center', zIndex: 6 }}>{String(a.text ?? 'Button').slice(0, 200)}</a>
        } else {
          node = <p data-addon={a.id} className={a.k ? 'el-' + a.k : undefined} style={{ position: 'absolute', left: 'calc(50% - 130px)', top, width: 260, margin: 0, fontSize: 20, lineHeight: 1.3, textAlign: 'center', zIndex: 6 }}>{String(a.text ?? 'Your text here').slice(0, 2000)}</p>
        }
        return createPortal(a.t === 'button' && a.ls ? <>{node}<style>{'a[data-addon][data-ls]{background:none!important;background-image:none!important;border:0!important;box-shadow:none!important;border-radius:0!important}'}</style></> : node, root, a.id)
      })}
    </>
  )
}
