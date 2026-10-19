'use client'

import React, { useEffect, useState } from 'react'
import { FaqAccordion } from '../../p/[token]/FaqAccordion'
import { PortfolioLightbox } from '../../p/[token]/PortfolioLightbox'
import { resolveTheme, NAV_DEFAULTS } from '@/lib/siteTheme'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

const DOOR_SUB: Record<string, string> = { about: 'Get to know me', portfolio: 'See my work', investment: 'What does it cost?' }

export function SiteView({ initial, token }: { initial: Record<string, any>; token: string }) {
  const [r, setR] = useState<Record<string, any>>(initial)
  const [open, setOpen] = useState(false)
  const [slide, setSlide] = useState(0)
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

  const t = resolveTheme(r)
  const { tpl, accent, ink, soft, line, bg, tint } = t
  const qs = isPreview ? '?preview=1' : ''
  const availHref = `/site/${token}/availability${qs}`

  const name: string = r.studio_name ?? r.display_name ?? 'Studio'
  const cityLine = [[r.service_city, r.service_state].filter(Boolean).join(', '), r.location_custom_text || null].filter(Boolean).join(' · ')
  const headline: string = (r.site_headline || '').trim() || (r.service_city ? `${r.service_city} Photographer` : 'Photographer')
  const subhead: string = (r.site_subhead || '').trim() || cityLine
  const logo = photoUrl(r.logo_path)
  const aboutPhoto = photoUrl(r.about_photo_path ?? r.avatar_path)

  const coverFallback = ((Array.isArray(r.cover_paths) && r.cover_paths.length > 0 ? r.cover_paths[0] : r.cover_path) as string | null) ?? ''
  const heroPaths: string[] = t.hero.photos.length > 0 ? t.hero.photos : [coverFallback].filter(Boolean)
  const heroUrls = heroPaths.map((p) => photoUrl(p)).filter(Boolean) as string[]
  const shownHero = t.hero.slideshow ? heroUrls : heroUrls.slice(0, 1)

  useEffect(() => {
    if (shownHero.length < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setSlide((i) => i + 1), 5000)
    return () => clearInterval(id)
  }, [shownHero.length])

  const galleries = ((r.site_galleries ?? []) as any[])
    .map((g) => ({
      id: g.id as string,
      title: (g.title ?? '') as string,
      cover_photo_id: (g.cover_photo_id ?? null) as string | null,
      photos: [...(g.photos ?? [])].sort((x: any, y: any) => (x.sort_order ?? 0) - (y.sort_order ?? 0)) as any[],
    }))
    .filter((g) => g.photos.length > 0)
  const sitePkgs = (r.site_packages ?? []) as { id: string; title: string; price: string | null; description: string | null }[]
  const quotes: { text: string; who: string; img: string | null }[] = [
    ...((r.testimonials ?? []) as any[]).filter((x) => x.quote).map((x) => ({ text: x.quote as string, who: (x.client_name ?? '') as string, img: photoUrl(x.storage_path) })),
    ...((r.reviews ?? []) as any[]).filter((v) => v.body).map((v) => ({ text: v.body as string, who: (v.couple_names ?? '') as string, img: null })),
  ]
  const faq = (r.faq ?? []) as any[]

  const on = (k: string) => r.site_sections?.[k] !== false
  const showMap: Record<string, boolean> = {
    about: on('about') && !!(t.text.about || r.bio || aboutPhoto),
    portfolio: on('portfolio') && galleries.length > 0,
    investment: on('investment') && sitePkgs.length > 0,
    testimonials: on('testimonials') && quotes.length > 0,
    faq: on('faq') && faq.length > 0,
    contact: true,
  }
  const visible = t.order.filter((k) => showMap[k])

  const navKeys = ['home', ...visible.filter((k) => k === 'about' || k === 'portfolio' || k === 'investment'), 'contact']
  const navItems = navKeys
    .filter((k) => !t.menu.hidden.includes(k))
    .map((k) => ({ id: k === 'home' ? 'top' : k, label: t.menu.labels[k]?.trim() || NAV_DEFAULTS[k] }))
  const doors = visible
    .filter((k) => k === 'about' || k === 'portfolio' || k === 'investment')
    .map((k) => ({ href: `#${k}`, t: t.titles[k], s: DOOR_SUB[k] }))

  const headStyle: React.CSSProperties = { fontFamily: t.head, fontWeight: 500, letterSpacing: '0.01em' }
  const btnStyle: React.CSSProperties = { background: accent, color: '#fff', fontFamily: t.body, borderRadius: t.radius }

  const cta = (force?: boolean) =>
    t.hero.ctaShow || force ? (
      <a href={availHref} className="inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={btnStyle}>{t.hero.ctaText}</a>
    ) : null

  const renderNav = (overlay: boolean, center: boolean) => {
    const brand = logo
      ? // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} style={{ height: 34, objectFit: 'contain' }} />
      : <span style={{ ...headStyle, fontSize: 24 }}>{name}</span>
    return (
      <nav
        className={overlay ? 'absolute inset-x-0 top-0 z-20' : 'sticky top-0 z-20'}
        style={overlay ? { color: '#fff' } : { color: ink, background: `color-mix(in srgb, ${bg} 94%, transparent)`, backdropFilter: 'blur(8px)', borderBottom: `1px solid ${line}` }}
      >
        <div className={center ? 'mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-4' : 'mx-auto flex h-16 max-w-6xl items-center justify-between px-6'}>
          <a href="#top">{brand}</a>
          <ul className="hidden gap-8 md:flex">
            {navItems.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} className="text-[11px] uppercase tracking-[0.2em] opacity-90 hover:opacity-100" style={{ fontFamily: t.body }}>{n.label}</a>
              </li>
            ))}
          </ul>
          <button className="absolute right-5 top-4 md:hidden" aria-label="Menu" onClick={() => setOpen(!open)} style={{ fontSize: 22, lineHeight: 1 }}>
            {open ? '✕' : '☰'}
          </button>
        </div>
        {open && (
          <ul className="flex flex-col gap-4 px-6 pb-5 md:hidden" style={{ background: overlay ? 'rgba(0,0,0,0.72)' : bg }}>
            {navItems.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} onClick={() => setOpen(false)} className="text-[12px] uppercase tracking-[0.2em]" style={{ fontFamily: t.body }}>{n.label}</a>
              </li>
            ))}
          </ul>
        )}
      </nav>
    )
  }

  const heroImg = (cls: string) =>
    shownHero.length === 0 ? (
      <div className={cls} style={{ background: accent, opacity: 0.85 }} />
    ) : (
      <>
        {shownHero.map((u, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={u} src={u} alt={i === 0 ? name : ''} className={cls}
            style={{ objectFit: 'cover', opacity: i === slide % shownHero.length ? 1 : 0, transition: 'opacity 1.2s ease-in-out' }} />
        ))}
      </>
    )

  const alignCls = t.hero.align === 'left' ? 'items-start text-left' : t.hero.align === 'right' ? 'items-end text-right' : 'items-center text-center'
  const vCls = t.hero.valign === 'top' ? 'pt-32' : t.hero.valign === 'center' ? 'my-auto py-20' : 'mt-auto pb-20 md:pb-28'
  const ov = t.hero.overlay
  const h1Big: React.CSSProperties = { ...headStyle, fontSize: 'var(--hl)', lineHeight: 1.05 }
  const h1Mid: React.CSSProperties = { ...headStyle, fontSize: 'calc(var(--hl) * 0.85)', lineHeight: 1.05 }

  const sec = (id: string, title: string | null, children: React.ReactNode, tinted: boolean) => (
    <section id={id} className="scroll-mt-16 px-6" style={{ background: tinted ? tint : undefined, paddingTop: 'var(--space)', paddingBottom: 'var(--space)' }}>
      <div className="mx-auto max-w-6xl">
        {title && <h2 className="mb-12 text-center text-4xl md:text-5xl" style={headStyle}>{title}</h2>}
        {children}
      </div>
    </section>
  )

  const socials = [
    { label: 'Instagram', url: r.instagram_url },
    { label: 'Facebook', url: r.facebook_url },
    { label: 'Pinterest', url: r.pinterest_url },
    { label: 'TikTok', url: r.tiktok_url },
    { label: 'Website', url: r.website_url },
  ].filter((s) => !!s.url)

  const renderSection = (k: string, tinted: boolean): React.ReactNode => {
    switch (k) {
      case 'about':
        return sec('about', t.titles.about,
          <div className={`mx-auto grid max-w-5xl items-center gap-12 ${aboutPhoto ? 'md:grid-cols-2' : ''}`}>
            {aboutPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={aboutPhoto} alt={name} className="w-full" style={{ aspectRatio: '4/5', objectFit: 'cover' }} />
            )}
            <div>
              <p className="whitespace-pre-line text-[16px] leading-[1.85]" style={{ color: soft }}>{t.text.about ?? r.bio ?? ''}</p>
              <div className="mt-8">{cta(true)}</div>
            </div>
          </div>, tinted)
      case 'portfolio':
        return sec('portfolio', t.titles.portfolio,
          <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 'calc(var(--gap) + 8px)' }}>
            {galleries.map((g) => {
              const cover = g.photos.find((p: any) => p.id === g.cover_photo_id) ?? g.photos[0]
              const u = photoUrl(cover?.storage_path)
              return (
                <a key={g.id} href={`/site/${token}/g/${g.id}${qs}`} className="group relative block overflow-hidden" style={{ aspectRatio: t.cardRatio, background: '#E5E1DB' }}>
                  {u && <img src={u} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.62))' }} />
                  <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                    <p className="text-3xl" style={headStyle}>{g.title}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.22em] opacity-90">{g.photos.length} photos →</p>
                  </div>
                </a>
              )
            })}
          </div>, tinted)
      case 'investment': {
        const feats = (d: string | null) => (d ?? '').split('\n').map((x) => x.trim()).filter(Boolean)
        const L = t.pricing.layout
        const fid = t.pricing.featured
        const anyHot = sitePkgs.some((p) => p.id === fid)
        const panel = `color-mix(in srgb, ${bg} 40%, #fff)`
        const book = (hot: boolean, mt = 'mt-8') =>
          t.pricing.button ? (
            <a href={availHref} className={`${mt} inline-block px-7 py-3 text-[11px] uppercase tracking-[0.22em]`}
              style={{ borderRadius: t.radius, fontFamily: t.body, background: hot ? accent : 'transparent', color: hot ? '#fff' : accent, border: `1px solid ${accent}` }}>
              {t.hero.ctaText}
            </a>
          ) : null
        const tag = (hot: boolean) =>
          hot ? (
            <p className="mb-3 text-[10px] uppercase tracking-[0.28em]" style={{ color: accent }}>Most popular</p>
          ) : anyHot ? (
            <p className="mb-3 text-[10px]">&nbsp;</p>
          ) : null
        const list = (d: string | null) =>
          feats(d).length > 0 && (
            <ul className="grid gap-2.5 text-center text-[14px] leading-snug" style={{ color: soft }}>
              {feats(d).map((f, j) => <li key={j}>{f}</li>)}
            </ul>
          )
        return sec('investment', t.titles.investment,
          <div className="mx-auto max-w-5xl">
            {t.pricing.intro && (
              <p className="mx-auto mb-12 max-w-xl whitespace-pre-line text-center text-[15px] leading-relaxed" style={{ color: soft }}>{t.pricing.intro}</p>
            )}

            {L === 'cards' && (
              <div className="grid items-stretch" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24 }}>
                {sitePkgs.map((p) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="flex flex-col items-center px-8 py-10 text-center"
                      style={{ background: panel, border: `1px solid ${hot ? accent : line}`, boxShadow: hot ? '0 10px 30px rgba(0,0,0,0.08)' : undefined }}>
                      {tag(hot)}
                      <h3 className="text-2xl" style={headStyle}>{p.title}</h3>
                      {p.price && <p className="mt-3 text-4xl" style={{ ...headStyle, color: accent }}>{p.price}</p>}
                      <div className="my-6 h-px w-10" style={{ background: line }} />
                      {list(p.description)}
                      <div className="mt-auto">{book(hot)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {L === 'menu' && (
              <div className="mx-auto max-w-3xl">
                {sitePkgs.map((p, i) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="py-8" style={{ borderTop: i > 0 ? `1px solid ${line}` : undefined }}>
                      {hot && <p className="mb-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: accent }}>Most popular</p>}
                      <div className="flex items-baseline gap-3">
                        <h3 className="text-2xl" style={{ ...headStyle, color: hot ? accent : ink }}>{p.title}</h3>
                        <span className="flex-1" style={{ borderBottom: `1px dotted ${soft}`, opacity: 0.5, transform: 'translateY(-4px)' }} />
                        {p.price && <span className="text-2xl" style={{ ...headStyle, color: accent }}>{p.price}</span>}
                      </div>
                      {feats(p.description).length > 0 && (
                        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: soft }}>{feats(p.description).join('   ·   ')}</p>
                      )}
                      {book(hot, 'mt-5')}
                    </div>
                  )
                })}
              </div>
            )}

            {L === 'columns' && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 1, background: line, border: `1px solid ${line}` }}>
                {sitePkgs.map((p) => {
                  const hot = p.id === fid
                  return (
                    <div key={p.id} className="flex flex-col items-center px-8 py-12 text-center" style={{ background: hot ? tint : bg }}>
                      {tag(hot)}
                      <h3 className="text-2xl" style={headStyle}>{p.title}</h3>
                      {p.price && <p className="mt-3 text-3xl" style={{ ...headStyle, color: accent }}>{p.price}</p>}
                      <div className="my-6 h-px w-10" style={{ background: accent, opacity: 0.6 }} />
                      {list(p.description)}
                      <div className="mt-auto">{book(hot)}</div>
                    </div>
                  )
                })}
              </div>
            )}

            {t.pricing.note && (
              <p className="mx-auto mt-10 max-w-xl whitespace-pre-line text-center text-[14px] italic leading-relaxed" style={{ color: soft }}>{t.pricing.note}</p>
            )}
            {!t.pricing.button && <div className="mt-10 text-center">{cta(true)}</div>}
          </div>, tinted)
      }
      case 'testimonials':
        return sec('words', t.titles.testimonials,
          <div className="grid gap-10 md:grid-cols-3">
            {quotes.slice(0, 6).map((q, i) => (
              <figure key={i} className="text-center">
                {q.img && <img src={q.img} alt="" loading="lazy" className="mx-auto mb-6 w-full object-cover" style={{ aspectRatio: '4/5' }} />}
                <blockquote className="text-xl italic leading-relaxed" style={{ fontFamily: t.head }}>&ldquo;{q.text}&rdquo;</blockquote>
                {q.who && <figcaption className="mt-4 text-[11px] uppercase tracking-[0.22em]" style={{ color: soft }}>{q.who}</figcaption>}
              </figure>
            ))}
          </div>, tinted)
      case 'faq':
        return sec('faq', t.titles.faq,
          <div className="mx-auto max-w-2xl">
            <FaqAccordion
              items={faq}
              questionStyle={{ fontFamily: t.head, fontSize: 20, color: ink }}
              answerStyle={{ fontFamily: t.body, fontSize: 15, color: soft, lineHeight: 1.7 }}
            />
          </div>, tinted)
      case 'contact':
        return sec('contact', t.titles.contact,
          <div className="mx-auto max-w-xl text-center">
            <p className="mb-8 whitespace-pre-line text-[15px] leading-relaxed" style={{ color: soft }}>
              {t.text.contact ?? 'Tell me about your day. Check a date and send me a message.'}
            </p>
            <div className="mb-10">{cta(true)}</div>
            {socials.length > 0 && (
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                {socials.map((s) => (
                  <a key={s.label} href={String(s.url).startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>{s.label}</a>
                ))}
              </div>
            )}
          </div>, tinted)
      default:
        return null
    }
  }

  return (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      <style>{`${t.cssVars}html{scroll-behavior:smooth;font-size:var(--text)}html,body{background:${bg}}`}</style>
      <PortfolioLightbox />
      <div style={{ background: bg, color: ink, fontFamily: t.body }}>
        {tpl === 'editorial' && (
          <>
            {t.menu.solid && renderNav(false, false)}
            <header id="top" className="relative flex flex-col overflow-hidden" style={{ minHeight: t.menu.solid ? 'calc(var(--hero-h) - 4rem)' : 'var(--hero-h)' }}>
              {heroImg('absolute inset-0 h-full w-full')}
              <div className="absolute inset-0" style={{ background: `linear-gradient(rgba(0,0,0,${ov}), rgba(0,0,0,${(ov * 0.35).toFixed(2)}) 40%, rgba(0,0,0,${Math.min(0.85, ov * 1.6).toFixed(2)}))` }} />
              {!t.menu.solid && renderNav(true, false)}
              <div className={`relative mx-auto flex w-full max-w-5xl flex-col px-6 text-white ${alignCls} ${vCls}`}>
                <div className="max-w-3xl">
                  <h1 style={h1Big}>{headline}</h1>
                  {subhead && <p className="mt-4 text-[12px] uppercase tracking-[0.28em] opacity-90">{subhead}</p>}
                  <div className="mt-8">{cta()}</div>
                </div>
              </div>
            </header>
          </>
        )}
        {tpl === 'split' && (
          <header id="top">
            {renderNav(false, false)}
            <div className="grid md:grid-cols-2" style={{ minHeight: 'calc(var(--hero-h) - 4rem)' }}>
              <div className={`order-2 flex flex-col justify-center px-8 py-16 md:order-1 md:px-16 ${t.hero.align === 'center' ? 'items-center text-center' : t.hero.align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
                {subhead && <p className="mb-5 text-[11px] uppercase tracking-[0.28em]" style={{ color: accent }}>{subhead}</p>}
                <h1 style={h1Mid}>{headline}</h1>
                <p className="mt-6 max-w-md text-[15px] leading-relaxed" style={{ color: soft }}>
                  {(t.text.about ?? r.bio ?? '').toString().split(/\n+/)[0].slice(0, 220)}
                </p>
                <div className="mt-8">{cta()}</div>
              </div>
              <div className="relative order-1 min-h-[60vh] md:order-2">{heroImg('absolute inset-0 h-full w-full')}</div>
            </div>
          </header>
        )}
        {tpl === 'minimal' && (
          <header id="top">
            {renderNav(false, true)}
            <div className="mx-auto max-w-6xl px-6 pt-6">
              <div className="relative aspect-[16/10] overflow-hidden md:aspect-[21/9]">{heroImg('absolute inset-0 h-full w-full')}</div>
            </div>
            <div className={`mx-auto flex max-w-3xl flex-col px-6 py-14 ${alignCls}`}>
              <h1 style={h1Mid}>{headline}</h1>
              {subhead && <p className="mt-4 text-[11px] uppercase tracking-[0.28em]" style={{ color: soft }}>{subhead}</p>}
              <div className="mt-8">{cta()}</div>
            </div>
          </header>
        )}

        {doors.length > 0 && (
          <div className="mx-auto grid max-w-6xl gap-0 px-6 py-16" style={{ gridTemplateColumns: `repeat(${Math.min(3, doors.length)}, minmax(0, 1fr))` }}>
            {doors.map((b, i) => (
              <a key={b.href} href={b.href} className="block px-6 py-8 text-center" style={{ borderTop: `1px solid ${line}`, borderLeft: i > 0 ? `1px solid ${line}` : undefined }}>
                <p className="text-3xl" style={headStyle}>{b.t}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: accent }}>{b.s} →</p>
              </a>
            ))}
          </div>
        )}

        {visible.map((k, i) => (
          <React.Fragment key={k}>{renderSection(k, i % 2 === 1)}</React.Fragment>
        ))}

        <footer className="px-6 pb-28 pt-6 text-center text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>
          {t.text.footer && <p className="mb-3 whitespace-pre-line normal-case tracking-normal" style={{ fontSize: 13 }}>{t.text.footer}</p>}
          © {new Date().getFullYear()} {name} · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
        </footer>
      </div>

      {t.availability.float && (
        <a href={availHref} className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap px-8 py-3.5 text-[11px] uppercase tracking-[0.22em]"
          style={{ ...btnStyle, boxShadow: '0 6px 20px rgba(0,0,0,0.22)' }}>
          {t.hero.ctaText}
        </a>
      )}
    </>
  )
}
