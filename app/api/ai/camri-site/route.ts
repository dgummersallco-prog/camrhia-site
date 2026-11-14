import { hasCamriAccess } from '@/lib/aiAccess'
import Anthropic from '@anthropic-ai/sdk'
import { adminDb, userFromRequest } from '@/lib/stripeServer'
import { MODEL_ID, costUsd } from '@/lib/aiRouter'
import { sanitizeCss } from '@/lib/safeCss'
import { safeJs } from '@/lib/safeJs'

export const dynamic = 'force-dynamic'

const STYLE_KEYS = ['airy', 'classic', 'romantic', 'bold', 'moody', 'clean', 'mosaic', 'earthy', 'peony', 'ivy', 'wisteria', 'juniper', 'camellia', 'cedar', 'olive', 'magnolia', 'lily', 'orchid', 'lotus', 'aster', 'fern', 'sage', 'rose', 'hazel', 'saffron', 'cypress', 'laurel', 'iris', 'poppy', 'thistle', 'clover', 'mimosa', 'yarrow']
const PAIRS = ['serif', 'modern', 'romantic']
const SHAPES = ['square', 'rounded', 'pill']
const HEX = /^#[0-9A-Fa-f]{6}$/

const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

async function handle(request: Request): Promise<Response> {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

    const beta = (process.env.AI_BETA_EMAILS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    const email = (auth.user.email ?? '').toLowerCase()
    if (!(await hasCamriAccess(auth.user.id, email))) return Response.json({ error: 'Camri is not open to your account yet.' }, { status: 403 })
    if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: 'Camri is not set up yet.' }, { status: 503 })
    {
      const cap = Number(process.env.CAMRI_MONTHLY_CAP_USD ?? 5)
      const now = new Date()
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
      const { data: used, error: usedErr } = await (adminDb() as any).from('ai_usage').select('cost_usd').eq('owner_id', auth.user.id).like('job', 'camri%').gte('created_at', monthStart)
      const spent = usedErr ? 0 : (used ?? []).reduce((t: number, r: any) => t + Number(r.cost_usd ?? 0), 0)
      if (cap > 0 && spent >= cap) return Response.json({ reply: "I've used all my design help for this month. It refills on the 1st, and I can pick right back up then.", changes: {} })
    }

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
{"reply": string, "changes": {"style": string|null, "palette": {"accent": string, "bg": string, "text": string}|null, "font_pair": string|null, "buttons": string|null, "headline": string|null, "subhead": string|null, "css": string|null, "js": string|null, "calendar": {"day": string, "selected": string, "month": string, "available": string, "unavailable": string, "resultText": string, "bg": string}|null, "images": {"name": string, "prompt": string, "shape": string}[]|null, "kit": {"layout": string|null, "palette": string|null, "fonts": string|null, "heading_font": string|null, "body_font": string|null, "theme": string|null, "save_theme": string|null, "role_font": {"role": string, "font": string}|null, "move_section": {"section": string, "to": string}|null, "add_page": {"id": string, "label": string, "sections": string[]}|null, "remove_page": string|null}|null}}

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
- Preview names: the person can hover the preview to see names, then say them to you. Map each name to its part: Cover = #top (the whole hero section: its background color, height, overlay), Cover image = #top img, Headline = #top h1, Hero paragraph = .cr-hpara, Menu bar = #nav, Your name = .el-menu_brand, Menu links = .el-menu_links, Button = .cr-btn, Nav section = #explore, Footer = #footer. For a color change on one of these, use css that targets only that part (use palette only when they ask for the whole accent, page or text color).
- CSS hooks that exist: #nav (menu bar), #top (hero), #portfolio, #words, #about, #aboutcta, #investment, #faq, #contact, #explore, #footer; .cr-btn (buttons), .cr-sub (subheads), .el-menu_brand, .el-menu_links, .el-about_text, .el-ex_title, .el-gal_name, .el-pr_name, .el-pr_price, .el-tes_quote, .el-faq_q, .el-con_msg, .el-ft_line. Theme variables you can set on :root: --hero-h (hero height), --space (section padding), --text (base font size), --logo (logo height), --menu (menu font size).
- The site uses inline styles, so add !important to rules that must win.
- Not allowed and stripped: url(), @import, position:fixed, scripts. Use @media (max-width: 768px) so phones look right. Keep text readable against its background. Keep the stylesheet under 9000 characters. In content: values write the actual character (for example '❄'), never a backslash code.
- js: the COMPLETE custom JavaScript for their site, replacing any previous JavaScript (keep earlier code you are not changing). Use "" only to remove all of it. Use js only for what css cannot do: canvas particle effects, falling snow with wind and depth, sparkle cursor trails, scroll reveals, parallax, confetti, floating ornaments. Plain vanilla JavaScript only. Your code runs inside a function and receives a helper named camri. camri.layer() returns a fixed, full-screen, click-through div: append your canvas or elements to it. camri.onCleanup(fn) registers a function that stops your timers, animation frames and listeners. camri.reduceMotion is true when the visitor asked for less motion: then draw nothing animated. A filter rejects the whole script if it breaks these rules: no network calls, storage, cookies, navigation, eval, new Function, innerHTML, or creating script, iframe, link, style or form elements; no bracket access with a string name (write a.b, never a['b']); no unicode or hex escapes in strings (write the real character); never use window.top, window.parent, location, history or window.open. Build with document.createElement, textContent, style properties, canvas 2d, requestAnimationFrame (cancel it in onCleanup) and addEventListener on window or document (remove it in onCleanup). Keep particles under 150, size the canvas to window.innerWidth and window.innerHeight and handle resize, and keep the script under 7000 characters: write it compact, with no comments, short variable names and reused helper functions. JS RECIPES: (1) Snow: one canvas in camri.layer(), 120 flakes each with its own radius 1 to 4, fall speed scaled by radius, a sine sway, and a shared slow wind that drifts over time; draw white circles with a soft alpha; bigger flakes are faster and brighter for depth. (2) Twinkling lights: a row of small circles along the top of the hero that fade in and out on offset sine waves. (3) Sparkle cursor trail: on mousemove spawn small star characters that float up and fade over 700ms, removed when done. (4) Scroll reveal: an IntersectionObserver that fades and lifts sections into view once. (5) Parallax: move the hero background a fraction of window.scrollY. (6) Confetti burst when a visitor presses a main button: 80 colored squares with gravity and spin, removed after 3 seconds. Add the effects that fit the theme, tastefully, and never cover text or the menu.
- GENERATED IMAGES: always set images to null. The builder places generated decorative pieces itself.
- DRAW YOUR OWN ART: you are never limited to the art pack. In js you can paint whole illustrated scenes on canvases inside camri.layer(), for any theme the person asks for. Draw the static parts once onto an offscreen canvas, then animate only what moves, so it stays smooth. RECIPES: (a) Pine trees: each tree is 4 to 6 stacked tiers; each tier is a triangle with slightly curved sides filled with a vertical gradient from deep green to lighter green, a white snow cap along the top of every tier, a small brown trunk and a glowing star on top. Add string lights as 25 to 40 small dots in warm red, gold, white and blue along zigzag lines across the tiers, drawn with shadowBlur 12 and a color the same as the dot, twinkling on offset sine waves. Place trees along the left and right edges in 3 sizes: far ones smaller, bluer and lower opacity, near ones bigger and greener, between 40 and 75 percent of the window height. (b) Giant bokeh flakes: 10 to 14 large soft circles, radius 20 to 70, filled with radial gradients at alpha .06 to .18, drifting slowly in front of the scene for depth. (c) Wreath: a ring of 70 small green leaf ellipses rotated around a circle, red berry dots, a bow, and a soft glow. (d) Ground snow: smooth white hills along the bottom with a blue-white gradient. (e) Night sky: a deep blue to purple vertical gradient with 80 tiny stars. (f) Glow and light: shadowBlur, radial gradients and globalCompositeOperation set to lighter. For other themes draw that theme's own objects the same way, such as pumpkins and bats, hearts, autumn leaves, waves, balloons or confetti. Keep big art in the outer 20 percent of the width and along the bottom edge so text stays readable, keep it behind the menu, and respect camri.reduceMotion by drawing a still frame.
- MOTION BELONGS IN JS, NOT CSS: falling snow, twinkling lights, sparkles, floating ornaments and anything that moves or reacts to the mouse or scrolling must be written in js, never with css keyframes or animated snow.svg layers (ignore SCENE RECIPE 1 and any css animation for snow). Use css only for static decoration: palette, art pack garland and light strips, frosted cards, gold foil headline, vignette, borders and spacing. Every holiday reply must include a js value with real canvas snow that has depth and wind.
- HOLIDAY SCENES ARE MANDATORY: for any holiday or seasonal theme, a recolor is a failure. In the same reply you MUST set palette, a full css scene (art pack, glowing lights, garland, frosted cards, gold foil headline, vignette) AND js with at least two effects, such as depth snow with wind, twinkling lights, and a sparkle cursor trail. Write the js completely and carefully so it runs the first time. Your reply should say what you added in plain, excited words.
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
${String(site.css ?? '').slice(0, 6000) || '(none)'}

