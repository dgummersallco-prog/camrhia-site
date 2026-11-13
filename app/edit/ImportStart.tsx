'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { isAccepted } from '@/lib/galleryUpload'
import { setPendingFiles } from '@/lib/editHandoff'

type Row = { id: string; title: string; status: string; created_at: string; gallery_photos: { count: number }[] }

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

const primary = 'rounded-full bg-[var(--color-twilight)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40'
const quiet = 'rounded-full border border-white/15 px-5 py-2.5 text-sm text-ink-soft transition hover:border-white/35 hover:text-ink disabled:opacity-40'

export default function ImportStart({ rows, userId, onOpen }: { rows: Row[] | null; userId: string | null; onOpen: (id: string) => void }) {
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const filesRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

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
    onOpen(data.id)
  }

  return (
    <div className="mt-8">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={async (e) => { e.preventDefault(); setDragging(false); void start(await filesFromDrop(e.dataTransfer)) }}
        className={`rounded-3xl border-2 border-dashed px-6 py-16 text-center transition ${dragging ? 'border-twilight bg-white/80' : 'border-white/70 bg-white/60'}`}
      >
        <p className="font-fraunces text-3xl text-ink">{busy ? 'Starting your shoot…' : 'Drop your shoot here'}</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
          JPEG, PNG, HEIC and RAW from any camera. A whole folder works too. We cull it, edit it and get it ready to send. You don&apos;t need a session yet.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className={primary} disabled={busy || !userId} onClick={() => folderRef.current?.click()}>Choose a folder</button>
          <button className={quiet} disabled={busy || !userId} onClick={() => filesRef.current?.click()}>Choose individual photos</button>
        </div>
        <input ref={filesRef} type="file" multiple hidden onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ''; void start(l) }} />
        <input ref={folderRef} type="file" multiple hidden {...({ webkitdirectory: '' } as object)} onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ''; void start(l) }} />
        {err && <p className="mt-5 text-sm text-red-700">{err}</p>}
      </div>

      {rows === null && <p className="mt-10 text-sm text-ink-soft">Loading…</p>}
      {rows && rows.length > 0 && (
        <>
          <p className="mt-12 font-fraunces text-xl text-ink">Pick up where you left off</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
              const count = r.gallery_photos?.[0]?.count ?? 0
              return (
                <button key={r.id} onClick={() => onOpen(r.id)} className="group rounded-2xl border border-white/70 bg-white/60 p-6 text-left transition hover:border-twilight">
                  <p className="font-fraunces text-xl text-ink">{r.title}</p>
                  <p className="mt-2 text-sm text-ink-soft">{count} {count === 1 ? 'photo' : 'photos'} · {r.status === 'published' ? 'Published' : 'Draft'}</p>
                  <p className="mt-6 text-sm text-twilight transition group-hover:translate-x-1">{count === 0 ? 'Start' : 'Open'} →</p>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
