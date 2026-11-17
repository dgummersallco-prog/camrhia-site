'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GallerySidebar } from '@/app/components/GallerySidebar'

type Review = {
  id: string
  rating: number
  body: string | null
  reviewer_name: string | null
  approved: boolean
  created_at: string
  galleries: { title: string } | null
}

export default function ReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[] | null>(null)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb) return
    const { data: sess } = await sb.auth.getSession()
    if (!sess.session) { router.replace('/login?next=/galleries/reviews'); return }
    const { data } = await sb
      .from('gallery_reviews')
      .select('id, rating, body, reviewer_name, approved, created_at, galleries(title)')
      .eq('photographer_id', sess.session.user.id)
      .order('created_at', { ascending: false })
    setReviews((data ?? []) as unknown as Review[])
  }, [router])
  useEffect(() => { load() }, [load])

  async function toggle(r: Review) {
    if (!supabase) return
    const next = !r.approved
    setReviews((list) => (list ?? []).map((x) => (x.id === r.id ? { ...x, approved: next } : x)))
    await supabase.from('gallery_reviews').update({ approved: next }).eq('id', r.id)
  }

  return (
    <div className="min-h-screen bg-paper xl:pl-60">
      <GallerySidebar active="reviews" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-fraunces text-3xl font-semibold text-ink">Reviews</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-soft">
          Clients can leave a review at the bottom of their gallery. Approve the ones you want to show on your website. Nothing appears until you approve it.
        </p>

        <div className="mt-6 space-y-3">
          {reviews === null && <p className="text-sm text-ink-soft">Loading…</p>}
          {reviews && reviews.length === 0 && (
            <p className="rounded-2xl border border-line bg-card p-5 text-sm text-ink-soft">No reviews yet. They will show up here after a client leaves one.</p>
          )}
          {reviews?.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg leading-none text-twilight">
                    {'★'.repeat(r.rating)}<span className="text-ink-soft/30">{'★'.repeat(5 - r.rating)}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {r.reviewer_name || 'A client'}{r.galleries?.title ? ` · ${r.galleries.title}` : ''} · {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  className={r.approved
                    ? 'rounded-xl bg-twilight px-4 py-2 text-sm font-medium text-white transition hover:opacity-90'
                    : 'rounded-xl border border-line px-4 py-2 text-sm text-ink transition hover:border-twilight'}
                >
                  {r.approved ? 'Approved ✓' : 'Approve'}
                </button>
              </div>
              {r.body && <p className="mt-3 text-sm text-ink">{r.body}</p>}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
