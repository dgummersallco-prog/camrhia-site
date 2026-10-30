'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DashboardHeader } from '@/app/components/DashboardHeader'
import { GalleryTabs } from '@/app/components/GalleryTabs'
import { storageLimitBytes, formatBytes } from '@/lib/storageLimit'
import { downloadZip } from 'client-zip'

type Row = { gallery_id: string; title: string; status: string; photos: number; bytes: number; created_at: string; collection: string | null }

const card = 'rounded-2xl border border-line bg-card p-5'

export default function StoragePage() {
  const router = useRouter()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [plan, setPlan] = useState<string | null>(null)
  const [packs, setPacks] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [dl, setDl] = useState<{ id: string; done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/storage'); return }
    const [u, p] = await Promise.all([
      sb.rpc('storage_usage'),
      sb.from('profiles').select('plan_tier, storage_addon_packs').eq('id', sess.session.user.id).single(),
    ])
    if (u.error) { setError(u.error.message); return }
    setRows(((u.data ?? []) as Row[]).map((r) => ({ ...r, photos: Number(r.photos), bytes: Number(r.bytes) })))
    setPlan((p.data?.plan_tier as string | null) ?? null)
    setPacks((p.data?.storage_addon_packs as number | null) ?? 0)
  }, [router])

  useEffect(() => { load() }, [load])

  async function remove(r: Row, skipConfirm = false) {
    const sb = supabase
    if (!sb) return
    if (!skipConfirm && !window.confirm(`Delete "${r.title}" and its ${r.photos} photos? This cannot be undone.`)) return
    setBusy(r.gallery_id)
    setError(null)
    const paths: string[] = []
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from('gallery_photos').select('orig_path, web_path, thumb_path, full_path').eq('gallery_id', r.gallery_id).range(from, from + 999)
      const batch = (data ?? []) as { orig_path: string | null; web_path: string | null; thumb_path: string | null; full_path: string | null }[]
      batch.forEach((b) => [b.orig_path, b.web_path, b.thumb_path, b.full_path].forEach((x) => { if (x) paths.push(x) }))
      if (batch.length < 1000) break
    }
    const { data: g } = await sb.from('galleries').select('cover_path').eq('id', r.gallery_id).maybeSingle()
    const { error: e } = await sb.from('galleries').delete().eq('id', r.gallery_id)
    if (e) { setBusy(null); setError(e.message); return }
    for (let i = 0; i < paths.length; i += 100) {
      await sb.storage.from('galleries').remove(paths.slice(i, i + 100))
    }
    if (g?.cover_path) await sb.storage.from('gallery-covers').remove([g.cover_path as string])
    setBusy(null)
    load()
  }

  async function download(r: Row) {
    const sb = supabase
    if (!sb) return
    setError(null)
    const { data: sess } = await sb.auth.getSession()
    const token = sess.session?.access_token
    if (!token) { setError('Please sign in again.'); return }

    const safe = r.title.replace(/[^\w\- ]+/g, '').trim() || 'gallery'
    const w = window as unknown as {
      showSaveFilePicker?: (o: unknown) => Promise<{ createWritable: () => Promise<WritableStream<Uint8Array>> }>
    }
    try {
      // Must run right after the click, before any waiting, or the browser blocks it.
      let handle: Awaited<ReturnType<NonNullable<typeof w.showSaveFilePicker>>> | null = null
      if (w.showSaveFilePicker) {
        handle = await w.showSaveFilePicker({
          suggestedName: `${safe}.zip`,
          types: [{ description: 'Zip file', accept: { 'application/zip': ['.zip'] } }],
        })
      } else if (r.bytes > 1.5e9) {
        setError('This gallery is too big for this browser. Please use Chrome or Edge on a computer to download it.')
        return
      }

      setDl({ id: r.gallery_id, done: 0, total: 0 })
      const res = await fetch(`/api/storage/manifest?id=${r.gallery_id}`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Could not start the download')
      const files = j.files as { name: string; url: string }[]
      if (files.length === 0) throw new Error('This gallery has no photos to download.')

      let n = 0
      async function* gen() {
        for (const f of files) {
          const resp = await fetch(f.url)
          if (!resp.ok) throw new Error(`Could not read ${f.name}`)
          n++
          setDl({ id: r.gallery_id, done: n, total: files.length })
          yield { name: f.name, input: resp }
        }
      }
      const zip = downloadZip(gen())
      if (handle) {
        const ws = await handle.createWritable()
        await zip.body!.pipeTo(ws)
      } else {
        const blob = await zip.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${safe}.zip`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 60000)
      }
      setDl(null)
      if (window.confirm(`Saved to your computer. Delete "${r.title}" from the site now? Clients will no longer be able to open it.`)) {
        await remove(r, true)
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDl(null)
    }
  }

  const used = (rows ?? []).reduce((n, r) => n + r.bytes, 0)
  const keyOf = (r: Row) => r.collection ?? ''
  const groupTotals: Record<string, { bytes: number; count: number }> = {}
  for (const r of rows ?? []) {
    const k = keyOf(r)
    const t = groupTotals[k] ?? { bytes: 0, count: 0 }
    t.bytes += r.bytes
    t.count += 1
    groupTotals[k] = t
  }
  const hasCollections = Object.keys(groupTotals).some((k) => k !== '')
  const ordered = hasCollections
    ? [...(rows ?? [])].sort((a, b) => {
        const ka = keyOf(a)
        const kb = keyOf(b)
        if (ka === kb) return b.bytes - a.bytes
        if (ka === '') return 1
        if (kb === '') return -1
        return groupTotals[kb].bytes - groupTotals[ka].bytes
      })
    : (rows ?? [])
  const limit = storageLimitBytes(plan, packs)
  const pct = Math.min(100, (used / limit) * 100)
  const barColor = used >= limit ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-twilight'

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <DashboardHeader active="galleries" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <GalleryTabs active="storage" />
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Studio</p>
        <h1 className="mb-6 font-fraunces text-3xl font-semibold text-ink">Storage</h1>

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        {rows === null ? (
          !error && <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <>
            <section className={card}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <p className="font-fraunces text-3xl font-semibold text-ink">
                  {formatBytes(used)} <span className="text-lg font-normal text-ink-soft">of {formatBytes(limit)} used</span>
                </p>
                <p className="text-sm text-ink-soft">{Math.round(pct)}%</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-line">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
              </div>
              {used >= limit ? (
                <p className="mt-3 text-sm text-red-600">Your storage is full. New uploads are paused. Delete old galleries below or add more storage. Clients can still view and download existing galleries.</p>
              ) : pct >= 80 ? (
                <p className="mt-3 text-sm text-amber-700">You are running low on storage.</p>
              ) : (
                <p className="mt-3 text-sm text-ink-soft">Your original photos count toward your storage.</p>
              )}
            </section>

            <section className={`${card} mt-4`}>
              <p className="font-fraunces text-lg font-semibold text-ink">Need more room?</p>
              <p className="mt-1 text-sm text-ink-soft">
                Extra storage packs are coming soon. Until then, <Link href="/support" className="underline hover:text-ink">contact support</Link> and we will add storage to your account.
              </p>
            </section>

            <section className={`${card} mt-4`}>
              <p className="mb-3 font-fraunces text-xl font-semibold text-ink">Galleries by size</p>
              {rows.length === 0 ? (
                <p className="text-sm text-ink-soft">No galleries yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {ordered.map((r, idx) => (
                    <Fragment key={r.gallery_id}>
                    {hasCollections && (idx === 0 || keyOf(ordered[idx - 1]) !== keyOf(r)) && (
                      <li className="flex items-center justify-between pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-ink-soft">
                        <span>{r.collection ?? 'No collection'}</span>
                        <span>{groupTotals[keyOf(r)].count} {groupTotals[keyOf(r)].count === 1 ? 'gallery' : 'galleries'} · {formatBytes(groupTotals[keyOf(r)].bytes)}</span>
                      </li>
                    )}
                    <li className="flex flex-wrap items-center gap-3 py-3">
                      <Link href={`/galleries/${r.gallery_id}`} className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{r.title}</p>
                        <p className="text-xs text-ink-soft">
                          {r.photos} photo{r.photos === 1 ? '' : 's'} · {r.status === 'published' ? 'Published' : 'Draft'} · {new Date(r.created_at).toLocaleDateString()}
                        </p>
                      </Link>
                      <span className="text-sm font-medium text-ink">{formatBytes(r.bytes)}</span>
                      <button
                        onClick={() => download(r)}
                        disabled={dl !== null || busy === r.gallery_id || r.photos === 0}
                        className="text-xs text-twilight underline disabled:opacity-50"
                      >
                        {dl?.id === r.gallery_id ? `Zipping ${dl.done}/${dl.total || '…'}` : 'Download'}
                      </button>
                      <button
                        onClick={() => remove(r)}
                        disabled={busy === r.gallery_id}
                        className="text-xs text-red-600 underline disabled:opacity-50"
                      >
                        {busy === r.gallery_id ? 'Deleting…' : 'Delete'}
                      </button>
                    </li>
                    </Fragment>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
