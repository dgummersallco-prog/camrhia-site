export const SIG_FAMILIES: Record<string, string> = {
  DancingScript: "'Dancing Script', cursive",
  GreatVibes: "'Great Vibes', cursive",
  Sacramento: "'Sacramento', cursive",
  AlexBrush: "'Alex Brush', cursive",
}
export const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Dancing+Script&family=Great+Vibes&family=Sacramento&display=swap'
export const sigFamily = (k: string | null) => SIG_FAMILIES[k ?? ''] ?? SIG_FAMILIES.DancingScript

export type SigInfo = { name: string; style: string | null; date: string }
type Mark = { info: SigInfo; kind: 'sig' | 'date' }

const SIG_RE = /^\s*Signature:\s*_{3,}\s*$/
const DATE_RE = /^\s*Date:/

export function signedLines(body: string, photographer: SigInfo | null, client: SigInfo | null): { lines: string[]; marks: Record<number, Mark>; slots: number } {
  const lines = body.split('\n')
  const slots: number[] = []
  lines.forEach((l, i) => { if (SIG_RE.test(l)) slots.push(i) })
  const marks: Record<number, Mark> = {}
  const who = [photographer, client]
  slots.slice(0, 2).forEach((idx, n) => {
    const info = who[n]
    if (!info) return
    marks[idx] = { info, kind: 'sig' }
    if (DATE_RE.test(lines[idx + 1] ?? '')) marks[idx + 1] = { info, kind: 'date' }
  })
  return { lines, marks, slots: slots.length }
}

export function signedHtml(body: string, photographer: SigInfo | null, client: SigInfo | null, esc: (s: string) => string): string {
  const { lines, marks, slots } = signedLines(body, photographer, client)
  const span = (i: SigInfo) => '<span style="font-family:' + sigFamily(i.style) + ';font-size:30px;border-bottom:1px solid #222;padding:0 8px">' + esc(i.name) + '</span>'
  let out = lines.map((l, i) => {
    const m = marks[i]
    if (!m) return esc(l)
    return m.kind === 'sig' ? 'Signature: ' + span(m.info) : 'Date: ' + esc(m.info.date)
  }).join('\n')
  if (slots < 2 && (photographer || client)) {
    out += '\n\n'
    if (photographer) out += 'Photographer: ' + span(photographer) + ' (' + esc(photographer.date) + ')\n'
    if (client) out += 'Client: ' + span(client) + ' (' + esc(client.date) + ')\n'
  }
  return out
}
