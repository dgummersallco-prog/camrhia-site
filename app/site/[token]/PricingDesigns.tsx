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
  const head = (align: 'center' | 'left' = 'center', color?: string, big = false) => (
    <div className={align === 'center' ? 'mx-auto mb-12 max-w-2xl text-center' : 'mb-10'}>
      <h2 style={{ ...headStyle, ...(color ? { color } : {}), fontSize: big ? 'clamp(2.6rem, 6.4vw, 6rem)' : 'clamp(2rem, 4vw, 3rem)', lineHeight: big ? 1 : 1.05 }}>{title}</h2>
      {intro && <p className="mt-4 whitespace-pre-line leading-relaxed" style={{ color: color ?? soft, opacity: color ? 0.8 : 1, fontSize: big ? 19 : 16 }}>{intro}</p>}
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
    return W(<>{head('center', undefined, true)}
      <div className="grid items-stretch lg:grid-cols-[1.1fr_1fr]" style={{ gap: 'clamp(14px, 1.8vw, 26px)' }}>
        <div id={'pk-' + main.id} className="flex flex-col items-center justify-center text-center" style={{ background: accent, color: '#fff', borderRadius: 24, padding: 'clamp(28px, 3.4vw, 48px) clamp(20px, 3vw, 44px)' }}>
          {hot(main) && <span className="mb-4 inline-block text-[12px] font-semibold uppercase tracking-[0.25em]" style={{ background: bg, color: accent, borderRadius: 12, padding: '10px 28px' }}>Most popular</span>}
          {name(main, 3.4, { color: '#fff' })}{pin(main, 'rgba(255,255,255,.85)')}
          {price(main, 5.2, { color: '#fff', marginTop: 4 })}
          <div className="my-6 h-px w-36" style={{ background: '#fff' }} />
          {ul(main, 'center', '#fff')}
        </div>
        <div className="grid" style={{ gap: 'clamp(14px, 1.8vw, 26px)', gridAutoRows: '1fr' }}>{rest.map((p) => (
          <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center justify-center text-center" style={{ border: `1px solid ${accent}`, borderRadius: 24, padding: 'clamp(20px, 2.6vw, 36px) clamp(18px, 2.4vw, 34px)' }}>
            <div className="flex items-center justify-center" style={{ gap: 'clamp(14px, 2.4vw, 36px)' }}>{name(p, 2.6)}<span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: accent, opacity: 0.8 }} />{price(p, 2.8, { whiteSpace: 'nowrap' })}</div>
            {pin(p)}
            {feats(p.description).length > 0 && <p className="el-pr_list mt-4 leading-snug" style={{ color: ink, fontSize: fsp('fs-plist', 17) }}>{feats(p.description).join(', ')}</p>}
          </div>))}</div>
      </div>{foot()}</>)
  }

  if (d === 'skye') return W(
    <div className="grid md:grid-cols-[34%_1fr]" style={{ gap: 0 }}>
      <div className="flex flex-col justify-center md:pr-10">{head('left', undefined, true)}{foot()}</div>
      <div className="md:pl-[5%]" style={{ borderLeft: `1px solid ${line}` }}>{pkgs.map((p, i) => (
        <div key={p.id} id={'pk-' + p.id} className="flex items-center justify-between gap-8" style={{ padding: 'clamp(18px, 2.8vw, 38px) 0', borderBottom: i < pkgs.length - 1 ? `1px solid ${line}` : undefined }}>
          <div className="min-w-0">{badge(p, accent, 'left')}{name(p, 3.2, hot(p) ? { color: accent } : {})}{pin(p)}
            {feats(p.description).length > 0 && <p className="el-pr_list mt-2 leading-snug" style={{ color: ink, fontSize: fsp('fs-plist', 17) }}>{feats(p.description).join(', ')}</p>}
          </div>
          {price(p, 3.2, { color: ink, whiteSpace: 'nowrap' })}
        </div>))}</div>
    </div>)

  if (d === 'bali') return W(<>{head('center', undefined, true)}
    <div className="mx-auto grid" style={{ maxWidth: 1100, gap: 'clamp(12px, 1.6vw, 22px)' }}>{pkgs.map((p) => { const h = hot(p); const f = feats(p.description); const notch: CSSProperties = { position: 'absolute', top: '50%', width: 30, height: 30, marginTop: -15, borderRadius: '50%', background: bg, border: `1px solid ${accent}`, boxSizing: 'border-box' }; return (
      <div key={p.id} id={'pk-' + p.id} className="relative grid sm:grid-cols-[1fr_27%]" style={{ borderRadius: 22 }}>
        <div className="flex flex-col justify-center" style={{ padding: 'clamp(18px, 2.4vw, 30px) clamp(24px, 4.6vw, 64px)' }}>
          {name(p, 2.8)}{pin(p)}
          {f.length > 0 && <p className="el-pr_list mt-2 leading-snug" style={{ color: ink, fontSize: fsp('fs-plist', 17) }}>{f.join(', ')}</p>}
        </div>
        <div className="flex items-center justify-center" style={{ background: h ? accent : `color-mix(in srgb, ${accent} 9%, ${bg})`, borderLeft: `1.5px dashed ${accent}`, borderRadius: '0 22px 22px 0', padding: '18px 12px' }}>
          {price(p, 3.4, { color: h ? '#fff' : accent })}
        </div>
        <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ border: `1px solid ${accent}`, borderRadius: 22 }} />
        <span aria-hidden="true" className="hidden sm:block" style={{ ...notch, left: -15, clipPath: 'inset(0 0 0 50%)' }} />
        <span aria-hidden="true" className="hidden sm:block" style={{ ...notch, right: -15, clipPath: 'inset(0 50% 0 0)' }} />
      </div>) })}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'fiji') return W(
    <div className="grid items-stretch md:grid-cols-2" style={{ gap: 'clamp(24px, 6vw, 80px)' }}>
      <div className="overflow-hidden" style={{ aspectRatio: '1 / 1.02', background: tint }}>
        {pic(0) ? <img src={pic(0) as string} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>}
      </div>
      <div className="flex flex-col justify-center">{head('left', undefined, true)}
        {pkgs.map((p) => (
          <div key={p.id} id={'pk-' + p.id} style={{ borderTop: `1px solid ${line}`, padding: 'clamp(16px, 2.6vw, 36px) 0' }}>
            <div className="flex items-baseline justify-between gap-4">{name(p, 2.4, hot(p) ? { color: accent } : {})}{price(p, 2.2, { color: ink, whiteSpace: 'nowrap' })}</div>
            {pin(p)}
            {feats(p.description).length > 0 && <p className="el-pr_list mt-2 leading-snug" style={{ color: ink, fontSize: fsp('fs-plist', 17) }}>{feats(p.description).join(', ')}</p>}
          </div>))}
        {foot()}
      </div>
    </div>)

  if (d === 'crete') return W(<>{head('center', undefined, true)}
    <div style={auto(240, 0)}>{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="flex flex-col items-center text-center" style={{ borderLeft: i > 0 ? `1px solid ${line}` : undefined, padding: 'clamp(20px, 3vw, 44px) clamp(14px, 2vw, 30px)' }}>
        {badge(p)}
        <p className="el-pr_name uppercase" style={{ ...headStyle, color: ink, fontSize: fsr('fs-pname', 1.3), letterSpacing: '0.45em', fontWeight: 600, marginBottom: 'clamp(18px, 3vw, 44px)', paddingLeft: '0.45em' }}>{p.title}</p>
        {price(p, 5.4, { color: ink, fontWeight: 300 })}
        {pin(p)}
        <div className="h-px" style={{ width: 'clamp(50px, 6vw, 100px)', background: accent, margin: 'clamp(18px, 3vw, 42px) 0' }} />
        {feats(p.description).length > 0 && <ul className="el-pr_list grid" style={{ ...headStyle, color: ink, fontSize: fsp('fs-plist', 19), gap: 'clamp(12px, 2vw, 26px)', letterSpacing: '0.04em' }}>{feats(p.description).map((f, j) => <li key={j}>{f}</li>)}</ul>}
      </div>))}</div>{foot()}</>)

  if (d === 'malta') return W(<>{head('center', undefined, true)}
    <div className="flex flex-wrap items-start justify-center py-4" style={{ gap: 'clamp(20px, 3vw, 44px)' }}>{pkgs.map((p, i) => { const u = pic(i); return (
      <div key={p.id} id={'pk-' + p.id} className="w-full max-w-[400px] flex-1" style={{ minWidth: 260 }}>
        <div style={{ transform: `rotate(${[-1.5, 1.5, -0.5, 1][i % 4]}deg)`, background: `color-mix(in srgb, ${bg} 50%, #fff)`, padding: '4% 4% 0', boxShadow: '0 14px 34px rgba(0,0,0,.16)', borderRadius: 3 }}>
          <div className="relative">
            <div className="overflow-hidden" style={{ aspectRatio: '1.28 / 1', background: tint }}>
              {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 78" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="78" fill="#e4e2de" /><path d="M0 60 L28 30 L44 46 L62 22 L100 60 Z" fill="#c9c6c1" /><circle cx="76" cy="19" r="6" fill="#d3d0cb" /></svg>}
            </div>
            {hot(p) && <span className="absolute left-1/2 text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ bottom: -16, transform: 'translateX(-50%)', background: accent, color: '#fff', borderRadius: 12, padding: '8px 22px', whiteSpace: 'nowrap' }}>Most popular</span>}
          </div>
          <div className="text-center" style={{ padding: 'clamp(22px, 3vw, 38px) 0 clamp(14px, 2vw, 24px)' }}>{name(p, 2.2, { color: ink })}{price(p, 2.6, { marginTop: 2 })}</div>
        </div>
        <div className="px-2 text-center" style={{ marginTop: 'clamp(16px, 2.4vw, 30px)' }}>{pin(p)}<div className="mt-2">{ul(p, 'center', ink)}</div></div>
      </div>) })}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'aruba') return W(<>{head('center', undefined, true)}
    <div className="flex flex-wrap items-end justify-center" style={{ gap: 'clamp(12px, 1.8vw, 26px)' }}>{pkgs.map((p, i) => { const h = pkgs.some(hot) ? hot(p) : i === pkgs.length - 1; const c = h ? '#fff' : ink; return (
      <div key={p.id} id={'pk-' + p.id} className="flex min-w-[230px] max-w-[380px] flex-1 flex-col items-center px-8 text-center" style={{ background: h ? accent : 'transparent', color: c, border: h ? `1px solid ${accent}` : `1px solid ${accent}`, borderRadius: 22, paddingTop: 36 + i * 30, paddingBottom: 40 }}>
        {badge(p, '#fff')}{price(p, 3.8, { color: h ? '#fff' : accent })}
        <div className="my-5 h-px w-24" style={{ background: h ? '#fff' : accent, opacity: h ? 0.85 : 1 }} />
        {name(p, 1.9, { color: c })}{pin(p, h ? 'rgba(255,255,255,.85)' : soft)}
        <div className="mt-5">{ul(p, 'center', h ? '#fff' : ink)}</div>
      </div>) })}</div>{foot()}</>, 'max-w-6xl')

  if (d === 'maui') return W(<>{head('center', undefined, true)}
    <div style={auto(270, 24)}>{pkgs.map((p, i) => { const u = pic(i); return (
      <div key={p.id} id={'pk-' + p.id} className="flex flex-col overflow-hidden" style={{ border: `1px solid ${hot(p) ? accent : line}`, borderRadius: 26 }}>
        <div className="relative" style={{ aspectRatio: '1.55 / 1', background: tint }}>
          {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 65" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="65" fill="#e4e2de" /><path d="M0 50 L28 24 L44 38 L62 18 L100 50 Z" fill="#c9c6c1" /><circle cx="76" cy="15" r="5" fill="#d3d0cb" /></svg>}
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-4 pb-4 pt-16 text-center" style={{ background: 'linear-gradient(transparent, rgba(30,15,8,.78))' }}>{name(p, 2.4, { color: '#fff' })}</div>
        </div>
        <div className="flex flex-1 flex-col items-center px-6 text-center" style={{ padding: 'clamp(14px, 2vw, 26px) 24px clamp(22px, 3vw, 40px)' }}>
          {badge(p, accent, 'center')}
          {price(p, 3.4)}
          {pin(p)}
          <div className="my-5 h-px w-24" style={{ background: accent }} />
          {ul(p, 'center', ink)}
        </div>
      </div>) })}</div>{foot()}</>)

  /* ---------- PAGE DESIGNS ---------- */
  if (d === 'corsica') return W(<>{head('center', undefined, true)}
    <div className="items-stretch" style={{ ...auto(270, 22), padding: 'clamp(10px, 2vw, 30px) 0' }}>{pkgs.map((p, i) => { const h = hot(p); const u = pic(i); return (
      <div key={p.id} id={'pk-' + p.id} className="flex flex-col overflow-hidden" style={{ background: panel, border: h ? `4px solid ${accent}` : `1px solid ${line}`, borderRadius: h ? 18 : 12, margin: h ? 'clamp(-26px, -2.4vw, -8px) 0 clamp(-12px, -1vw, -4px)' : undefined, boxShadow: h ? '0 18px 40px rgba(0,0,0,.14)' : undefined }}>
        <div className="relative">
          <div className="overflow-hidden" style={{ aspectRatio: h ? '0.76 / 1' : '0.8 / 1', background: tint }}>
            {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 125" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="125" fill="#e4e2de" /><path d="M0 95 L28 55 L44 78 L62 40 L100 95 Z" fill="#c9c6c1" /><circle cx="74" cy="30" r="8" fill="#d3d0cb" /></svg>}
          </div>
          {h && <span className="absolute left-1/2 text-[15px]" style={{ bottom: -18, transform: 'translateX(-50%)', background: accent, color: '#fff', borderRadius: 10, padding: '7px 22px', whiteSpace: 'nowrap' }}>Most popular</span>}
        </div>
        <div className="flex flex-1 flex-col items-center text-center" style={{ padding: 'clamp(24px, 3.4vw, 46px) clamp(16px, 2vw, 28px) clamp(20px, 3vw, 40px)' }}>
          {name(p, 2.6)}{pin(p, ink)}
          {price(p, 3, { marginTop: 'clamp(12px, 2vw, 26px)' })}
          <div className="my-5 h-px w-24" style={{ background: accent }} />
          {ul(p, 'center', ink)}
        </div>
      </div>) })}</div>{foot()}</>)

  if (d === 'sardinia') { const ff = (headStyle as any).fontFamily; const u = pic(0); const col = (first = false): CSSProperties => ({ borderLeft: first ? undefined : `1px solid ${accent}`, margin: 'clamp(14px, 2vw, 28px) 0', padding: '0 clamp(12px, 1.8vw, 26px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }); return W(
    <div className="grid lg:grid-cols-[30%_1fr]" style={{ gap: 'clamp(20px, 4vw, 56px)' }}>
      <div className="lg:sticky lg:top-24 lg:self-start lg:pr-[clamp(16px,3vw,40px)]" style={{ borderRight: `1px solid ${line}` }}>
        <div className="overflow-hidden" style={{ aspectRatio: '0.5 / 1', background: tint }}>
          {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 50 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="50" height="100" fill="#e4e2de" /><path d="M0 76 L14 46 L24 62 L34 36 L50 76 Z" fill="#c9c6c1" /><circle cx="38" cy="22" r="5" fill="#d3d0cb" /></svg>}
        </div>
        <div className="mx-auto my-8 h-px w-28" style={{ background: accent }} />
        <h2 style={{ ...headStyle, fontSize: 'clamp(2.4rem, 4.4vw, 4rem)', lineHeight: 1.05 }}>{title}</h2>
        {intro && <p className="mt-5 whitespace-pre-line leading-relaxed" style={{ color: ink, fontSize: 18 }}>{intro}</p>}
        <div className="mx-auto my-8 h-px w-28" style={{ background: accent }} />
        {note && <p className="text-center italic" style={{ fontFamily: ff, color: ink, fontSize: 17 }}>{note}</p>}
      </div>
      <div className="grid content-start" style={{ gap: 'clamp(18px, 2.6vw, 38px)' }}>{pkgs.map((p) => { const h = hot(p); return (
        <div key={p.id} id={'pk-' + p.id} className="relative grid md:grid-cols-[1fr_1.15fr_auto]" style={{ background: panel, border: h ? `3px solid ${accent}` : `1px solid ${line}`, borderRadius: 16 }}>
          {h && <span className="absolute left-1/2 text-[16px] italic" style={{ top: -17, transform: 'translateX(-50%)', fontFamily: ff, background: accent, color: '#fff', borderRadius: 999, padding: '5px 28px', whiteSpace: 'nowrap' }}>Most popular</span>}
          <div style={{ ...col(true), padding: '0 clamp(14px, 2.4vw, 34px)' }}>{name(p, 3)}<div style={{ fontFamily: ff }}>{pin(p, ink)}</div></div>
          <div style={col()}>{feats(p.description).length > 0 && <ul className="el-pr_list grid list-disc gap-2 pl-5" style={{ color: ink, fontSize: fsp('fs-plist', 17) }}>{feats(p.description).map((f, j) => <li key={j}>{f}</li>)}</ul>}</div>
          <div style={{ ...col(), alignItems: 'center', padding: '0 clamp(14px, 2.4vw, 34px)' }}>{price(p, 3, { whiteSpace: 'nowrap' })}</div>
        </div>) })}</div>
    </div>) }

  if (d === 'tahiti') { const ff = (headStyle as any).fontFamily; return (
    <div style={bleed} className="px-2 py-14">
      {W(<>{head('center', bg, true)}
        <div style={{ ...auto(270, 24), paddingTop: 16 }}>{pkgs.map((p) => { const h = hot(p); return (
          <div key={p.id} id={'pk-' + p.id} className="relative flex flex-col items-center text-center" style={{ border: `1px solid ${h ? accent : 'rgba(255,255,255,.35)'}`, borderRadius: 8, padding: 'clamp(30px, 4vw, 56px) clamp(16px, 2.4vw, 34px) clamp(30px, 4vw, 56px)' }}>
            {h && <span className="absolute left-1/2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ top: -15, transform: 'translateX(-50%)', background: accent, color: ink, padding: '7px 22px', whiteSpace: 'nowrap' }}>Most popular</span>}
            {name(p, 3.2, { color: bg })}
            <div className="mt-5" style={{ fontFamily: ff }}>{pin(p, 'rgba(255,255,255,.88)')}</div>
            {price(p, 3.8, { marginTop: 'clamp(24px, 3.4vw, 46px)' })}
            <div className="my-7 h-px w-20" style={{ background: accent }} />
            {ul(p, 'center', bg)}
          </div>) })}</div><div style={{ fontFamily: ff }}>{foot('rgba(255,255,255,.75)')}</div></>)}
    </div>) }

  if (d === 'santorini') {
    const u = pic(0); const ff = (headStyle as any).fontFamily
    return W(<>
      <div className="relative flex items-end overflow-hidden px-6 md:px-14" style={{ background: tint, minHeight: 'clamp(380px, 54vw, 660px)', paddingBottom: 'clamp(90px, 12vw, 150px)', paddingTop: 80 }}>
        {u ? <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" className="absolute inset-0" style={{ width: '100%', height: '100%' }}><rect width="100" height="60" fill="#e4e2de" /><path d="M0 46 L28 22 L44 34 L62 14 L100 46 Z" fill="#c9c6c1" /><circle cx="76" cy="12" r="5" fill="#d3d0cb" /></svg>}
        <div className="absolute inset-0" style={{ background: u ? 'linear-gradient(transparent 35%, rgba(0,0,0,.6))' : 'none' }} />
        <div className="relative max-w-2xl">
          <h2 style={{ ...headStyle, color: u ? '#fff' : ink, fontSize: 'clamp(2.8rem, 8vw, 7rem)', lineHeight: 1 }}>{title}</h2>
          {intro && <p className="mt-4 whitespace-pre-line leading-relaxed" style={{ color: u ? 'rgba(255,255,255,.92)' : soft, fontSize: 19 }}>{intro}</p>}
        </div>
      </div>
      <div className="relative items-start px-3 md:px-4" style={{ marginTop: 'clamp(-110px, -9vw, -40px)', ...auto(270, 14) }}>{pkgs.map((p) => { const h = hot(p); return (
        <div key={p.id} id={'pk-' + p.id} className="relative flex flex-col items-center text-center" style={{ background: panel, border: h ? `3px solid ${accent}` : undefined, borderRadius: h ? 22 : 18, boxShadow: '0 8px 26px rgba(0,0,0,.14)', padding: 'clamp(24px, 3.4vw, 46px) clamp(14px, 2vw, 28px) clamp(24px, 3vw, 40px)', marginTop: h ? -16 : 0, marginBottom: h ? -8 : 0 }}>
          {h && <span className="absolute left-1/2 text-[16px] italic" style={{ top: -16, transform: 'translateX(-50%)', fontFamily: ff, background: accent, color: '#fff', borderRadius: 10, padding: '5px 26px', whiteSpace: 'nowrap' }}>Most popular</span>}
          {name(p, 2.6)}{pin(p)}{price(p, 3.4, { marginTop: 10 })}
          <div className="my-6 h-px w-24" style={{ background: accent }} />{ul(p, 'center', ink)}
        </div>) })}</div><div style={{ fontFamily: ff, marginTop: 'clamp(16px, 3vw, 40px)' }}>{foot(ink)}</div></>)
  }

  if (d === 'zanzibar') { const ff = (headStyle as any).fontFamily; const half = Math.ceil(pkgs.length / 2)
    const sprig = (flip = false) => (
      <svg width="96" height="40" viewBox="0 0 96 40" fill="none" stroke={accent} strokeWidth="1.2" strokeLinecap="round" style={flip ? { transform: 'scale(-1,-1)' } : undefined}>
        <path d="M6 34 Q44 30 88 8" />
        <ellipse cx="30" cy="25" rx="9" ry="4" transform="rotate(-28 30 25)" /><ellipse cx="38" cy="33" rx="9" ry="4" transform="rotate(35 38 33)" />
        <ellipse cx="52" cy="19" rx="9" ry="4" transform="rotate(-32 52 19)" /><ellipse cx="60" cy="28" rx="9" ry="4" transform="rotate(32 60 28)" />
        <ellipse cx="74" cy="13" rx="8" ry="3.6" transform="rotate(-35 74 13)" /><ellipse cx="80" cy="20" rx="8" ry="3.6" transform="rotate(30 80 20)" />
      </svg>)
    const orn = (flip = false) => (
      <div className="mx-auto flex items-center justify-center gap-5" style={{ maxWidth: 640 }}><span style={{ height: 1, flex: 1, background: accent }} />{sprig(flip)}<span style={{ height: 1, flex: 1, background: accent }} /></div>)
    return W(
    <div className="relative" style={{ border: `1.5px solid ${accent}`, borderRadius: 22, padding: 'clamp(10px, 1.2vw, 16px)' }}>
      <div style={{ border: `1px solid ${accent}`, borderRadius: 16, padding: 'clamp(24px, 4vw, 56px) clamp(18px, 4vw, 64px)' }}>
        {orn()}
        <div style={{ marginTop: 'clamp(16px, 3vw, 40px)' }}>{head('center', undefined, true)}</div>
        <div style={{ columnCount: 2, columnGap: 'clamp(28px, 5vw, 72px)', columnRule: `1px solid ${line}` }} className="max-md:!columns-1">{pkgs.map((p, i) => (
          <div key={p.id} id={'pk-' + p.id} className="break-inside-avoid" style={{ padding: 'clamp(16px, 2.6vw, 36px) 0', borderBottom: i === half - 1 || i === pkgs.length - 1 ? undefined : `1px solid ${line}` }}>
            <div className="flex items-baseline gap-3">{name(p, 2.6, hot(p) ? { color: accent } : {})}<span className="flex-1" style={{ borderBottom: `2px dotted ${accent}`, opacity: 0.55, transform: 'translateY(-6px)' }} />{price(p, 2.6, { color: ink, whiteSpace: 'nowrap' })}</div>
            {pin(p)}
            {feats(p.description).length > 0 && <p className="el-pr_list mt-2 leading-snug" style={{ color: ink, fontSize: fsp('fs-plist', 16) }}>{feats(p.description).join('  •  ')}</p>}
          </div>))}</div>
        <div style={{ fontFamily: ff, marginBottom: 'clamp(16px, 3vw, 40px)' }}>{foot(ink)}</div>
        {orn(true)}
      </div>
    </div>, 'max-w-5xl') }

  if (d === 'madeira') { const ff = (headStyle as any).fontFamily; return W(<>{head('center', undefined, true)}
    <div>{pkgs.map((p, i) => { const u = pic(i); const flip = i % 2 === 1; return (
      <div key={p.id} id={'pk-' + p.id} className={flip ? 'grid md:grid-cols-[1fr_55%]' : 'grid md:grid-cols-[55%_1fr]'} style={{ background: flip ? tint : 'transparent', padding: 'clamp(12px, 2vw, 28px) 0', alignItems: 'center' }}>
        <div className="overflow-hidden" style={{ order: flip ? 2 : 1, aspectRatio: '1.52 / 1', background: tint }}>
          {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 66" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="66" fill="#e4e2de" /><path d="M0 50 L28 24 L44 38 L62 16 L100 50 Z" fill="#c9c6c1" /><circle cx="76" cy="13" r="5" fill="#d3d0cb" /></svg>}
        </div>
        <div style={{ order: flip ? 1 : 2, margin: 'clamp(8px, 1.4vw, 20px) 0', padding: '0 clamp(16px, 4vw, 56px)', [flip ? 'borderRight' : 'borderLeft']: `1px solid ${line}` }}>
          {hot(p) && <span className="mb-3 inline-block text-[16px] italic" style={{ fontFamily: ff, background: accent, color: '#fff', borderRadius: 8, padding: '6px 24px' }}>Most popular</span>}
          {name(p, 3.4)}{price(p, 3, { marginTop: 2 })}
          <div className="mt-3" style={{ fontFamily: ff }}>{pin(p, ink)}</div>
          {feats(p.description).length > 0 && <ul className="el-pr_list mt-4 grid list-disc gap-1.5 pl-5" style={{ color: ink, fontSize: fsp('fs-plist', 18) }}>{feats(p.description).map((f, j) => <li key={j}>{f}</li>)}</ul>}
        </div>
      </div>) })}</div>{foot(ink)}</>, 'max-w-6xl') }

  if (d === 'mykonos') { const ff = (headStyle as any).fontFamily; return (
    <div style={bleed} className="px-2 py-14">
      {W(<>{head('center', bg, true)}
        <div className="grid md:grid-cols-3" style={{ columnGap: 0 }}>{pkgs.map((p, i) => { const u = pic(i); return (
          <div key={p.id} id={'pk-' + p.id} style={{ padding: '0 clamp(6px, 1vw, 14px)' }}>
            <div className="overflow-hidden" style={{ border: `3px solid ${bg}`, aspectRatio: '1.02 / 1', background: '#2a2a2c' }}>
              {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 98" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="98" fill="#e4e2de" /><path d="M0 76 L28 42 L44 60 L62 30 L100 76 Z" fill="#c9c6c1" /><circle cx="74" cy="24" r="7" fill="#d3d0cb" /></svg>}
            </div>
            <div className="relative text-center" style={{ borderLeft: i > 0 ? '1px solid rgba(255,255,255,.22)' : undefined, margin: '0 -14px', padding: 'clamp(56px, 7vw, 92px) clamp(14px, 2vw, 30px) clamp(20px, 3vw, 40px)' }}>
              {hot(p) && <span className="absolute left-1/2 text-[12px] font-semibold uppercase tracking-[0.3em]" style={{ top: 'clamp(16px, 2.4vw, 28px)', transform: 'translateX(-50%)', background: accent, color: ink, padding: '8px 26px', whiteSpace: 'nowrap' }}>Most popular</span>}
              {name(p, 2.6, { color: bg })}{price(p, 3.2, { marginTop: 6 })}
              <div className="mt-4" style={{ fontFamily: ff }}>{pin(p, 'rgba(255,255,255,.82)')}</div>
              <div className="mx-auto my-6 h-px w-16" style={{ background: accent }} />
              {ul(p, 'center', bg)}
            </div>
          </div>) })}</div><div style={{ fontFamily: ff }}>{foot('rgba(255,255,255,.75)')}</div></>, 'max-w-6xl')}
    </div>) }

  if (d === 'bermuda') { const ff = (headStyle as any).fontFamily; const col = (first = false): CSSProperties => ({ borderLeft: first ? undefined : `1px solid ${line}`, margin: 'clamp(16px, 2.2vw, 32px) 0', padding: '0 clamp(14px, 2.2vw, 32px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }); return W(<>{head('left', undefined, true)}
    <div>{pkgs.map((p, i) => (
      <div key={p.id} id={'pk-' + p.id} className="grid md:grid-cols-[110px_1.25fr_1.1fr_auto]" style={{ borderTop: `1px solid ${line}`, borderBottom: i === pkgs.length - 1 ? `1px solid ${line}` : undefined }}>
        <span className="flex items-center" style={{ ...headStyle, color: accent, fontSize: 'clamp(2.6rem, 5vw, 4.6rem)', lineHeight: 1 }}>{String(i + 1).padStart(2, '0')}</span>
        <div style={col()}>{badge(p, accent, 'left')}{name(p, 3, hot(p) ? { color: accent } : {})}<div style={{ fontFamily: ff }}>{pin(p, ink)}</div></div>
        <div style={col()}>{feats(p.description).length > 0 && <ul className="el-pr_list grid list-disc gap-1.5 pl-5" style={{ color: ink, fontSize: fsp('fs-plist', 18) }}>{feats(p.description).map((f, j) => <li key={j}>{f}</li>)}</ul>}</div>
        <div style={{ ...col(), alignItems: 'flex-end' }}>{price(p, 3.2, { color: ink, whiteSpace: 'nowrap' })}</div>
      </div>))}</div><div style={{ fontFamily: ff }}>{foot(ink)}</div></>, 'max-w-6xl') }

  if (d === 'tobago') { const ff = (headStyle as any).fontFamily; const u = pic(0); return W(
    <div className="grid lg:grid-cols-[36%_1fr]">
      <div className="relative min-h-[360px] overflow-hidden" style={{ background: tint }}>
        {u ? <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" className="absolute inset-0" style={{ width: '100%', height: '100%' }}><rect width="100" height="130" fill="#e4e2de" /><path d="M0 98 L28 56 L44 80 L62 42 L100 98 Z" fill="#c9c6c1" /><circle cx="74" cy="30" r="8" fill="#d3d0cb" /></svg>}
      </div>
      <div style={{ padding: 'clamp(20px, 4vw, 56px)' }}>{head('center', undefined, true)}
        {pkgs.map((p, i) => (
          <details key={p.id} id={'pk-' + p.id} open={hot(p) || (!pkgs.some(hot) && i === 0)} className="group border-t border-[color:var(--l)] open:rounded-xl open:border open:border-[color:var(--a)]" style={{ ['--l' as any]: line, ['--a' as any]: accent, padding: 'clamp(14px, 2vw, 24px) clamp(16px, 2.4vw, 28px)' }}>
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">{name(p, 3)}{hot(p) && <span className="text-[15px] italic" style={{ fontFamily: ff, background: accent, color: '#fff', borderRadius: 999, padding: '4px 18px' }}>Most popular</span>}</div>
                <div className="flex items-center gap-5">{price(p, 2.6, { whiteSpace: 'nowrap' })}<span className="text-3xl leading-none group-open:hidden" style={{ color: accent }}>+</span><span className="hidden text-3xl leading-none group-open:inline" style={{ color: accent }}>&minus;</span></div>
              </div>
              <div className="mt-1" style={{ fontFamily: ff }}>{pin(p, ink)}</div>
            </summary>
            {feats(p.description).length > 0 && <ul className="el-pr_list mt-4 grid list-disc gap-1.5 pl-6" style={{ fontFamily: ff, color: ink, fontSize: fsp('fs-plist', 18) }}>{feats(p.description).map((f, j) => <li key={j}>{f}</li>)}</ul>}
          </details>))}
        <div style={{ borderTop: `1px solid ${line}`, fontFamily: ff }}>{foot(ink)}</div>
      </div>
    </div>, 'max-w-6xl') }

  if (d === 'lanai') { const ff = (headStyle as any).fontFamily
    const ico = (t: string) => { const x = t.toLowerCase(); const A = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: ink, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
      if (/min|hour|hr|coverage|day/.test(x)) return <svg {...A}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      if (/outfit/.test(x)) return <svg {...A}><path d="M9 3l-1 5 2 3-3 10h12l-3-10 2-3-1-5" /></svg>
      if (/photo|image|edit/.test(x)) return <svg {...A}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 16l5-5 4 4 3-3 6 6" /></svg>
      if (/gallery|online|download/.test(x)) return <svg {...A}><rect x="5" y="5" width="14" height="10" /><path d="M2 19h20" /></svg>
      if (/location|place|venue/.test(x)) return <svg {...A}><path d="M12 21s-6-6-6-11a6 6 0 0112 0c0 5-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></svg>
      if (/partner|family|friend|people|group/.test(x)) return <svg {...A}><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5M16 14c3 0 5 2 5 5" /></svg>
      return <svg {...A}><circle cx="12" cy="12" r="2" fill={ink} /></svg> }
    return W(<>{head('center', undefined, true)}
    <div className="grid md:grid-cols-2" style={{ gap: 'clamp(14px, 2.2vw, 30px)', paddingTop: 12 }}>{pkgs.map((p, i) => { const u = pic(i); const h = hot(p); return (
      <div key={p.id} id={'pk-' + p.id} className="relative">
        {h && <span className="absolute left-1/2 z-10 text-[16px] italic" style={{ top: -14, transform: 'translateX(-50%)', fontFamily: ff, background: accent, color: '#fff', borderRadius: 999, padding: '4px 26px', whiteSpace: 'nowrap', boxShadow: `0 0 0 2px ${bg}` }}>Most popular</span>}
        <div className="overflow-hidden" style={{ background: panel, border: h ? `3px solid ${accent}` : `1px solid ${line}`, borderRadius: 18, height: '100%' }}>
          <div className="relative" style={{ aspectRatio: '1.68 / 1', background: tint }}>
            {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="60" fill="#e4e2de" /><path d="M0 46 L28 22 L44 34 L62 14 L100 46 Z" fill="#c9c6c1" /><circle cx="76" cy="12" r="5" fill="#d3d0cb" /></svg>}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-6 pb-3 pt-16" style={{ background: 'linear-gradient(transparent, rgba(30,15,8,.8))' }}>{name(p, 2.8, { color: '#fff' })}{price(p, 2.6, { color: '#fff', whiteSpace: 'nowrap' })}</div>
          </div>
          <div style={{ padding: 'clamp(12px, 1.8vw, 22px) clamp(18px, 4vw, 52px) clamp(18px, 2.4vw, 30px)' }}>
            <div className="text-center" style={{ fontFamily: ff }}>{pin(p, ink)}</div>
            {feats(p.description).length > 0 && <ul className="el-pr_list mt-3" style={{ color: ink, fontSize: fsp('fs-plist', 18) }}>{feats(p.description).map((f, j, arr) => (
              <li key={j} className="grid items-center gap-3" style={{ gridTemplateColumns: '28px 1fr', padding: '8px 0', borderBottom: j < arr.length - 1 ? `1px solid ${line}` : undefined }}>{ico(f)}<span>{f}</span></li>))}</ul>}
          </div>
        </div>
      </div>) })}</div><div style={{ fontFamily: ff }}>{foot(ink)}</div></>) }

  if (d === 'azores') return W(<>{head('center', undefined, true)}
    <div className="grid lg:grid-cols-2" style={{ gap: 'clamp(14px, 2vw, 28px)' }}>{pkgs.map((p, i) => { const u = pic(i); return (
      <div key={p.id} id={'pk-' + p.id} className="grid overflow-hidden sm:grid-cols-[42%_1fr]" style={{ background: panel, borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,.12)', border: hot(p) ? `1px solid ${accent}` : undefined }}>
        <div className="min-h-[220px] overflow-hidden" style={{ background: tint }}>
          {u ? <img src={u} alt="" className="h-full w-full object-cover" /> : <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>}
        </div>
        <div className="flex flex-col justify-center" style={{ padding: 'clamp(18px, 2.6vw, 36px)' }}>
          {hot(p) && <span className="mb-3 inline-block self-start text-[13px]" style={{ background: `color-mix(in srgb, ${accent} 22%, ${bg})`, color: accent, borderRadius: 999, padding: '4px 16px' }}>Most popular</span>}
          {name(p, 2.2)}{price(p, 2.2, { marginTop: 4 })}{pin(p, ink)}
          <div className="mt-5">{ul(p, 'left', ink)}</div>
        </div>
      </div>) })}</div>{foot(ink)}</>)

  if (d === 'ibiza') { const ff = (headStyle as any).fontFamily; const col = (first = false): CSSProperties => ({ borderLeft: first ? undefined : `1px solid ${line}`, margin: 'clamp(16px, 2.4vw, 36px) 0', padding: '0 clamp(14px, 2.2vw, 32px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }); return W(<>{head('center', undefined, true)}
    <div>{pkgs.map((p, i) => { const u = pic(i); return (
      <div key={p.id} id={'pk-' + p.id} className="grid md:grid-cols-[23%_1fr_1fr_22%]" style={{ background: i % 2 ? tint : 'transparent', minHeight: 'clamp(190px, 25vw, 270px)' }}>
        <div className="relative min-h-[170px] overflow-hidden" style={{ background: tint }}>
          {u ? <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>}
          {hot(p) && <span aria-hidden="true" className="absolute inset-y-0 right-0" style={{ width: 12, background: accent }} />}
        </div>
        <div style={{ ...col(true), padding: '0 clamp(16px, 2.6vw, 38px)' }}>
          {hot(p) && <span className="mb-2 inline-block self-start text-[16px] italic" style={{ fontFamily: ff, background: accent, color: '#fff', borderRadius: 8, padding: '6px 22px' }}>Most popular</span>}
          {name(p, 2.8)}<div style={{ fontFamily: ff }}>{pin(p, ink)}</div>
        </div>
        <div style={col()}>{feats(p.description).length > 0 && <ul className="el-pr_list grid list-disc gap-1.5 pl-5" style={{ color: ink, fontSize: fsp('fs-plist', 18) }}>{feats(p.description).map((f, j) => <li key={j}>{f}</li>)}</ul>}</div>
        <div style={{ ...col(), alignItems: 'center' }}>{price(p, 3.2, { whiteSpace: 'nowrap' })}</div>
      </div>) })}</div><div style={{ fontFamily: ff, marginTop: 'clamp(8px, 2vw, 24px)' }}>{foot(ink)}</div></>, 'max-w-6xl') }

  return null
}
