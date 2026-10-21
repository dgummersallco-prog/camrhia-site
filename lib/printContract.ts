import { signedHtml, FONT_HREF } from '@/lib/contractSign'

export type PrintRow = {
  body: string | null
  sent_at: string | null
  signed_at: string | null
  signer_name: string | null
  signature_style: string | null
  photographer_signature_name: string | null
  photographer_signature_style: string | null
  photographer_signed_at: string | null
}

const fmtLong = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '')
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function printSignedContract(c: PrintRow) {
  const w = window.open('', '_blank')
  if (!w) { window.alert('Allow pop-ups to print the contract.'); return }
  const css = 'body{font-family:Georgia,serif;color:#222;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.6;font-size:13px}pre{white-space:pre-wrap;font-family:inherit}.stamp{margin-top:28px;border:2px solid #a8803f;color:#a8803f;display:inline-block;padding:6px 14px;font-size:12px;letter-spacing:.14em;text-transform:uppercase}'
  const html = '<!doctype html><html><head><meta charset="utf-8"><title>Signed contract</title><link rel="stylesheet" href="' + FONT_HREF + '"><style>' + css + '</style></head><body><pre>' +
    signedHtml(
      c.body ?? '',
      { name: c.photographer_signature_name ?? '', style: c.photographer_signature_style, date: fmtLong(c.photographer_signed_at ?? c.sent_at) },
      { name: c.signer_name ?? '', style: c.signature_style, date: fmtLong(c.signed_at) },
      esc,
    ) + '</pre><div class="stamp">Fully signed ' + esc(fmtLong(c.signed_at)) + '</div></body></html>'
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 900)
}
