import type { CSSProperties, ReactNode } from 'react'

type Pkg = { id: string; title: string; price?: string | number | null; description?: string | null }

export const PR_SEC = ['capri', 'skye', 'bali', 'fiji', 'crete', 'malta', 'aruba', 'maui']
export const PR_PAGE = ['corsica', 'sardinia', 'tahiti', 'santorini', 'zanzibar', 'madeira', 'mykonos', 'bermuda', 'tobago', 'lanai', 'azores', 'ibiza']

type Props = {
  design: string; title: string; pkgs: Pkg[]; fid: string; intro: string; note: string
  pkgIntro: Record<string, string>; headStyle: CSSProperties
  ink: string; soft: string; accent: string; line: string; bg: string; tint: string
  pics: string[]; fsp: (k: string, d: number) => any; fsr: (k: string, d: number) => any
}

export function PricingDesign(P: Props) {
  const { design: d, title, pkgs, fid, intro, note, pkgIntro, headStyle, ink, soft, accent, line, bg, tint, pics, fsp, fsr } = P
  const panel = `color-mix(in srgb, ${bg} 40%, #fff)`
  const bleed: CSSProperties = { background: ink, boxShadow: `0 0 0 100vmax ${ink}`, clipPath: 'inset(0 -100vmax)' }
  const feats = (s?: string | null) => (s ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
  const pic = (i: number): string | null => (pics.length ? pics[i % pics.length] : null)
  const hot = (p: Pkg) => p.id === fid
  const name = (p: Pkg, size = 1.5, st: CSSProperties = {}) => (
    <h3 className="el-pr_name" style={{ ...headStyle, fontSize: fsr('fs-pname', size), lineHeight: 1.2, ...st }}>{p.title}</h3>
  )
  const price = (p: Pkg, size = 2.25, st: CSSProperties = {}) =>
    p.price ? <p className="el-pr_price" style={{ ...headStyle, color: accent, fontSize: fsr('fs-pprice', size), lineHeight: 1.1, ...st }}>{p.price}</p> : null
  const pin = (p: Pkg, color = soft) =>
    pkgIntro[p.id] ? <p className="el-pr_intro mt-2 whitespace-pre-line italic leading-relaxed" style={{ color, fontSize: fsp('fs-plist', 15) }}>{pkgIntro[p.id]}</p> : null
  const ul = (p: Pkg, align: 'left' | 'center' = 'left', color = soft) =>
    feats(p.description).length > 0 ? (
      <ul className="el-pr_list grid gap-2.5 leading-snug" style={{ color, fontSize: fsp('fs-plist', 14), textAlign: align }}>
        {feats(p.description).map((f, j) => <li key={j}>{f}</li>)}
      </ul>
    ) : null
  const inline = (p: Pkg, color = soft) =>
    feats(p.description).length > 0 ? (
      <p className="el-pr_list mt-3 leading-relaxed" style={{ color, fontSize: fsp('fs-plist', 14) }}>{feats(p.description).join('   ·   ')}</p>
    ) : null
  const badge = (p: Pkg, color = accent, align: 'left' | 'center' = 'center') =>
    hot(p) ? <p className="mb-3 text-[10px] uppercase tracking-[0.28em]" style={{ color, textAlign: align }}>Most popular</p> : null
  const head = (align: 'center' | 'left' = 'center', color?: string) => (
    <div className={align === 'center' ? 'mx-auto mb-12 max-w-2xl text-center' : 'mb-10'}>
      <h2 style={{ ...headStyle, ...(color ? { color } : {}), fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.05 }}>{title}</h2>
      {intro && <p className="mt-4 whitespace-pre-line leading-relaxed" style={{ color: color ?? soft, opacity: color ? 0.8 : 1, fontSize: 16 }}>{intro}</p>}
    </div>
  )
  const foot = (color = soft) => (note ? <p className="mt-10 text-center text-sm italic" style={{ color }}>{note}</p> : null)
  const W = (node: ReactNode, w = 'max-w-7xl') => <div className={`mx-auto ${w}`}>{node}</div>
  const photo = (i: number, ar: string, st: CSSProperties = {}) => {
    const u = pic(i)
    return u ? <div className="overflow-hidden" style={{ aspectRatio: ar, ...st }}><img src={u} alt="" className="h-full w-full object-cover" /></div> : null
  }
  const auto = (min: number, gap = 24): CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap })

  /* ---------- SECTION DESIGNS ---------- */
  if (d === 'capri') {
    const main = pkgs.find((p) => hot(p)) ?? pkgs[Math.floor(pkgs.length / 2)] ?? pkgs[0]
    if (!main) return null
    const rest = pkgs.filter((p) => p !== main)
    return W(<>{head()}
      <div className="grid items-stretch gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div id={'pk-' + main.id} className="flex flex-col justify-center rounded-3xl p-12" style={{ background: accent, color: '#fff' }}>
          {badge(main, 'rgba(255,255,255,.8)', 'left')}{name(main, 2, { color: '#fff' })}{pin(main, 'rgba(255,255,255,.8)')}
          {price(main, 3.2, { color: '#fff', marginTop: 16 })}
          <div className="my-7 h-px w-14" style={{ background: 'rgba(255,255,255,.4)' }} />
          {ul(main, 'left', 'rgba(255,255,255,.9)')}
        </div>
        <div className="grid gap-6">{rest.map((p) => (
          <div key={p.id} id={'pk-' + p.id} className="flex flex-col justify-center rounded-3xl p-9" style={{ background: panel, border: `1px solid ${line}` }}>
            <div className="flex items-baseline justify-between gap-4">{name(p, 1.4)}{price(p, 1.6, { whiteSpace: 'nowrap' })}</div>
            {pin(p)}{inline(p)}
          </div>))}</div>
      </div>{foot()}</>)
  }

  if (d === 'skye') return W(
    <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
      <div>{head('left')}{foot()}</div>
      <div>{pkgs.map((p, i) => (
        <div key={p.id} id={'pk-' + p.id} className="flex items-start justify-between gap-8 py-8" style={{ borderTop: i > 0 ? `1px solid ${line}` : `1px solid ${line}` }}>
          <div className="min-w-0">{badge(p, accent, 'left')}{name(p, 1.4, hot(p) ? { color: accent } : {})}{pin(p)}{inline(p)}</div>
          {price(p, 1.6, { whiteSpace: 'nowrap' })}
        </div>))}</div>
    </div>)

  if (d === 'bali') return W(<>{head()}
    <div className="mx-auto grid max-w-4xl gap-5">{pkgs.map((p) => (
      <div key={p.id} id={'pk-' + p.id} className="grid overflow-hidden sm:grid-cols-[1fr_auto]" style={{ background: panel, border: `1px solid ${hot(p) ? accent : line}`, borderRadius: 16 }}>
        <div className="p-8">{badge(p, accent, 'left')}{name(p, 1.5)}{pin(p)}{inline(p)}</div>
        <div className="flex min-w-[170px] items-center justify-center px-8 py-6 text-center" style={{ borderLeft: `2px dashed ${hot(p) ? accent : line}`, background: hot(p) ? accent : tint }}>
          {price(p, 2, { color: hot(p) ? '#fff' : accent })}
        </div>
      </div>))}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'fiji') return W(
    <div className="grid items-stretch gap-12 md:grid-cols-2">
      {photo(0, '4/5')}
      <div className="flex flex-col justify-center">{head('left')}
        {pkgs.map((p, i) => (
          <div key={p.id} id={'pk-' + p.id} className="py-6" style={{ borderTop: `1px solid ${line}` }}>
            <div className="flex items-baseline justify-between gap-4">{name(p, 1.35, hot(p) ? { color: accent } : {})}{price(p, 1.5, { whiteSpace: 'nowrap' })}</div>
            {pin(p)}{inline(p)}
          </div>))}
        {foot()}
      </div>
    </div>)

  if (d === 'crete') return W(<>{head()}
    <div style={auto(240, 0)}>{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center px-8 py-6 text-center" style={{ borderLeft: i > 0 ? `1px solid ${line}` : undefined }}>
        {badge(p)}
        <p className="mb-2 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>{p.title}</p>
        {price(p, 3.6, { color: hot(p) ? accent : ink })}
        {pin(p)}
        <div className="my-6 h-px w-10" style={{ background: accent }} />
        {ul(p, 'center')}
      </div>))}</div>{foot()}</>)

  if (d === 'malta') return W(<>{head()}
    <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-16 py-4">{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="w-full max-w-[320px] flex-1" style={{ minWidth: 260, transform: `rotate(${[-2, 1.5, -1, 2][i % 4]}deg)` }}>
        <div className="bg-white p-3 pb-7" style={{ boxShadow: '0 14px 34px rgba(0,0,0,.16)' }}>
          {photo(i, '4/5')}
          <div className="px-1 pt-5 text-center">{badge(p)}{name(p, 1.4, { color: '#2a2a2a' })}{price(p, 1.6, { marginTop: 6 })}</div>
        </div>
        <div className="mt-6 px-2 text-center">{pin(p)}<div className="mt-3">{ul(p, 'center')}</div></div>
      </div>))}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'aruba') return W(<>{head()}
    <div className="flex flex-wrap items-end justify-center gap-5">{pkgs.map((p, i) => { const h = hot(p); const c = h ? '#fff' : ink; return (
      <div key={p.id} id={'pk-' + p.id} className="flex min-w-[230px] max-w-[360px] flex-1 flex-col items-center px-8 text-center" style={{ background: h ? accent : panel, color: c, border: h ? undefined : `1px solid ${line}`, paddingTop: 40, paddingBottom: 40 + i * 36 }}>
        {badge(p, '#fff')}{price(p, 2.6, { color: h ? '#fff' : accent })}
        <div className="my-5 h-px w-10" style={{ background: h ? 'rgba(255,255,255,.4)' : line }} />
        {name(p, 1.4, { color: c })}{pin(p, h ? 'rgba(255,255,255,.8)' : soft)}
        <div className="mt-5">{ul(p, 'center', h ? 'rgba(255,255,255,.88)' : soft)}</div>
      </div>) })}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'maui') return W(<>{head()}
    <div style={auto(270)}>{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="flex flex-col overflow-hidden" style={{ background: panel, border: `1px solid ${hot(p) ? accent : line}` }}>
        <div className="relative">
          {photo(i, '4/3')}
          <div className="absolute inset-x-0 bottom-0 p-6" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.6))' }}>{name(p, 1.5, { color: '#fff' })}</div>
        </div>
        <div className="flex flex-1 flex-col p-7">
          <div className="flex items-baseline justify-between gap-3">{price(p, 1.8)}{hot(p) && <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: accent }}>Most popular</span>}</div>
          {pin(p)}<div className="mt-5">{ul(p)}</div>
        </div>
      </div>))}</div>{foot()}</>)

  /* ---------- PAGE DESIGNS ---------- */
  if (d === 'corsica') return W(<>{head()}
    <div className="items-end" style={auto(270, 28)}>{pkgs.map((p, i) => { const h = hot(p); return (
      <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center text-center" style={{ background: panel, border: `1px solid ${h ? accent : line}`, paddingBottom: h ? 44 : 28, boxShadow: h ? '0 18px 44px rgba(0,0,0,.12)' : undefined }}>
        <div className="w-full">{photo(i, h ? '3/4' : '4/5')}</div>
        <div className="flex flex-col items-center px-8 pt-8">{badge(p)}{name(p, 1.6)}{pin(p)}{price(p, 2.4, { marginTop: 12 })}<div className="my-6 h-px w-10" style={{ background: line }} />{ul(p, 'center')}</div>
      </div>) })}</div>{foot()}</>)

  if (d === 'sardinia') return W(
    <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">{photo(0, '4/5', { marginBottom: 32 })}{head('left')}{note && <p className="text-sm italic" style={{ color: soft }}>{note}</p>}</div>
      <div className="grid gap-5">{pkgs.map((p) => (
        <div key={p.id} id={'pk-' + p.id} className="grid items-center gap-6 p-9 md:grid-cols-[1.1fr_1.2fr_auto]" style={{ background: panel, border: `1px solid ${hot(p) ? accent : line}` }}>
          <div>{badge(p, accent, 'left')}{name(p, 1.5)}{pin(p)}</div>
          {ul(p)}
          {price(p, 2.2, { whiteSpace: 'nowrap' })}
        </div>))}</div>
    </div>)

  if (d === 'tahiti') return (
    <div style={bleed} className="px-2 py-10">
      {W(<>{head('center', bg)}
        <div style={auto(270, 24)}>{pkgs.map((p) => (
          <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center px-9 py-12 text-center" style={{ border: `1px solid ${hot(p) ? accent : 'rgba(255,255,255,.2)'}` }}>
            {badge(p)}{name(p, 1.6, { color: bg })}{pin(p, 'rgba(255,255,255,.65)')}{price(p, 2.6, { marginTop: 14 })}
            <div className="my-7 h-px w-12" style={{ background: accent }} />
            {ul(p, 'center', 'rgba(255,255,255,.75)')}
          </div>))}</div>{foot('rgba(255,255,255,.6)')}</>)}
    </div>)

  if (d === 'santorini') {
    const u = pic(0)
    return W(<>
      <div className="relative flex items-end overflow-hidden px-8 pb-24 pt-32 md:px-16" style={{ background: tint, minHeight: 360 }}>
        {u && <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0" style={{ background: u ? 'linear-gradient(transparent, rgba(0,0,0,.55))' : 'none' }} />
        <div className="relative max-w-2xl">
          <h2 style={{ ...headStyle, color: u ? '#fff' : ink, fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', lineHeight: 1.05 }}>{title}</h2>
          {intro && <p className="mt-4 whitespace-pre-line leading-relaxed" style={{ color: u ? 'rgba(255,255,255,.88)' : soft, fontSize: 16 }}>{intro}</p>}
        </div>
      </div>
      <div className="relative px-4 md:px-10" style={{ marginTop: -64, ...auto(270, 20) }}>{pkgs.map((p) => (
        <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center px-8 py-10 text-center" style={{ background: panel, border: `1px solid ${hot(p) ? accent : line}`, boxShadow: '0 12px 32px rgba(0,0,0,.08)' }}>
          {badge(p)}{name(p, 1.5)}{pin(p)}{price(p, 2.3, { marginTop: 12 })}
          <div className="my-6 h-px w-10" style={{ background: line }} />{ul(p, 'center')}
        </div>))}</div>{foot()}</>)
  }

  if (d === 'zanzibar') return W(<>{head('center')}
    <div className="gap-x-20 md:columns-2">{pkgs.map((p) => (
      <div key={p.id} id={'pk-' + p.id} className="mb-14 break-inside-avoid">
        {badge(p, accent, 'left')}
        <div className="flex items-baseline gap-3">
          {name(p, 1.9, hot(p) ? { color: accent } : {})}
          <span className="flex-1" style={{ borderBottom: `1px dotted ${soft}`, opacity: 0.5, transform: 'translateY(-5px)' }} />
          {price(p, 1.6, { whiteSpace: 'nowrap' })}
        </div>
        {pin(p)}{inline(p)}
      </div>))}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'madeira') return W(<>{head('center')}
    <div className="grid gap-20">{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="grid items-center gap-12 md:grid-cols-2">
        <div style={{ order: i % 2 ? 2 : 1 }}>{photo(i, '4/3')}</div>
        <div style={{ order: i % 2 ? 1 : 2 }}>
          {badge(p, accent, 'left')}{name(p, 2)}{price(p, 1.8, { marginTop: 10 })}{pin(p)}
          <div className="mt-6">{ul(p)}</div>
        </div>
      </div>))}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'mykonos') return (
    <div style={bleed} className="px-2 py-14">
      {W(<>{head('center', bg)}
        <div style={auto(270, 24)}>{pkgs.map((p, i) => (
          <div key={p.id} id={'pk-' + p.id}>
            <div className="p-2" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.18)' }}>{photo(i, '3/2')}</div>
            <div className="pt-6 text-center">{badge(p)}{name(p, 1.5, { color: bg })}{price(p, 1.8, { marginTop: 8 })}{pin(p, 'rgba(255,255,255,.65)')}<div className="mt-4">{ul(p, 'center', 'rgba(255,255,255,.75)')}</div></div>
          </div>))}</div>{foot('rgba(255,255,255,.6)')}</>, 'max-w-6xl')}
    </div>)

  if (d === 'bermuda') return W(<>{head('left')}
    <div>{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="grid items-start gap-8 py-10 md:grid-cols-[90px_1.2fr_2fr_auto]" style={{ borderTop: `1px solid ${line}`, borderBottom: i === pkgs.length - 1 ? `1px solid ${line}` : undefined }}>
        <span style={{ ...headStyle, color: accent, fontSize: '2rem', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
        <div>{badge(p, accent, 'left')}{name(p, 1.6)}{pin(p)}</div>
        {ul(p)}
        {price(p, 2, { whiteSpace: 'nowrap' })}
      </div>))}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'tobago') return W(<>
    <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.2fr]">
      <div className="lg:sticky lg:top-24">{photo(0, '4/5')}</div>
      <div>{head('left')}
        {pkgs.map((p, i) => (
          <details key={p.id} id={'pk-' + p.id} open={hot(p) || (!pkgs.some(hot) && i === 0)} className="group py-6" style={{ borderTop: `1px solid ${line}` }}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
              <div>{badge(p, accent, 'left')}{name(p, 1.6)}</div>
              <div className="flex items-center gap-6">{price(p, 1.6, { whiteSpace: 'nowrap' })}<span className="text-2xl leading-none group-open:hidden" style={{ color: accent }}>+</span><span className="hidden text-2xl leading-none group-open:inline" style={{ color: accent }}>&minus;</span></div>
            </summary>
            <div className="pb-4 pt-5">{pin(p)}<div className="mt-4">{ul(p)}</div></div>
          </details>))}
        {foot()}
      </div>
    </div></>, 'max-w-6xl')

  if (d === 'lanai') return W(<>{head()}
    <div className="grid gap-6 md:grid-cols-2">{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="overflow-hidden" style={{ background: panel, border: `1px solid ${hot(p) ? accent : line}` }}>
        <div className="relative">{photo(i, '16/10')}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,.65))' }}>{name(p, 1.6, { color: '#fff' })}{price(p, 1.8, { color: '#fff', whiteSpace: 'nowrap' })}</div>
        </div>
        <div className="p-7">{badge(p, accent, 'left')}{pin(p)}<div className="mt-3">{ul(p)}</div></div>
      </div>))}</div>{foot()}</>)

  if (d === 'azores') return W(<>{head('center')}
    <div className="grid gap-6 lg:grid-cols-2">{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="grid overflow-hidden sm:grid-cols-[2fr_3fr]" style={{ background: panel, border: `1px solid ${hot(p) ? accent : line}` }}>
        <div className="min-h-[200px]" style={{ background: tint }}>{pic(i) && <img src={pic(i) as string} alt="" className="h-full w-full object-cover" />}</div>
        <div className="p-8">{badge(p, accent, 'left')}{name(p, 1.5)}{price(p, 1.7, { marginTop: 8 })}{pin(p)}<div className="mt-5">{ul(p)}</div></div>
      </div>))}</div>{foot()}</>)

  if (d === 'ibiza') return W(<>{head()}
    <div>{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="grid items-stretch md:grid-cols-[220px_1fr_1.3fr_auto]" style={{ background: i % 2 ? tint : panel, borderLeft: `4px solid ${hot(p) ? accent : 'transparent'}` }}>
        <div className="min-h-[140px]" style={{ background: tint }}>{pic(i) && <img src={pic(i) as string} alt="" className="h-full w-full object-cover" />}</div>
        <div className="p-8">{badge(p, accent, 'left')}{name(p, 1.7)}{pin(p)}</div>
        <div className="flex items-center p-8">{ul(p)}</div>
        <div className="flex items-center p-8">{price(p, 2.2, { whiteSpace: 'nowrap' })}</div>
      </div>))}</div>{foot()}</>, 'max-w-6xl')

  return null
}
