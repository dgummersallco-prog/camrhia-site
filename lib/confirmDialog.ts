export function confirmDialog(message: string, confirmLabel?: string): Promise<boolean> {
  if (typeof document === 'undefined') return Promise.resolve(false)
  return new Promise((resolve) => {
    const danger = /^(delete|remove)/i.test(message)
    const label = confirmLabel ?? (/^delete/i.test(message) ? 'Delete' : /^remove/i.test(message) ? 'Remove' : /^approve/i.test(message) ? 'Approve' : 'Confirm')
    const accent = danger ? '#8f3f3f' : '#8a6a43'

    const wrap = document.createElement('div')
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(40,30,28,.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)'
    const card = document.createElement('div')
    card.style.cssText = 'width:100%;max-width:420px;background:#fffaf4;color:#3a2c28;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:28px 28px 22px;box-shadow:0 24px 60px rgba(40,30,28,.28);font-size:15px;line-height:1.55;white-space:pre-line'
    card.textContent = message
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:22px'

    const mk = (text: string, primary: boolean) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = text
      b.style.cssText = 'cursor:pointer;border-radius:999px;padding:10px 22px;font-size:14px;font-family:inherit;' + (primary ? `border:1px solid ${accent};background:${accent};color:#fff` : 'border:1px solid rgba(0,0,0,.14);background:transparent;color:#3a2c28')
      return b
    }
    const cancel = mk('Cancel', false)
    const ok = mk(label, true)

    const done = (v: boolean) => {
      document.removeEventListener('keydown', onKey, true)
      wrap.remove()
      resolve(v)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); done(false) }
      else if (e.key === 'Enter') { e.preventDefault(); done(true) }
    }
    cancel.onclick = () => done(false)
    ok.onclick = () => done(true)
    wrap.onclick = (e) => { if (e.target === wrap) done(false) }

    row.append(cancel, ok)
    card.append(row)
    wrap.append(card)
    document.body.append(wrap)
    document.addEventListener('keydown', onKey, true)
    ok.focus()
  })
}
