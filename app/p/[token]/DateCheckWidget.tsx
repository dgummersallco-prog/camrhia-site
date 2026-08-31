"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

type CheckResult = { status: 'idle' } | { status: 'checking' } | { status: 'available' } | { status: 'unavailable'; nearby: string[] } | { status: 'error' }

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function DateCheckWidget({
  photographerId, accent, dayColor, selectedColor, monthColor, availableColor, unavailableColor, resultTextColor, fontFamily, fontSize, bgColor,
}: {
  photographerId: string; accent: string
  dayColor?: string | null; selectedColor?: string | null; monthColor?: string | null
  availableColor?: string | null; unavailableColor?: string | null; resultTextColor?: string | null
  fontFamily?: string; fontSize?: number | null; bgColor?: string | null
}) {
  const [viewDate, setViewDate] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selected, setSelected] = useState<string | null>(null)
  const [result, setResult] = useState<CheckResult>({ status: 'idle' })

  const selColor = selectedColor ?? accent
  const availColor = availableColor ?? '#3F9142'
  const unavailColor = unavailableColor ?? '#8A8A8A'
  const resultColor = resultTextColor ?? '#6B6B6B'
  const calFont = fontFamily ?? "'Playfair Display', serif"
  const baseSize = fontSize ?? 13

  async function checkDate(dateStr: string) {
    setSelected(dateStr)
    setResult({ status: 'checking' })
    if (!supabase) { setResult({ status: 'error' }); return }
    const { data, error } = await supabase.rpc('check_photographer_date_availability', {
      p_photographer_id: photographerId, p_date: dateStr,
    })
    if (error || !data) { setResult({ status: 'error' }); return }
    if (data.available) setResult({ status: 'available' })
    else setResult({ status: 'unavailable', nearby: data.nearby ?? [] })
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const year = viewDate.getFullYear(), month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ border: '1px solid #eee', borderRadius: 12, overflow: 'hidden', backgroundColor: bgColor ?? '#fff', padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selColor, fontSize: 18 }}>‹</button>
          <span style={{ fontFamily: calFont, fontSize: baseSize + 3, color: monthColor ?? dayColor ?? '#2B2B2B' }}>{monthLabel}</span>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: selColor, fontSize: 18 }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontFamily: calFont, fontSize: Math.max(baseSize - 3, 8), color: dayColor ?? '#8A8A8A', textAlign: 'center', marginBottom: 4 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {cells.map((day, i) => {
            if (day === null) return <div key={i} />
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isPast = dateStr < todayStr
            const isSelected = selected === dateStr
            return (
              <button
                key={i}
                disabled={isPast}
                onClick={() => checkDate(dateStr)}
                style={{
                  aspectRatio: '1', border: 'none', borderRadius: '50%', cursor: isPast ? 'default' : 'pointer',
                  fontFamily: calFont, fontSize: baseSize,
                  backgroundColor: isSelected ? selColor : 'transparent',
                  color: isSelected ? '#fff' : isPast ? `${dayColor ?? '#2B2B2B'}55` : (dayColor ?? '#2B2B2B'),
                }}
              >{day}</button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {result.status === 'checking' ? (
            <div style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #eee', fontFamily: 'system-ui, sans-serif', fontSize: 13.5, color: resultColor }}>
              Checking {fmtDate(selected)}…
            </div>
          ) : result.status === 'available' ? (
            <div style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${availColor}66`, backgroundColor: `${availColor}18`, fontFamily: 'system-ui, sans-serif', fontSize: 13.5, color: resultColor }}>
              ✓ {fmtDate(selected)} is open!
            </div>
          ) : result.status === 'unavailable' ? (
            <>
              <div style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${unavailColor}66`, backgroundColor: `${unavailColor}18`, fontFamily: 'system-ui, sans-serif', fontSize: 13.5, color: resultColor }}>
                ✕ {fmtDate(selected)} is not available.
              </div>
              {result.nearby.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11.5, letterSpacing: 0.3, textTransform: 'uppercase', color: selColor }}>Nearby open dates</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {result.nearby.map((nd: string) => (
                      <button key={nd} onClick={() => checkDate(nd)} style={{ padding: '7px 12px', borderRadius: 999, border: `1px solid ${selColor}`, background: 'none', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', fontSize: 12.5, color: selColor }}>
                        {fmtDate(nd)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : result.status === 'error' ? (
            <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13.5, color: resultColor }}>Couldn&apos;t check that date — try again.</div>
          ) : null}
        </div>
      )}
    </div>
  )
}
