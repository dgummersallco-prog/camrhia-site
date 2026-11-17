"use client"
import type { CSSProperties, ReactNode } from 'react'

export const BOOK_CAL = ['tahoe', 'como', 'garda', 'bled', 'annecy', 'tekapo']
export const BOOK_NOCAL = ['louise', 'placid', 'lucerne', 'orta', 'maggiore', 'braies']
export const BOOK_ALL = [...BOOK_CAL, ...BOOK_NOCAL]

type Props = {
  design: string; sent: boolean; title: string; intro: string; h1Style: CSSProperties
  calBlock: ReactNode; formBlock: ReactNode; sentBlock: ReactNode; pics: string[]
  ink: string; soft: string; line: string; bg: string
}

export function BookingDesign(P: Props) {
  const { design: d, sent, title, intro, h1Style, formBlock, sentBlock, pics, ink, soft, line, bg } = P
  const DARK = '#1d1a18'
  const CREAM = '#f3ead8'
  const calBlock = P.calBlock ? <div className="mx-auto w-full" style={{ maxWidth: 440 }}>{P.calBlock}</div> : null
  const wash = `color-mix(in srgb, ${bg} 90%, ${ink})`
  const bleed = (c: string): CSSProperties => ({ background: c, boxShadow: `0 0 0 100vmax ${c}`, clipPath: 'inset(0 -100vmax)' })
  const hasPic = pics.length > 0
  const img = (i: number, ar: string, st: CSSProperties = {}) => hasPic ? (
    <div style={{ aspectRatio: ar, overflow: 'hidden', ...st }}><img src={pics[i % pics.length]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /></div>
  ) : null
  const card: CSSProperties = { background: '#fff', border: `1px solid ${line}`, borderRadius: 16, padding: 32 }
  const hdr = (o: { color?: string; align?: 'center' | 'left'; w?: string } = {}) => {
    const al = o.align ?? 'center'
    return (
      <div id="book-head" style={{ textAlign: al }}>
        <h1 style={{ ...h1Style, ...(o.color ? { color: o.color } : {}) }}>{title}</h1>
        <p className={'mt-4 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed ' + (al === 'center' ? 'mx-auto' : '')} style={{ color: o.color ?? soft, opacity: o.color ? 0.88 : 1, ...(o.w ? { maxWidth: o.w } : {}) }}>{intro}</p>
      </div>
    )
  }
  const cal = sent ? null : calBlock
  const form = sent ? sentBlock : formBlock
  const two = <style>{`.bk2 #book-form{grid-template-columns:repeat(2,minmax(0,1fr))}.bk2 #book-form>p,.bk2 #book-form>.bk-wide,.bk2 #book-form>button{grid-column:1/-1}@media(max-width:700px){.bk2 #book-form{grid-template-columns:1fr}}`}</style>
  const cover = (h: string, children: ReactNode) => (
    <div className="relative flex items-center justify-center" style={{ height: h }}>
      {hasPic && <img src={pics[0]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.42)' }} />
      <div className="relative w-full px-6">{children}</div>
    </div>
  )

  /* ---------- WITH THE CALENDAR ---------- */
  if (d === 'tahoe') return (
    <div className={hasPic ? 'mx-auto grid gap-10 lg:grid-cols-[35%_55%] lg:justify-between' : 'mx-auto max-w-xl px-6 pb-24 pt-4'} style={hasPic ? { maxWidth: 1400, padding: '16px 2.4% 64px' } : undefined}>
      {hasPic && <div className="lg:sticky lg:top-6 lg:self-start">{img(0, '0.38/1')}</div>}
      <div className="bk2 w-full" style={{ paddingTop: 'clamp(0px, 3vw, 40px)' }}>{two}{hdr({ align: 'left', w: '32rem' })}<div className="mt-10 grid gap-10">{sent ? null : P.calBlock ? <div className="w-full" style={{ maxWidth: 390 }}>{P.calBlock}</div> : null}{form}</div></div>
    </div>)

  if (d === 'como') return (
    <div style={bleed(DARK)} className="mb-16 px-6 py-16">
      <div className="mx-auto" style={{ maxWidth: 1160 }}>
        <div className="mb-12" style={{ paddingLeft: '1%' }}>{hdr({ color: CREAM, align: 'left' })}</div>
        {sent ? <div className="mx-auto max-w-xl">{sentBlock}</div> : (
          <div className={'grid gap-8 ' + (P.calBlock ? 'lg:grid-cols-[39%_50.3%] lg:justify-between' : 'mx-auto max-w-xl')}>
            {P.calBlock}
            <div style={{ ...card, borderRadius: 20, padding: 'clamp(18px, 2.4vw, 30px)' }}>{formBlock}</div>
          </div>)}
      </div>
    </div>)

  if (d === 'garda') return (
    <div className="pb-24">
      {hasPic ? (
        <div className="relative" style={{ height: 'clamp(240px, 29vw, 460px)' }}>
          <img src={pics[0]} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.58), rgba(0,0,0,.06) 70%)' }} />
          <div className="absolute inset-x-0 bottom-0" style={{ padding: '0 3.3% 2.4%' }}>{hdr({ color: '#fff', align: 'left', w: '34rem' })}</div>
        </div>
      ) : <div className="px-6 pt-8">{hdr()}</div>}
      <div className="mx-auto" style={{ maxWidth: 1280, padding: '0 4%', marginTop: 20 }}>
        {sent ? sentBlock : (
          <div className={'grid gap-6 ' + (P.calBlock ? 'lg:grid-cols-[38%_51.6%] lg:justify-between' : 'mx-auto max-w-xl')}>
            {P.calBlock}
            <div style={{ ...card, borderRadius: 20, padding: 'clamp(18px, 2.4vw, 30px)' }}>{formBlock}</div>
          </div>)}
      </div>
    </div>)

  if (d === 'bled') return (
    <div className="pb-24">
      {hasPic && <div className="mx-auto grid grid-cols-3" style={{ width: '89%', gap: '0.9%', paddingTop: 8 }}>{[0, 1, 2].map((i) => <div key={i}>{img(i, '1.58/1')}</div>)}</div>}
      <div className="mx-auto px-6 pt-6" style={{ maxWidth: 820 }}>{hdr()}</div>
      <div className="mx-auto px-6 pt-6" style={{ maxWidth: 700 }}><div className="grid gap-6">{cal}{form}</div></div>
    </div>)

  if (d === 'annecy') return (
    <div style={{ background: hasPic ? `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.18)), url("${pics[0]}") center / cover fixed` : wash, padding: 'clamp(150px, 29vw, 380px) 4.5% 5%' }}>
      <div className="mx-auto" style={{ ...card, maxWidth: 1144, background: '#fdfcfa', border: 'none', borderRadius: 'clamp(16px, 2.2vw, 28px)', padding: 'clamp(20px, 3.6vw, 48px) clamp(18px, 4.4vw, 50px) clamp(24px, 4vw, 56px)' }}>
        {hdr()}
        <div className={'mt-10 grid gap-10 ' + (!sent && calBlock ? 'lg:grid-cols-[40%_55%] lg:justify-between' : 'mx-auto max-w-xl')}>{cal}{form}</div>
      </div>
    </div>)

  if (d === 'tekapo') return (
    <div>
      <div style={bleed(wash)} className="px-6 pb-8 pt-6"><div className="mx-auto" style={{ maxWidth: 900 }}>{hdr()}{cal && <div className="mt-4">{cal}</div>}</div></div>
      <div className={'grid gap-10 pb-16 ' + (hasPic ? 'lg:grid-cols-[42.3%_50%] lg:justify-between' : 'mx-auto max-w-xl px-6')} style={{ marginTop: 11, paddingTop: hasPic ? 0 : 40 }}>
        {hasPic && <div>{img(0, '0.78/1')}</div>}
        <div className={hasPic ? 'px-6 lg:px-0 lg:pt-4' : 'w-full'}>{form}</div>
      </div>
    </div>)

  /* ---------- WITHOUT THE CALENDAR ---------- */
  if (d === 'louise') return (
    <div style={{ background: hasPic ? `linear-gradient(rgba(0,0,0,.22), rgba(0,0,0,.22)), url("${pics[0]}") center / cover fixed` : wash, padding: 'clamp(110px, 19vw, 240px) 5% 3.7%' }}>
      <div style={{ marginBottom: 'clamp(28px, 6vw, 80px)' }}>{hasPic ? hdr({ color: '#fff' }) : hdr()}</div>
      <div className="bk2 mx-auto" style={{ ...card, maxWidth: 1130, background: '#fff', border: 'none', borderRadius: 'clamp(16px, 2.2vw, 28px)', padding: 'clamp(20px, 3vw, 40px) clamp(18px, 4.8vw, 58px) clamp(24px, 3.6vw, 48px)' }}>{two}{form}</div>
    </div>)

  if (d === 'placid') return (
    <div className={'mx-auto grid gap-10 pb-16 pt-8 ' + (hasPic ? 'lg:grid-cols-[46%_46.4%] lg:justify-between' : '')} style={{ maxWidth: 1400, padding: '32px 1.3% 64px 3.2%' }}>
      <div className={hasPic ? '' : 'mx-auto w-full max-w-xl'} style={{ paddingTop: 'clamp(0px, 3vw, 40px)' }}>{hdr({ align: 'left', w: '34rem' })}<div className="mt-8">{form}</div></div>
      {hasPic && <div className="lg:sticky lg:top-6 lg:self-start">{img(0, '0.51/1')}</div>}
    </div>)

  if (d === 'lucerne') return (
    <div style={bleed(DARK)} className="mb-16 px-6 pb-16 pt-6">
      {hasPic && <div className="mx-auto grid grid-cols-3" style={{ width: '104%', maxWidth: 1240, gap: '0.6%', marginBottom: 'clamp(16px, 3vw, 36px)' }}>{[0, 1, 2].map((i) => <div key={i}>{img(i, '1.43/1')}</div>)}</div>}
      <div className="mx-auto mb-10" style={{ maxWidth: 900 }}>{hdr({ color: CREAM })}</div>
      <div className="bk2 mx-auto" style={{ ...card, maxWidth: 1100, background: '#fff', border: 'none', borderRadius: 24, padding: 'clamp(18px, 3vw, 40px) clamp(18px, 4.2vw, 52px) clamp(22px, 3.6vw, 48px)' }}>{two}{form}</div>
    </div>)

  if (d === 'orta') return (
    <div className="bk2 pb-12">
      {two}
      <div className="mx-auto px-4 pt-8" style={{ maxWidth: 1170 }}>
        {hdr({ align: 'left', w: '72rem' })}
        <div className="mt-8" style={{ ...card, borderRadius: 24, padding: 'clamp(18px, 3vw, 40px) clamp(18px, 4.2vw, 52px) clamp(22px, 3.4vw, 44px)' }}>{form}</div>
      </div>
      {hasPic && <div style={{ width: '100vw', marginLeft: 'calc(50% - 50vw)', marginTop: 'clamp(16px, 2.6vw, 32px)' }}>{img(0, '3/1')}</div>}
    </div>)

  if (d === 'maggiore') return (
    <div className={'mx-auto grid max-w-7xl gap-8 px-4 pb-24 pt-8 ' + (hasPic ? 'lg:grid-cols-[46%_52%] lg:items-start lg:justify-between' : '')}>
      {hasPic && <div className="mx-auto w-full" style={{ maxWidth: 520, transform: 'rotate(-5.5deg)', background: '#fff', padding: '3.2% 3.2% 4.5%', boxShadow: '0 14px 36px rgba(0,0,0,.2)', marginTop: 'clamp(24px, 8vw, 100px)' }}>{img(0, '0.6/1')}</div>}
      <div className={hasPic ? '' : 'mx-auto w-full max-w-xl'}>{hdr({ align: 'left', w: '36rem' })}<div className="mt-6" style={{ ...card, borderRadius: 20, padding: 'clamp(18px, 2.4vw, 30px)' }}>{form}</div></div>
    </div>)

  if (d === 'braies') return (
    <div style={bleed(wash)} className="mb-16 px-6 py-12">
      <div className="bk2 mx-auto" style={{ maxWidth: 1120, background: '#fbf8f3', boxShadow: '0 6px 22px rgba(0,0,0,.18)', padding: 'clamp(18px, 2.6vw, 32px) clamp(18px, 5.9vw, 66px) clamp(24px, 4.4vw, 56px)' }}>
        {two}{hasPic && img(0, '1/1', { borderRadius: 9999, width: 'clamp(110px, 17.4vw, 218px)', margin: '0 auto 12px' })}
        {hdr()}
        <div className="mt-10">{form}</div>
      </div>
    </div>)

  return null
}
