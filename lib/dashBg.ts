export const DASH_BG_KEY = 'camrhia_dash_bg'
const SCRIM = 'linear-gradient(rgba(255, 250, 244, 0.25), rgba(255, 250, 244, 0.25))'

export const BG_PRESETS: { id: string; label: string; css: string | null; preview: string }[] = [
  { id: 'golden', label: 'Ivory', css: null, preview: 'linear-gradient(160deg,#FBF6F0 0%,#F4E8D6 55%,#EAD7B4 100%)' },
  { id: 'evening', label: 'Champagne', css: 'linear-gradient(160deg,#FFF9EF 0%,#F3E2BF 50%,#E2C48D 100%)', preview: 'linear-gradient(160deg,#FFF9EF 0%,#F3E2BF 50%,#E2C48D 100%)' },
  { id: 'garden', label: 'Sage', css: 'linear-gradient(160deg,#F6F3E8 0%,#DCE4CC 55%,#C3D0AC 100%)', preview: 'linear-gradient(160deg,#F6F3E8 0%,#DCE4CC 55%,#C3D0AC 100%)' },
]

// value: a preset id, a storage path in the portfolio bucket, or null for the default.
export function applyDashBg(value: string | null, sb: any) {
  const root = document.documentElement
  let css: string | null = null
  const preset = BG_PRESETS.find((p) => p.id === value)
  if (preset) css = preset.css
  else if (value) {
    const url = sb?.storage?.from('portfolio')?.getPublicUrl(value)?.data?.publicUrl
    if (url) css = `${SCRIM}, url("${url}") center / cover no-repeat`
  }
  if (css) root.style.setProperty('--dash-bg', css)
  else root.style.removeProperty('--dash-bg')
  try {
    if (value) localStorage.setItem(DASH_BG_KEY, value)
    else localStorage.removeItem(DASH_BG_KEY)
  } catch {}
}
