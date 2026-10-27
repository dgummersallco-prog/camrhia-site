'use client'

import { useSiteBase } from '@/app/site/useSiteBase'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PortfolioLightbox } from '../../../../p/[token]/PortfolioLightbox'
import { resolveTheme, NAV_DEFAULTS } from '@/lib/siteTheme'
import { installPreviewGlow } from '@/lib/previewGlow'
import { AboutCanvas } from '../../AboutCanvas'
import { galleryPhotosStarter } from '@/lib/aboutCanvas'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
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

  useEffect(() => {
    if (!isPreview) return
    window.parent?.postMessage({ type: 'camrhia-galleries', list: galleries.map((x) => ({ id: x.id, title: x.title })) }, '*')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, galleries.length])

  const shell = (inner: React.ReactNode) => (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      <style>{`${t.cssVars}html{font-size:var(--text)}html,body{background:${bg}}`}</style>
      <div style={{ background: bg, color: ink, fontFamily: t.body, minHeight: '100vh' }}>{inner}</div>
    </>
  )

  const nav = (
    <nav className={'mx-auto flex max-w-6xl px-6 py-4 ' + (t.menu.logoPos === 'center' ? 'flex-col items-center gap-3' : 'items-center justify-between' + (t.menu.logoPos === 'right' ? ' flex-row-reverse' : ''))}>
      <Link href={`${homeHref}${qs}`} style={{ display: 'inline-flex', transform: 'translate(var(--nudge, 0px), var(--nudgey, 0px))', transition: 'transform 0.12s ease-out' }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} />
        ) : (
          <span className="el-menu_brand" style={{ ...head, fontSize: 24 }}>{t.menu.brand ?? name}</span>
        )}
      </Link>
      <div className={'flex flex-wrap gap-x-5 gap-y-1 text-[11px] uppercase tracking-[0.2em] ' + (t.menu.logoPos === 'center' ? 'justify-center' : t.menu.logoPos === 'right' ? 'justify-start' : 'justify-end')} style={{ fontSize: 'var(--menu)', transform: 'translateY(var(--menuy, 0px))' }}>
        {([['home', `${homeHref}${qs}`], ['galleries', `${base}/galleries${qs}`], ['about', `${base}/about${qs}`], ['book', `${base}/availability${qs}`]] as [string, string][])
          .filter(([k]) => !t.menu.hidden.includes(k))
          .map(([k, h]) => <Link key={k} href={h}>{t.menu.labels[k]?.trim() || NAV_DEFAULTS[k]}</Link>)}
      </div>
    </nav>
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
  const layout = t.galpage.layout

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

  return shell(
    <>
      <PortfolioLightbox />
      {nav}
      {layout !== 'custom' && (<header className="px-6 pb-10 pt-8 text-center">
        <h1 style={{ ...head, fontSize: 'var(--gal-h)', lineHeight: 1.05 }}>{gal.title}</h1>
        {t.galpage.showCount && <p className="mt-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>{photos.length} photos</p>}
      </header>)}

      <main id="gal-main" className="mx-auto max-w-6xl px-6 pb-16">
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
              <Link href={`${base}/availability${qs}`} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ background: accent, color: t.btnText, borderRadius: t.radius }}>{label}</Link>
            )}
          />) : (<div className="flex flex-col gap-14">
          {groups.map((grp) => (
            <div key={grp.id}>
              {grp.title && <h2 className="mb-6 text-center text-3xl" style={head}>{grp.title}</h2>}
              {layout === 'masonry' && <div className="columns-1 sm:columns-2 lg:columns-3" style={{ columnGap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'grid' && <div className="grid grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'single' && <div className="mx-auto flex max-w-3xl flex-col" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'tall' && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'editorial' && <div className="grid grid-cols-2" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
            </div>
          ))}
        </div>)}

        {t.galpage.showButton && layout !== 'custom' && (
          <div className="mt-14 text-center">
            <Link href={`${base}/availability${qs}`} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ background: accent, color: t.btnText, borderRadius: t.radius }}>
              {t.hero.ctaText}
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
