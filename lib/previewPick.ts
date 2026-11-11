const KEYS = ['menu_links', 'menu_brand', 'ex_label', 'ex_title', 'ex_sub', 'con_msg', 'con_social', 'ft_line', 'ft_copy', 'gal_name', 'gal_count', 'gal_link', 'tes_quote', 'tes_name', 'about_text', 'pr_intro', 'pr_group', 'pr_name', 'pr_price', 'pr_list', 'pr_note', 'faq_q', 'faq_a']

export function installPreviewPick(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return () => {}

  const sel = KEYS.map((k) => '.el-' + k).join(',')
  const css = document.createElement('style')
  css.textContent = `${sel},h1{cursor:pointer}${sel.split(',').map((x) => x + ':hover').join(',')},h1:hover{outline:1px dashed #d9a21b;outline-offset:3px}`
  document.head.appendChild(css)

  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null
    if (!t || !t.closest) return
    let el = t.closest(sel) as HTMLElement | null
    let key: string | null = null
    if (el) {
      for (const k of KEYS) if (el.classList.contains('el-' + k)) { key = k; break }
    } else {
      const h = t.closest('h1') as HTMLElement | null
      if (h) { el = h; key = 'hero_headline' }
    }
    if (!el || !key) return
    e.preventDefault()
    e.stopPropagation()
    const r = el.getBoundingClientRect()
    window.parent?.postMessage({ type: 'camrhia-pick', key, text: (el.textContent ?? '').trim(), x: r.left, y: r.top, w: r.width, h: r.height, color: getComputedStyle(el).color }, '*')
  }
  document.addEventListener('click', onClick, true)
  return () => { document.removeEventListener('click', onClick, true); css.remove() }
}
