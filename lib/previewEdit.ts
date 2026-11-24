// Type straight on the preview: click a text or button, it becomes editable in place.
// Only used inside the designer preview (?preview=1).

export type EditMeta =
  | { kind: 'key'; key: string }
  | { kind: 'btn'; tx: string }
  | { kind: 'nav'; nav: string }
  | { kind: 'ex'; field: 'title' | 'sub'; door: string }
  | { kind: 'exlabel' }
  | { kind: 'faq' }

const DENY = ['gal_name', 'gal_count', 'gal_link', 'tes_quote', 'tes_name', 'pr_intro', 'pr_group', 'pr_name', 'pr_price', 'pr_list', 'pr_note', 'con_social', 'hero_btn']

export const editing = (t: EventTarget | null): boolean => {
  const el = t as HTMLElement | null
  return !!(el && el.closest && el.closest('[data-cam-ed]'))
}

const pathOf = (a: HTMLAnchorElement | null): string => {
  if (!a) return ''
  try { return new URL(a.getAttribute('href') || a.href, window.location.href).pathname } catch { return '' }
}
const doorOf = (a: HTMLAnchorElement | null): string | null => {
  const p = pathOf(a)
  if (/\/galleries\/?$/.test(p)) return 'galleries'
  if (/\/about\/?$/.test(p)) return 'about'
  if (/\/availability\/?$/.test(p)) return 'book'
  return null
}
const navOf = (a: HTMLAnchorElement | null): string | null => {
  if (!a) return null
  const p = pathOf(a)
  const d = doorOf(a)
  if (d) return d
  if (/\/blog\/?$/.test(p)) return 'blog'
  const m = /\/p\/([a-z0-9-]+)\/?$/.exec(p)
  if (m) return m[1]
  if (/^\/site\/[^/]+\/?$/.test(p) || p === '/' || p === '') return 'home'
  return null
}

export function metaFor(el: HTMLElement, key: string): EditMeta | null {
  if (DENY.includes(key)) return null
  if (key === 'faq_q' || key === 'faq_a') return { kind: 'faq' }
  if (key === 'menu_links') { const n = navOf(el.closest('a')); return n ? { kind: 'nav', nav: n } : null }
  if (key === 'ex_title' || key === 'ex_sub') { const d = doorOf(el.closest('a')); return d ? { kind: 'ex', field: key === 'ex_title' ? 'title' : 'sub', door: d } : null }
  if (key === 'ex_label') return { kind: 'exlabel' }
  return { kind: 'key', key }
}

let cur: HTMLElement | null = null

export function startEdit(el: HTMLElement, meta: EditMeta, x: number, y: number): boolean {
  if (el.dataset.camEd) return true
  if (cur && cur !== el) cur.blur()
  if (el.childNodes.length !== 1 || el.childNodes[0].nodeType !== 3) return false
  const node = el.childNodes[0] as Text
  const orig = node.nodeValue ?? ''
  if (!orig.trim()) return false
  const oOutline = el.style.outline
  const oOff = el.style.outlineOffset
  const oCur = el.style.cursor
  el.dataset.camEd = '1'
  try { el.contentEditable = 'plaintext-only' } catch { el.contentEditable = 'true' }
  if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true'
  el.style.outline = '2px solid #d9a21b'
  el.style.outlineOffset = '3px'
  el.style.cursor = 'text'
  cur = el
  let done = false
  const finish = (commit: boolean) => {
    if (done) return
    done = true
    el.removeEventListener('keydown', onKey)
    el.removeEventListener('keyup', onKeyUp)
    el.removeEventListener('paste', onPaste)
    el.removeEventListener('blur', onBlur)
    const txt = (el.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\r/g, '')
    el.removeAttribute('contenteditable')
    delete el.dataset.camEd
    el.style.outline = oOutline
    el.style.outlineOffset = oOff
    el.style.cursor = oCur
    const ok = commit && txt.trim() !== '' && txt.trim() !== orig.trim()
    node.nodeValue = ok ? txt.trim() : orig
    el.replaceChildren(node)
    if (cur === el) cur = null
    if (!ok) return
    const out: Record<string, unknown> = { type: 'camrhia-text', ...meta, text: txt.trim() }
    if (meta.kind === 'faq') {
      out.qs = Array.from(document.querySelectorAll('.el-faq_q')).map((n) => (n.textContent ?? '').trim())
      out.as = Array.from(document.querySelectorAll('.el-faq_a')).map((n) => (n.textContent ?? '').trim())
    }
    window.parent?.postMessage(out, '*')
  }
  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) document.execCommand('insertText', false, '\n')
      else el.blur()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      finish(false)
      el.blur()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => { e.stopPropagation(); if (e.key === ' ') e.preventDefault() }
  const onPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    const t = e.clipboardData?.getData('text/plain') ?? ''
    document.execCommand('insertText', false, t.replace(/\r?\n/g, ' '))
  }
  const onBlur = () => finish(true)
  el.addEventListener('keydown', onKey)
  el.addEventListener('keyup', onKeyUp)
  el.addEventListener('paste', onPaste)
  el.addEventListener('blur', onBlur)
  el.focus()
  try {
    const d = document as any
    let r: Range | null = null
    if (d.caretRangeFromPoint) r = d.caretRangeFromPoint(x, y)
    else if (d.caretPositionFromPoint) { const p = d.caretPositionFromPoint(x, y); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); r.collapse(true) } }
    const sel = window.getSelection()
    if (sel && r && el.contains(r.startContainer)) { sel.removeAllRanges(); sel.addRange(r) }
    else if (sel) { const rr = document.createRange(); rr.selectNodeContents(el); rr.collapse(false); sel.removeAllRanges(); sel.addRange(rr) }
  } catch { /* ignore */ }
  return true
}
