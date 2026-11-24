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
  if (!u) return <div style={{ aspectRatio: ratio, overflow: 'hidden', background: '#e4e2de', ...style }}><svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg></div>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={u} alt="" className="w-full object-cover" style={{ aspectRatio: ratio, ...style }} />
}
function Head({ title, intro, sty, center = false }: { title: string; intro: string; sty: BlogSty; center?: boolean }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left' }}>
      <h1 className="el-blog_title" style={{ ...sty.head, fontSize: 'clamp(34px,5vw,58px)', lineHeight: 1.1, margin: 0 }}>{title}</h1>
      {intro && <p className="el-blog_intro" style={{ color: sty.soft, maxWidth: 560, margin: center ? '14px auto 0' : '14px 0 0', lineHeight: 1.7 }}>{intro}</p>}
    </div>
  )
}
function Meta({ p, sty, size = 24, excerpt = true, center = false }: { p: BlogPostT; sty: BlogSty; size?: number; excerpt?: boolean; center?: boolean }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left' }}>
      <p className="el-blog_date" style={{ ...small, color: sty.accent, margin: '16px 0 8px' }}>{fmtDate(p.date)}</p>
      <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontSize: size, lineHeight: 1.25, margin: 0 }}>{p.title}</h2>
      {excerpt && p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 15, lineHeight: 1.65, marginTop: 10 }}>{p.excerpt}</p>}
    </div>
  )
}
function A({ p, hrefFor, sty, children, style }: { p: BlogPostT; hrefFor: (s: string) => string; sty: BlogSty; children: React.ReactNode; style?: React.CSSProperties }) {
  return <Link href={hrefFor(p.slug)} style={{ color: sty.ink, textDecoration: 'none', display: 'block', ...style }}>{children}</Link>
}

