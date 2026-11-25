'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { roots, rootKey } from '@/lib/photoFx'

type Kind = 'text' | 'photo' | 'button' | 'line' | 'circle' | 'x' | 'arrow' | 'rect' | 'star' | 'heart' | 'badge' | 'quote' | 'social'
const KINDS: Kind[] = ['text', 'photo', 'button', 'line', 'circle', 'x', 'arrow', 'rect', 'star', 'heart', 'badge', 'quote', 'social']
const GLYPH: Record<string, string> = { x: '\u2715', arrow: '\u2192', star: '\u2605', heart: '\u2665' }
type Links = { instagram?: string | null; facebook?: string | null; tiktok?: string | null; pinterest?: string | null }
type Addon = { id: string; sec: string; t: Kind; k?: string; text?: string; url?: string; z?: number; o?: number; ls?: number }

const PH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="260" height="190" viewBox="0 0 260 190"><rect width="260" height="190" fill="#E9E2D6"/><g fill="none" stroke="#9C8F7A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="95" y="68" width="70" height="52" rx="8"/><circle cx="130" cy="94" r="14"/></g><text x="130" y="152" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#9C8F7A">Click to add your photo</text></svg>')

const okUrl = (u?: string) => (u && /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(u.trim()) ? u.trim() : '#')

const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/` : ''
const picUrl = (p?: string) => (p ? (/^(data:|https?:)/.test(p) ? p : p.startsWith('/') ? p : BASE + p) : '')

export function Addons({ list, accent, pics, links }: { list: unknown; accent: string; pics?: Record<string, string> | null; links?: Links }) {
  const [mounted, setMounted] = useState(false)
  const [, setTick] = useState(0)
  const arr: Addon[] = (Array.isArray(list) ? list : []).filter((a: any) => a && typeof a.id === 'string' && typeof a.sec === 'string' && KINDS.includes(a.t))
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
        } else if (a.t === 'circle') {
          node = <div data-addon={a.id} data-cam-rule="1" aria-hidden="true" style={{ position: 'absolute', left: 'calc(50% - 60px)', top, width: 120, height: 120, border: '3px solid ' + accent, borderRadius: '50%', boxSizing: 'border-box', zIndex: 6 }} />
        } else if (a.t === 'rect') {
          node = <div data-addon={a.id} data-cam-rule="1" aria-hidden="true" style={{ position: 'absolute', left: 'calc(50% - 110px)', top, width: 220, height: 120, border: '2px solid ' + accent, borderRadius: 12, boxSizing: 'border-box', zIndex: 6 }} />
        } else if (a.t === 'x' || a.t === 'arrow' || a.t === 'star' || a.t === 'heart') {
          node = <div data-addon={a.id} data-cam-rule="1" aria-hidden="true" style={{ position: 'absolute', left: 'calc(50% - 40px)', top, width: 80, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontSize: 52, fontWeight: 300, lineHeight: 1, zIndex: 6 }}>{GLYPH[a.t]}</div>
        } else if (a.t === 'badge') {
          node = <p data-addon={a.id} className={a.k ? 'el-' + a.k : undefined} style={{ position: 'absolute', left: 'calc(50% - 70px)', top, margin: 0, padding: '8px 18px', borderRadius: 999, background: accent, color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'center', zIndex: 6 }}>{String(a.text ?? 'Now booking').slice(0, 80)}</p>
        } else if (a.t === 'quote') {
          node = <p data-addon={a.id} className={a.k ? 'el-' + a.k : undefined} style={{ position: 'absolute', left: 'calc(50% - 160px)', top, width: 320, margin: 0, padding: '22px 24px', border: '1px solid ' + accent, borderRadius: 14, background: 'rgba(255,255,255,0.6)', fontSize: 17, fontStyle: 'italic', lineHeight: 1.5, textAlign: 'center', whiteSpace: 'pre-line', boxSizing: 'border-box', zIndex: 6 }}>{String(a.text ?? '\u201CLoved every moment of our session.\u201D\n\u2014 Client name').slice(0, 600)}</p>
        } else if (a.t === 'social') {
          const have = ([['instagram', links?.instagram], ['facebook', links?.facebook], ['tiktok', links?.tiktok], ['pinterest', links?.pinterest]] as const).filter(([, u]) => !!u)
          const shown = have.length ? have : ([['instagram', '#']] as const)
          const c = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
          node = (
            <div data-addon={a.id} style={{ position: 'absolute', left: 'calc(50% - 60px)', top, display: 'flex', gap: 14, color: accent, zIndex: 6 }}>
              {shown.map(([n, u]) => (
                <a key={n} href={okUrl(String(u))} {...(/^https?:/i.test(String(u)) ? { target: '_blank', rel: 'noopener noreferrer' } : {})} aria-label={n} style={{ width: 34, height: 34, color: 'inherit', display: 'block' }}>
                  {n === 'instagram' ? <svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="3" y="3" width="18" height="18" rx="5" {...c} /><circle cx="12" cy="12" r="4" {...c} /><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" /></svg>
                    : n === 'facebook' ? <svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M14 8h2.5V5H14a3.5 3.5 0 0 0-3.5 3.5V11H8v3h2.5v6H14v-6h2.2l.5-3H14V8.5A.5.5 0 0 1 14.5 8" {...c} /></svg>
                    : n === 'tiktok' ? <svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5 M14 4c.4 2.4 2 4 4.5 4.2" {...c} /></svg>
                    : <svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="9" {...c} /><path d="M11 8.5c3-1 5 1 4 3.5-.8 2-3 2.5-4 1 M11 11l-1.5 7" {...c} /></svg>}
                </a>
              ))}
            </div>
          )
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
