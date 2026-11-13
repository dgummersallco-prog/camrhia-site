import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'
import { sanitizeCss } from '@/lib/safeCss'

export const dynamic = 'force-dynamic'

const STYLE_KEYS = ['airy', 'classic', 'romantic', 'bold', 'moody', 'clean', 'mosaic', 'earthy']
const PAIRS = ['serif', 'modern', 'romantic']
const SHAPES = ['square', 'rounded', 'pill']
const HEX = /^#[0-9A-Fa-f]{6}$/

const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })

    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 600) : ''
    if (!message) return Response.json({ error: 'Tell me what to change.' }, { status: 400 })
    const site = body.site ?? {}
    const hist: { from: string; text: string }[] = Array.isArray(body.history) ? body.history.slice(-10) : []

    const kitIn = body.kit ?? {}
    const kitLayouts: { key: string; name: string }[] = (Array.isArray(kitIn.layouts) ? kitIn.layouts : []).slice(0, 8).map((x: any) => ({ key: String(x?.key ?? ''), name: String(x?.name ?? '') })).filter((x: any) => x.key)
    const kitPalettes: { name: string }[] = (Array.isArray(kitIn.palettes) ? kitIn.palettes : []).slice(0, 8).map((x: any) => ({ name: String(x?.name ?? '') })).filter((x: any) => x.name)
    const kitFonts: { key: string; name: string }[] = (Array.isArray(kitIn.fonts) ? kitIn.fonts : []).slice(0, 8).map((x: any) => ({ key: String(x?.key ?? ''), name: String(x?.name ?? '') })).filter((x: any) => x.key)
    const kitThemes: string[] = (Array.isArray(kitIn.themes) ? kitIn.themes : []).filter((x: unknown) => typeof x === 'string').slice(0, 20)
    const stIn = body.structure ?? {}
    const strList = (a: unknown): string[] => (Array.isArray(a) ? a : []).filter((x: unknown): x is string => typeof x === 'string').slice(0, 20)
    const stExtra = (Array.isArray(stIn.extra) ? stIn.extra : []).slice(0, 8).map((e: any) => ({ id: String(e?.id ?? '').slice(0, 24), label: String(e?.label ?? '').slice(0, 24), sections: strList(e?.sections) })).filter((e: any) => e.id)
    const stPageIds: string[] = ['home', 'about', 'galleries', ...stExtra.map((e: any) => e.id)]
    const tpIn = kitIn.type ?? {}
    const typeDesc = ['title', 'subtitle', 'paragraph'].map((r) => r + ' [' + strList(tpIn[r]).join(', ') + ']').join(', ')
    const SECS = ['about', 'portfolio', 'investment', 'testimonials', 'faq', 'contact', 'explore', 'aboutcta', 'social']
    const stDesc = 'Home [' + strList(stIn.home).join(', ') + '], About [' + strList(stIn.about).join(', ') + '], Galleries [' + strList(stIn.galleries).join(', ') + ']' + stExtra.map((e: any) => ', ' + e.label + ' (id ' + e.id + ') [' + e.sections.join(', ') + ']').join('')
    const fontList: { id: string; label: string }[] = (Array.isArray(body.fontList) ? body.fontList : []).slice(0, 200).map((x: any) => ({ id: String(x?.id ?? ''), label: String(x?.label ?? '') })).filter((x: any) => x.id)
    const fontIds = fontList.map((f) => f.id)
    const system = `You are Camri, a cute, warm camera robot who designs photographers' websites. You know what works for photographers: big photos, lots of white space, one accent color, readable type, a clear Book button, and a look that matches the kind of client they want.

Reply with ONLY a JSON object, no other text:
{"reply": string, "changes": {"style": string|null, "palette": {"accent": string, "bg": string, "text": string}|null, "font_pair": string|null, "buttons": string|null, "headline": string|null, "subhead": string|null, "css": string|null, "kit": {"layout": string|null, "palette": string|null, "fonts": string|null, "heading_font": string|null, "body_font": string|null, "theme": string|null, "save_theme": string|null, "role_font": {"role": string, "font": string}|null, "move_section": {"section": string, "to": string}|null, "add_page": {"id": string, "label": string, "sections": string[]}|null, "remove_page": string|null}|null}}

Rules:
- reply: 1-3 short, friendly sentences. Say what you changed and why it suits a photographer. No emoji spam.
- Change only what the photographer asked for. Everything else must be null.
- style must be one of: ${STYLE_KEYS.join(', ')}. (airy=light white, classic=timeless serif, romantic=soft dreamy, bold=magazine, moody=dark cinematic, clean=split, mosaic=photo wall, earthy=warm cream and clay.) Picking a style resets colors and fonts to that style, so only use it when they ask for a whole new look.
- palette: hex colors like #C98A8D. accent is for buttons and links, bg is the page, text is body text. Keep text readable against bg (strong contrast).
- font_pair must be one of: ${PAIRS.join(', ')}. (serif=Classic, modern=Modern, romantic=Romantic.)
- buttons must be one of: ${SHAPES.join(', ')}.
- headline: under 8 words. subhead: under 18 words. Write real copy in the photographer's voice, never lorem ipsum.
- If they ask a question or want advice, answer in reply and leave all changes null.
- css: the COMPLETE custom stylesheet for their site, replacing any previous custom CSS (keep earlier rules you are not changing). Use "" only to remove all custom CSS. Use css for design the other options cannot do: layouts, spacing, hero size, overlays, hover effects, animations, borders, typography details. Prefer the other options for simple color, font pair, button shape or copy changes.
- CSS hooks that exist: #nav (menu bar), #top (hero), #portfolio, #words, #about, #aboutcta, #investment, #faq, #contact, #explore, #footer; .cr-btn (buttons), .cr-sub (subheads), .el-menu_brand, .el-menu_links, .el-about_text, .el-ex_title, .el-gal_name, .el-pr_name, .el-pr_price, .el-tes_quote, .el-faq_q, .el-con_msg, .el-ft_line. Theme variables you can set on :root: --hero-h (hero height), --space (section padding), --text (base font size), --logo (logo height), --menu (menu font size).
- The site uses inline styles, so add !important to rules that must win.
- Not allowed and stripped: url(), @import, position:fixed, scripts. Use @media (max-width: 768px) so phones look right. Keep text readable against its background. Keep the stylesheet under 9000 characters.
- ART PACK: you may use these images in css with url('/seasonal/NAME.svg'). Nothing else can be loaded except the photographer's own uploads. string-lights.svg (320x70 tile, repeat-x, hang it from the top edge of a section), garland.svg (400x90 tile, repeat-x, swag across the top of the hero or just under the menu), snow.svg (300x300 tile, repeat; animate background-position in @keyframes for falling snow), ornament-red.svg and ornament-gold.svg (120x160, single, can dangle from a section edge), star.svg (100x100), snowflake.svg (80x80), pine-corner.svg (400x400, pin to a top corner), ribbon.svg (120x600, pin to a left or right edge). Place decoration on ::before or ::after of existing sections with position:absolute, or position:fixed for page-wide snow, always with pointer-events:none, a z-index below the menu, and background-repeat and background-size set. Never cover text. Prefer the art pack over emoji. For a holiday theme combine a matching palette, the art pack, and several of these SCENE RECIPES for a big, premium look. (1) Falling snow in two layers: put snow.svg on body::after, position:fixed, inset:0, pointer-events:none, once at background-size 300px and again on body::before at 180px, each animated with @keyframes moving background-position downward at different speeds such as 14s and 22s, which gives depth. (2) Glowing lights: on string-lights.svg strips add filter: drop-shadow(0 0 6px rgba(255,200,120,.8)) and a slow @keyframes flicker of opacity between .85 and 1. (3) Warm bokeh: a few large blurred radial-gradient circles on the hero via a pseudo-element at opacity .35 with a slow drift animation. (4) Swinging ornaments: ornament-red.svg or ornament-gold.svg hung from the top edge with transform-origin:top center and a @keyframes sway from -4deg to 4deg over 4s. (5) Gold foil headings: background:linear-gradient(90deg,#f7dd8c,#c9902a,#f7dd8c) with background-clip:text and transparent color on the hero headline, keeping it readable. (6) A soft dark vignette on the hero edges for a cozy mood. (7) Frosted cards and menu: backdrop-filter blur(10px) with a translucent background. (8) Garland across the top of the hero with a soft drop-shadow, and pine-corner.svg in the top-right plus a mirrored copy (transform:scaleX(-1)) in the top-left. Wrap all animations in @media (prefers-reduced-motion: no-preference).
- For a holiday or seasonal theme (Christmas, Halloween, Valentine's and so on) do not stop at colors. Use css to add real decoration: emoji or symbols in ::before and ::after on headings and section dividers, candy-cane or garland stripes with repeating-linear-gradient on borders and bars, snow-like dots with radial-gradient backgrounds on the hero, and a gentle @keyframes twinkle or sway. Keep text readable and the result tasteful.
- The photographer is working on their ${String(body.page ?? 'home').replace(/[^a-z ]/gi, '').slice(0, 20) || 'home'} page right now. Treat requests as being about that page when it makes sense, and say so if something is not possible on that page yet.
- kit favorites the photographer saved: layouts [${kitLayouts.map((x) => x.key + ' (' + x.name + ')').join(', ') || 'none yet'}]; color schemes [${kitPalettes.map((x) => x.name).join(', ') || 'none yet'}]; font pairs [${kitFonts.map((x) => x.key + ' (' + x.name + ')').join(', ') || 'none yet'}]; saved themes [${kitThemes.join(', ') || 'none yet'}].
  kit.layout: a layout key from their favorites, or "next" or "prev" to move through them. kit.palette: a color scheme name from their favorites. kit.fonts: a font pair key from their favorites.
  kit.heading_font and kit.body_font: a font id from this list when they ask for a specific font: ${fontList.map((f) => f.id + '=' + f.label).join(', ') || 'none'}.
  kit.theme: the name of a saved theme to switch to. kit.save_theme: a short name to save the design as it will look after this reply's changes. Use it when they ask for a new named theme like Christmas or Dark: make the design changes with palette, css and the other fields in the same reply, and set kit.save_theme. The app keeps their current design as "Main" so they can always switch back.
  Page structure (pages and the sections stacked on them, in order): ${stDesc}. Section ids: about, portfolio (the galleries), investment (pricing), testimonials, faq, contact (the book-now band), explore (the quick-links cards to their other pages), social (their social media links), aboutcta. kit.move_section {"section","to"}: move a section onto a page (to = home, about, galleries or an extra page id), or to = "none" to take it off every page. kit.add_page {"id","label","sections"}: make a new menu page (id is lowercase letters, numbers and dashes) holding those sections, for example a testimonials page. kit.remove_page: the id of an extra page to delete. Use these only when they ask to move, add or remove a section or page.
  kit.role_font {"role","font"}: set one font for the title, subtitle or paragraph (role is one of those three words). Their saved picks, first is the one in use: ${typeDesc}. Use a saved pick when they say things like "use my second title font", otherwise any font id from the font list.

Current site: template ${site.template ?? 'unknown'}, accent ${site.accent ?? 'unknown'}, page color ${site.bg ?? 'unknown'}, text color ${site.text ?? 'unknown'}, fonts ${site.font_pair ?? 'unknown'}, buttons ${site.buttons ?? 'unknown'}, headline "${site.headline ?? ''}", subhead "${site.subhead ?? ''}".

Current custom CSS (empty if none):
${String(site.css ?? '').slice(0, 6000) || '(none)'}`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'me' ? 'user' : 'assistant') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 500) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 8000, system, messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_site', model: MODEL_ID.haiku,
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd('haiku', inTok, outTok),
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    let parsed: any
    try { parsed = JSON.parse(m[0]) } catch { try { parsed = JSON.parse(m[0].replace(/\r?\n/g, ' ')) } catch { return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 }) } }

    const c = parsed.changes ?? {}
    const p = c.palette
    const kc = c.kit ?? {}
    const kitOut = {
      layout: ['next', 'prev', ...kitLayouts.map((x) => x.key)].includes(kc.layout) ? kc.layout : null,
      palette: kitPalettes.some((x) => x.name === kc.palette) ? kc.palette : null,
      fonts: kitFonts.some((x) => x.key === kc.fonts) ? kc.fonts : null,
      heading_font: fontIds.includes(kc.heading_font) ? kc.heading_font : null,
      body_font: fontIds.includes(kc.body_font) ? kc.body_font : null,
      theme: kitThemes.includes(kc.theme) ? kc.theme : null,
      move_section: kc.move_section && SECS.includes(kc.move_section.section) && (stPageIds.includes(kc.move_section.to) || kc.move_section.to === 'none') ? { section: kc.move_section.section, to: kc.move_section.to } : null,
      add_page: kc.add_page && /^[a-z0-9-]{1,24}$/.test(String(kc.add_page.id ?? '')) && !['home', 'about', 'galleries', 'book', 'p', 'site'].includes(String(kc.add_page.id)) ? { id: String(kc.add_page.id), label: String(kc.add_page.label ?? kc.add_page.id).slice(0, 24), sections: strList(kc.add_page.sections).filter((k) => SECS.includes(k)) } : null,
      remove_page: stExtra.some((e: any) => e.id === kc.remove_page) ? kc.remove_page : null,
      role_font: kc.role_font && ['title', 'subtitle', 'paragraph'].includes(kc.role_font.role) && fontList.some((f: any) => f.id === kc.role_font.font) ? { role: kc.role_font.role, font: kc.role_font.font } : null,
      save_theme: clean(kc.save_theme, 30),
    }
    const kitAny = Object.values(kitOut).some(Boolean)
    const changes = {
      style: STYLE_KEYS.includes(c.style) ? c.style : null,
      palette: p && HEX.test(p.accent) && HEX.test(p.bg) && HEX.test(p.text) ? { accent: p.accent, bg: p.bg, text: p.text } : null,
      font_pair: PAIRS.includes(c.font_pair) ? c.font_pair : null,
      buttons: SHAPES.includes(c.buttons) ? c.buttons : null,
      headline: clean(c.headline, 80),
      subhead: clean(c.subhead, 160),
      css: typeof c.css === 'string' ? sanitizeCss(c.css).slice(0, 16000) : null,
      kit: kitAny ? kitOut : null,
    }
    const reply = clean(parsed.reply, 500) ?? 'Done!'
    return Response.json({ reply, changes })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
