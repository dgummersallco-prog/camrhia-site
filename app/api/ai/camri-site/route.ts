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
    const fontList: { id: string; label: string }[] = (Array.isArray(body.fontList) ? body.fontList : []).slice(0, 200).map((x: any) => ({ id: String(x?.id ?? ''), label: String(x?.label ?? '') })).filter((x: any) => x.id)
    const fontIds = fontList.map((f) => f.id)
    const system = `You are Camri, a cute, warm camera robot who designs photographers' websites. You know what works for photographers: big photos, lots of white space, one accent color, readable type, a clear Book button, and a look that matches the kind of client they want.

Reply with ONLY a JSON object, no other text:
{"reply": string, "changes": {"style": string|null, "palette": {"accent": string, "bg": string, "text": string}|null, "font_pair": string|null, "buttons": string|null, "headline": string|null, "subhead": string|null, "css": string|null, "kit": {"layout": string|null, "palette": string|null, "fonts": string|null, "heading_font": string|null, "body_font": string|null, "theme": string|null, "save_theme": string|null}|null}}

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
- Not allowed and stripped: url(), @import, position:fixed, scripts. Use @media (max-width: 768px) so phones look right. Keep text readable against its background. Keep the stylesheet under 6000 characters.
- For a holiday or seasonal theme (Christmas, Halloween, Valentine's and so on) do not stop at colors. Use css to add real decoration: emoji or symbols in ::before and ::after on headings and section dividers, candy-cane or garland stripes with repeating-linear-gradient on borders and bars, snow-like dots with radial-gradient backgrounds on the hero, and a gentle @keyframes twinkle or sway. Keep text readable and the result tasteful.
- The photographer is working on their ${String(body.page ?? 'home').replace(/[^a-z ]/gi, '').slice(0, 20) || 'home'} page right now. Treat requests as being about that page when it makes sense, and say so if something is not possible on that page yet.
- kit favorites the photographer saved: layouts [${kitLayouts.map((x) => x.key + ' (' + x.name + ')').join(', ') || 'none yet'}]; color schemes [${kitPalettes.map((x) => x.name).join(', ') || 'none yet'}]; font pairs [${kitFonts.map((x) => x.key + ' (' + x.name + ')').join(', ') || 'none yet'}]; saved themes [${kitThemes.join(', ') || 'none yet'}].
  kit.layout: a layout key from their favorites, or "next" or "prev" to move through them. kit.palette: a color scheme name from their favorites. kit.fonts: a font pair key from their favorites.
  kit.heading_font and kit.body_font: a font id from this list when they ask for a specific font: ${fontList.map((f) => f.id + '=' + f.label).join(', ') || 'none'}.
  kit.theme: the name of a saved theme to switch to. kit.save_theme: a short name to save the design as it will look after this reply's changes. Use it when they ask for a new named theme like Christmas or Dark: make the design changes with palette, css and the other fields in the same reply, and set kit.save_theme. The app keeps their current design as "Main" so they can always switch back.

Current site: template ${site.template ?? 'unknown'}, accent ${site.accent ?? 'unknown'}, page color ${site.bg ?? 'unknown'}, text color ${site.text ?? 'unknown'}, fonts ${site.font_pair ?? 'unknown'}, buttons ${site.buttons ?? 'unknown'}, headline "${site.headline ?? ''}", subhead "${site.subhead ?? ''}".

Current custom CSS (empty if none):
${String(site.css ?? '').slice(0, 6000) || '(none)'}`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'me' ? 'user' : 'assistant') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 500) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID.haiku, max_tokens: 4000, system, messages })

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
      css: typeof c.css === 'string' ? sanitizeCss(c.css).slice(0, 8000) : null,
      kit: kitAny ? kitOut : null,
    }
    const reply = clean(parsed.reply, 500) ?? 'Done!'
    return Response.json({ reply, changes })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}
