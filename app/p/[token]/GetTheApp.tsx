"use client"

export default function GetTheApp({ token, appStoreUrl }: { token: string; appStoreUrl: string }) {
  function prep() {
    try { navigator.clipboard.writeText("camrhia-portfolio:" + token) } catch {}
  }
  const primary = "inline-flex items-center justify-center gap-2 rounded-2xl bg-ink text-white px-6 py-3.5 text-sm font-semibold hover:bg-ink/90 transition-colors w-full"
  const secondary = "inline-flex items-center justify-center rounded-2xl border border-line text-ink px-6 py-3.5 text-sm font-semibold w-full"
  return (
    <div className="flex flex-col gap-3 mt-8">
      <a href={appStoreUrl} onClick={prep} className={primary}>Download on the App Store</a>
      <a href={"camrhia://p/" + token} className={secondary}>I already have the app</a>
      <p className="text-xs text-ink-soft mt-2">Create a free account in the app and you will land right on this portfolio.</p>
    </div>
  )
}