Their current custom JavaScript, replace it completely whenever you change it:
${String(site.js ?? '').slice(0, 12000) || '(none)'}`

    const messages = [
      ...hist.map((m) => ({ role: (m.from === 'me' ? 'user' : 'assistant') as 'user' | 'assistant', content: String(m.text ?? '').slice(0, 500) })),
      { role: 'user' as const, content: message },
    ]
    while (messages.length && messages[0].role !== 'user') messages.shift()

    const lastUser = String(messages[messages.length - 1]?.content ?? '')
    const jsPhase = lastUser.startsWith('[[JS]]')
    const wantsMotion = !jsPhase && /christmas|halloween|holiday|valentine|thanksgiving|easter|fourth of july|seasonal|animat|snow|sparkle|confetti|effect|magic|wow|dramatic|glow|twinkl|scene|theme|vibe|season|beach|summer|winter|spring|autumn|tropical|ocean|forest|boho|desert|mountain|sunset|night sky/i.test(lastUser)
    const tier: 'sonnet' | 'haiku' = jsPhase || wantsMotion || /christmas|halloween|holiday|valentine|thanksgiving|easter|fourth of july|seasonal|theme|animat|snow|sparkle|confetti|effect|magic|wow|fancy|dramatic|glow|twinkl|scene/i.test(lastUser) ? 'sonnet' : 'haiku'
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const res = await client.messages.create({ model: MODEL_ID[tier], max_tokens: jsPhase ? 5500 : 9000, system: system + DESIGN_RULES + (jsPhase ? JS_STEP_NOTE : wantsMotion ? LOOK_STEP_NOTE : ''), messages })

    const inTok = res.usage?.input_tokens ?? 0
    const outTok = res.usage?.output_tokens ?? 0
    const db = adminDb() as any
    await db.from('ai_usage').insert({
      owner_id: auth.user.id, gallery_id: null, job: 'camri_site', model: MODEL_ID[tier],
      photos: 0, input_tokens: inTok, output_tokens: outTok, cost_usd: costUsd(tier, inTok, outTok),
    })

    const raw = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('')
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 })
    let parsed: any
    try { parsed = JSON.parse(m[0]) } catch { try { parsed = JSON.parse(m[0].replace(/\r?\n/g, ' ')) } catch { return Response.json({ error: 'Camri could not answer. Try again.' }, { status: 502 }) } }

    if (typeof parsed.changes?.js === 'string' && parsed.changes.js.trim() && !safeJs(parsed.changes.js)) parsed.reply = String(parsed.reply ?? '') + ' (I could not add the animation code that time, so I left that part out. Try asking another way.)'
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
      js: typeof c.js === 'string' ? (c.js.trim() === '' ? '' : safeJs(c.js)) : null,
      calendar: c.calendar && typeof c.calendar === 'object' ? Object.fromEntries(['day', 'selected', 'month', 'available', 'unavailable', 'resultText', 'bg'].filter((k) => /^#[0-9a-fA-F]{6}$/.test(String(c.calendar[k] ?? ''))).map((k) => [k, String(c.calendar[k])])) : null,
      images: Array.isArray(c.images) ? c.images.slice(0, 2).map((i: any) => ({ name: String(i?.name ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24), prompt: String(i?.prompt ?? '').slice(0, 500), shape: ['tall', 'wide', 'square'].includes(i?.shape) ? i.shape : 'square' })).filter((i: any) => i.name && i.prompt) : null,
      kit: kitAny ? kitOut : null,
    }
    const reply = clean(parsed.reply, 500) ?? 'Done!'
    return Response.json({ reply, changes, next: wantsMotion ? 'js' : null })
  } catch (e) {
    return Response.json({ error: 'Camri hit a snag. Try again.' }, { status: 500 })
  }
}

export const maxDuration = 300

// Long scenes take a while to write. Send a ping every few seconds so the connection stays open,
// then the finished answer. Leading spaces are ignored by the JSON reader on the other side.
export async function POST(request: Request) {
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const ping = setInterval(() => { try { controller.enqueue(enc.encode(' ')) } catch { /* closed */ } }, 4000)
      try {
        const r = await handle(request)
        controller.enqueue(enc.encode(await r.text()))
      } catch {
        controller.enqueue(enc.encode(JSON.stringify({ error: 'Camri hit a snag. Try again.' })))
      } finally {
        clearInterval(ping)
        controller.close()
      }
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
}

const JS_STEP_NOTE = "\n\nTHIS IS THE ANIMATION STEP, and it overrides any earlier rule that says to also change css or other settings. The look is already built and saved (its css is shown above). The user's message starts with the marker [[JS]]: ignore the marker and treat the rest as their request. Reply with one short, excited sentence about the motion you are adding, and set every change to null except js. If the css already places generated images such as trees or a wreath, do not redraw them in js: spend the code on depth snow with wind, giant bokeh flakes, twinkling lights and a sparkle cursor trail. Write the complete js now, compact and under 7000 characters so it finishes quickly: rich, layered and carefully written so it runs the first time, matching the look that was just built."
const LOOK_STEP_NOTE = "\n\nTHIS IS STEP 1 OF 2 and it overrides any earlier rule that says to include js in this reply. Build the look now: palette, css (static decoration only, complete, under 7000 characters), kit and headline as needed. Set js to null, because a second step writes the animation code right after this one. In your reply, say what you built in plain, excited words and that the motion is coming next."

const DESIGN_RULES = `

