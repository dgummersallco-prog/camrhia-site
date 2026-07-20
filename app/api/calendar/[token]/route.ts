import { createClient } from '@supabase/supabase-js'

// Force dynamic — request-time token lookup, never cache
export const dynamic = 'force-dynamic'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── iCalendar helpers ─────────────────────────────────────────────────────────

// 'YYYY-MM-DD' → 'YYYYMMDD'
function icsDate(dateStr: string): string {
  return dateStr.slice(0, 10).replace(/-/g, '')
}

// 'YYYY-MM-DD' → 'YYYYMMDD' for the next day (all-day DTEND is exclusive)
function icsDayAfter(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return (
    String(next.getFullYear()) +
    String(next.getMonth() + 1).padStart(2, '0') +
    String(next.getDate()).padStart(2, '0')
  )
}

// Current UTC instant in iCal format: YYYYMMDDTHHMMSSZ
function dtstamp(): string {
  return new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
}

// RFC 5545 text escaping (backslash, semicolon, comma, newlines)
function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// RFC 5545 §3.1: fold lines longer than 75 octets with CRLF + SPACE
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  chunks.push(line.slice(0, 75))
  let pos = 75
  while (pos < line.length) {
    chunks.push(' ' + line.slice(pos, pos + 74))
    pos += 74
  }
  return chunks.join('\r\n')
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = adminClient()

  // Token IS the access control — no other auth required
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('calendar_feed_token', token)
    .maybeSingle()

  if (!profile) {
    return new Response('Calendar not found', { status: 404 })
  }

  const stamp = dtstamp()
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Camrhia//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Camrhia',
    'X-WR-CALDESC:Your Camrhia weddings and holds',
  ]

  // ── Weddings ──────────────────────────────────────────────────────────────
  const { data: weddings } = await supabase
    .from('weddings')
    .select('id, names, wedding_date')
    .eq('owner_id', profile.id)
    .not('wedding_date', 'is', null)

  for (const w of weddings ?? []) {
    const dtstart = icsDate(w.wedding_date)
    const dtend = icsDayAfter(w.wedding_date)
    const summary = escapeText(`Wedding: ${w.names ?? 'Couple'}`)
    lines.push(
      'BEGIN:VEVENT',
      `UID:wedding-${w.id}@camrhia.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      'END:VEVENT',
    )
  }

  // ── Availability blocks ───────────────────────────────────────────────────
  const { data: blocks } = await supabase
    .from('availability_blocks')
    .select('id, type, block_date')
    .eq('owner_id', profile.id)

  for (const b of blocks ?? []) {
    const dtstart = icsDate(b.block_date)
    const dtend = icsDayAfter(b.block_date)
    const label = b.type ?? 'Hold'
    const summary = escapeText(`Camrhia: ${label}`)
    lines.push(
      'BEGIN:VEVENT',
      `UID:block-${b.id}@camrhia.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  const body = lines.map(foldLine).join('\r\n') + '\r\n'

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="camrhia.ics"',
      // Allow calendar apps to poll for updates
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
