'use client'

import { useSiteBase } from '@/app/site/useSiteBase'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PortfolioLightbox } from '../../../../p/[token]/PortfolioLightbox'
import { resolveTheme, NAV_DEFAULTS } from '@/lib/siteTheme'
import { SiteNav } from '../../SiteNav'
import { installPreviewGlow } from '@/lib/previewGlow'
import { AboutCanvas } from '../../AboutCanvas'
import { galleryPhotosStarter } from '@/lib/aboutCanvas'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? (path.startsWith('/') ? path : `${STORAGE_BASE}${path}`) : null
}

export function GalleryView({ initial, token, gid }: { initial: Record<string, any>; token: string; gid: string }) {
  const [r, setR] = useState<Record<string, any>>(initial)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => installPreviewGlow(), [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1') return
    setIsPreview(true)
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; patch?: Record<string, any> } | null
      if (d && d.type === 'camrhia-preview' && d.patch) setR((prev) => ({ ...prev, ...d.patch }))
    }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'camrhia-preview-ready', ...(() => { const seg = window.location.pathname.split('/').filter(Boolean); const base = seg[0] === 'site' ? 2 : 0; const rest = seg[base]; const page = rest === 'about' ? 'about' : rest === 'galleries' ? 'galleries' : rest === 'g' ? 'gallery' : rest === 'availability' ? 'availability' : !rest ? 'home' : null; return { page, gid: rest === 'g' ? seg[base + 1] ?? null : null } })() }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const qs = isPreview ? '?preview=1' : ''
  const base = useSiteBase(token)
  const homeHref = base || '/'
  const t = resolveTheme(r)
  const { accent, bg, ink, soft, line } = t
  const name: string = r.studio_name ?? r.display_name ?? 'Studio'
  const logo = photoUrl(r.logo_path)
  const head = { fontFamily: t.head, fontWeight: 500, letterSpacing: '0.01em' } as const

  const galleries = ((r.site_galleries ?? []) as any[]).filter((g) => (g.photos ?? []).length > 0)
  const gal = galleries.find((g) => g.id === gid)
  const GP_OK = ['masonry', 'grid', 'single', 'tall', 'editorial', 'lark', 'wren', 'finch', 'heron', 'swift', 'plover', 'egret', 'kestrel', 'osprey', 'sparrow']
  const ownL = (((r.site_settings as any)?.galpage?.byName ?? {}) as Record<string, string>)[String(gal?.title ?? '').trim().toLowerCase()]
  const layout0 = (GP_OK.includes(ownL) ? ownL : t.galpage.layout) as typeof t.galpage.layout

  useEffect(() => {
    if (!isPreview) return
    window.parent?.postMessage({ type: 'camrhia-galleries', list: galleries.map((x) => ({ id: x.id, title: x.title })) }, '*')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, galleries.length])

  const shell = (inner: React.ReactNode) => (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      <style>{`${t.cssVars}html{font-size:var(--text)}html,body{background:${bg}}`}</style>
      <div style={{ background: layout0 === 'plover' ? '#14110f' : bg, color: layout0 === 'plover' ? '#f3ead8' : ink, fontFamily: t.body, minHeight: '100vh' }}>{inner}</div>
    </>
  )

  const nav = (
    <SiteNav t={t} logo={logo} name={name} homeHref={`${homeHref}${qs}`} headStyle={head} back={{ href: `${base}/galleries${qs}`, label: t.backText.galleries ?? '← Galleries', key: 'galleries' }} items={([['home', `${homeHref}${qs}`], ['galleries', `${base}/galleries${qs}`], ['about', `${base}/about${qs}`], ['book', `${base}/availability${qs}`]] as [string, string][]).filter(([k]) => !t.menu.hidden.includes(k)).map(([k, h]) => ({ key: k, href: h, label: t.menu.labels[k]?.trim() || NAV_DEFAULTS[k], active: k === 'galleries' }))} />
  )

  if (!gal) {
    return shell(
      <>
        {nav}
        <div className="px-6 py-24 text-center">
          <h1 className="text-2xl" style={head}>This gallery isn&apos;t available.</h1>
          <p className="mt-3 text-sm" style={{ color: soft }}>Add a gallery with photos and it will show here.</p>
        </div>
      </>
    )
  }

  const photos = [...gal.photos].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const others = galleries.filter((g) => g.id !== gid)
  const secs = [...(gal.sections ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const secIds = new Set(secs.map((x: any) => x.id))
  const groups: { id: string; title: string | null; photos: any[] }[] = []
  const loose = photos.filter((p: any) => !p.section_id || !secIds.has(p.section_id))
  if (loose.length) groups.push({ id: 'loose', title: null, photos: loose })
  for (const sec of secs) {
    const ps = photos.filter((p: any) => p.section_id === sec.id)
    if (ps.length) groups.push({ id: sec.id, title: sec.title as string, photos: ps })
  }
  const layout = layout0
  const NEWL = ['lark', 'wren', 'finch', 'heron', 'swift', 'plover', 'egret', 'kestrel', 'osprey', 'sparrow']

  const imgs = (list: any[]) =>
    list.map((p: any, i: number) => {
      const u = photoUrl(p.storage_path)
      if (!u) return null
      // eslint-disable-next-line @next/next/no-img-element
      if (layout === 'tall') return <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '9/16', cursor: 'zoom-in' }} />
      if (layout === 'editorial') return <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className={'block w-full object-cover' + (i % 3 === 0 ? ' col-span-2' : '')} style={{ aspectRatio: i % 3 === 0 ? '3/2' : '4/5', cursor: 'zoom-in' }} />
      return layout === 'grid'
        ? <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '1/1', cursor: 'zoom-in' }} />
        : <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className="block w-full" style={{ cursor: 'zoom-in', marginBottom: layout === 'masonry' ? 'var(--gal-gap)' : 0 }} />
    })

  const pic = (p: any, cls = '', style: any = {}) => {
    const u = photoUrl(p.storage_path)
    if (!u) return null
    // eslint-disable-next-line @next/next/no-img-element
    return <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className={'block object-cover ' + cls} style={{ cursor: 'zoom-in', ...style }} />
  }
  const gp = 'var(--gal-gap)'

  return shell(
    <>
      <PortfolioLightbox />
      {nav}
      {layout !== 'custom' && layout !== 'egret' && (<header className="px-6 pb-10 pt-8 text-center">
        <h1 style={{ ...head, fontSize: 'var(--gal-h)', lineHeight: 1.05, color: layout === 'plover' ? '#f3ead8' : undefined }}>{gal.title}</h1>
        {t.galpage.showCount && <p className="mt-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>{photos.length} photos</p>}
      </header>)}

      <main id="gal-main" className={NEWL.includes(layout) ? 'mx-auto max-w-[1600px] px-4 pb-16 sm:px-8' : 'mx-auto max-w-6xl px-6 pb-16'}>
        {layout === 'custom' ? (<AboutCanvas
            canvas={(r.site_settings?.galpage?.canvases ?? {})[gid]} photo2={null} aboutPhoto={null} toUrl={(pth) => photoUrl(pth)} editing={isPreview}
            title={null} bio="" headStyle={head} ink={ink} soft={soft} tint="rgba(0,0,0,0.04)"
            bodyFont={t.body} headWeight={t.headWeight} defaultButton={t.hero.ctaText} boardId={'gal:' + gid}
            fallback={(dv) => galleryPhotosStarter(dv, photos.map((p: any) => p.storage_path))}
            renderSpecial={(type) => {
              if (type === 'title') return <h1 style={{ ...head, fontSize: 'var(--gal-h)', lineHeight: 1.05, margin: 0, color: 'inherit' }}>{gal.title}</h1>
              if (type === 'subtitle') return <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: soft, margin: 0 }}>{photos.length} photos</p>
              return null
            }}
            renderButton={(label) => (
              <Link href={galLink(t.galBtnLink, base, qs, homeHref)} className="cr-btn gb-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ background: accent, color: t.btnText, borderRadius: t.radius }}>{label}</Link>
            )}
          />) : (<div className={layout === 'egret' ? 'md:grid md:grid-cols-[260px_1fr] md:gap-12' : 'flex flex-col gap-14'}>
          {layout === 'egret' && (
            <aside className="mb-10 md:sticky md:top-24 md:mb-0 md:self-start">
              <h1 style={{ ...head, fontSize: 'var(--gal-h)', lineHeight: 1.05 }}>{gal.title}</h1>
              {t.galpage.showCount && <p className="mt-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>{photos.length} photos</p>}
              <Link href={`${base}/galleries${qs}`} className="mt-6 inline-block text-xs uppercase tracking-[0.2em]" style={{ color: accent }}>← Back to galleries</Link>
            </aside>
          )}
          <div className="flex flex-col gap-14">
          {groups.map((grp) => (
            <div key={grp.id}>
              {grp.title && <h2 className="mb-6 text-center text-3xl" style={head}>{grp.title}</h2>}
              {layout === 'masonry' && <div className="columns-1 sm:columns-2 lg:columns-3" style={{ columnGap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'grid' && <div className="grid grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'single' && <div className="mx-auto flex max-w-3xl flex-col" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'tall' && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'editorial' && <div className="grid grid-cols-2" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'lark' && <div className="flex flex-wrap" style={{ gap: gp }}>{grp.photos.map((p: any) => pic(p, '', { height: 'clamp(170px, 24vw, 360px)', flexGrow: 1, minWidth: 100, maxWidth: '70%' }))}<span style={{ flexGrow: 20 }} /></div>}
              {layout === 'wren' && <div className="columns-2 lg:columns-3 2xl:columns-4" style={{ columnGap: gp }}>{grp.photos.map((p: any) => pic(p, 'w-full', { marginBottom: gp }))}</div>}
              {layout === 'finch' && <div className="mx-auto flex max-w-[1200px] flex-col" style={{ gap: gp }}>{grp.photos.map((p: any) => pic(p, 'w-full'))}</div>}
              {layout === 'heron' && <div className="flex flex-col" style={{ gap: gp }}>{grp.photos[0] && pic(grp.photos[0], 'w-full', { aspectRatio: '21/9' })}<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6" style={{ gap: gp }}>{grp.photos.slice(1).map((p: any) => pic(p, 'w-full', { aspectRatio: '1/1' }))}</div></div>}
              {layout === 'swift' && <div className="grid grid-flow-dense grid-cols-2 md:grid-cols-4" style={{ gap: gp, gridAutoRows: 'clamp(150px, 20vw, 320px)' }}>{grp.photos.map((p: any, i: number) => pic(p, 'h-full w-full ' + (i % 3 === 0 ? 'col-span-2 row-span-2' + (Math.floor(i / 3) % 2 ? ' md:col-start-3' : '') : 'col-span-1 md:col-span-2')))}</div>}
              {layout === 'plover' && <div className="columns-2 lg:columns-3 2xl:columns-4" style={{ columnGap: gp }}>{grp.photos.map((p: any) => pic(p, 'w-full', { marginBottom: gp }))}</div>}
              {layout === 'egret' && <div className="grid grid-cols-2 xl:grid-cols-3" style={{ gap: gp }}>{grp.photos.map((p: any) => pic(p, 'w-full', { aspectRatio: '4/5' }))}</div>}
              {layout === 'kestrel' && <div className="grid grid-cols-2" style={{ gap: gp }}>{grp.photos.map((p: any, i: number) => pic(p, 'w-full ' + (i % 3 === 0 ? 'col-span-2' : 'col-span-1'), { aspectRatio: i % 3 === 0 ? '21/9' : '16/10' }))}</div>}
              {layout === 'osprey' && <div className="mx-auto flex max-w-[1200px] flex-col gap-12">{Array.from({ length: Math.ceil(grp.photos.length / 2) }, (_, k) => (<div key={k}><div className="grid grid-cols-2" style={{ gap: '4px' }}>{grp.photos.slice(k * 2, k * 2 + 2).map((p: any) => pic(p, 'w-full', { aspectRatio: '4/5' }))}</div><p className="mt-3 text-center text-[10px] tracking-[0.3em]" style={{ color: soft }}>{k + 1}</p></div>))}</div>}
              {layout === 'sparrow' && <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" style={{ gap: 'calc(var(--gal-gap) + 24px)' }}>{grp.photos.map((p: any) => pic(p, 'w-full', { aspectRatio: '4/5' }))}</div>}
            </div>
          ))}
          </div>
        </div>)}

        {t.galpage.showButton && layout !== 'custom' && (
          <div className="mt-14 text-center">
            <Link href={galLink(t.galBtnLink, base, qs, homeHref)} id="gal-btn" className="cr-btn gb-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ background: accent, color: t.btnText, borderRadius: t.radius }}>
              {t.galBtnText}
            </Link>
          </div>
        )}

        {t.galpage.showMore && others.length > 0 && (
          <div className="mt-16 border-t pt-10 text-center" style={{ borderColor: line }}>
            <p className="mb-5 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>More galleries</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {others.map((g) => (
                <Link key={g.id} href={`${base}/g/${g.id}${qs}`} className="text-2xl" style={{ ...head, color: accent }}>{g.title}</Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer id="gal-footer" className="px-6 pb-12 text-center text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>
        {t.text.footer && <p className="mb-3 whitespace-pre-line normal-case tracking-normal" style={{ fontSize: 13 }}>{t.text.footer}</p>}
        © {new Date().getFullYear()} {name} · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
      </footer>
    </>
  )
}

function galLink(gl: string | undefined, base: string, qs: string, homeHref: string): string {
  const x = String(gl ?? '').trim()
  if (x === 'galleries') return `${base}/galleries${qs}`
  if (x === 'about') return `${base}/about${qs}`
  if (x === 'home') return `${homeHref}${qs}`
  if (x.startsWith('g:')) return `${base}/g/${x.slice(2)}${qs}`
  if (/^https?:\/\//i.test(x)) return x
  return `${base}/availability${qs}`
}
