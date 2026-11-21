'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isAccepted } from '@/lib/galleryUpload'
import { setPendingFiles } from '@/lib/editHandoff'

type Row = { id: string; title: string; status: string; created_at: string; edit_archived?: boolean | null; gallery_photos: { count: number }[] }
type Stats = Record<string, { culled: number; edited: number }>

async function walk(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    await new Promise<void>((res) => (entry as FileSystemFileEntry).file((f) => { out.push(f); res() }, () => res()))
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader()
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res) => reader.readEntries(res, () => res([])))
      if (!batch.length) break
      for (const e of batch) await walk(e, out)
    }
  }
}

async function filesFromDrop(dt: DataTransfer): Promise<File[]> {
  const entries = Array.from(dt.items ?? [])
    .map((i) => i.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => !!e)
  if (!entries.length) return Array.from(dt.files)
  const out: File[] = []
  for (const e of entries) await walk(e, out)
  return out
}

const BUCKET = 'galleries'
const LAST_KEY = 'camrhia:lastShoot'
const primary = 'rounded-full bg-[var(--color-twilight)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
const quiet = 'rounded-full border border-white/15 px-5 py-2.5 text-sm text-ink-soft transition hover:border-white/35 hover:text-ink disabled:opacity-40'

type Stage = 'add' | 'cull' | 'edit' | 'send' | 'sent'
const STAGE_LABEL: Record<Stage, string> = { add: 'No photos yet', cull: 'Needs cull', edit: 'Needs edit', send: 'Ready to send', sent: 'Sent' }
const STAGE_ACTION: Record<Stage, string> = { add: 'Add photos', cull: 'Start culling', edit: 'Continue editing', send: 'Finish and send', sent: 'Open' }
const STAGE_RANK: Record<Stage, number> = { cull: 0, edit: 1, send: 2, add: 3, sent: 4 }
const FILTERS: { key: 'all' | Stage; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'cull', label: 'Needs cull' },
  { key: 'edit', label: 'Needs edit' },
  { key: 'send', label: 'Ready to send' },
  { key: 'sent', label: 'Sent' },
]
type Sort = 'new' | 'name' | 'photos' | 'attention'

function stageOf(r: Row, st: { culled: number; edited: number } | undefined): Stage {
  const count = r.gallery_photos?.[0]?.count ?? 0
  if (count === 0) return 'add'
  if (r.status === 'published') return 'sent'
  if (st && st.edited >= count) return 'send'
  if (st && st.culled > 0) return 'edit'
  return 'cull'
}

function progressOf(r: Row, st: { culled: number; edited: number } | undefined): string {
  const count = r.gallery_photos?.[0]?.count ?? 0
  const s = stageOf(r, st)
  if (s === 'add') return 'Add photos to begin'
  if (s === 'sent') return 'Sent to your client'
  if (s === 'send') return 'Culled and edited'
  if (s === 'edit') return `Culled · edited ${st?.edited ?? 0} of ${count}`
  return 'Not culled yet'
}

