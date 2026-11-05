'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

type Row = {
  id: string
  slug: string
  name: string
  style: string
  content: Record<string, unknown> | null
  cta_label: string
  cta_url: string | null
  published: boolean
}

type Form = {
  id: string
  slug: string
  style: string
  name: string
  published: boolean
  cta_label: string
  cta_url: string
  text: Record<string, string>
  steps: { title: string; body: string }[]
  items: { title: string; value: string }[]
}

const ALL = ['miller', 'hormozi', 'brunson', 'priestley']
const STYLES = [
  { id: 'miller', label: 'Donald Miller' },
  { id: 'hormozi', label: 'Alex Hormozi' },
  { id: 'brunson', label: 'Russell Brunson' },
  { id: 'priestley', label: 'Daniel Priestley' },
]

const TEXT_FIELDS: { key: string; label: string; area?: boolean; styles: string[] }[] = [
  { key: 'hero_headline', label: 'Headline (top of the page)', styles: ALL },
  { key: 'hero_sub', label: 'Line under the headline', area: true, styles: ALL },
  { key: 'image_url', label: 'Picture link (optional)', styles: ALL },
  { key: 'problem_title', label: 'The problem: title', styles: ['miller'] },
  { key: 'problem_body', label: 'The problem: words', area: true, styles: ['miller'] },
  { key: 'guide_title', label: 'You as the guide: title', styles: ['miller'] },
  { key: 'guide_body', label: 'You as the guide: words', area: true, styles: ['miller'] },
  { key: 'stakes_title', label: 'The stakes: title', styles: ['miller'] },
  { key: 'stakes_body', label: 'The stakes: words', area: true, styles: ['miller'] },
  { key: 'stack_total', label: 'Line under the list (total value)', styles: ['hormozi', 'brunson'] },
  { key: 'guarantee_title', label: 'Risk reversal: title', styles: ['hormozi'] },
  { key: 'guarantee_body', label: 'Risk reversal: words', area: true, styles: ['hormozi'] },
  { key: 'story_title', label: 'The story: title', styles: ['brunson'] },
  { key: 'story_body', label: 'The story: words', area: true, styles: ['brunson'] },
  { key: 'ps', label: 'P.S. at the bottom', area: true, styles: ['brunson'] },
  { key: 'for_body', label: 'Who this is for', area: true, styles: ['priestley'] },
  { key: 'not_for_body', label: 'Who this is NOT for', area: true, styles: ['priestley'] },
  { key: 'proof_title', label: 'Proof: title (optional)', styles: ['priestley'] },
  { key: 'proof_body', label: 'Proof: words (leave empty to hide)', area: true, styles: ['priestley'] },
  { key: 'scarcity_title', label: 'Limited spots: title (optional)', styles: ['hormozi', 'priestley'] },
  { key: 'scarcity_body', label: 'Limited spots: words (leave empty to hide)', area: true, styles: ['hormozi', 'priestley'] },
]

function toForm(r: Row | null): Form {
  const c = (r?.content ?? {}) as Record<string, unknown>
  const text: Record<string, string> = {}
  TEXT_FIELDS.forEach((f) => { text[f.key] = String(c[f.key] ?? '') })
  const src = Array.isArray(c.steps) ? (c.steps as { title?: string; body?: string }[]) : []
  const steps = [0, 1, 2].map((i) => ({ title: String(src[i]?.title ?? ''), body: String(src[i]?.body ?? '') }))
  const srcItems = Array.isArray(c.items) ? (c.items as { title?: string; value?: string }[]) : []
  const items = [0, 1, 2, 3, 4].map((i) => ({ title: String(srcItems[i]?.title ?? ''), value: String(srcItems[i]?.value ?? '') }))
  return {
    id: r?.id ?? '',
    slug: r?.slug ?? '',
    style: r?.style ?? 'miller',
    name: r?.name ?? 'New page',
    published: r?.published ?? false,
    cta_label: r?.cta_label ?? 'Get the app',
    cta_url: r?.cta_url ?? '',
    text,
    steps,
    items,
  }
}

function toContent(f: Form) {
  const content: Record<string, unknown> = {}
  TEXT_FIELDS.forEach((t) => { if (f.text[t.key].trim()) content[t.key] = f.text[t.key].trim() })
  if (f.steps.some((s) => s.title.trim() || s.body.trim())) content.steps = f.steps
  const items = f.items.filter((i) => i.title.trim())
  if (items.length) content.items = items
  return content
}

