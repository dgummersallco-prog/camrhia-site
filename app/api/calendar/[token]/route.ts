import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type FeedSession = {
  id: string
  names: string | null
  date: string
  type: string | null
  venue: string | null
  city: string | null
  state: string | null
  start: string | null
  hours: number | null
  status: string | null
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function pretty(t: string | null): string {
  if (!t) return 'Session'
  return t.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function parseStart(t: string | null): { h: number; m: number } | null {
  if (!t) return null
  const mt = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
  if (!mt) return null
  let h = Number(mt[1])
  const m = mt[2] ? Number(mt[2]) : 0
  const ap = mt[3]?.toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23 || m > 59) return null
  return { h, m }
}

function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params
  const token = raw.replace(/\.ics$/i, '')
  if (!supabase || !/^[a-f0-9]{20,64}$/.test(token)) return new Response('Not found', { status: 404 })

  const { data, error } = await supabase.rpc('calendar_feed', { p_token: token })
  if (error || !data) return new Response('Not found', { status: 404 })

  const feed = data as { studio: string | null; sessions: FeedSession[] }
  const now = new Date()
  const nowStamp = stamp(now) + 'Z'

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Camrhia//Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc(feed.studio ? `${feed.studio} sessions` : 'Camrhia sessions')}`,
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]

  for (const s of feed.sessions ?? []) {
    const [y, mo, d] = s.date.split('-').map(Number)
    const where = [s.venue, [s.city, s.state].filter(Boolean).join(', ')].filter(Boolean).join(', ')
    const title = `${s.names || 'Session'} (${pretty(s.type)})`
    lines.push('BEGIN:VEVENT', `UID:${s.id}@camrhia.com`, `DTSTAMP:${nowStamp}`)

    const st = parseStart(s.start)
    if (st) {
      const startD = new Date(Date.UTC(y, mo - 1, d, st.h, st.m))
      const endD = new Date(startD.getTime() + (s.hours && s.hours > 0 ? s.hours : 2) * 3600000)
      lines.push(`DTSTART:${stamp(startD)}`, `DTEND:${stamp(endD)}`)
    } else {
      const startD = new Date(Date.UTC(y, mo - 1, d))
      const endD = new Date(startD.getTime() + 86400000)
      lines.push(
        `DTSTART;VALUE=DATE:${stamp(startD).slice(0, 8)}`,
        `DTEND;VALUE=DATE:${stamp(endD).slice(0, 8)}`,
      )
    }

    lines.push(`SUMMARY:${esc(title)}`)
    if (where) lines.push(`LOCATION:${esc(where)}`)
    lines.push(
      `DESCRIPTION:${esc(`${s.status ? `Status: ${s.status}\n` : ''}https://camrhia.com/sessions/${s.id}`)}`,
      `URL:https://camrhia.com/sessions/${s.id}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')

  return new Response(lines.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
