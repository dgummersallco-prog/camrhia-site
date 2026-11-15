'use client'

import React from 'react'
import Link from 'next/link'
import { type BlogPostT, blogBlocks, fmtDate } from '@/lib/blog'

export const BLOG_LIST = ['danube', 'loire', 'rhine', 'seine', 'thames', 'tiber', 'volga', 'elbe', 'ebro', 'tagus', 'arno', 'rhone']
export const BLOG_POST = ['eiger', 'rainier', 'denali', 'olympus', 'whitney', 'elbrus', 'etna', 'shasta', 'blanc', 'kenya', 'fuji', 'cervin']

export type BlogSty = { head: React.CSSProperties; ink: string; soft: string; accent: string; line: string; bg: string }
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/` : ''
const small: React.CSSProperties = { fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase' }
const DARK = '#17130f'
const CREAM = '#f4efe7'
const wrap = 'mx-auto max-w-6xl px-6 pb-24 pt-10'
const bleed: React.CSSProperties = { width: '100vw', marginLeft: 'calc(50% - 50vw)' }
const cv = (p: BlogPostT) => (p.cover ? SB + p.cover : null)

type LP = { title: string; intro: string; posts: BlogPostT[]; hrefFor: (s: string) => string; sty: BlogSty }
type PP = { post: BlogPostT; backHref: string; sty: BlogSty }

function Pic({ p, ratio, style }: { p: BlogPostT; ratio: string; style?: React.CSSProperties }) {
  const u = cv(p)
  if (!u) return <div style={{ aspectRatio: ratio, background: 'rgba(128,128,128,.14)', ...style }} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={u} alt="" className="w-full object-cover" style={{ aspectRatio: ratio, ...style }} />
}
function Head({ title, intro, sty, center = false }: { title: string; intro: string; sty: BlogSty; center?: boolean }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left' }}>
      <h1 style={{ ...sty.head, fontSize: 'clamp(34px,5vw,58px)', lineHeight: 1.1, margin: 0 }}>{title}</h1>
      {intro && <p style={{ color: sty.soft, maxWidth: 560, margin: center ? '14px auto 0' : '14px 0 0', lineHeight: 1.7 }}>{intro}</p>}
    </div>
  )
}
function Meta({ p, sty, size = 24, excerpt = true, center = false }: { p: BlogPostT; sty: BlogSty; size?: number; excerpt?: boolean; center?: boolean }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left' }}>
      <p style={{ ...small, color: sty.accent, margin: '16px 0 8px' }}>{fmtDate(p.date)}</p>
      <h2 style={{ ...sty.head, fontSize: size, lineHeight: 1.25, margin: 0 }}>{p.title}</h2>
      {excerpt && p.excerpt && <p style={{ color: sty.soft, fontSize: 15, lineHeight: 1.65, marginTop: 10 }}>{p.excerpt}</p>}
    </div>
  )
}
function A({ p, hrefFor, sty, children, style }: { p: BlogPostT; hrefFor: (s: string) => string; sty: BlogSty; children: React.ReactNode; style?: React.CSSProperties }) {
  return <Link href={hrefFor(p.slug)} style={{ color: sty.ink, textDecoration: 'none', display: 'block', ...style }}>{children}</Link>
}

/* ---------- LIST DESIGNS ---------- */
function Danube({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}><Pic p={p} ratio="4/5" /><Meta p={p} sty={sty} /></A>)}
      </div>
    </main>
  )
}
function Loire({ title, intro, posts, hrefFor, sty }: LP) {
  const [first, ...rest] = posts
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12"><A p={first} hrefFor={hrefFor} sty={sty}><Pic p={first} ratio="21/9" /><Meta p={first} sty={sty} size={38} /></A></div>
      {rest.length > 0 && <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2">{rest.map((p) => <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}><Pic p={p} ratio="3/2" /><Meta p={p} sty={sty} /></A>)}</div>}
    </main>
  )
}
function Rhine({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-14 space-y-16">
        {posts.map((p, i) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div className={i % 2 ? 'md:order-2' : ''}><Pic p={p} ratio="4/3" /></div>
              <div><Meta p={p} sty={sty} size={32} /></div>
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
function Seine({ title, intro, posts, hrefFor, sty }: LP) {
  const rs = ['4/5', '1/1', '3/4', '4/3']
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12 columns-1 gap-8 sm:columns-2">
        {posts.map((p, i) => <div key={p.id} className="mb-12 break-inside-avoid"><A p={p} hrefFor={hrefFor} sty={sty}><Pic p={p} ratio={rs[i % 4]} /><Meta p={p} sty={sty} /></A></div>)}
      </div>
    </main>
  )
}
function Thames({ title, intro, posts, hrefFor, sty }: LP) {
  const [a, b, c, ...rest] = posts
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3"><A p={a} hrefFor={hrefFor} sty={sty}><Pic p={a} ratio="4/3" /><Meta p={a} sty={sty} size={32} /></A></div>
        <div className="flex flex-col gap-8 lg:col-span-2">
          {[b, c].filter(Boolean).map((p) => <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}><Pic p={p} ratio="3/2" /><Meta p={p} sty={sty} size={20} excerpt={false} /></A>)}
        </div>
      </div>
      {rest.length > 0 && <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">{rest.map((p) => <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}><Pic p={p} ratio="4/5" /><Meta p={p} sty={sty} /></A>)}</div>}
    </main>
  )
}
function Tiber({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12">
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ borderTop: `1px solid ${sty.line}` }}>
            <div className="grid items-center gap-5 py-8 sm:grid-cols-[130px_1fr_170px]">
              <p style={{ ...small, color: sty.accent, margin: 0 }}>{fmtDate(p.date)}</p>
              <div><h2 style={{ ...sty.head, fontSize: 28, lineHeight: 1.2, margin: 0 }}>{p.title}</h2>{p.excerpt && <p style={{ color: sty.soft, fontSize: 15, lineHeight: 1.65, marginTop: 8 }}>{p.excerpt}</p>}</div>
              <Pic p={p} ratio="4/3" />
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
function Volga({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12 grid sm:grid-cols-2" style={bleed}>
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ position: 'relative', color: '#fff' }}>
            <Pic p={p} ratio="3/2" />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 32, background: 'linear-gradient(transparent 35%, rgba(0,0,0,.68))' }}>
              <p style={{ ...small, margin: '0 0 8px', opacity: 0.85 }}>{fmtDate(p.date)}</p>
              <h2 style={{ ...sty.head, fontSize: 30, lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
function Elbe({ title, intro, posts, hrefFor, sty }: LP) {
  const d: BlogSty = { ...sty, ink: CREAM, soft: '#bdb3a4' }
  return (
    <div style={{ background: DARK, color: CREAM }}>
      <main className={wrap}>
        <Head title={title} intro={intro} sty={d} />
        <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => <A key={p.id} p={p} hrefFor={hrefFor} sty={d}><Pic p={p} ratio="1/1" /><Meta p={p} sty={d} /></A>)}
        </div>
      </main>
    </div>
  )
}
function Ebro({ title, intro, posts, hrefFor, sty }: LP) {
  const rot = [-1.6, 1.2, -0.8, 1.8]
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ background: '#fff', padding: '14px 14px 22px', boxShadow: '0 10px 30px rgba(0,0,0,.14)', transform: `rotate(${rot[i % 4]}deg)`, color: '#2a1f24' }}>
            <Pic p={p} ratio="1/1" />
            <p style={{ ...small, color: sty.accent, margin: '16px 0 6px' }}>{fmtDate(p.date)}</p>
            <h2 style={{ ...sty.head, fontSize: 22, lineHeight: 1.25, margin: 0 }}>{p.title}</h2>
          </A>
        ))}
      </div>
    </main>
  )
}
function Tagus({ title, intro, posts, hrefFor, sty }: LP) {
  const [a, ...rest] = posts
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12" style={bleed}>
        <A p={a} hrefFor={hrefFor} sty={sty} style={{ position: 'relative', color: '#fff' }}>
          <Pic p={a} ratio="16/7" style={{ aspectRatio: 'auto', height: 'min(70vh, 640px)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '48px max(24px, 6vw)', background: 'linear-gradient(transparent 30%, rgba(0,0,0,.7))' }}>
            <p style={{ ...small, margin: '0 0 10px', opacity: 0.85 }}>Latest · {fmtDate(a.date)}</p>
            <h2 style={{ ...sty.head, fontSize: 'clamp(30px,4.5vw,52px)', lineHeight: 1.12, margin: 0, maxWidth: 800 }}>{a.title}</h2>
            {a.excerpt && <p style={{ maxWidth: 600, lineHeight: 1.65, marginTop: 12, opacity: 0.9 }}>{a.excerpt}</p>}
          </div>
        </A>
      </div>
      {rest.length > 0 && <div className="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{rest.map((p) => <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}><Pic p={p} ratio="1/1" /><Meta p={p} sty={sty} size={19} excerpt={false} /></A>)}</div>}
    </main>
  )
}
function Arno({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-10">
      <Head title={title} intro={intro} sty={sty} center />
      <div className="mt-16 space-y-24">
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
            <Pic p={p} ratio="3/2" />
            <Meta p={p} sty={sty} size={32} center />
            <p style={{ ...small, color: sty.ink, textAlign: 'center', marginTop: 18 }}>Read →</p>
          </A>
        ))}
      </div>
    </main>
  )
}
function Rhone({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className={wrap}>
      <Head title={title} intro={intro} sty={sty} />
      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ border: `1px solid ${sty.line}` }}>
            <Pic p={p} ratio="3/2" />
            <div style={{ padding: '4px 26px 28px' }}>
              <Meta p={p} sty={sty} />
              <p style={{ ...small, color: sty.accent, marginTop: 18 }}>Read more →</p>
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
const LISTS: Record<string, (p: LP) => React.ReactElement> = { danube: Danube, loire: Loire, rhine: Rhine, seine: Seine, thames: Thames, tiber: Tiber, volga: Volga, elbe: Elbe, ebro: Ebro, tagus: Tagus, arno: Arno, rhone: Rhone }

export function BlogList({ design, title, intro, posts, hrefFor, sty }: { design?: string; title: string; intro: string; posts: BlogPostT[]; hrefFor: (slug: string) => string; sty: BlogSty }) {
  if (posts.length === 0) {
    return (
      <main className={wrap}>
        <Head title={title} intro={intro} sty={sty} />
        <p style={{ color: sty.soft, marginTop: 40 }}>No posts yet.</p>
      </main>
    )
  }
  const C = LISTS[design ?? ''] ?? Danube
  return <C title={title} intro={intro} posts={posts} hrefFor={hrefFor} sty={sty} />
}

/* ---------- POST DESIGNS ---------- */
function Back({ href, sty }: { href: string; sty: BlogSty }) {
  return <Link href={href} style={{ ...small, color: sty.soft, textDecoration: 'none' }}>← All posts</Link>
}
function Body({ post, sty, size = 17 }: { post: BlogPostT; sty: BlogSty; size?: number }) {
  return (
    <div style={{ color: sty.ink }}>
      {blogBlocks(post.body).map((b, i) => b.t === 'h'
        ? <h2 key={i} style={{ ...sty.head, fontSize: 26, margin: '36px 0 12px' }}>{b.s}</h2>
        : <p key={i} style={{ fontSize: size, lineHeight: 1.85, margin: '0 0 20px', whiteSpace: 'pre-line' }}>{b.s}</p>)}
    </div>
  )
}
function DT({ post, sty, center = false, size = 'clamp(32px,5vw,54px)', color }: { post: BlogPostT; sty: BlogSty; center?: boolean; size?: string; color?: string }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', color }}>
      <p style={{ ...small, color: color ?? sty.accent, margin: '0 0 12px', opacity: color ? 0.85 : 1 }}>{fmtDate(post.date)}</p>
      <h1 style={{ ...sty.head, fontSize: size, lineHeight: 1.12, margin: 0 }}>{post.title}</h1>
    </div>
  )
}

function Eiger({ post, backHref, sty }: PP) {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
      <Back href={backHref} sty={sty} />
      <div className="mt-8"><Pic p={post} ratio="21/9" /></div>
      <div className="mx-auto mt-12 max-w-2xl"><DT post={post} sty={sty} center /><div className="mt-10"><Body post={post} sty={sty} /></div></div>
    </main>
  )
}
function Rainier({ post, backHref, sty }: PP) {
  return (
    <>
      <div style={{ position: 'relative', color: '#fff' }}>
        <Pic p={post} ratio="16/7" style={{ aspectRatio: 'auto', height: 'min(78vh, 720px)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '56px max(24px, 6vw)', background: 'linear-gradient(transparent 30%, rgba(0,0,0,.7))' }}>
          <DT post={post} sty={sty} color="#fff" size="clamp(34px,5.5vw,66px)" />
        </div>
      </div>
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-12"><Back href={backHref} sty={sty} /><div className="mt-8"><Body post={post} sty={sty} /></div></main>
    </>
  )
}
function Denali({ post, backHref, sty }: PP) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.5fr]">
        <div className="self-start lg:sticky lg:top-10"><Back href={backHref} sty={sty} /><div className="mt-10"><DT post={post} sty={sty} size="clamp(30px,4vw,46px)" /></div></div>
        <div><Pic p={post} ratio="3/2" /><div className="mt-10"><Body post={post} sty={sty} /></div></div>
      </div>
    </main>
  )
}
function Olympus({ post, backHref, sty }: PP) {
  const d: BlogSty = { ...sty, ink: CREAM, soft: '#bdb3a4' }
  return (
    <div style={{ background: DARK, color: CREAM, minHeight: '100vh' }}>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
        <Back href={backHref} sty={d} />
        <div className="mt-10"><DT post={post} sty={d} center color={CREAM} /></div>
        <div className="mt-12" style={{ border: '1px solid rgba(255,255,255,.2)', padding: 10 }}><Pic p={post} ratio="3/2" /></div>
        <div className="mt-12"><Body post={post} sty={d} /></div>
      </main>
    </div>
  )
}
function Whitney({ post, backHref, sty }: PP) {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-10">
      <style>{`.bp-cap p:first-of-type::first-letter{float:left;font-size:4.4em;line-height:.8;padding:8px 12px 0 0;color:${sty.accent}}`}</style>
      <Back href={backHref} sty={sty} />
      <div className="mt-10"><DT post={post} sty={sty} center /></div>
      <div className="mt-10"><Pic p={post} ratio="16/9" /></div>
      <div className="bp-cap mx-auto mt-12 max-w-2xl"><Body post={post} sty={sty} /></div>
    </main>
  )
}
function Elbrus({ post, backHref, sty }: PP) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
      <Back href={backHref} sty={sty} />
      <div className="mt-10 grid items-end gap-12 md:grid-cols-[1.2fr_1fr]">
        <DT post={post} sty={sty} size="clamp(34px,5vw,60px)" />
        <Pic p={post} ratio="4/5" />
      </div>
      <div className="mx-auto mt-16 max-w-2xl"><Body post={post} sty={sty} /></div>
    </main>
  )
}
function Etna({ post, backHref, sty }: PP) {
  const bl = blogBlocks(post.body)
  const item = (b: { t: 'h' | 'p'; s: string }, i: number) => b.t === 'h'
    ? <h2 key={i} style={{ ...sty.head, fontSize: 26, margin: '36px 0 12px' }}>{b.s}</h2>
    : <p key={i} style={{ fontSize: 17, lineHeight: 1.85, margin: '0 0 20px', whiteSpace: 'pre-line' }}>{b.s}</p>
  return (
    <main className="mx-auto max-w-2xl px-6 pb-24 pt-10" style={{ color: sty.ink }}>
      <Back href={backHref} sty={sty} />
      <div className="mt-12"><DT post={post} sty={sty} size="clamp(36px,6vw,64px)" /></div>
      <div className="mt-10">
        {bl.slice(0, 1).map(item)}
        <div className="my-12 lg:-mx-28"><Pic p={post} ratio="3/2" /></div>
        {bl.slice(1).map((b, i) => item(b, i + 1))}
      </div>
    </main>
  )
}
function Shasta({ post, backHref, sty }: PP) {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <Back href={backHref} sty={sty} />
      <div className="mt-12 flex flex-col items-center gap-12 sm:flex-row">
        <div style={{ background: '#fff', padding: '14px 14px 36px', boxShadow: '0 12px 34px rgba(0,0,0,.16)', transform: 'rotate(-2deg)', width: 280, flexShrink: 0 }}><Pic p={post} ratio="4/5" /></div>
        <DT post={post} sty={sty} size="clamp(30px,4.5vw,48px)" />
      </div>
      <div className="mt-16"><Body post={post} sty={sty} /></div>
    </main>
  )
}
function Blanc({ post, backHref, sty }: PP) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-10">
      <Back href={backHref} sty={sty} />
      <div className="mt-10"><DT post={post} sty={sty} size="clamp(34px,5vw,58px)" /></div>
      <div className="mt-14 grid gap-12 lg:grid-cols-[340px_1fr]">
        <div className="self-start lg:sticky lg:top-10"><Pic p={post} ratio="3/4" /></div>
        <div className="max-w-2xl"><Body post={post} sty={sty} /></div>
      </div>
    </main>
  )
}
function Kenya({ post, backHref, sty }: PP) {
  return (
    <>
      <div style={{ position: 'relative', color: '#fff' }}>
        <Pic p={post} ratio="16/7" style={{ aspectRatio: 'auto', height: 'min(60vh, 560px)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,.42)' }}>
          <DT post={post} sty={sty} center color="#fff" size="clamp(34px,5.5vw,64px)" />
        </div>
      </div>
      <main className="relative mx-auto max-w-2xl px-6 pb-24">
        <div style={{ background: sty.bg, marginTop: -80, padding: '44px 44px 12px', boxShadow: '0 20px 50px rgba(0,0,0,.12)', position: 'relative' }}>
          <Back href={backHref} sty={sty} />
          <div className="mt-8"><Body post={post} sty={sty} /></div>
        </div>
      </main>
    </>
  )
}
function Fuji({ post, backHref, sty }: PP) {
  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-10">
      <Back href={backHref} sty={sty} />
      <div className="mt-10"><DT post={post} sty={sty} center /></div>
      <div className="mt-10"><Pic p={post} ratio="16/9" /></div>
      <div className="mt-12 gap-12 lg:columns-2"><Body post={post} sty={sty} size={16} /></div>
    </main>
  )
}
function Cervin({ post, backHref, sty }: PP) {
  const u = cv(post)
  return (
    <div className="grid lg:grid-cols-2">
      <div className="relative lg:sticky lg:top-0 lg:h-screen" style={{ minHeight: '45vh', background: 'rgba(128,128,128,.14)' }}>
        {u && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <div className="px-8 pb-24 pt-14 lg:px-16">
        <div className="max-w-xl">
          <Back href={backHref} sty={sty} />
          <div className="mt-10"><DT post={post} sty={sty} size="clamp(32px,4vw,50px)" /></div>
          <div className="mt-10"><Body post={post} sty={sty} /></div>
        </div>
      </div>
    </div>
  )
}
const POSTS: Record<string, (p: PP) => React.ReactElement> = { eiger: Eiger, rainier: Rainier, denali: Denali, olympus: Olympus, whitney: Whitney, elbrus: Elbrus, etna: Etna, shasta: Shasta, blanc: Blanc, kenya: Kenya, fuji: Fuji, cervin: Cervin }

export function BlogPost({ design, post, backHref, sty }: { design?: string; post: BlogPostT; backHref: string; sty: BlogSty }) {
  const C = POSTS[design ?? ''] ?? Eiger
  return <C post={post} backHref={backHref} sty={sty} />
}