const slugify = (v: string) => v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '').slice(0, 60)

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase!.auth.getSession()
  const res = await fetch('/api/admin/funnel-pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({ action, ...payload }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

const inputCls = 'mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink outline-none focus:border-twilight'

export default function AdminPagesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [pages, setPages] = useState<Row[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)

  const load = useCallback(async () => {
    try {
      const { pages: rows } = await call('list')
      setPages(rows as Row[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load pages')
    }
  }, [])

  useEffect(() => {
    async function check() {
      if (!supabase) { setReady(true); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/admin/login'); return }
      setReady(true)
      load()
    }
    check()
  }, [router, load])

  async function save() {
    if (!form) return
    setSaving(true)
    try {
      const { page: saved } = await call('save', {
        page: {
          id: form.id || undefined,
          slug: form.slug,
          name: form.name,
          style: form.style,
          cta_label: form.cta_label,
          cta_url: form.cta_url.trim() || null,
          published: form.published,
          content: toContent(form),
        },
      })
      setError(null)
      setForm(toForm(saved as Row))
      setPreviewKey((k) => k + 1)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this page for good?')) return
    try {
      await call('delete', { id })
      setForm(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
    }
  }

  if (!ready) return null

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-fraunces text-3xl font-semibold text-ink">Funnels</h1>
          <p className="mt-1 text-sm text-ink-soft">One-page funnels you send ad traffic to. Each lives at camrhia.com/go/its-address.</p>
        </div>
        <button type="button" onClick={() => setForm(toForm(null))} className="rounded-full bg-twilight px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">+ New funnel</button>
      </div>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      {form && (
        <section className="mt-8 rounded-2xl border border-line bg-card p-8">
          <p className="text-sm font-medium text-ink">Style</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STYLES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setForm({ ...form, style: st.id })}
                className={`rounded-full border px-4 py-1.5 text-sm transition ${form.style === st.id ? 'border-twilight bg-twilight/10 text-twilight' : 'border-line text-ink-soft hover:border-twilight'}`}
              >
                {st.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-ink">Name (just for you)</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Address: camrhia.com/go/…</span>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="miller" className={inputCls} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Button words</span>
              <input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} className={inputCls} />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-ink">Button link (where it goes)</span>
              <input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="https://apps.apple.com/app/id6800011162?ct=miller&mt=8" className={inputCls} />
            </label>
          </div>

          <p className="mt-6 text-sm text-ink-soft">Leave any box empty and the page uses its default Camrhia words.</p>

          <div className="mt-4 grid gap-4">
            {TEXT_FIELDS.filter((f) => f.styles.includes(form.style)).map((f) => (
              <label key={f.key} className="block">
                <span className="text-sm font-medium text-ink">{f.label}</span>
                {f.area ? (
                  <textarea rows={3} value={form.text[f.key]} onChange={(e) => setForm({ ...form, text: { ...form.text, [f.key]: e.target.value } })} className={inputCls} />
                ) : (
                  <input value={form.text[f.key]} onChange={(e) => setForm({ ...form, text: { ...form.text, [f.key]: e.target.value } })} className={inputCls} />
                )}
              </label>
            ))}
          </div>

          {(form.style === 'hormozi' || form.style === 'brunson') && (
            <>
              <p className="mt-6 text-sm font-medium text-ink">What they get (up to 5 lines, value is optional)</p>
              <div className="mt-2 grid gap-3">
                {form.items.map((it, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr]">
                    <input value={it.title} placeholder={`Item ${i + 1}`} onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={inputCls} />
                    <input value={it.value} placeholder="Value, like $29/mo" onChange={(e) => setForm({ ...form, items: form.items.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} className={inputCls} />
                  </div>
                ))}
              </div>
            </>
          )}

          {form.style !== 'hormozi' && (
          <>
          <p className="mt-6 text-sm font-medium text-ink">The three steps</p>
          <div className="mt-2 grid gap-3">
            {form.steps.map((st, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                <input value={st.title} placeholder={`Step ${i + 1} title`} onChange={(e) => setForm({ ...form, steps: form.steps.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={inputCls} />
                <input value={st.body} placeholder={`Step ${i + 1} words`} onChange={(e) => setForm({ ...form, steps: form.steps.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} className={inputCls} />
              </div>
            ))}
          </div>
          </>
          )}

          <label className="mt-6 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} className="accent-twilight" />
            Published (visible to anyone with the link)
          </label>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={save} disabled={saving} className="rounded-full bg-twilight px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{saving ? 'Saving…' : 'Save page'}</button>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-ink-soft underline">Cancel</button>
            {form.id && <button type="button" onClick={() => remove(form.id)} className="ml-auto text-xs text-ink-soft underline hover:text-red-700">Delete page</button>}
          </div>
        </section>
      )}

      {form && form.id && (
        <section className="mt-8 rounded-2xl border border-line bg-card p-8">
          <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Live preview</p>
          <p className="mt-2 text-sm text-ink-soft">The saved version at phone size. {form.published ? 'Press Save to refresh it.' : 'This funnel is a draft. Tick Published and save to see it here.'}</p>
          <div className="mt-4 flex justify-center">
            <iframe key={previewKey} src={`/go/${form.slug}?v=${previewKey}`} title="Preview" className="h-[720px] w-[390px] max-w-full rounded-2xl border border-line bg-paper" />
          </div>
        </section>
      )}

      <section className="mt-8 rounded-2xl border border-line bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-soft/60">Your funnels</p>
        {pages.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No pages yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {pages.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-fraunces text-xl font-semibold text-ink">{p.name}</p>
                  <p className="text-sm text-ink-soft">/go/{p.slug}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${p.published ? 'bg-sage/15 text-sage' : 'bg-line text-ink-soft'}`}>{p.published ? 'Published' : 'Draft'}</span>
                <a href={`/go/${p.slug}`} target="_blank" rel="noreferrer" className="text-sm text-twilight underline">View</a>
                <button type="button" onClick={() => setForm(toForm(p))} className="rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-twilight">Edit</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
