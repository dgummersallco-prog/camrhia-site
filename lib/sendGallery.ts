import type { SupabaseClient } from '@supabase/supabase-js'

function localDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Links a published gallery to the client's session and notifies the client's app (first send only).
// Returns an error message, or null on success.
export async function sendGalleryToClient(
  sb: SupabaseClient,
  o: { weddingId: string; coupleUserId?: string | null; token: string; expiresAt: string | null; pin: string; alreadySent: boolean },
): Promise<string | null> {
  const now = new Date().toISOString()
  const { error } = await sb
    .from('weddings')
    .update({
      gallery_url: `${window.location.origin}/g/${o.token}`,
      gallery_source: 'link',
      gallery_password: o.pin || null,
      gallery_expires_at: o.expiresAt ? localDate(o.expiresAt) : null,
      delivered: true,
      gallery_delivered_at: now,
      gallery_sent_at: now,
    })
    .eq('id', o.weddingId)
  if (error) return error.message
  if (o.coupleUserId && !o.alreadySent) {
    await sb.from('notifications').insert({
      user_id: o.coupleUserId,
      type: 'gallery_ready',
      title: 'Your gallery is ready',
      body: 'Your photographer shared your gallery. Tap to view your photos.',
      wedding_id: o.weddingId,
    })
  }
  return null
}
