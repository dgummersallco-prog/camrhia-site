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
  const hdr = (o: { color?: string; align?: 'center' | 'left' } = {}) => {
    const al = o.align ?? 'center'
    return (
      <div id="book-head" style={{ textAlign: al }}>
        <h1 style={{ ...h1Style, ...(o.color ? { color: o.color } : {}) }}>{title}</h1>
        <p className={'mt-4 max-w-md whitespace-pre-line text-[15px] leading-relaxed ' + (al === 'center' ? 'mx-auto' : '')} style={{ color: o.color ?? soft, opacity: o.color ? 0.88 : 1 }}>{intro}</p>
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
    <div className={hasPic ? 'mx-auto grid max-w-7xl gap-10 px-6 pb-24 pt-4 lg:grid-cols-[2fr_3fr] lg:gap-16' : 'mx-auto max-w-xl px-6 pb-24 pt-4'}>
      {hasPic && <div className="lg:sticky lg:top-6 lg:self-start">{img(0, '4/5')}</div>}
      <div className="bk2 w-full max-w-3xl">{two}{hdr({ align: 'left' })}<div className="mt-10 grid gap-10">{sent ? null : P.calBlock ? <div className="w-full" style={{ maxWidth: 440 }}>{P.calBlock}</div> : null}{form}</div></div>
    </div>)

  if (d === 'como') return (
    <div style={bleed(DARK)} className="mb-16 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12">{hdr({ color: CREAM })}</div>
        {sent ? <div className="mx-auto max-w-xl">{sentBlock}</div> : (
          <div className={'grid gap-8 ' + (calBlock ? 'lg:grid-cols-2' : 'mx-auto max-w-xl')}>
            {calBlock}
            <div style={card}>{formBlock}</div>
          </div>)}
      </div>
    </div>)

  if (d === 'garda') return (
    <div className="pb-24">
      {hasPic ? cover('clamp(380px, 56vh, 560px)', <div className="mx-auto max-w-6xl pb-16">{hdr({ color: '#fff', align: 'left' })}</div>) : <div className="px-6 pt-8">{hdr()}</div>}
      <div className="relative mx-auto max-w-6xl px-6" style={{ marginTop: hasPic ? -72 : 40 }}>
        {sent ? sentBlock : (
          <div className={'grid gap-6 ' + (calBlock ? 'lg:grid-cols-2' : 'mx-auto max-w-xl')}>
            {calBlock}
            <div style={card}>{formBlock}</div>
          </div>)}
      </div>
    </div>)

  if (d === 'bled') return (
    <div className="pb-24">
      {hasPic && <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2 px-6 pt-4">{[0, 1, 2].map((i) => <div key={i}>{img(i, '4/5')}</div>)}</div>}
      <div className="mx-auto max-w-xl px-6 pt-10">{hdr()}<div className="mt-10 grid gap-10">{cal}{form}</div></div>
    </div>)

  if (d === 'annecy') return (
    <div style={{ background: hasPic ? `linear-gradient(rgba(0,0,0,.4), rgba(0,0,0,.4)), url("${pics[0]}") center / cover fixed` : wash }} className="px-6 py-16">
      <div className="mx-auto max-w-5xl" style={{ ...card, borderRadius: 24, padding: 48 }}>
        {hdr()}
        <div className={'mt-10 grid gap-10 ' + (!sent && calBlock ? 'lg:grid-cols-2 lg:gap-14' : 'mx-auto max-w-xl')}>{cal}{form}</div>
      </div>
    </div>)

  if (d === 'tekapo') return (
    <div>
      <div style={bleed(wash)} className="px-6 py-14"><div className="mx-auto max-w-xl">{hdr()}{cal && <div className="mt-10">{cal}</div>}</div></div>
      <div className={'mx-auto grid max-w-6xl gap-12 px-6 py-20 ' + (hasPic ? 'lg:grid-cols-2 lg:items-start' : '')}>
        {hasPic && <div>{img(0, '4/5')}</div>}
        <div className={hasPic ? '' : 'mx-auto w-full max-w-xl'}>{form}</div>
      </div>
    </div>)

  /* ---------- WITHOUT THE CALENDAR ---------- */
  if (d === 'louise') return (
    <div className="pb-24">
      {hasPic ? cover('clamp(380px, 62vh, 640px)', hdr({ color: '#fff' })) : <div className="px-6 pt-8">{hdr()}</div>}
      <div className="bk2 relative mx-auto max-w-3xl px-6" style={{ marginTop: hasPic ? -90 : 40 }}>{two}<div style={card}>{form}</div></div>
    </div>)

  if (d === 'placid') return (
    <div className={'mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-8 ' + (hasPic ? 'lg:grid-cols-2 lg:gap-16' : '')}>
      <div className={hasPic ? '' : 'mx-auto w-full max-w-xl'}>{hdr({ align: 'left' })}<div className="mt-10">{form}</div></div>
      {hasPic && <div className="lg:sticky lg:top-6 lg:self-start">{img(0, '4/5')}</div>}
    </div>)

  if (d === 'lucerne') return (
    <div style={bleed(DARK)} className="mb-16 px-6 py-16">
      {hasPic && <div className="mx-auto mb-12 grid max-w-5xl grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i}>{img(i, '3/2')}</div>)}</div>}
      <div className="mx-auto mb-10 max-w-xl">{hdr({ color: CREAM })}</div>
      <div className="bk2 mx-auto max-w-3xl" style={card}>{two}{form}</div>
    </div>)

  if (d === 'orta') return (
    <div className="bk2 mx-auto max-w-5xl px-6 pb-24 pt-8">
      {two}
      {hdr({ align: 'left' })}
      <div className="mt-10" style={card}>{form}</div>
      {hasPic && <div className="mt-10">{img(0, '21/8')}</div>}
    </div>)

  if (d === 'maggiore') return (
    <div className={'mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-8 ' + (hasPic ? 'lg:grid-cols-[1fr_1.1fr]' : '')}>
      {hasPic && <div className="mx-auto w-full max-w-sm bg-white p-3 pb-12" style={{ transform: 'rotate(-2.5deg)', boxShadow: '0 16px 40px rgba(0,0,0,.18)' }}>{img(0, '4/5')}</div>}
      <div className={hasPic ? '' : 'mx-auto w-full max-w-xl'}>{hdr({ align: 'left' })}<div className="mt-8" style={card}>{form}</div></div>
    </div>)

  if (d === 'braies') return (
    <div style={bleed(wash)} className="mb-16 px-6 py-16">
      <div className="bk2 mx-auto max-w-3xl bg-white px-8 py-12 sm:px-14" style={{ boxShadow: '0 20px 50px rgba(0,0,0,.12)', border: `1px solid ${line}` }}>
        {two}{hasPic && img(0, '1/1', { borderRadius: 9999, width: 96, margin: '0 auto 32px' })}
        {hdr()}
        <div className="mt-10">{form}</div>
      </div>
    </div>)

  return null
}
