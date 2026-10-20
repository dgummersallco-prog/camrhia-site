'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PortfolioLightbox } from '../../../../p/[token]/PortfolioLightbox'
import { resolveTheme } from '@/lib/siteTheme'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

export function GalleryView({ initial, token, gid }: { initial: Record<string, any>; token: string; gid: string }) {
  const [r, setR] = useState<Record<string, any>>(initial)
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== '1') return
    setIsPreview(true)
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; patch?: Record<string, any> } | null
      if (d && d.type === 'camrhia-preview' && d.patch) setR((prev) => ({ ...prev, ...d.patch }))
    }
    window.addEventListener('message', onMsg)
    window.parent?.postMessage({ type: 'camrhia-preview-ready' }, '*')
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const qs = isPreview ? '?preview=1' : ''
  const t = resolveTheme(r)
  const { accent, bg, ink, soft, line } = t
  const name: string = r.studio_name ?? r.display_name ?? 'Studio'
  const logo = photoUrl(r.logo_path)
  const head = { fontFamily: t.head, fontWeight: 500, letterSpacing: '0.01em' } as const

  const galleries = ((r.site_galleries ?? []) as any[]).filter((g) => (g.photos ?? []).length > 0)
  const gal = galleries.find((g) => g.id === gid)

  const shell = (inner: React.ReactNode) => (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      <style>{`${t.cssVars}html{font-size:var(--text)}html,body{background:${bg}}`}</style>
      <div style={{ background: bg, color: ink, fontFamily: t.body, minHeight: '100vh' }}>{inner}</div>
    </>
  )

  const nav = (
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <Link href={`/site/${token}${qs}`}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={name} style={{ height: 'var(--logo)', objectFit: 'contain' }} />
        ) : (
          <span style={{ ...head, fontSize: 24 }}>{name}</span>
        )}
      </Link>
      <div className="flex gap-6 text-[11px] uppercase tracking-[0.2em]">
        <Link href={`/site/${token}${qs}#portfolio`}>{t.menu.labels.portfolio?.trim() || 'Portfolio'}</Link>
        <Link href={`/site/${token}/availability${qs}`}>{t.menu.labels.contact?.trim() || 'Contact'}</Link>
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
    list.map((p: any) => {
      const u = photoUrl(p.storage_path)
      if (!u) return null
      // eslint-disable-next-line @next/next/no-img-element
      return layout === 'grid'
        ? <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className="block w-full object-cover" style={{ aspectRatio: '1/1', cursor: 'zoom-in' }} />
        : <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className="block w-full" style={{ cursor: 'zoom-in', marginBottom: layout === 'masonry' ? 'var(--gal-gap)' : 0 }} />
    })

  return shell(
    <>
      <PortfolioLightbox />
      {nav}
      <header className="px-6 pb-10 pt-8 text-center">
        <h1 style={{ ...head, fontSize: 'var(--gal-h)', lineHeight: 1.05 }}>{gal.title}</h1>
        {t.galpage.showCount && <p className="mt-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>{photos.length} photos</p>}
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-col gap-14">
          {groups.map((grp) => (
            <div key={grp.id}>
              {grp.title && <h2 className="mb-6 text-center text-3xl" style={head}>{grp.title}</h2>}
              {layout === 'masonry' && <div className="columns-1 sm:columns-2 lg:columns-3" style={{ columnGap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'grid' && <div className="grid grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
              {layout === 'single' && <div className="mx-auto flex max-w-3xl flex-col" style={{ gap: 'var(--gal-gap)' }}>{imgs(grp.photos)}</div>}
            </div>
          ))}
        </div>

        {t.galpage.showButton && (
          <div className="mt-14 text-center">
            <Link href={`/site/${token}/availability${qs}`} className="cr-btn inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ background: accent, color: t.btnText, borderRadius: t.radius }}>
              {t.hero.ctaText}
            </Link>
          </div>
        )}

        {t.galpage.showMore && others.length > 0 && (
          <div className="mt-16 border-t pt-10 text-center" style={{ borderColor: line }}>
            <p className="mb-5 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>More galleries</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {others.map((g) => (
                <Link key={g.id} href={`/site/${token}/g/${g.id}${qs}`} className="text-2xl" style={{ ...head, color: accent }}>{g.title}</Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 pb-12 text-center text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>
        {t.text.footer && <p className="mb-3 whitespace-pre-line normal-case tracking-normal" style={{ fontSize: 13 }}>{t.text.footer}</p>}
        © {new Date().getFullYear()} {name} · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
      </footer>
    </>
  )
}
