import { editing, metaFor, startEdit } from './previewEdit'
import { BTN_SEL, textAtPoint } from './photoFx'
const KEYS = ['ax1', 'ax2', 'ax3', 'ax4', 'ax5', 'ax6', 'ax7', 'ax8', 'ax9', 'ax10', 'ax11', 'ax12', 'ax13', 'ax14', 'ax15', 'ax16', 'blog_title', 'blog_intro', 'blog_ptitle', 'blog_excerpt', 'blog_date', 'blog_body', 'book_title', 'book_intro', 'book_step', 'book_faq', 'menu_links', 'menu_brand', 'ex_label', 'ex_title', 'ex_sub', 'con_msg', 'con_social', 'ft_line', 'ft_copy', 'gal_name', 'gal_count', 'gal_link', 'tes_quote', 'tes_name', 'about_text', 'pr_intro', 'pr_group', 'pr_name', 'pr_price', 'pr_list', 'pr_note', 'faq_q', 'faq_a', 'feat_title', 'hero_btn', 'air_label', 'air_more', 'ls_title', 'rom_kicker', 'rom_story', 'rom_more', 'ea_kicker', 'ea_para', 'ea_follow', 'pe_tag', 'iv_kicker', 'iv_tag', 'wi_hi', 'ju_kicker', 'ju_para', 'ju_s1t', 'ju_s1d', 'ju_s2t', 'ju_s2d', 'ju_s3t', 'ju_s3d', 'ca_sub', 'ca_bar', 'ca_w1', 'ca_w2', 'ca_w3', 'ca_w4', 'ce_p1', 'ce_p2', 'ol_kicker', 'ol_c1', 'ol_c2', 'ol_c3', 'ol_c4', 'mg_story', 'mg_text', 'li_kicker', 'li_para', 'li_meet', 'li_more', 'as_kicker', 'as_para', 'as_kind', 'as_q1', 'as_n1', 'as_q2', 'as_n2', 'as_q3', 'as_n3', 'sg_tag', 'sg_recent', 'ro_script', 'ro_c1', 'ro_c2', 'ro_c3', 'hz_kicker', 'hz_para', 'hz_quote', 'hz_name', 'sf_n1', 'sf_n2', 'sf_n3', 'sf_n4', 'sf_c1', 'sf_c2', 'sf_c3', 'cy_tag', 'cy_s1', 'cy_s2', 'cy_s3', 'la_vert', 'la_para', 'ir_l', 'ir_r', 'ir_issue', 'ir_t1', 'ir_t2', 'ir_t3', 'pr_kicker', 'pr_c1', 'pr_c2', 'pr_c3', 'pr_c4', 'th_tag', 'cl_p1', 'cl_p2', 'cl_p3', 'cl_p4', 'cl_p5', 'cl_sub', 'cl_t1', 'cl_t2', 'cl_t3', 'mi_t1', 'mi_t2', 'mi_t3', 'mi_t4', 'ya_script', 'ya_month', 'ya_calday', 'ya_caldate', 'ya_head', 'ya_para', 'ya_link', 'gs_title', 'gp_title', 'tes_title', 'faq_title', 'ab_h1', 'ab_h2', 'ab_h3', 'ab_p3', 'ab_by', 'ab_loves', 'ab_hi', 'ab_n1', 'ab_l1', 'ab_n2', 'ab_l2', 'ab_n3', 'ab_l3', 'ab_quote', 'ab_sig', 'ab_tag', 'ab_f1t', 'ab_f1d', 'ab_f2t', 'ab_f2d', 'ab_f3t', 'ab_f3d', 'ab_f4t', 'ab_f4d', 'ab_f5t', 'ab_f5d', 'soc_title', 'soc_handle', 'con_title']

