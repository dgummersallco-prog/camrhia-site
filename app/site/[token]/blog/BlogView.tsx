'use client'

import React, { useEffect, useState } from 'react'
import { useSiteBase } from '@/app/site/useSiteBase'
import { installPreviewGlow } from '@/lib/previewGlow'
import { installPreviewPick } from '@/lib/previewPick'
import { Addons } from '../Addons'
import { installPreviewSections } from '@/lib/previewSections'
import { applyPhotoFx, applyBtnFx, applyBoxFx, applySecAccent } from '@/lib/photoFx'
import { resolveTheme, NAV_DEFAULTS } from '@/lib/siteTheme'
import { blogPosts } from '@/lib/blog'
import { SiteNav } from '../SiteNav'
import CustomJs from '@/app/site/CustomJs'
import { sanitizeCss } from '@/lib/safeCss'
import { BlogList, BlogPost } from './BlogDesigns'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/` : ''

export function BlogView({ initial, token, slug }: { initial: Record<string, any>; token: string; slug?: string }) {
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
    window.parent?.postMessage({ type: 'camrhia-preview-ready', page: 'blog' }, window.location.origin)
    return () => window.removeEventListener('message', onMsg)
  }, [])
  useEffect(() => installPreviewGlow(), [])
  useEffect(() => installPreviewPick(), [])
  useEffect(() => installPreviewSections(), [])

  const t = resolveTheme(r)
  const { accent, ink, soft, line, bg } = t
  useEffect(() => {
    const st = (r as any).site_settings
    applyPhotoFx(st?.photoFx, st?.slotPics, (pp: string) => (pp ? (/^https?:/.test(pp) ? pp : STORAGE_BASE + pp) : null))
    applyBtnFx(st?.btnFx)
    applyBoxFx(st?.boxFx)
    document.body.dataset.camGroups = JSON.stringify(st?.boxGroups ?? [])
    applySecAccent(st?.secStyle, accent)
  })
  const blSt = (((r as any).site_settings?.secStyle?.blog) ?? {}) as { bg?: string; text?: string }
  const okHex = (v?: string) => (v && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : null)
  const pageBg = okHex(blSt.bg) ?? bg
  const blogCss = (okHex(blSt.bg) ? `#blog{background:${okHex(blSt.bg)} !important}` : '') + (okHex(blSt.text) ? `#blog{color:${okHex(blSt.text)} !important}` : '')
  const studio: string = r.studio_name ?? r.display_name ?? 'Studio'
  const qs = isPreview ? '?preview=1' : ''
  const base = useSiteBase(token)
  const homeHref = base || '/'
  const logo = r.logo_path ? STORAGE_BASE + r.logo_path : null
  const ss = (r.site_settings ?? {}) as Record<string, any>
  const realPosts = blogPosts(ss)
  const SAMPLE_BODY = 'Share the story behind a session here. Tell people how it came together, what you loved about it, and what you hope they take away.\n\nAdd more paragraphs, tips and photos as you go.'
  const posts = isPreview && realPosts.length === 0
    ? ([['sample-one', 'A sample blog post', '2026-11-20'], ['sample-two', 'Another sample post', '2026-11-12'], ['sample-three', 'A third sample post', '2026-11-03']] as const).map(([slug, title, date], i) => ({ id: 'sample' + i, slug, title, date, cover: null, excerpt: 'A short preview of what this post is about goes here.', body: SAMPLE_BODY, published: true }))
    : realPosts
  const post = slug ? posts.find((p) => p.slug === slug) : undefined
  const head: React.CSSProperties = { fontFamily: t.head, fontWeight: 500, letterSpacing: '0.01em' }
  const sty = { head, ink, soft, accent, line, bg }
  const navPairs: [string, string][] = [['home', `${homeHref}${qs}`], ['galleries', `${base}/galleries${qs}`], ['about', `${base}/about${qs}`], ['book', `${base}/availability${qs}`], ['blog', `${base}/blog${qs}`], ...t.extraPages.map((e) => [e.id, `${base}/p/${e.id}${qs}`] as [string, string])]
  const items = navPairs
    .filter(([k]) => !t.menu.hidden.includes(k) && !(t.pagesOff as string[]).includes(k))
    .map(([k, h]) => ({ key: k, href: h, label: (t.menu.labels as Record<string, string | undefined>)[k]?.trim() || (NAV_DEFAULTS as Record<string, string>)[k] || t.extraPages.find((e) => e.id === k)?.label || k, active: k === 'blog' }))

  return (
    <>
      <link rel="stylesheet" href={t.fontsHref} />
      <style>{`${t.cssVars}html{font-size:var(--text)}html,body{background:${pageBg}}body{overflow-x:clip}${blogCss}`}</style>
      <div style={{ background: pageBg, color: ink, fontFamily: t.body, minHeight: '100vh' }}>
        <CustomJs code={String(ss.custom_js ?? '')} />
        {(() => { const cc = sanitizeCss(ss.custom_css); return cc ? <style dangerouslySetInnerHTML={{ __html: cc }} /> : null })()}
        <Addons list={(r as any).site_settings?.addons} accent={t.accent} pics={(r as any).site_settings?.slotPics} />
        <SiteNav t={t} logo={logo} name={studio} homeHref={`${homeHref}${qs}`} headStyle={head} items={items} />
        <section id="blog">
        {slug ? (
          post
            ? <BlogPost design={String(ss.blog?.postDesign ?? '')} post={post} backHref={`${base}/blog${qs}`} sty={sty} />
            : <main className="mx-auto max-w-3xl px-6 pb-24 pt-16"><p style={{ color: soft }}>This post isn&apos;t available.</p></main>
        ) : (
          <BlogList design={String(ss.blog?.listDesign ?? '')} title={String(ss.blog?.title ?? '').trim() || 'Journal'} intro={String(ss.blog?.intro ?? '')} posts={posts} hrefFor={(s) => `${base}/blog/${s}${qs}`} sty={sty} />
        )}
        </section>
      </div>
    </>
  )
}
