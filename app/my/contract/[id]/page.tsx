'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ClientHeader } from '@/app/components/ClientHeader'

type Contract = {
  id: string; status: string; body: string | null
  sent_at: string | null; signed_at: string | null
  signer_name: string | null; signature_style: string | null
  photographer_signature_name: string | null; photographer_signed_at: string | null
}

const STYLES: { key: string; label: string; family: string }[] = [
  { key: 'DancingScript', label: 'Dancing Script', family: "'Dancing Script', cursive" },
  { key: 'GreatVibes', label: 'Great Vibes', family: "'Great Vibes', cursive" },
  { key: 'Sacramento', label: 'Sacramento', family: "'Sacramento', cursive" },
  { key: 'AlexBrush', label: 'Alex Brush', family: "'Alex Brush', cursive" },
]
const familyFor = (k: string | null) => STYLES.find((s) => s.key === k)?.family ?? STYLES[0].family
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '')

export default function ClientContractPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [ready, setReady] = useState(false)
  const [name, setName] = useState('')
  const [style, setStyle] = useState('DancingScript')
  const [agree, setAgree] = useState(false)
  const [signing, setSigning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const sb = supabase
      if (!sb) return
      const { data: sess } = await sb.auth.getSession()
      if (!sess.session) { router.replace(`/login?next=/my/contract/${id}`); return }
      const { data } = await sb
        .from('contracts')
        .select('id, status, body, sent_at, signed_at, signer_name, signature_style, photographer_signature_name, photographer_signed_at')
        .eq('wedding_id', id)
        .maybeSingle()
      setContract((data as Contract | null) ?? null)
      setReady(true)
    }
    load()
  }, [id, router])

  async function sign() {
    const sb = supabase
    if (!sb || !name.trim() || !agree || signing) return
    setSigning(true)
    setError(null)
    const { error: e } = await sb.rpc('sign_contract', { p_wedding_id: id, p_signer_name: name.trim(), p_signature_style: style })
    setSigning(false)
    if (e) { setError(e.message); return }
    setContract((c) => (c ? { ...c, status: 'signed', signed_at: new Date().toISOString(), signer_name: name.trim(), signature_style: style } : c))
  }

  const visible = contract && (contract.status === 'sent' || contract.status === 'signed')
  const signed = contract?.status === 'signed'

  return (
    <div className="min-h-screen bg-paper lg:pl-60 print:pl-0">
      <div className="print:hidden"><ClientHeader active="sessions" /></div>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Dancing+Script&family=Great+Vibes&family=Sacramento&display=swap" />
      <header className="border-b border-line bg-card print:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4">
          <a href="/my" className="text-sm text-ink-soft underline hover:text-ink">Back</a>
          <h1 className="font-fraunces text-lg font-semibold text-ink">Contract</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {!ready ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : !visible ? (
          <p className="rounded-2xl border border-line bg-card p-6 text-ink-soft">Your photographer has not sent the contract yet. You will get a notification when it is ready.</p>
        ) : (
          <>
            <article className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-card p-6 text-sm leading-relaxed text-ink print:max-h-none print:overflow-visible">
              {contract!.body}
            </article>

            {contract!.photographer_signature_name && (
              <section className="mt-6 rounded-2xl border border-line bg-card p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-brass">Photographer signature</p>
                <p className="mt-3 text-4xl text-ink" style={{ fontFamily: familyFor('DancingScript') }}>{contract!.photographer_signature_name}</p>
                <p className="mt-2 text-sm text-ink-soft">{fmt(contract!.photographer_signed_at ?? contract!.sent_at)}</p>
              </section>
            )}

            {signed ? (
              <section className="mt-6 rounded-2xl border border-line bg-card p-6">
                <p className="font-mono text-xs uppercase tracking-widest text-brass">Your signature</p>
                <p className="mt-3 text-4xl text-ink" style={{ fontFamily: familyFor(contract!.signature_style) }}>{contract!.signer_name}</p>
                <p className="mt-2 text-sm text-ink-soft">{fmt(contract!.signed_at)}</p>
                <button onClick={() => window.print()} className="mt-4 rounded-full border border-line px-5 py-2 text-sm font-semibold text-ink hover:bg-paper-deep print:hidden">
                  Print or save as PDF
                </button>
              </section>
            ) : (
              <section className="mt-6 rounded-2xl border border-line bg-card p-6">
                <h2 className="font-fraunces text-lg font-semibold text-ink">Sign your contract</h2>
                <label className="mt-4 block text-sm text-ink-soft">Type your full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-ink focus:border-twilight focus:outline-none focus:ring-2 focus:ring-twilight/25"
                />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setStyle(s.key)}
                      className={`rounded-xl border px-3 py-3 text-2xl text-ink ${style === s.key ? 'border-twilight bg-twilight/5 ring-2 ring-twilight/25' : 'border-line'}`}
                      style={{ fontFamily: s.family }}
                    >
                      {name.trim() || 'Your name'}
                    </button>
                  ))}
                </div>
                <label className="mt-4 flex items-start gap-3 text-sm text-ink">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5" />
                  I have read this contract and agree to its terms.
                </label>
                {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                <button
                  onClick={sign}
                  disabled={!name.trim() || !agree || signing}
                  className="mt-5 rounded-full bg-twilight px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {signing ? 'Signing…' : 'Sign contract'}
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
