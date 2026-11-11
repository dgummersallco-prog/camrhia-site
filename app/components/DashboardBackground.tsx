'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BG_PRESETS, applyDashBg } from '@/lib/dashBg'

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * scale)
  c.height = Math.round(bmp.height * scale)
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read that image.'))), 'image/jpeg', 0.85))
}

export function DashboardBackground() {
  const [value, setValue] = useState('golden')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const sb = supabase
      if (!sb) return
      const { data } = await sb.auth.getSession()
      if (!data.session) return
      const { data: pr } = await sb.from('profiles').select('dash_bg').eq('id', data.session.user.id).maybeSingle()
      setValue((pr as { dash_bg?: string | null } | null)?.dash_bg ?? 'golden')
    })().catch(() => {})
  }, [])

  async function save(v: string) {
    const sb = supabase
    if (!sb) return
    const { data } = await sb.auth.getSession()
    const id = data.session?.user.id
    if (!id) return
    const { error } = await sb.from('profiles').update({ dash_bg: v }).eq('id', id)
    if (error) { setMsg(error.message); return }
    setValue(v)
    applyDashBg(v === 'golden' ? null : v, sb)
    setMsg(null)
  }

  async function upload(file: File) {
    const sb = supabase
    if (!sb) return
    setBusy(true)
    setMsg(null)
    try {
      const { data } = await sb.auth.getSession()
      const id = data.session?.user.id
      if (!id) return
      const blob = await shrink(file)
      const path = `${id}/dashbg_${Date.now()}.jpg`
      const up = await sb.storage.from('portfolio').upload(path, blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      await save(path)
    } catch (e) {
      setMsg((e as { message?: string })?.message ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  const isPhoto = !BG_PRESETS.some((p) => p.id === value)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {BG_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => save(p.id)}
            className={`w-28 overflow-hidden rounded-xl border text-left text-xs ${value === p.id ? 'border-twilight ring-2 ring-twilight/30' : 'border-line'}`}
          >
            <span className="block h-16" style={{ background: p.preview }} />
            <span className="block px-2 py-1.5 text-ink">{p.label}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:bg-paper-deep">
          {busy ? 'Uploading…' : isPhoto ? 'Replace my photo' : 'Upload my own photo'}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
        </label>
        {isPhoto && <button type="button" onClick={() => save('golden')} className="text-sm text-ink-soft underline hover:text-ink">Use the default</button>}
      </div>
      {msg && <p className="text-sm text-red-700">{msg}</p>}
    </>
  )
}