function dateOf(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ImportStart({ rows, stages, userId, onOpen, onRows }: { rows: Row[] | null; stages: Stats | null; userId: string | null; onOpen: (id: string) => void; onRows: (f: (r: Row[]) => Row[]) => void }) {
  const [filter, setFilter] = useState<'all' | Stage | 'archived'>('all')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('new')
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  const [covers, setCovers] = useState<Record<string, string>>({})
  const tried = useRef(new Set<string>())
  const filesRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  const all = rows ?? []
  const live = all.filter((r) => !r.edit_archived)
  const archived = all.filter((r) => !!r.edit_archived)

  useEffect(() => {
    const sb = supabase
    if (!sb || !rows) return
    const need = rows.filter((r) => (r.gallery_photos?.[0]?.count ?? 0) > 0 && !tried.current.has(r.id)).slice(0, 60)
    if (need.length === 0) return
    need.forEach((r) => tried.current.add(r.id))
    let dead = false
    ;(async () => {
      const found = await Promise.all(need.map(async (r) => {
        const { data } = await sb.from('gallery_photos').select('thumb_path').eq('gallery_id', r.id).not('thumb_path', 'is', null).order('sort_order', { ascending: true }).limit(1)
        return [r.id, ((data ?? [])[0] as { thumb_path: string } | undefined)?.thumb_path ?? null] as const
      }))
      const hit = found.filter((f): f is readonly [string, string] => !!f[1])
      if (hit.length === 0) return
      const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(hit.map((f) => f[1]), 3600)
      const urls = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
      if (dead) return
      const next: Record<string, string> = {}
      for (const [id, path] of hit) { const u = urls.get(path); if (u) next[id] = u }
      setCovers((prev) => ({ ...prev, ...next }))
    })().catch(() => {})
    return () => { dead = true }
  }, [rows])

  function open(id: string) {
    try { window.localStorage.setItem(LAST_KEY, id) } catch { /* ignore */ }
    onOpen(id)
  }

  async function start(list: File[]) {
    const sb = supabase
    if (busy || !sb || !userId) return
    const files = list.filter((f) => !f.name.startsWith('.') && isAccepted(f))
    if (files.length === 0) { setErr('No supported photos in that drop. JPEG, PNG, HEIC and RAW all work.'); return }
    setErr(null)
    setBusy(true)
    const title = `Shoot ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    const { data, error } = await sb.from('galleries').insert({ owner_id: userId, title, session_id: null }).select('id').single()
    if (error || !data) { setBusy(false); setErr(error?.message ?? 'Could not start the shoot.'); return }
    setPendingFiles(data.id, files)
    open(data.id)
  }

  async function saveRename(r: Row) {
    const sb = supabase
    const name = renameVal.trim()
    setRenaming(null)
    if (!sb || !name || name === r.title) return
    const { error } = await sb.from('galleries').update({ title: name }).eq('id', r.id)
    if (error) { setErr(error.message); return }
    onRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, title: name } : x)))
  }

  async function setArchived(r: Row, on: boolean) {
    const sb = supabase
    setMenu(null)
    if (!sb) return
    const { error } = await sb.from('galleries').update({ edit_archived: on }).eq('id', r.id)
    if (error) { setErr(error.message); return }
    onRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, edit_archived: on } : x)))
    if (on && filter === 'archived' && archived.length <= 1) setFilter('all')
  }

  async function removeShoot(r: Row) {
    const sb = supabase
    setMenu(null)
    if (!sb) return
    const count = r.gallery_photos?.[0]?.count ?? 0
    if (!window.confirm(`Delete "${r.title}"${count ? ` and its ${count} ${count === 1 ? 'photo' : 'photos'}` : ''}? This cannot be undone.`)) return
    setWorking(r.id)
    setErr(null)
    try {
      for (let guard = 0; guard < 400; guard++) {
        const { data, error } = await sb.from('gallery_photos').select('id, orig_path, web_path, thumb_path, full_path, pre_web_path, pre_thumb_path, pre_full_path').eq('gallery_id', r.id).limit(100)
        if (error) throw new Error(error.message)
        const list = (data ?? []) as Record<string, string | null>[]
        if (list.length === 0) break
        const del = await sb.from('gallery_photos').delete().in('id', list.map((p) => p.id as string))
        if (del.error) throw new Error(del.error.message)
        const paths = list.flatMap((p) => [p.orig_path, p.web_path, p.thumb_path, p.full_path, p.pre_web_path, p.pre_thumb_path, p.pre_full_path]).filter((x): x is string => !!x)
        for (let i = 0; i < paths.length; i += 100) await sb.storage.from(BUCKET).remove(paths.slice(i, i + 100))
      }
      const { error } = await sb.from('galleries').delete().eq('id', r.id)
      if (error) throw new Error(error.message)
      onRows((prev) => prev.filter((x) => x.id !== r.id))
      try { if (window.localStorage.getItem(LAST_KEY) === r.id) window.localStorage.removeItem(LAST_KEY) } catch { /* ignore */ }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete that shoot.')
    }
    setWorking(null)
  }

  const stg = (r: Row) => (stages ? stages[r.id] : undefined)
  const pool = filter === 'archived' ? archived : live
  const needle = q.trim().toLowerCase()
  const shown = pool
    .filter((r) => filter === 'archived' || filter === 'all' || !stages || stageOf(r, stg(r)) === filter)
    .filter((r) => !needle || r.title.toLowerCase().includes(needle))
    .sort((a, b) => {
      if (sort === 'name') return a.title.localeCompare(b.title)
      if (sort === 'photos') return (b.gallery_photos?.[0]?.count ?? 0) - (a.gallery_photos?.[0]?.count ?? 0)
      if (sort === 'attention') return STAGE_RANK[stageOf(a, stg(a))] - STAGE_RANK[stageOf(b, stg(b))] || b.created_at.localeCompare(a.created_at)
      return b.created_at.localeCompare(a.created_at)
    })

  let lastId: string | null = null
  try { lastId = window.localStorage.getItem(LAST_KEY) } catch { /* ignore */ }
  const resume = live.find((r) => r.id === lastId && (r.gallery_photos?.[0]?.count ?? 0) > 0)
    ?? live.find((r) => ['cull', 'edit', 'send'].includes(stageOf(r, stg(r))))
    ?? null

  const compact = live.length > 0

  const cover = (r: Row, cls: string) => (
    <div className={`overflow-hidden bg-white/40 ${cls}`}>
      {covers[r.id] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={covers[r.id]} alt="" className="h-full w-full object-cover" />
      )}
    </div>
  )

  return (
    <div className="mt-8" onClick={() => menu && setMenu(null)}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => { e.preventDefault(); setDragging(false); void start(await filesFromDrop(e.dataTransfer)) }}
        className={compact
          ? `flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-dashed px-6 py-5 transition ${dragging ? 'border-twilight bg-white/80' : 'border-white/70 bg-white/60'}`
          : `rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${dragging ? 'border-twilight bg-white/80' : 'border-white/70 bg-white/60'}`}
      >
        {compact ? (
          <div>
            <p className="font-fraunces text-xl text-ink">{busy ? 'Starting your shoot…' : 'Add a new shoot'}</p>
            <p className="mt-1 text-sm text-ink-soft">Drop a folder here, or choose one. JPEG, PNG, HEIC and RAW all work.</p>
          </div>
        ) : (
          <>
            <p className="font-fraunces text-3xl text-ink">{busy ? 'Starting your shoot…' : 'Drop your shoot here'}</p>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
              JPEG, PNG, HEIC and RAW from any camera. A whole folder works too. We cull it, edit it and get it ready to send. You don&apos;t need a session yet.
            </p>
          </>
        )}
        <div className={compact ? 'flex flex-wrap gap-3' : 'mt-8 flex flex-wrap justify-center gap-3'}>
          <button className={primary} disabled={busy || !userId} onClick={() => folderRef.current?.click()}>Choose a folder</button>
          <button className={quiet} disabled={busy || !userId} onClick={() => filesRef.current?.click()}>Choose individual photos</button>
        </div>
        <input ref={filesRef} type="file" multiple hidden onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ''; void start(l) }} />
        <input ref={folderRef} type="file" multiple hidden {...({ webkitdirectory: '' } as object)} onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ''; void start(l) }} />
      </div>
      {err && <p className="mt-4 text-sm text-red-700">{err}</p>}

      {rows === null && <p className="mt-10 text-sm text-ink-soft">Loading…</p>}

      {resume && (
        <>
          <p className="mt-10 font-fraunces text-xl text-ink">Pick up where you left off</p>
          <div className="mt-4 flex flex-wrap items-center gap-5 rounded-2xl border border-white/70 bg-white/60 p-4">
            {cover(resume, 'h-24 w-36 shrink-0 rounded-xl')}
            <div className="min-w-0 flex-1">
              <p className="truncate font-fraunces text-2xl text-ink">{resume.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{resume.gallery_photos?.[0]?.count ?? 0} photos · {progressOf(resume, stg(resume))}</p>
            </div>
            <button className={primary} onClick={() => open(resume.id)}>{STAGE_ACTION[stageOf(resume, stg(resume))]}</button>
          </div>
        </>
      )}

      {rows && rows.length > 0 && (
        <>
          <p className="mt-10 font-fraunces text-xl text-ink">All shoots</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {stages && FILTERS.map((f) => {
              const n = f.key === 'all' ? live.length : live.filter((r) => stageOf(r, stg(r)) === f.key).length
              if (n === 0 && f.key !== 'all') return null
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full border px-4 py-1.5 text-sm transition ${filter === f.key ? 'border-twilight bg-white text-ink' : 'border-white/70 bg-white/40 text-ink-soft hover:border-twilight'}`}>
                  {f.label} <span className="text-ink-soft">{n}</span>
                </button>
              )
            })}
            {archived.length > 0 && (
              <button onClick={() => setFilter('archived')} className={`rounded-full border px-4 py-1.5 text-sm transition ${filter === 'archived' ? 'border-twilight bg-white text-ink' : 'border-white/70 bg-white/40 text-ink-soft hover:border-twilight'}`}>
                Archived <span className="text-ink-soft">{archived.length}</span>
              </button>
            )}
            <span className="ml-auto flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search shoots"
                className="w-44 rounded-full border border-white/70 bg-white/60 px-4 py-1.5 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-twilight"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-sm text-ink outline-none focus:border-twilight"
              >
                <option value="new">Newest</option>
                <option value="attention">Needs attention first</option>
                <option value="name">Name</option>
                <option value="photos">Most photos</option>
              </select>
            </span>
          </div>

          {shown.length === 0 && <p className="mt-8 text-sm text-ink-soft">No shoots match.</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => {
              const count = r.gallery_photos?.[0]?.count ?? 0
              const st = stageOf(r, stg(r))
              const isArch = !!r.edit_archived
              return (
                <div key={r.id} className={`relative rounded-2xl border border-white/70 bg-white/60 p-4 transition hover:border-twilight ${working === r.id ? 'opacity-50' : ''}`}>
                  <button className="block w-full text-left" disabled={working === r.id || renaming === r.id} onClick={() => open(r.id)}>
                    {cover(r, 'h-36 w-full rounded-xl')}
                  </button>
                  <div className="mt-3 flex items-start justify-between gap-2">
                    {renaming === r.id ? (
                      <input
                        autoFocus
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={() => void saveRename(r)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void saveRename(r); if (e.key === 'Escape') setRenaming(null) }}
                        className="min-w-0 flex-1 rounded-lg border border-white/70 bg-white/80 px-2 py-1 font-fraunces text-lg text-ink outline-none focus:border-twilight"
                      />
                    ) : (
                      <button className="min-w-0 flex-1 text-left" onClick={() => open(r.id)}>
                        <p className="truncate font-fraunces text-xl text-ink">{r.title}</p>
                      </button>
                    )}
                    <button
                      aria-label="Shoot options"
                      className="shrink-0 rounded-full px-2 text-lg leading-none text-ink-soft transition hover:text-ink"
                      onClick={(e) => { e.stopPropagation(); setMenu(menu === r.id ? null : r.id) }}
                    >
                      …
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{count} {count === 1 ? 'photo' : 'photos'} · {dateOf(r.created_at)}</p>
                  <p className="mt-1 text-sm text-ink-soft">{isArch ? 'Archived' : progressOf(r, stg(r))}</p>
                  <div className="mt-4">
                    {isArch ? (
                      <button className={quiet} onClick={() => void setArchived(r, false)}>Restore</button>
                    ) : (
                      <button className={st === 'sent' ? quiet : primary} onClick={() => open(r.id)}>{STAGE_ACTION[st]}</button>
                    )}
                  </div>
                  {menu === r.id && (
                    <div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-14 z-20 w-44 overflow-hidden rounded-xl border border-white/70 bg-white/95 text-sm shadow-lg">
                      <button className="block w-full px-4 py-2.5 text-left text-ink transition hover:bg-black/5" onClick={() => { setMenu(null); setRenameVal(r.title); setRenaming(r.id) }}>Rename</button>
                      <button className="block w-full px-4 py-2.5 text-left text-ink transition hover:bg-black/5" onClick={() => void setArchived(r, !isArch)}>{isArch ? 'Restore' : 'Archive'}</button>
                      {r.status !== 'published' ? (
                        <button className="block w-full px-4 py-2.5 text-left text-red-700 transition hover:bg-black/5" onClick={() => void removeShoot(r)}>Delete</button>
                      ) : (
                        <p className="px-4 py-2.5 text-xs text-ink-soft">Sent shoots can only be archived.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