DESIGN RULES FOR EVERY REQUEST (you are a refined art director for wedding and portrait photographers; these always apply):
- The photographer's own photos are the star. Decoration never covers a photo, a face, a headline or a button, and never sits behind text without enough contrast to read it.
- Stay refined and restrained: 3 main colors at most, one script or handwritten font used only for small accents, one clean serif or sans for everything else. Plenty of white space. Never crowded, never cartoonish, never cheesy.
- Decoration is small and organic, not a scene: tucked corner accents, a slim divider between sections, a soft paper or linen or watercolor texture behind a panel, a small sprig or ornament on a card corner, a short themed edge above the footer. At most 4 or 5 decorative pieces per theme.
- Do not use a full-page scenery background or a huge overlay.
- Text must always be easy to read: strong contrast, and soft shadows or a calm panel behind text when needed.
- Name offers specifically, like Book a Holiday Mini Session, instead of a generic Book a Session, when the season or theme calls for it.
- The booking calendar colors are yours to design too: whenever you change the palette or theme, also set the calendar field with 6-digit hex colors for day, selected, month, available, unavailable, resultText and bg so the booking calendar matches the whole look and stays readable, with strong contrast between each text color and its background; otherwise set calendar to null.\n- When asked for less or more, change only the amount of decoration and keep the structure, the photos and the readable text intact.`
