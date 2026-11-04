import LeadForm from './LeadForm'

export type SpecialData = {
  brand: string
  headline: string
  sub: string
  price: string
  photos: string[]
  detailsTitle?: string
  details: string
  spots: string
  label: string
  thanks: string
  formTitle?: string
}

export default function SpecialView({ d, funnelId, preview }: { d: SpecialData; funnelId: string; preview?: boolean }) {
  const photos = d.photos.filter(Boolean).slice(0, 3)
  const btn = 'inline-block rounded-full bg-twilight px-8 py-4 text-base font-medium text-white transition hover:opacity-90'
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">{d.brand}</p>
      <h1 className="mt-4 font-fraunces text-4xl font-semibold leading-tight sm:text-5xl">{d.headline || 'Your offer title'}</h1>
      {d.sub ? <p className="mt-5 text-lg leading-relaxed text-ink-soft">{d.sub}</p> : null}
      {d.price ? <p className="mt-5 font-fraunces text-2xl font-semibold text-twilight">{d.price}</p> : null}
      {photos.length > 0 && (
        <div className={`mt-8 grid gap-3 ${photos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {photos.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" className={`w-full rounded-2xl object-cover ${photos.length === 1 || i === 0 ? 'aspect-[4/5] sm:aspect-[4/3]' : 'aspect-square'} ${photos.length === 3 && i === 0 ? 'col-span-2' : ''}`} />
          ))}
        </div>
      )}
      <div className="mt-8">
        {preview ? <span className={btn}>{d.label}</span> : <a href="#claim" className={btn}>{d.label}</a>}
      </div>
      {d.details ? (
        <section className="mt-12">
          <h2 className="font-fraunces text-2xl font-semibold">{d.detailsTitle || 'What is included'}</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-soft">{d.details}</p>
        </section>
      ) : null}
      <div id="claim">
        <section className="mt-14 rounded-2xl border border-line bg-card p-6">
          <h2 className="font-fraunces text-2xl font-semibold">{d.formTitle || 'Claim your spot'}</h2>
          <div className="mt-3">
            {d.spots ? <p className="mb-4 font-medium text-ink">{d.spots}</p> : null}
            <LeadForm funnelId={funnelId} label={d.label} thanks={d.thanks} disabled={preview} />
          </div>
        </section>
      </div>
    </>
  )
}
