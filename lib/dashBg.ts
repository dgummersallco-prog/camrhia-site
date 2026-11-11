export const DASH_BG_KEY = 'camrhia_dash_bg'
const SCRIM = 'linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.2))'

export const BG_PRESETS: { id: string; label: string; css: string | null; preview: string }[] = [
  { id: 'golden', label: 'White', css: null, preview: '#FFFFFF' },
  { id: 'evening', label: 'Mist', css: 'linear-gradient(160deg,#F7F8FA 0%,#E9ECF1 100%)', preview: 'linear-gradient(160deg,#F7F8FA 0%,#E9ECF1 100%)' },
  { id: 'garden', label: 'Sage', css: 'linear-gradient(160deg,#F6F8F2 0%,#DCE4CC 100%)', preview: 'linear-gradient(160deg,#F6F8F2 0%,#DCE4CC 100%)' },
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
