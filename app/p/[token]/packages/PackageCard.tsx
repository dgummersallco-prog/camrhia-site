"use client"
import { useState } from "react"

export function PackageCard({ pkg, nameStyle, priceColor, accent }: {
  pkg: any
  nameStyle: React.CSSProperties
  priceColor: string
  accent: string
}) {
  const [expanded, setExpanded] = useState(false)
  const lines = (pkg.covers ?? '').split('\n').map((l: string) => l.trim()).filter(Boolean)
  return (
    <button
      onClick={() => setExpanded(v => !v)}
      style={{ display: 'block', width: '100%', textAlign: 'left', background: '#fff', border: 'none', borderRadius: 12, padding: 14, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={nameStyle}>{pkg.name}</div>
          {pkg.detail && <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, color: '#8A8A8A', marginTop: 4 }}>{pkg.detail}</p>}
        </div>
        {pkg.price && <span style={{ fontFamily: 'system-ui, sans-serif', fontWeight: 600, fontSize: 15, color: priceColor }}>{pkg.price}</span>}
      </div>
      {expanded && lines.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lines.map((line: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: accent, flexShrink: 0 }} />
              <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13.5, color: '#6B6B6B' }}>{line}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}
