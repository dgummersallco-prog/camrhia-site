'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { makeVersions } from '@/lib/galleryImages'
import { GallerySidebar } from '@/app/components/GallerySidebar'

type Ph = { id: string; storage_path: string; section: string }

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/portfolio/`
const btn = 'rounded-xl bg-twilight px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50'

const SECTIONS = [
  { key: 'hero', label: 'Hero photos', hint: 'The big photos at the top of your site.' },
  { key: 'about', label: 'About photos', hint: 'Photos of you for your about page.' },
  { key: 'testimonials', label: 'Testimonial photos', hint: 'Photos of happy clients to go with their words.' },
]
const OTHER = { key: 'other', label: 'Other photos', hint: 'Photos you added before sections existed.' }

export default function WebsitePhotos() {
  const router = useRouter()
  const [uid, setUid] = useState<string | null>(null)
  const [photos, setPhotos] = useState<Ph[] | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const target = useRef('hero')

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: s } = await sb.auth.getSession()
    if (!s.session) { router.replace('/login?next=/galleries/photos'); return }
    setUid(s.session.user.id)
    const { data } = await sb.from('website_library').select('id, storage_path, section').eq('photographer_id', s.session.user.id).order('created_at', { ascending: false })
    setPhotos((data ?? []) as Ph[])
  }, [router])

  useEffect(() => { load() }, [load])

  async function upload(files: FileList | null) {
    const sb = supabase
    if (!sb || !uid || !files || files.length === 0) return
    const section = target.current
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
    if (list.length === 0) { setMsg('Please choose image files.'); return }
    let done = 0
    let failed = 0
    const queue = list.map((file, i) => ({ file, i }))
    setProgress(`Uploading 0 of ${list.length}…`)
    const worker = async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
        try {
          const v = await makeVersions(item.file)
          const path = `${uid}/lib_${Date.now()}_${item.i}.jpg`
          const up = await sb.storage.from('portfolio').upload(path, v.web.blob, { contentType: 'image/jpeg', upsert: true })
          if (up.error) throw up.error
          const { error } = await sb.from('website_library').insert({ photographer_id: uid, storage_path: path, section })
          if (error) { await sb.storage.from('portfolio').remove([path]); throw error }
        } catch {
          failed++
        }
        done++
        setProgress(`Uploading ${done} of ${list.length}…`)
      }
    }
    await Promise.all([worker(), worker(), worker()])
    setProgress(null)
    setMsg(failed ? `${failed} photo${failed === 1 ? '' : 's'} could not be uploaded.` : 'Photos added.')
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  async function remove(p: Ph) {
    const sb = supabase
    if (!sb) return
    if (!window.confirm('Remove this photo from your website photos?')) return
    await sb.storage.from('portfolio').remove([p.storage_path])
    await sb.from('website_library').delete().eq('id', p.id)
    load()
  }

  const hasOther = (photos ?? []).some((p) => p.section === 'other')
  const sections = hasOther ? [...SECTIONS, OTHER] : SECTIONS

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <GallerySidebar active="photos" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-brass">Website</p>
        <h1 className="mb-2 font-fraunces text-3xl font-semibold text-ink">Website photos</h1>
        <p className="mb-6 text-sm text-ink-soft">Photos for specific spots on your site, like your hero, about page, and testimonials. Add them to a section here, then choose from it when you design your site. We will crop each one to fit the space.</p>

        <input ref={fileRef} type="file" multiple accept="image/*,.heic,.heif" className="hidden" onChange={(e) => upload(e.target.files)} />
        {(progress || msg) && <p className="mb-4 text-sm text-ink-soft">{progress ?? msg}</p>}

        {photos === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : (
          <div className="space-y-8">
            {sections.map((sec) => {
              const list = photos.filter((p) => p.section === sec.key)
              return (
                <section key={sec.key}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-fraunces text-xl text-ink">{sec.label} <span className="text-sm font-normal text-ink-soft">({list.length})</span></h2>
                      <p className="text-xs text-ink-soft">{sec.hint}</p>
                    </div>
                    {sec.key !== 'other' && (
                      <button type="button" className={btn} disabled={!!progress} onClick={() => { target.current = sec.key; fileRef.current?.click() }}>Add photos</button>
                    )}
                  </div>
                  {list.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-card p-5"><p className="text-sm text-ink-soft">No photos yet.</p></div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {list.map((p) => (
                        <div key={p.id} className="group relative overflow-hidden rounded-xl border border-line bg-card">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={BASE + p.storage_path} alt="" className="aspect-[4/5] w-full object-cover" />
                          <button type="button" onClick={() => remove(p)} aria-label="Remove" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 shadow transition group-hover:opacity-100">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
