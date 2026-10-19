import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { PortfolioLightbox } from "../../../../p/[token]/PortfolioLightbox"

export const dynamic = 'force-dynamic'

const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/`
  : ''
function photoUrl(path: string | null | undefined): string | null {
  return path ? `${STORAGE_BASE}${path}` : null
}

const PAIRS: Record<string, { head: string; body: string; css: string }> = {
  serif: { head: "'Cormorant Garamond', Georgia, serif", body: "'Montserrat', system-ui, sans-serif", css: 'family=Cormorant+Garamond:wght@400;500;600&family=Montserrat:wght@300;400;500;600' },
  modern: { head: "'Josefin Sans', system-ui, sans-serif", body: "'Work Sans', system-ui, sans-serif", css: 'family=Josefin+Sans:wght@300;400;600&family=Work+Sans:wght@300;400;500' },
  romantic: { head: "'Playfair Display', Georgia, serif", body: "'Lora', Georgia, serif", css: 'family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lora:wght@400;500' },
}

async function loadProfile(token: string) {
  if (!supabase) return null
  const { data } = await supabase.rpc('get_public_profile', { p_token: token })
  return (data as Record<string, any> | null) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ token: string; gid: string }> }) {
  const { token, gid } = await params
  const r = await loadProfile(token)
  if (!r) return { title: 'Gallery not available' }
  const gal = ((r.site_galleries ?? []) as any[]).find((g) => g.id === gid)
  const name = r.studio_name ?? r.display_name ?? 'Photographer'
  if (!gal) return { title: name }
  const first = gal.photos?.[0]?.storage_path as string | undefined
  const image = photoUrl(first)
  const title = `${gal.title} · ${name}`
  return { title, openGraph: { title, type: 'website', ...(image ? { images: [{ url: image }] } : {}) } }
}

export default async function SiteGalleryPage({ params }: { params: Promise<{ token: string; gid: string }> }) {
  const { token, gid } = await params
  const r = await loadProfile(token)
  const galleries = ((r?.site_galleries ?? []) as any[]).filter((g) => (g.photos ?? []).length > 0)
  const gal = galleries.find((g) => g.id === gid)
  if (!r || !gal) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: 'system-ui', padding: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>This gallery isn&apos;t available.</h1>
        <Link href={`/site/${token}`} style={{ color: '#5B6B8C', textDecoration: 'underline' }}>Back to the website</Link>
      </div>
    )
  }

  const pair = PAIRS[r.site_font_pair as string] ?? PAIRS.serif
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(String(r.site_accent ?? '')) ? (r.site_accent as string) : (r.accent_color ?? '#A9545F')
  const tpl = r.site_template
  const bg = tpl === 'minimal' ? '#FFFFFF' : tpl === 'split' ? '#F6F1EA' : '#FAF7F2'
  const ink = '#2A1F24'
  const soft = '#6F5E64'
  const name: string = r.studio_name ?? r.display_name ?? 'Studio'
  const head = { fontFamily: pair.head, fontWeight: 500, letterSpacing: '0.01em' } as const
  const photos = [...gal.photos].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const others = galleries.filter((g) => g.id !== gid)
  const secs = [...(gal.sections ?? [])].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const secIds = new Set(secs.map((x: any) => x.id))
  const groups: { id: string; title: string | null; photos: any[] }[] = []
  const loose = photos.filter((p: any) => !p.section_id || !secIds.has(p.section_id))
  if (loose.length) groups.push({ id: 'loose', title: null, photos: loose })
  for (const sec of secs) {
    const ps = photos.filter((p: any) => p.section_id === sec.id)
    if (ps.length) groups.push({ id: sec.id, title: sec.title as string, photos: ps })
  }

  return (
    <>
      <link rel="stylesheet" href={`https://fonts.googleapis.com/css2?${pair.css}&display=swap`} />
      <style>{`html,body{background:${bg}}`}</style>
      <PortfolioLightbox />
      <div style={{ background: bg, color: ink, fontFamily: pair.body, minHeight: '100vh' }}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href={`/site/${token}`} style={{ ...head, fontSize: 24 }}>{name}</Link>
          <div className="flex gap-6 text-[11px] uppercase tracking-[0.2em]">
            <Link href={`/site/${token}#portfolio`}>Portfolio</Link>
            <Link href={`/site/${token}#contact`}>Contact</Link>
          </div>
        </nav>

        <header className="px-6 pb-10 pt-8 text-center">
          <h1 className="text-5xl md:text-6xl" style={head}>{gal.title}</h1>
          <p className="mt-3 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>{photos.length} photos</p>
        </header>

        <main className="mx-auto max-w-6xl px-6 pb-16">
          <div className="flex flex-col gap-14">
            {groups.map((grp) => (
              <div key={grp.id}>
                {grp.title && <h2 className="mb-6 text-center text-3xl" style={head}>{grp.title}</h2>}
                <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
                  {grp.photos.map((p: any) => {
                    const u = photoUrl(p.storage_path)
                    // eslint-disable-next-line @next/next/no-img-element
                    return u ? <img key={p.id} src={u} alt="" data-zoom="1" loading="lazy" className="mb-3 block w-full" style={{ cursor: 'zoom-in' }} /> : null
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link href={`/site/${token}#contact`} className="inline-block px-8 py-3 text-[11px] uppercase tracking-[0.22em]" style={{ background: accent, color: '#fff' }}>
              Check availability
            </Link>
          </div>

          {others.length > 0 && (
            <div className="mt-16 border-t pt-10 text-center" style={{ borderColor: 'rgba(42,31,36,0.12)' }}>
              <p className="mb-5 text-[11px] uppercase tracking-[0.25em]" style={{ color: soft }}>More galleries</p>
              <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
                {others.map((g) => (
                  <Link key={g.id} href={`/site/${token}/g/${g.id}`} className="text-2xl" style={{ ...head, color: accent }}>{g.title}</Link>
                ))}
              </div>
            </div>
          )}
        </main>

        <footer className="px-6 pb-12 text-center text-[11px] uppercase tracking-[0.2em]" style={{ color: soft }}>
          © {new Date().getFullYear()} {name} · <a href="https://camrhia.com" style={{ color: accent }}>Powered by Camrhia</a>
        </footer>
      </div>
    </>
  )
}
