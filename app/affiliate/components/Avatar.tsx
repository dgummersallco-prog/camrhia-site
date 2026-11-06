'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

const ROSE = '#A9545F'

export function Avatar({ url, name, size = 36 }: { url?: string | null; name?: string | null; size?: number }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white" style={{ width: size, height: size, backgroundColor: ROSE, fontSize: size * 0.42 }}>
      {initial}
    </span>
  )
}

export function AvatarPicker({
  client, uid, url, name, size = 56, onDone,
}: {
  client: SupabaseClient | null
  uid: string
  url?: string | null
  name?: string | null
  size?: number
  onDone: (url: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function pick(file: File | undefined) {
    if (!file || !client) return
    if (!file.type.startsWith('image/')) { setErr('Pick an image.'); return }
    if (file.size > 5 * 1024 * 1024) { setErr('That image is over 5 MB.'); return }
    setBusy(true)
    setErr(null)
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const path = `${uid}/avatar-${Date.now()}.${ext}`
    const up = await client.storage.from('hub-posts').upload(path, file, { contentType: file.type })
    if (up.error) { setBusy(false); setErr(up.error.message); return }
    const publicUrl = client.storage.from('hub-posts').getPublicUrl(path).data.publicUrl
    const { error } = await client.rpc('hub_set_avatar', { p_url: publicUrl })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onDone(publicUrl)
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar url={url} name={name} size={size} />
      <div>
        <label className="cursor-pointer text-sm font-semibold" style={{ color: ROSE }}>
          {busy ? 'Uploading…' : url ? 'Change photo' : 'Add a photo'}
          <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        {err && <p className="text-xs text-red-700">{err}</p>}
      </div>
    </div>
  )
}
