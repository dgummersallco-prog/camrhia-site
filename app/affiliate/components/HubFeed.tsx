'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Post = { id: string; author_id: string; author_name: string; body: string; link_url: string | null; pinned: boolean; created_at: string }
type Comment = { id: string; post_id: string; author_id: string; author_name: string; body: string; created_at: string }
type Like = { post_id: string; user_id: string }

const ROSE = '#A9545F'
const field = 'w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-twilight/25 focus:border-twilight'

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function HubFeed() {
  const [uid, setUid] = useState<string | null>(null)
  const [member, setMember] = useState<boolean | null>(null)
  const [admin, setAdmin] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [likes, setLikes] = useState<Like[]>([])
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})

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
  }, [])

  useEffect(() => { load() }, [load])

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
    setBusy(true)
    setErr(null)
    const { error } = await sb.from('hub_posts').insert({ author_id: uid, body: text, link_url: url })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setBody('')
    setLink('')
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
      <div className="rounded-2xl border border-line bg-card p-5">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000} placeholder="Share a post that is working, an idea, or a question for the team…" className={field} />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link to your post (optional)" className={`${field} mt-3`} />
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        <div className="mt-3 flex justify-end">
          <button onClick={submitPost} disabled={busy || !body.trim()} className="rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: ROSE }}>
            {busy ? 'Posting…' : 'Post to the team'}
          </button>
        </div>
      </div>

      {posts.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-8 text-center">
          <p className="font-fraunces text-lg italic text-ink-soft">No posts yet. Be the first to share something.</p>
        </div>
      )}

      {posts.map((p) => {
        const pl = likes.filter((l) => l.post_id === p.id)
        const liked = !!uid && pl.some((l) => l.user_id === uid)
        const pc = comments.filter((c) => c.post_id === p.id)
        return (
          <article key={p.id} className="rounded-2xl border bg-card p-5" style={{ borderColor: p.pinned ? ROSE : undefined }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {p.author_name}
                  {p.pinned && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white" style={{ backgroundColor: ROSE }}>Pinned</span>}
                </p>
                <p className="text-xs text-ink-soft">{ago(p.created_at)}</p>
              </div>
              <div className="flex gap-3 text-xs text-ink-soft">
                {admin && <button onClick={() => togglePin(p)} className="hover:text-ink">{p.pinned ? 'Unpin' : 'Pin'}</button>}
                {(admin || p.author_id === uid) && <button onClick={() => removePost(p)} className="hover:text-red-700">Delete</button>}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{p.body}</p>
            {p.link_url && (
              <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate text-sm underline" style={{ color: ROSE }}>{p.link_url}</a>
            )}
            <div className="mt-4 flex items-center gap-5 text-sm">
              <button onClick={() => toggleLike(p)} className={liked ? 'font-semibold' : 'text-ink-soft hover:text-ink'} style={liked ? { color: ROSE } : undefined}>
                {liked ? '♥' : '♡'} {pl.length}
              </button>
              <button onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))} className="text-ink-soft hover:text-ink">
                Comments {pc.length}
              </button>
            </div>
            {open[p.id] && (
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                {pc.map((c) => (
                  <div key={c.id} className="text-sm">
                    <p className="text-ink"><span className="font-semibold">{c.author_name}</span> <span className="text-xs text-ink-soft">{ago(c.created_at)}</span></p>
                    <p className="whitespace-pre-wrap text-ink-soft">{c.body}</p>
                    {(admin || c.author_id === uid) && <button onClick={() => removeComment(c)} className="text-xs text-ink-soft hover:text-red-700">Delete</button>}
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={drafts[p.id] ?? ''} onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))} placeholder="Add a comment" maxLength={1000} className={field} />
                  <button onClick={() => addComment(p)} className="rounded-full px-5 text-sm font-semibold text-white" style={{ backgroundColor: ROSE }}>Send</button>
                </div>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