/* ---------- LIST DESIGNS ---------- */
function Danube({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'A collection of stories, sessions, and inspiration from behind the lens.'}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 'clamp(28px, 4.4vw, 56px)', columnGap: 'clamp(24px, 4.6vw, 64px)', rowGap: 'clamp(36px, 5vw, 64px)' }}>
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
            <Pic p={p} ratio="11/9" />
            <p className="el-blog_date" style={{ ...small, fontSize: 12, color: sty.accent, margin: '14px 0 8px' }}>{fmtDate(p.date)}</p>
            <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.4rem, 2.2vw, 1.9rem)', lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
            {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(0.9rem, 1.2vw, 1rem)', lineHeight: 1.5, margin: '10px 0 0' }}>{p.excerpt}</p>}
          </A>
        ))}
      </div>
    </main>
  )
}
function Loire({ title, intro, posts, hrefFor, sty }: LP) {
  const [first, ...rest] = posts
  const dt = (p: BlogPostT) => <p className="el-blog_date" style={{ ...small, fontSize: 12, fontWeight: 600, color: sty.accent, margin: '14px 0 8px' }}>{fmtDate(p.date)}</p>
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, shoots, and a look behind the lens.'}</p>
      <div style={{ marginTop: 'clamp(24px, 3.6vw, 44px)' }}>
        <A p={first} hrefFor={hrefFor} sty={sty}>
          <Pic p={first} ratio="4/1" />
          {dt(first)}
          <h2 className="el-blog_ptitle" data-pid={first.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2rem, 4.6vw, 3.8rem)', lineHeight: 1.1, margin: 0 }}>{first.title}</h2>
        </A>
      </div>
      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2" style={{ marginTop: 'clamp(32px, 5vw, 64px)', columnGap: 'clamp(28px, 6vw, 90px)', rowGap: 'clamp(32px, 5vw, 64px)' }}>
          {rest.map((p) => (
            <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
              <Pic p={p} ratio="5/2" />
              {dt(p)}
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)', lineHeight: 1.15, margin: 0 }}>{p.title}</h2>
              {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)', lineHeight: 1.45, margin: '10px 0 0' }}>{p.excerpt}</p>}
            </A>
          ))}
        </div>
      )}
    </main>
  )
}
function Rhine({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
      <div style={{ marginTop: 'clamp(28px, 4.4vw, 56px)', display: 'flex', flexDirection: 'column', gap: 'clamp(36px, 5vw, 64px)' }}>
        {posts.map((p, i) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
            <div className="grid items-center md:grid-cols-2" style={{ columnGap: 'clamp(28px, 5vw, 70px)', rowGap: 24 }}>
              <div className={i % 2 ? 'md:order-2' : ''}><Pic p={p} ratio="37/20" /></div>
              <div style={{ padding: '0 clamp(0px, 1.4vw, 20px)' }}>
                <p className="el-blog_date" style={{ ...small, fontSize: 13, color: sty.accent, margin: '0 0 14px' }}>{fmtDate(p.date)}</p>
                <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2rem, 4.2vw, 3.5rem)', lineHeight: 1.1, margin: 0 }}>{p.title}</h2>
                {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.6vw, 1.3rem)', lineHeight: 1.5, margin: '20px 0 0', maxWidth: 480 }}>{p.excerpt}</p>}
              </div>
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
function Seine({ title, intro, posts, hrefFor, sty }: LP) {
  const rs = ['9/10', '4/3', '37/13', '5/4']
  const ws = ['75%', '72%', '100%', '90%']
  const card = (p: BlogPostT, i: number) => (
    <div key={p.id} style={{ width: i % 4 === 0 ? '88%' : '100%', marginLeft: i % 4 === 0 ? '12%' : 0, marginBottom: 'clamp(28px, 4.4vw, 52px)' }}>
      <div style={{ width: ws[i % 4] }}>
        <A p={p} hrefFor={hrefFor} sty={sty}>
          <Pic p={p} ratio={rs[i % 4]} />
        </A>
      </div>
      <A p={p} hrefFor={hrefFor} sty={sty}>
        <p className="el-blog_date" style={{ ...small, fontSize: 12, color: sty.accent, margin: '10px 0 6px' }}>{fmtDate(p.date)}</p>
        <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.5rem, 2.6vw, 2.2rem)', lineHeight: 1.15, margin: 0 }}>{p.title}</h2>
        {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)', lineHeight: 1.45, margin: '8px 0 0' }}>{p.excerpt}</p>}
      </A>
    </div>
  )
  const hd = (
    <div style={{ marginBottom: 'clamp(20px, 3vw, 36px)' }}>
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
    </div>
  )
  return (
    <main className="mx-auto px-6 pb-24 pt-6" style={{ maxWidth: 1150 }}>
      <div className="md:hidden">{hd}{posts.map((p, i) => card(p, i))}</div>
      <div className="hidden md:grid md:grid-cols-2" style={{ columnGap: 'clamp(28px, 5vw, 70px)' }}>
        <div>{hd}{posts.map((p, i) => (i % 2 === 0 ? card(p, i) : null))}</div>
        <div>{posts.map((p, i) => (i % 2 === 1 ? card(p, i) : null))}</div>
      </div>
    </main>
  )
}
function Thames({ title, intro, posts, hrefFor, sty }: LP) {
  const [a, b, c, ...rest] = posts
  const dt = (p: BlogPostT) => <p className="el-blog_date" style={{ ...small, fontSize: 12, fontWeight: 600, color: sty.accent, margin: '12px 0 6px' }}>{fmtDate(p.date)}</p>
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
      <div className="grid lg:grid-cols-[1.62fr_1fr]" style={{ marginTop: 'clamp(20px, 3vw, 36px)', columnGap: 'clamp(24px, 3.6vw, 52px)', rowGap: 28 }}>
        <A p={a} hrefFor={hrefFor} sty={sty}>
          <Pic p={a} ratio="2/1" />
          <p className="el-blog_date" style={{ ...small, fontSize: 13, fontWeight: 600, color: sty.accent, margin: '16px 0 6px' }}>{fmtDate(a.date)}</p>
          <h2 className="el-blog_ptitle" data-pid={a.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', lineHeight: 1.1, margin: 0 }}>{a.title}</h2>
          {a.excerpt && <p className="el-blog_excerpt" data-pid={a.id} style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.4vw, 1.2rem)', lineHeight: 1.45, margin: '10px 0 0' }}>{a.excerpt}</p>}
        </A>
        <div className="flex flex-col" style={{ gap: 'clamp(20px, 2.8vw, 36px)' }}>
          {[b, c].filter(Boolean).map((p) => (
            <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
              <Pic p={p} ratio="23/8" />
              {dt(p)}
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.4rem, 2.2vw, 1.9rem)', lineHeight: 1.15, margin: 0 }}>{p.title}</h2>
            </A>
          ))}
        </div>
      </div>
      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 'clamp(32px, 4.6vw, 60px)', columnGap: 'clamp(20px, 3.2vw, 40px)', rowGap: 'clamp(28px, 4vw, 48px)' }}>
          {rest.map((p) => (
            <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
              <Pic p={p} ratio="9/5" />
              {dt(p)}
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.35rem, 2vw, 1.8rem)', lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
              {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)', lineHeight: 1.45, margin: '8px 0 0' }}>{p.excerpt}</p>}
            </A>
          ))}
        </div>
      )}
    </main>
  )
}
function Tiber({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
      <div style={{ marginTop: 'clamp(24px, 3.6vw, 44px)', borderBottom: `1px solid ${sty.line}` }}>
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ borderTop: `1px solid ${sty.line}` }}>
            <div className="grid items-center sm:grid-cols-[clamp(110px,14vw,200px)_1fr_clamp(200px,31%,420px)]" style={{ columnGap: 'clamp(16px, 2.4vw, 32px)', rowGap: 14, padding: 'clamp(14px, 1.8vw, 22px) 0 clamp(14px, 1.8vw, 22px) 10px' }}>
              <p className="el-blog_date" style={{ ...small, fontSize: 13, fontWeight: 500, letterSpacing: '0.28em', lineHeight: 1.9, color: sty.accent, margin: 0, maxWidth: 150 }}>{fmtDate(p.date)}</p>
              <div>
                <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.7rem, 3.2vw, 2.9rem)', lineHeight: 1.12, margin: 0 }}>{p.title}</h2>
                {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(0.95rem, 1.4vw, 1.2rem)', lineHeight: 1.45, margin: '12px 0 0' }}>{p.excerpt}</p>}
              </div>
              <Pic p={p} ratio="12/5" />
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
function Volga({ title, intro, posts, hrefFor, sty }: LP) {
  const ab = (d: string) => { const x = new Date(d); return isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  return (
    <main className="mx-auto max-w-6xl px-6 pt-6" style={{ paddingBottom: 0 }}>
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and notes from behind the lens.'}</p>
      <div className="grid sm:grid-cols-2" style={{ ...bleed, marginTop: 'clamp(24px, 3.6vw, 44px)' }}>
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ position: 'relative', color: '#fff' }}>
            <Pic p={p} ratio="17/10" />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(16px, 2.6vw, 38px)', background: 'linear-gradient(transparent 50%, rgba(0,0,0,.62))' }}>
              <p style={{ ...small, fontSize: 12, fontWeight: 600, letterSpacing: '0.2em', margin: '0 0 4px', opacity: 0.95 }}>{ab(p.date)}</p>
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.5rem, 2.6vw, 2.4rem)', lineHeight: 1.15, margin: 0, color: '#fff' }}>{p.title}</h2>
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
function Elbe({ title, intro, posts, hrefFor, sty }: LP) {
  const ab = (d: string) => { const x = new Date(d); return isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  return (
    <div style={{ background: '#121212', color: CREAM, minHeight: '100vh' }}>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: CREAM }}>{title}</h1>
        <p className="el-blog_intro" style={{ color: CREAM, fontSize: 'clamp(1rem, 1.6vw, 1.25rem)', letterSpacing: '0.04em', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and reflections from behind the lens.'}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 'clamp(28px, 4vw, 48px)', columnGap: 'clamp(28px, 8.5vw, 120px)', rowGap: 'clamp(32px, 4vw, 48px)' }}>
          {posts.map((p) => (
            <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ color: CREAM }}>
              <Pic p={p} ratio="11/10" />
              <p style={{ ...small, fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: '#e6b84a', margin: '14px 0 6px' }}>{ab(p.date)}</p>
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.4rem, 2.2vw, 1.9rem)', lineHeight: 1.2, margin: 0, color: CREAM }}>{p.title}</h2>
              {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: '#e4ddd0', fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)', lineHeight: 1.45, letterSpacing: '0.02em', margin: '8px 0 0' }}>{p.excerpt}</p>}
            </A>
          ))}
        </div>
      </main>
    </div>
  )
}
function Ebro({ title, intro, posts, hrefFor, sty }: LP) {
  const rot = [-2.4, 0.8, 1.2, -0.8, 0.5, 1]
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3" style={{ marginTop: 'clamp(28px, 4.4vw, 56px)', gap: 'clamp(24px, 3.4vw, 44px)' }}>
        {posts.map((p, i) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ background: '#fbf8f3', padding: '14px 14px 18px', boxShadow: '0 10px 28px rgba(60,40,20,.18)', transform: `rotate(${rot[i % 6]}deg)`, color: '#2a2320' }}>
            <Pic p={p} ratio="11/8" />
            <p className="el-blog_date" style={{ ...small, fontSize: 12, fontWeight: 700, color: sty.accent, margin: '14px 0 6px 6px' }}>{fmtDate(p.date)}</p>
            <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.3rem, 2vw, 1.75rem)', lineHeight: 1.2, margin: '0 0 0 6px' }}>{p.title}</h2>
          </A>
        ))}
      </div>
    </main>
  )
}
function Tagus({ title, intro, posts, hrefFor, sty }: LP) {
  const [a, ...rest] = posts
  const my = (d: string) => { const x = new Date(d); return isNaN(x.getTime()) ? '' : x.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
      <div style={{ ...bleed, marginTop: 'clamp(20px, 3vw, 36px)' }}>
        <A p={a} hrefFor={hrefFor} sty={sty} style={{ position: 'relative', color: '#fff' }}>
          <Pic p={a} ratio="3/1" style={{ aspectRatio: 'auto', height: 'clamp(300px, 33.4vw, 560px)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(20px, 3vw, 44px) max(24px, 4vw)', background: 'linear-gradient(to right, rgba(0,0,0,.62), rgba(0,0,0,0) 62%), linear-gradient(transparent 55%, rgba(0,0,0,.35))' }}>
            <p style={{ ...small, fontWeight: 600, letterSpacing: '0.3em', margin: '0 0 10px' }}>Latest · {my(a.date)}</p>
            <h2 className="el-blog_ptitle" data-pid={a.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2rem, 4.4vw, 3.6rem)', lineHeight: 1.1, margin: 0, maxWidth: 800 }}>{a.title}</h2>
            {a.excerpt && <p className="el-blog_excerpt" data-pid={a.id} style={{ maxWidth: 640, fontSize: 'clamp(0.95rem, 1.3vw, 1.15rem)', lineHeight: 1.5, margin: '10px 0 0' }}>{a.excerpt}</p>}
          </div>
        </A>
      </div>
      {rest.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4" style={{ marginTop: 'clamp(24px, 3.4vw, 44px)', columnGap: 'clamp(16px, 2.6vw, 32px)', rowGap: 'clamp(28px, 4vw, 48px)' }}>
          {rest.map((p) => (
            <A key={p.id} p={p} hrefFor={hrefFor} sty={sty}>
              <Pic p={p} ratio="7/5" />
              <p className="el-blog_date" style={{ ...small, fontSize: 12, fontWeight: 600, color: sty.accent, margin: '12px 0 6px' }}>{fmtDate(p.date)}</p>
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.3rem, 2vw, 1.8rem)', lineHeight: 1.2, margin: 0 }}>{p.title}</h2>
            </A>
          ))}
        </div>
      )}
    </main>
  )
}
function Arno({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className="mx-auto px-6 pb-24 pt-6" style={{ maxWidth: 900 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 9vw, 7rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
        <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1.05rem, 1.9vw, 1.5rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
      </div>
      <div style={{ marginTop: 'clamp(36px, 6vw, 72px)' }}>
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ paddingBottom: 'clamp(28px, 4vw, 44px)', marginBottom: 'clamp(28px, 4vw, 44px)', borderBottom: `1px solid ${sty.line}` }}>
            <Pic p={p} ratio="2/1" />
            <div style={{ textAlign: 'center' }}>
              <p className="el-blog_date" style={{ ...small, color: sty.accent, fontWeight: 600, letterSpacing: '0.3em', margin: 'clamp(16px, 2.4vw, 28px) 0 8px' }}>{fmtDate(p.date)}</p>
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.9rem, 4.2vw, 3.4rem)', lineHeight: 1.15, margin: 0 }}>{p.title}</h2>
              {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.6vw, 1.25rem)', lineHeight: 1.5, margin: '12px 0 0' }}>{p.excerpt}</p>}
              <p style={{ ...small, color: sty.ink, fontWeight: 700, letterSpacing: '0.3em', margin: '22px 0 0' }}>Read →</p>
            </div>
          </A>
        ))}
      </div>
    </main>
  )
}
function Rhone({ title, intro, posts, hrefFor, sty }: LP) {
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <h1 className="el-blog_title" style={{ fontWeight: 300, fontSize: 'clamp(3.4rem, 8vw, 6.4rem)', lineHeight: 1, letterSpacing: '-0.01em', margin: 0, color: sty.ink }}>{title}</h1>
      <p className="el-blog_intro" style={{ color: sty.soft, fontSize: 'clamp(1rem, 1.7vw, 1.3rem)', margin: '10px 0 0' }}>{intro || 'Stories, sessions, and inspiration from behind the camera.'}</p>
      <div className="grid sm:grid-cols-2" style={{ marginTop: 'clamp(24px, 3.6vw, 44px)', gap: 'clamp(16px, 2vw, 24px)' }}>
        {posts.map((p) => (
          <A key={p.id} p={p} hrefFor={hrefFor} sty={sty} style={{ border: `1px solid ${sty.line}` }}>
            <Pic p={p} ratio="27/10" />
            <div style={{ padding: 'clamp(16px, 2.4vw, 26px) clamp(18px, 2.4vw, 34px) clamp(18px, 2.4vw, 28px)' }}>
              <p className="el-blog_date" style={{ ...small, fontSize: 12, fontWeight: 700, color: sty.accent, margin: '0 0 6px' }}>{fmtDate(p.date)}</p>
              <h2 className="el-blog_ptitle" data-pid={p.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(1.5rem, 2.6vw, 2.3rem)', lineHeight: 1.15, margin: 0 }}>{p.title}</h2>
              {p.excerpt && <p className="el-blog_excerpt" data-pid={p.id} style={{ color: sty.soft, fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)', lineHeight: 1.45, margin: '10px 0 0' }}>{p.excerpt}</p>}
              <p style={{ ...small, fontSize: 12, fontWeight: 700, color: sty.accent, margin: '18px 0 0' }}>Read more →</p>
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
function inl(t: string): React.ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*)/g).map((x, i) => (x.length > 4 && x.startsWith('**') && x.endsWith('**') ? <strong key={i} style={{ fontWeight: 700 }}>{x.slice(2, -2)}</strong> : x))
}
function Body({ post, sty, size = 17, serif = false, from = 0, to }: { post: BlogPostT; sty: BlogSty; size?: number; serif?: boolean; from?: number; to?: number }) {
  const ff = serif ? (sty.head as any).fontFamily : undefined
  return (
    <div style={{ color: sty.ink, fontFamily: ff, letterSpacing: serif ? '0.02em' : undefined }}>
      {blogBlocks(post.body).slice(from, to).map((b, i) => {
        if (b.t === 'h') return <h2 key={i} style={{ ...sty.head, ...(serif ? { fontWeight: 400, fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', margin: '40px 0 18px' } : { fontSize: 26, margin: '36px 0 12px' }) }}>{b.s}</h2>
        const lines = b.s.split('\n').map((x) => x.trim()).filter(Boolean)
        if (lines.length > 0 && lines.every((l) => /^\d+[.)]\s/.test(l))) {
          return (
            <div key={i} style={{ margin: '0 0 20px' }}>
              {lines.map((l, j) => (
                <div key={j} style={{ display: 'flex', gap: 14, margin: '0 0 14px' }}>
                  <span style={{ color: sty.accent, fontWeight: 700, minWidth: 26, fontSize: size + 2 }}>{j + 1}.</span>
                  <span style={{ fontSize: size, lineHeight: 1.75 }}>{inl(l.replace(/^\d+[.)]\s+/, ''))}</span>
                </div>
              ))}
            </div>
          )
        }
        return <p key={i} className="el-blog_body" style={{ fontSize: size, lineHeight: 1.85, margin: '0 0 20px', whiteSpace: 'pre-line' }}>{inl(b.s)}</p>
      })}
    </div>
  )
}
function DT({ post, sty, center = false, size = 'clamp(32px,5vw,54px)', color }: { post: BlogPostT; sty: BlogSty; center?: boolean; size?: string; color?: string }) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', color }}>
      <p className="el-blog_date" style={{ ...small, color: color ?? sty.accent, margin: '0 0 12px', opacity: color ? 0.85 : 1 }}>{fmtDate(post.date)}</p>
      <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontSize: size, lineHeight: 1.12, margin: 0 }}>{post.title}</h1>
    </div>
  )
}

function Eiger({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <main className="pb-24 pt-6">
      <div className="mx-auto max-w-6xl px-6"><Back href={backHref} sty={sty} /></div>
      <div style={{ ...bleed, marginTop: 'clamp(14px, 2vw, 24px)' }}><Pic p={post} ratio="14/5" /></div>
      <div className="mx-auto px-6" style={{ maxWidth: 780 }}>
        <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: sty.accent, fontFamily: ff, textAlign: 'center', margin: 'clamp(24px, 3.6vw, 44px) 0 12px' }}>{fmtDate(post.date)}</p>
        <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.2rem, 5vw, 4.2rem)', lineHeight: 1.1, textAlign: 'center', margin: '0 0 clamp(28px, 4vw, 48px)' }}>{post.title}</h1>
        <Body post={post} sty={sty} serif />
      </div>
    </main>
  )
}
function Rainier({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <>
      <div style={{ position: 'relative', color: '#fff' }}>
        <Pic p={post} ratio="16/7" style={{ aspectRatio: 'auto', height: 'clamp(380px, 58vw, 720px)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 'clamp(20px, 3vw, 44px) max(24px, 5vw)', background: 'linear-gradient(transparent 45%, rgba(0,0,0,.72))' }}>
          <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 500, letterSpacing: '0.25em', fontFamily: ff, margin: '0 0 8px' }}>{fmtDate(post.date)}</p>
          <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 6vw, 5rem)', lineHeight: 1.08, margin: 0, color: '#fff' }}>{post.title}</h1>
        </div>
      </div>
      <main className="pb-24 pt-8">
        <div style={{ padding: '0 max(24px, 5vw)' }}><Back href={backHref} sty={sty} /></div>
        <div className="mx-auto px-6" style={{ maxWidth: 780, marginTop: 'clamp(16px, 2.4vw, 28px)' }}><Body post={post} sty={sty} serif /></div>
      </main>
    </>
  )
}
function Denali({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-14">
      <div className="grid lg:grid-cols-[28%_1fr]" style={{ columnGap: 'clamp(24px, 2.4vw, 32px)', rowGap: 28 }}>
        <div className="self-start lg:sticky lg:top-10">
          <Back href={backHref} sty={sty} />
          <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: sty.accent, fontFamily: ff, margin: 'clamp(20px, 3vw, 36px) 0 14px' }}>{fmtDate(post.date)}</p>
          <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.2rem, 4.6vw, 3.9rem)', lineHeight: 1.15, margin: 0 }}>{post.title}</h1>
        </div>
        <div>
          <Pic p={post} ratio="3/2" />
          <div style={{ marginTop: 'clamp(24px, 3.4vw, 40px)', maxWidth: 700 }}><Body post={post} sty={sty} serif /></div>
        </div>
      </div>
    </main>
  )
}
function Olympus({ post, backHref, sty }: PP) {
  const d: BlogSty = { ...sty, ink: '#f4efe7', soft: '#bdb3a4', accent: '#f0c14b' }
  const ff = (sty.head as any).fontFamily
  return (
    <div style={{ background: '#1c1c1c', color: '#f4efe7', minHeight: '100vh' }}>
      <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
        <Back href={backHref} sty={d} />
        <p className="el-blog_date" style={{ ...small, fontSize: 12, fontWeight: 700, letterSpacing: '0.25em', color: '#f0c14b', fontFamily: ff, textAlign: 'center', margin: 'clamp(20px, 3vw, 36px) 0 14px' }}>{fmtDate(post.date)}</p>
        <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 5.8vw, 4.9rem)', lineHeight: 1.1, textAlign: 'center', margin: '0 auto', maxWidth: 900, color: '#fff' }}>{post.title}</h1>
        <div className="mx-auto" style={{ maxWidth: 880, marginTop: 'clamp(22px, 3.2vw, 38px)', border: '1px solid rgba(255,255,255,.75)' }}><Pic p={post} ratio="2/1" /></div>
        <div className="mx-auto" style={{ maxWidth: 640, marginTop: 'clamp(26px, 3.8vw, 46px)' }}><Body post={post} sty={d} serif /></div>
      </main>
    </div>
  )
}
function Whitney({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <main className="mx-auto px-6 pb-24 pt-6" style={{ maxWidth: 1040 }}>
      <style>{`.bp-cap p:first-of-type::first-letter{float:left;font-size:5em;line-height:.78;padding:8px 12px 0 0;color:${sty.accent}}`}</style>
      <Back href={backHref} sty={sty} />
      <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 700, letterSpacing: '0.25em', color: sty.accent, fontFamily: ff, textAlign: 'center', margin: 'clamp(8px, 1.4vw, 16px) 0 10px' }}>{fmtDate(post.date)}</p>
      <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 6vw, 5rem)', lineHeight: 1.1, textAlign: 'center', margin: 0 }}>{post.title}</h1>
      <div style={{ marginTop: 'clamp(20px, 3vw, 36px)' }}><Pic p={post} ratio="17/8" /></div>
      <div className="bp-cap mx-auto" style={{ maxWidth: 780, marginTop: 'clamp(26px, 3.8vw, 46px)' }}><Body post={post} sty={sty} serif /></div>
    </main>
  )
}
function Elbrus({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <Back href={backHref} sty={sty} />
      <div className="grid items-center lg:grid-cols-[1fr_54%]" style={{ marginTop: 'clamp(14px, 2vw, 24px)', columnGap: 'clamp(20px, 2.8vw, 40px)', rowGap: 28 }}>
        <div>
          <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: sty.accent, fontFamily: ff, margin: '0 0 clamp(14px, 2vw, 24px)' }}>{fmtDate(post.date)}</p>
          <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 5.8vw, 5rem)', lineHeight: 1.1, margin: 0 }}>{post.title}</h1>
        </div>
        <Pic p={post} ratio="6/7" />
      </div>
      <div className="mx-auto" style={{ maxWidth: 740, marginTop: 'clamp(28px, 4vw, 48px)' }}><Body post={post} sty={sty} serif /></div>
    </main>
  )
}
function Etna({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <main className="mx-auto px-6 pb-24 pt-6" style={{ maxWidth: 1000 }}>
      <Back href={backHref} sty={sty} />
      <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: sty.accent, fontFamily: ff, margin: 'clamp(14px, 2vw, 24px) 0 8px' }}>{fmtDate(post.date)}</p>
      <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 6.2vw, 5.2rem)', lineHeight: 1.08, margin: '0 0 clamp(16px, 2.4vw, 28px)' }}>{post.title}</h1>
      <div style={{ padding: '0 clamp(0px, 1.6vw, 18px)' }}><Body post={post} sty={sty} serif from={0} to={1} /></div>
      <div style={{ margin: 'clamp(16px, 2.4vw, 28px) 0' }}><Pic p={post} ratio="2/1" /></div>
      <div style={{ padding: '0 clamp(0px, 1.6vw, 18px)' }}><Body post={post} sty={sty} serif from={1} /></div>
    </main>
  )
}
function Shasta({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <Back href={backHref} sty={sty} />
      <div className="grid items-center lg:grid-cols-[50%_1fr]" style={{ marginTop: 'clamp(24px, 3.6vw, 48px)', columnGap: 'clamp(28px, 4vw, 52px)', rowGap: 36 }}>
        <div style={{ background: '#fff', padding: 'clamp(10px, 1.6vw, 18px) clamp(10px, 1.6vw, 18px) clamp(30px, 4.6vw, 52px)', boxShadow: '0 14px 36px rgba(60,40,20,.2)', transform: 'rotate(-3deg)' }}><Pic p={post} ratio="6/5" /></div>
        <div>
          <p className="el-blog_date" style={{ ...small, fontSize: 13, fontWeight: 600, letterSpacing: '0.25em', color: sty.accent, fontFamily: ff, margin: '0 0 clamp(10px, 1.6vw, 18px)' }}>{fmtDate(post.date)}</p>
          <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 6.4vw, 5.4rem)', lineHeight: 1.1, margin: 0 }}>{post.title}</h1>
        </div>
      </div>
      <div className="mx-auto" style={{ maxWidth: 760, marginTop: 'clamp(32px, 5vw, 64px)' }}><Body post={post} sty={sty} serif /></div>
    </main>
  )
}
function Blanc({ post, backHref, sty }: PP) {
  const u = cv(post)
  const ff = (sty.head as any).fontFamily
  const fill: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-8">
      <Back href={backHref} sty={sty} />
      <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: sty.accent, fontFamily: ff, margin: 'clamp(16px, 2.4vw, 30px) 0 6px' }}>{fmtDate(post.date)}</p>
      <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.6rem, 7.4vw, 6rem)', lineHeight: 1.05, margin: 0 }}>{post.title}</h1>
      <div className="grid lg:grid-cols-[36%_1fr]" style={{ marginTop: 'clamp(24px, 3.4vw, 44px)', columnGap: 'clamp(28px, 4.4vw, 56px)', rowGap: 32 }}>
        <div className="relative aspect-[3/4] lg:aspect-auto" style={{ background: '#e4e2de' }}>
          {u
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={u} alt="" className="object-cover" style={fill} />
            : <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={fill}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>}
        </div>
        <div style={{ maxWidth: 620 }}><Body post={post} sty={sty} serif /></div>
      </div>
    </main>
  )
}
function Kenya({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <>
      <div style={{ position: 'relative', color: '#fff' }}>
        <Pic p={post} ratio="16/7" style={{ aspectRatio: 'auto', height: 'clamp(380px, 55vw, 640px)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', textAlign: 'center', padding: '24px 24px clamp(100px, 13vw, 150px)', background: 'linear-gradient(transparent 40%, rgba(0,0,0,.22))' }}>
          <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 500, letterSpacing: '0.3em', fontFamily: ff, margin: '0 0 12px' }}>{fmtDate(post.date)}</p>
          <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.2rem, 5.6vw, 4.8rem)', lineHeight: 1.1, margin: 0, color: '#fff' }}>{post.title}</h1>
        </div>
      </div>
      <main className="relative mx-auto px-6 pb-24" style={{ maxWidth: 1000 }}>
        <div style={{ background: '#fbf8f4', marginTop: 'clamp(-110px, -12vw, -60px)', padding: 'clamp(24px, 4vw, 44px) clamp(22px, 5vw, 58px) 16px', boxShadow: '0 20px 50px rgba(0,0,0,.14)', borderRadius: 4, position: 'relative' }}>
          <Back href={backHref} sty={sty} />
          <div className="mt-6"><Body post={post} sty={sty} serif /></div>
        </div>
      </main>
    </>
  )
}
function Fuji({ post, backHref, sty }: PP) {
  const ff = (sty.head as any).fontFamily
  return (
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-6">
      <Back href={backHref} sty={sty} />
      <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 500, letterSpacing: '0.3em', color: sty.accent, fontFamily: ff, textAlign: 'center', margin: 'clamp(24px, 3.6vw, 44px) 0 14px' }}>{fmtDate(post.date)}</p>
      <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 5.8vw, 4.9rem)', lineHeight: 1.1, textAlign: 'center', margin: '0 auto', maxWidth: 900 }}>{post.title}</h1>
      <div style={{ marginTop: 'clamp(24px, 3.4vw, 44px)' }}><Pic p={post} ratio="2/1" /></div>
      <div className="lg:columns-2" style={{ marginTop: 'clamp(28px, 4vw, 52px)', columnGap: 'clamp(28px, 5vw, 56px)', padding: '0 clamp(0px, 0.6vw, 8px)' }}><Body post={post} sty={sty} serif size={16.5} /></div>
    </main>
  )
}
function Cervin({ post, backHref, sty }: PP) {
  const u = cv(post)
  const ff = (sty.head as any).fontFamily
  const fill: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' }
  return (
    <div className="grid lg:grid-cols-[44.7%_1fr]">
      <div className="relative lg:sticky lg:top-0 lg:h-screen" style={{ minHeight: '55vh', background: '#e4e2de' }}>
        {u
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={u} alt="" className="object-cover" style={fill} />
          : <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={fill}><rect width="100" height="100" fill="#e4e2de" /><path d="M0 78 L28 42 L44 62 L62 30 L100 78 Z" fill="#c9c6c1" /><circle cx="74" cy="26" r="7" fill="#d3d0cb" /></svg>}
      </div>
      <div className="px-6 pb-24 pt-10 lg:px-12">
        <div style={{ maxWidth: 560 }}>
          <Back href={backHref} sty={sty} />
          <p className="el-blog_date" style={{ ...small, fontSize: 14, fontWeight: 700, letterSpacing: '0.2em', color: sty.accent, fontFamily: ff, margin: 'clamp(20px, 3vw, 36px) 0 10px' }}>{fmtDate(post.date)}</p>
          <h1 className="el-blog_ptitle" data-pid={post.id} style={{ ...sty.head, fontWeight: 400, fontSize: 'clamp(2.4rem, 5.5vw, 4.6rem)', lineHeight: 1.08, margin: '0 0 clamp(24px, 3.4vw, 40px)' }}>{post.title}</h1>
          <Body post={post} sty={sty} serif />
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
