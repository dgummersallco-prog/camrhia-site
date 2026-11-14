const KEYS = ['menu_links', 'menu_brand', 'ex_label', 'ex_title', 'ex_sub', 'con_msg', 'con_social', 'ft_line', 'ft_copy', 'gal_name', 'gal_count', 'gal_link', 'tes_quote', 'tes_name', 'about_text', 'pr_intro', 'pr_group', 'pr_name', 'pr_price', 'pr_list', 'pr_note', 'faq_q', 'faq_a']

const LABELS: Record<string, string> = { hero_headline: 'Headline', menu_links: 'Menu links', menu_brand: 'Your name', ex_label: 'Section label', ex_title: 'Section title', ex_sub: 'Section subtitle', con_msg: 'Contact message', con_social: 'Social links', ft_line: 'Footer line', ft_copy: 'Copyright', gal_name: 'Gallery name', gal_count: 'Gallery count', gal_link: 'Gallery link', tes_quote: 'Testimonial', tes_name: 'Testimonial name', about_text: 'About text', pr_intro: 'Package intro', pr_group: 'Package group', pr_name: 'Package name', pr_price: 'Package price', pr_list: 'Package list', pr_note: 'Package note', faq_q: 'Question', faq_a: 'Answer' }

export function installPreviewPick(): () => void {
  if (typeof window === 'undefined') return () => {}
  if (new URLSearchParams(window.location.search).get('preview') !== '1') return () => {}

  const sel = KEYS.map((k) => '.el-' + k).join(',')
  const css = document.createElement('style')
  css.textContent = `${sel},h1{cursor:pointer}[data-name]{cursor:default}`
  document.head.appendChild(css)

  const box = document.createElement('div')
  box.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:1.5px dashed #d9a21b;border-radius:3px;display:none'
  const tag = document.createElement('div')
  tag.style.cssText = 'position:absolute;left:-1.5px;bottom:100%;margin-bottom:3px;background:#1f1a14;color:#fff;font:600 11px/1 system-ui,sans-serif;padding:4px 7px;border-radius:4px;white-space:nowrap'
  box.appendChild(tag)
  document.body.appendChild(box)

  const nameOf = (t: HTMLElement): { el: HTMLElement; name: string; editable: boolean } | null => {
    const el = t.closest(sel + ',[data-name],h1') as HTMLElement | null
    if (!el) return null
    for (const k of KEYS) if (el.classList.contains('el-' + k)) return { el, name: LABELS[k], editable: true }
    if (el.tagName === 'H1') return { el, name: 'Headline', editable: true }
    const dn = el.getAttribute('data-name')
    return dn ? { el, name: dn, editable: false } : null
  }

  const onOver = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null
    const hit = t ? nameOf(t) : null
    if (!hit) { box.style.display = 'none'; return }
    const r = hit.el.getBoundingClientRect()
    box.style.display = 'block'
    box.style.left = r.left + 'px'
    box.style.top = r.top + 'px'
    box.style.width = r.width + 'px'
    box.style.height = r.height + 'px'
    tag.textContent = hit.name + (hit.editable ? ' · click to edit' : '')
    tag.style.bottom = r.top < 28 ? 'auto' : '100%'
    tag.style.top = r.top < 28 ? '100%' : 'auto'
    tag.style.marginTop = r.top < 28 ? '3px' : '0'
  }
  const hide = () => { box.style.display = 'none' }

  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null
    if (!t || !t.closest) return
    const hit = nameOf(t)
    if (!hit || !hit.editable) return
    const el = hit.el
    let key: string | null = el.tagName === 'H1' && !KEYS.some((k) => el.classList.contains('el-' + k)) ? 'hero_headline' : null
    if (!key) for (const k of KEYS) if (el.classList.contains('el-' + k)) { key = k; break }
    if (!key) return
    e.preventDefault()
    e.stopPropagation()
    const r = el.getBoundingClientRect()
    window.parent?.postMessage({ type: 'camrhia-pick', key, text: (el.textContent ?? '').trim(), x: r.left, y: r.top, w: r.width, h: r.height, color: getComputedStyle(el).color }, '*')
  }

  document.addEventListener('mouseover', onOver, true)
  document.addEventListener('scroll', hide, true)
  document.addEventListener('click', onClick, true)
  return () => {
    document.removeEventListener('mouseover', onOver, true)
    document.removeEventListener('scroll', hide, true)
    document.removeEventListener('click', onClick, true)
    css.remove()
    box.remove()
  }
}