const LABELS: Record<string, string> = { ax1: 'Your text', ax2: 'Your text', ax3: 'Your text', ax4: 'Your text', ax5: 'Your text', ax6: 'Your text', ax7: 'Your text', ax8: 'Your text', ax9: 'Your text', ax10: 'Your text', ax11: 'Your text', ax12: 'Your text', ax13: 'Your text', ax14: 'Your text', ax15: 'Your text', ax16: 'Your text', blog_title: 'Blog title', blog_intro: 'Blog intro', blog_ptitle: 'Post title', blog_excerpt: 'Post excerpt', blog_date: 'Post date', blog_body: 'Post text', book_title: 'Booking title', book_intro: 'Booking intro', book_step: 'Step label', book_faq: 'FAQ heading', hero_headline: 'Headline', menu_links: 'Menu links', menu_brand: 'Your name', ex_label: 'Section label', ex_title: 'Section title', ex_sub: 'Section subtitle', con_msg: 'Contact message', con_social: 'Social links', ft_line: 'Footer line', ft_copy: 'Copyright', gal_name: 'Gallery name', gal_count: 'Gallery count', gal_link: 'Gallery link', tes_quote: 'Testimonial', tes_name: 'Testimonial name', about_text: 'About text', pr_intro: 'Package intro', pr_group: 'Package group', pr_name: 'Package name', pr_price: 'Package price', pr_list: 'Package list', pr_note: 'Package note', faq_q: 'Question', faq_a: 'Answer', feat_title: 'Featured work title', hero_btn: 'Button text', air_label: 'About label', air_more: 'Link text', ls_title: 'Section title', rom_kicker: 'Small line', rom_story: 'Story title', rom_more: 'Link text', ea_kicker: 'Small line', ea_para: 'Paragraph', ea_follow: 'Section title', pe_tag: 'Tagline', iv_kicker: 'Small line', iv_tag: 'Tagline', wi_hi: 'About heading', ju_kicker: 'Small line', ju_para: 'Intro', ju_s1t: 'Service title', ju_s1d: 'Service text', ju_s2t: 'Service title', ju_s2d: 'Service text', ju_s3t: 'Service title', ju_s3d: 'Service text', ca_sub: 'Subtitle', ca_bar: 'Bar text', ca_w1: 'Word', ca_w2: 'Word', ca_w3: 'Word', ca_w4: 'Word', ce_p1: 'Paragraph', ce_p2: 'Paragraph', ol_kicker: 'Small line', ol_c1: 'Caption', ol_c2: 'Caption', ol_c3: 'Caption', ol_c4: 'Caption', mg_story: 'Heading', mg_text: 'Paragraph', li_kicker: 'Small line', li_para: 'Paragraph', li_meet: 'Heading', li_more: 'Link', as_kicker: 'Small line', as_para: 'Paragraph', as_kind: 'Heading', as_q1: 'Quote', as_n1: 'Name', as_q2: 'Quote', as_n2: 'Name', as_q3: 'Quote', as_n3: 'Name', sg_tag: 'Tagline', sg_recent: 'Heading', ro_script: 'Script word', ro_c1: 'Caption', ro_c2: 'Caption', ro_c3: 'Caption', hz_kicker: 'Small line', hz_para: 'Paragraph', hz_quote: 'Quote', hz_name: 'Name', sf_n1: 'Service', sf_n2: 'Service', sf_n3: 'Service', sf_n4: 'Service', sf_c1: 'Caption', sf_c2: 'Caption', sf_c3: 'Caption', cy_tag: 'Tagline', cy_s1: 'Label', cy_s2: 'Label', cy_s3: 'Label', la_vert: 'Side text', la_para: 'Paragraph', ir_l: 'Left words', ir_r: 'Right words', ir_issue: 'Heading', ir_t1: 'Label', ir_t2: 'Label', ir_t3: 'Label', pr_kicker: 'Small line', pr_c1: 'Caption', pr_c2: 'Caption', pr_c3: 'Caption', pr_c4: 'Caption', th_tag: 'Tagline', cl_p1: 'Caption', cl_p2: 'Caption', cl_p3: 'Caption', cl_p4: 'Caption', cl_p5: 'Caption', cl_sub: 'Subheading', cl_t1: 'Label', cl_t2: 'Label', cl_t3: 'Label', mi_t1: 'Label', mi_t2: 'Label', mi_t3: 'Label', mi_t4: 'Label', ya_script: 'Script line', ya_month: 'Month', ya_calday: 'Weekdays', ya_caldate: 'Dates', ya_head: 'Heading', ya_para: 'Paragraph', ya_link: 'Link', gs_title: 'Section title', gp_title: 'Page title', tes_title: 'Section title', faq_title: 'Page title', ab_h1: 'Story heading', ab_h2: 'Belief heading', ab_h3: 'Invitation heading', ab_p3: 'Invitation text', ab_by: 'By line', ab_loves: 'Loves label', ab_hi: 'Greeting', ab_n1: 'Stat 1', ab_l1: 'Stat 1 label', ab_n2: 'Stat 2', ab_l2: 'Stat 2 label', ab_n3: 'Stat 3', ab_l3: 'Stat 3 label', ab_quote: 'Pull quote', ab_sig: 'Signature', ab_tag: 'Tagline', ab_f1t: 'Fact 1 title', ab_f1d: 'Fact 1 text', ab_f2t: 'Fact 2 title', ab_f2d: 'Fact 2 text', ab_f3t: 'Fact 3 title', ab_f3d: 'Fact 3 text', ab_f4t: 'Fact 4 title', ab_f4d: 'Fact 4 text', ab_f5t: 'Fact 5 title', ab_f5d: 'Fact 5 text', soc_title: 'Social heading', soc_handle: 'Social handle', con_title: 'Booking heading' }

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
    if (e.buttons) { box.style.display = 'none'; return }
    const t = e.target as HTMLElement | null
    const hit = t ? nameOf(t) : null
    if (!hit) { box.style.display = 'none'; return }
    const r = hit.el.getBoundingClientRect()
    box.style.display = 'block'
    box.style.left = r.left + 'px'
    box.style.top = r.top + 'px'
    box.style.width = r.width + 'px'
    box.style.height = r.height + 'px'
    tag.textContent = hit.name + (hit.editable ? (hit.el.hasAttribute('data-cam-bsel') ? ' · click to edit' : ' · click to select') : '')
    tag.style.bottom = r.top < 28 ? 'auto' : '100%'
    tag.style.top = r.top < 28 ? '100%' : 'auto'
    tag.style.marginTop = r.top < 28 ? '3px' : '0'
  }
  const hide = () => { box.style.display = 'none' }
  document.addEventListener('pointerdown', hide, true)

  const onClick = (e: MouseEvent) => {
    let t = e.target as HTMLElement | null
    if (!t || !t.closest) return
    if (editing(t)) { e.preventDefault(); return }
    if (!nameOf(t)?.editable) { const up = (document.elementsFromPoint(e.clientX, e.clientY).find((n) => n instanceof HTMLElement && KEYS.some((k) => n.classList.contains('el-' + k)) && !n.closest('#cam-box')) as HTMLElement | undefined) ?? textAtPoint(e.clientX, e.clientY); if (up && KEYS.some((k) => up.classList.contains('el-' + k))) t = up }
    if (e.shiftKey) return
    const hit = nameOf(t)
    if (!hit || !hit.editable) return
    if (hit.el.closest(BTN_SEL)) return
    const el = hit.el
    let key: string | null = el.tagName === 'H1' && !KEYS.some((k) => el.classList.contains('el-' + k)) ? 'hero_headline' : null
    if (!key) for (const k of KEYS) if (el.classList.contains('el-' + k)) { key = k; break }
    if (!key) return
    e.preventDefault()
    e.stopPropagation()
    const r = el.getBoundingClientRect()
    window.parent?.postMessage({ type: 'camrhia-pick', key, text: (el.textContent ?? '').trim(), x: r.left, y: r.top, w: r.width, h: r.height, color: getComputedStyle(el).color, size: parseFloat(getComputedStyle(el).fontSize) || 0, op: Number(getComputedStyle(el).opacity) }, '*')
    const mt = metaFor(el, key)
    if (mt && el.hasAttribute('data-cam-bsel')) startEdit(el, mt, e.clientX, e.clientY)
  }

  document.addEventListener('mouseover', onOver, true)
  document.addEventListener('scroll', hide, true)
  document.addEventListener('click', onClick, true)
  return () => {
    document.removeEventListener('mouseover', onOver, true)
    document.removeEventListener('scroll', hide, true)
    document.removeEventListener('pointerdown', hide, true)
    document.removeEventListener('click', onClick, true)
    css.remove()
    box.remove()
  }
}
