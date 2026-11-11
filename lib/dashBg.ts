export const DASH_BG_KEY = 'camrhia_dash_bg'
const SCRIM = 'linear-gradient(rgba(20,14,16,0.45), rgba(20,14,16,0.45))'

export const BG_PRESETS: { id: string; label: string; css: string | null; preview: string }[] = [
  { id: 'golden', label: 'Golden hour', css: null, preview: 'linear-gradient(160deg,#3A2A2E 0%,#8A5A4E 45%,#E0A878 75%,#F3D3A0 100%)' },
  { id: 'evening', label: 'Evening', css: 'linear-gradient(160deg,#182235 0%,#3C4B6B 45%,#C9A36A 80%,#F0D9A6 100%)', preview: 'linear-gradient(160deg,#182235 0%,#3C4B6B 45%,#C9A36A 80%,#F0D9A6 100%)' },
  { id: 'garden', label: 'Garden', css: 'linear-gradient(160deg,#1F2A22 0%,#4E6B50 50%,#A9B88A 85%,#EEE3C2 100%)', preview: 'linear-gradient(160deg,#1F2A22 0%,#4E6B50 50%,#A9B88A 85%,#EEE3C2 100%)' },
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
