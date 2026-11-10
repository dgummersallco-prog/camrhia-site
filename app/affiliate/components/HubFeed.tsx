'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseAffiliate as defaultClient } from '@/lib/supabaseAffiliate'
import { Avatar } from './Avatar'

type Post = {
  id: string; author_id: string; author_name: string; body: string; link_url: string | null; pinned: boolean; created_at: string
  platform: string | null; views: number | null; ig_likes: number | null; shares: number | null; saves: number | null; signed: number | null; image_url: string | null
}
type Comment = { id: string; post_id: string; author_id: string; author_name: string; body: string; created_at: string }
type Like = { post_id: string; user_id: string }
type Nums = { views: string; ig_likes: string; shares: string; saves: string; signed: string }

const ROSE = '#3A4A6B'
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube']
const field = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-[#3A4A6B]/25 focus:border-[#3A4A6B]'

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const fmt = (n: number | null) => (n == null ? '—' : n.toLocaleString())
function embedFor(url: string | null): { src: string; kind: 'tall' | 'wide'; h?: number; top?: number; bottom?: number; side?: number } | null {
  if (!url) return null
  let m = url.match(/instagram\.com\/(?:[^/?#]+\/)?(p|reel|tv)\/([A-Za-z0-9_-]+)/i)
  if (m) return { src: `https://www.instagram.com/${m[1].toLowerCase()}/${m[2]}/embed`, kind: 'tall', h: 620, top: 60, bottom: 146, side: 10 }
  m = url.match(/tiktok\.com\/@[^/?#]+\/video\/(\d+)/i)
  if (m) return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, kind: 'tall', h: 740, top: 72, bottom: 74, side: 28 }
  m = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i)
  if (m) return { src: `https://www.youtube.com/embed/${m[1]}`, kind: 'tall', h: 600 }
  m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?(?:[^#]*&)?v=)([A-Za-z0-9_-]{6,})/i)
  if (m) return { src: `https://www.youtube.com/embed/${m[1]}`, kind: 'wide' }
  return null
}

const toNum = (v: string) => { const n = parseInt(v.replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : null }

const PLATFORM_DOT: Record<string, string> = { Instagram: '#E1306C', TikTok: '#25F4EE', YouTube: '#FF0000' }

function PostEmbed({ url, platform }: { url: string | null; platform: string | null }) {
  const [on, setOn] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const em = embedFor(url)
  if (!em) return null
  const tall = em.kind === 'tall'
  const S = 0.85
  const W0 = 380
  const side = em.side ?? 0
  const tp = em.top ?? 0
  const bt = em.bottom ?? 0
  const boxW = (W0 - 2 * side) * S
  const boxH = em.h ? (em.h - tp - bt) * S : 0
  return (
    <div className="mt-4 overflow-hidden rounded-2xl p-3" style={{ background: 'linear-gradient(160deg,#1E2740 0%,#0F1422 100%)' }}>
      {!on ? (
        <button
          type="button"
          onClick={() => setOn(true)}
          className={`group relative mx-auto flex w-full max-w-[290px] flex-col items-center justify-center gap-3 rounded-xl ${tall ? 'aspect-[4/5]' : 'aspect-video'}`}
          style={{ background: 'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 70%)' }}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl shadow-xl transition group-hover:scale-110" style={{ color: ROSE }}>&#9654;</span>
          <span className="text-sm font-semibold text-white">Watch the post</span>
          <span className="text-xs text-white/60">{platform ?? 'Tap to load'}</span>
        </button>
      ) : (
        <div className={tall ? 'relative mx-auto overflow-hidden rounded-xl bg-white' : 'relative'} style={tall && em.h ? { width: boxW, height: boxH } : undefined}>
          {!loaded && <div className="absolute inset-0 animate-pulse rounded-xl bg-white/10" />}
          <iframe
            src={em.src}
            title="Post"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className={`${tall ? 'absolute max-w-none' : 'w-full'} rounded-xl bg-white transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${em.kind === 'wide' ? 'aspect-video' : ''}`}
            style={em.h ? { width: W0, height: em.h, left: -side * S, top: -tp * S, transform: `scale(${S})`, transformOrigin: 'top left' } : undefined}
          />
        </div>
      )}
    </div>
  )
}

export default function HubFeed({ client }: { client?: SupabaseClient | null }) {
  const supabase = client ?? defaultClient
  const [uid, setUid] = useState<string | null>(null)
  const [member, setMember] = useState<boolean | null>(null)
  const [admin, setAdmin] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [likes, setLikes] = useState<Like[]>([])
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [platform, setPlatform] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [composing, setComposing] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<'new' | 'signed'>('new')
  const [editing, setEditing] = useState<Record<string, Nums | undefined>>({})
  const [avatars, setAvatars] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return
    setUid(session.user.id)
    const { data: m } = await sb.rpc('hub_is_member')
    setMember(m === true)
    if (m !== true) return
    const { data: a } = await sb.rpc('hub_is_admin')
    setAdmin(a === true)
    const { data: p } = await sb.from('hub_posts').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(100)
    const list = (p ?? []) as Post[]
    setPosts(list)
    const ids = list.map((x) => x.id)
    if (ids.length) {
      const [c, l] = await Promise.all([
        sb.from('hub_comments').select('*').in('post_id', ids).order('created_at', { ascending: true }),
        sb.from('hub_likes').select('post_id, user_id').in('post_id', ids),
      ])
      setComments((c.data ?? []) as Comment[])
      setLikes((l.data ?? []) as Like[])
    } else {
      setComments([])
      setLikes([])
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setInterval(() => { load() }, 30000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    const sb = supabase
    if (!sb || !uid) return
    const ids = Array.from(new Set([uid, ...posts.map((x) => x.author_id), ...comments.map((x) => x.author_id)]))
    sb.rpc('hub_avatars', { p_ids: ids }).then(({ data }) => {
      const m: Record<string, string> = {}
      for (const r of (data ?? []) as { user_id: string; avatar_url: string | null }[]) if (r.avatar_url) m[r.user_id] = r.avatar_url
      setAvatars(m)
    })
  }, [supabase, uid, posts, comments])

  const shown = useMemo(() => {
    const list = [...posts]
    list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      if (sort === 'signed') return (b.signed ?? -1) - (a.signed ?? -1) || +new Date(b.created_at) - +new Date(a.created_at)
      return +new Date(b.created_at) - +new Date(a.created_at)
    })
    return list
  }, [posts, sort])

  async function submitPost() {
    const sb = supabase
    const text = body.trim()
    if (!sb || !uid || !text) return
    let url: string | null = null
    const raw = link.trim()
    if (raw) {
      try {
        const u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad')
        url = u.toString()
      } catch {
        setErr('That link does not look right.')
        return
      }
    }
    if (file) {
      if (!file.type.startsWith('image/')) { setErr('Pick an image of your post.'); return }
      if (file.size > 6 * 1024 * 1024) { setErr('That image is over 6 MB.'); return }
    }
    setBusy(true)
    setErr(null)
    let imageUrl: string | null = null
    if (file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const path = `${uid}/${Date.now()}.${ext || 'jpg'}`
      const up = await sb.storage.from('hub-posts').upload(path, file, { contentType: file.type })
      if (up.error) { setBusy(false); setErr(up.error.message); return }
      imageUrl = sb.storage.from('hub-posts').getPublicUrl(path).data.publicUrl
    }
    const { error } = await sb.from('hub_posts').insert({ author_id: uid, body: text, link_url: url, platform: platform || null, image_url: imageUrl })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setBody('')
    setLink('')
    setPlatform('')
    setFile(null)
    setComposing(false)
    load()
  }

  function startEdit(p: Post) {
    setEditing((e) => ({
      ...e,
      [p.id]: { views: p.views == null ? '' : String(p.views), ig_likes: p.ig_likes == null ? '' : String(p.ig_likes), shares: p.shares == null ? '' : String(p.shares), saves: p.saves == null ? '' : String(p.saves), signed: p.signed == null ? '' : String(p.signed) },
    }))
  }

  async function saveNums(p: Post) {
    const n = editing[p.id]
    if (!n || !supabase) return
    const { error } = await supabase.from('hub_posts').update({ views: toNum(n.views), ig_likes: toNum(n.ig_likes), shares: toNum(n.shares), saves: toNum(n.saves), signed: toNum(n.signed) }).eq('id', p.id)
    if (error) { setErr(error.message); return }
    setEditing((e) => ({ ...e, [p.id]: undefined }))
    load()
  }

  async function toggleLike(p: Post) {
    const sb = supabase
    if (!sb || !uid) return
    const liked = likes.some((l) => l.post_id === p.id && l.user_id === uid)
    if (liked) await sb.from('hub_likes').delete().eq('post_id', p.id).eq('user_id', uid)
    else await sb.from('hub_likes').insert({ post_id: p.id, user_id: uid })
    load()
  }

  async function addComment(p: Post) {
    const sb = supabase
    const text = (drafts[p.id] ?? '').trim()
    if (!sb || !uid || !text) return
    const { error } = await sb.from('hub_comments').insert({ post_id: p.id, author_id: uid, body: text })
    if (error) { setErr(error.message); return }
    setDrafts((d) => ({ ...d, [p.id]: '' }))
    load()
  }

  async function removePost(p: Post) {
    if (!window.confirm('Delete this post?')) return
    await supabase?.from('hub_posts').delete().eq('id', p.id)
    load()
  }
  async function removeComment(c: Comment) {
    await supabase?.from('hub_comments').delete().eq('id', c.id)
    load()
  }
  async function togglePin(p: Post) {
    await supabase?.from('hub_posts').update({ pinned: !p.pinned }).eq('id', p.id)
    load()
  }

  if (member === null) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!member) {
    return (
      <div className="rounded-2xl border border-line bg-card p-8 text-center">
        <p className="font-fraunces text-xl font-semibold text-ink">The Team Hub opens when your application is approved.</p>
        <p className="mt-2 text-sm text-ink-soft">We will call you soon.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <button type="button" onClick={() => setComposing(true)} className="rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90" style={{ backgroundColor: ROSE }}>
          Add a post
        </button>
      </div>

      {composing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setComposing(false)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#D5DCEA] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-fraunces text-2xl font-semibold text-ink">Add a post</p>
              <button type="button" aria-label="Close" onClick={() => setComposing(false)} className="text-2xl leading-none text-ink-soft hover:text-ink">&times;</button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {PLATFORMS.map((pl) => (
                <button key={pl} type="button" onClick={() => setPlatform(platform === pl ? '' : pl)} className={`rounded-full border px-4 py-1.5 text-sm transition ${platform === pl ? 'text-white' : 'border-line text-ink hover:border-[#3A4A6B]'}`} style={platform === pl ? { backgroundColor: ROSE, borderColor: ROSE } : undefined}>
                  {pl}
                </button>
              ))}
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} placeholder="The hook or caption you used…" className={field} />
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste the link to your post (Instagram, TikTok or YouTube)" className={`${field} mt-3`} />
            {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setComposing(false)} className="rounded-full border border-line px-5 py-2.5 text-sm text-ink-soft hover:text-ink">Cancel</button>
              <button onClick={submitPost} disabled={busy || !body.trim() || !link.trim()} className="rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ROSE }}>
                {busy ? 'Posting…' : 'Post to the team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {posts.length > 1 && (
        <div className="flex gap-2 text-sm">
          {([['new', 'Newest'], ['signed', 'Most subs']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setSort(k)} className={`rounded-full border px-4 py-1.5 transition ${sort === k ? 'text-white' : 'border-line text-ink hover:border-[#3A4A6B]'}`} style={sort === k ? { backgroundColor: ROSE, borderColor: ROSE } : undefined}>
              {label}
            </button>
          ))}
        </div>
      )}

      {posts.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <p className="font-fraunces text-lg italic text-ink-soft">No posts yet. Be the first to share something.</p>
        </div>
      )}

      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
      {shown.map((p) => {
        const mine = p.author_id === uid
        const ed = editing[p.id]
        const hasNums = p.views != null || p.ig_likes != null || p.shares != null || p.saves != null || p.signed != null
        const long = p.body.length > 220
        const isOpen = !!expanded[p.id]
        return (
          <article key={p.id} className={`overflow-hidden rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(30,40,70,0.05),0_20px_44px_-24px_rgba(30,40,70,0.28)] ${p.pinned ? 'ring-2 ring-[#3A4A6B]' : 'border border-line'}`}>
            {p.pinned && <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: ROSE }}>Pinned</p>}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar url={avatars[p.author_id]} name={p.author_name} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{p.author_name}</p>
                  <p className="flex items-center gap-1.5 text-xs text-ink-soft">
                    {p.platform && (
                      <>
                        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PLATFORM_DOT[p.platform] ?? ROSE }} />
                        {p.platform}
                        <span aria-hidden>&middot;</span>
                      </>
                    )}
                    {ago(p.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-3 text-xs text-ink-soft">
                {admin && <button onClick={() => togglePin(p)} className="hover:text-ink">{p.pinned ? 'Unpin' : 'Pin'}</button>}
                {(admin || mine) && <button onClick={() => removePost(p)} className="hover:text-red-700">Delete</button>}
              </div>
            </div>

            <p className={`mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-ink ${long && !isOpen ? 'line-clamp-4' : ''}`}>{p.body}</p>
            {long && (
              <button onClick={() => setExpanded((x) => ({ ...x, [p.id]: !x[p.id] }))} className="mt-1 text-xs font-semibold" style={{ color: ROSE }}>
                {isOpen ? 'Show less' : 'Read more'}
              </button>
            )}
            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt="Post" className="mt-4 max-h-[28rem] w-full rounded-2xl border border-line object-contain bg-white" />
            )}
            <PostEmbed url={p.link_url} platform={p.platform} />
            {p.link_url && (
              <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: ROSE }}>
                Open on {p.platform ?? 'the original'} &#8599;
              </a>
            )}

            {(hasNums || mine) && !ed && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-line">
                <div className="grid grid-cols-5 divide-x divide-line">
                  <div className="px-1 py-3 text-center text-white" style={{ backgroundColor: ROSE }}>
                    <p className="font-fraunces text-xl font-semibold leading-none">{fmt(p.signed)}</p>
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/85">Subs</p>
                  </div>
                  {([['Views', p.views], ['Likes', p.ig_likes], ['Shares', p.shares], ['Saves', p.saves]] as const).map(([label, v]) => (
                    <div key={label} className="px-1 py-3 text-center">
                      <p className="text-base font-semibold leading-none text-ink">{fmt(v)}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-wider text-ink-soft">{label}</p>
                    </div>
                  ))}
                </div>
                {mine && (
                  <button onClick={() => startEdit(p)} className="w-full border-t border-line bg-paper-deep px-4 py-2 text-xs font-semibold" style={{ color: ROSE }}>
                    {hasNums ? 'Update numbers' : 'Add your numbers'}
                  </button>
                )}
              </div>
            )}

            {ed && (
              <div className="mt-5 rounded-2xl bg-paper-deep p-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {([['signed', 'Subs'], ['views', 'Views'], ['ig_likes', 'Likes'], ['shares', 'Shares'], ['saves', 'Saves']] as const).map(([k, label]) => (
                    <label key={k} className="block text-[10px] uppercase tracking-wider text-ink-soft">
                      {label}
                      <input inputMode="numeric" value={ed[k]} onChange={(e) => setEditing((s) => ({ ...s, [p.id]: { ...ed, [k]: e.target.value } }))} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-[#3A4A6B]" />
                    </label>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => saveNums(p)} className="rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ backgroundColor: ROSE }}>Save</button>
                  <button onClick={() => setEditing((s) => ({ ...s, [p.id]: undefined }))} className="rounded-full border border-line px-5 py-2 text-sm text-ink-soft hover:text-ink">Cancel</button>
                </div>
              </div>
            )}

          </article>
        )
      })}
      </div>
    </div>
  )
}
