// Screens JavaScript that Camri writes before it is saved or run. The code only ever runs on the
// sites host (a separate origin from the dashboard), and a Content-Security-Policy blocks outside
// requests. This list is the second layer: no network, navigation, storage, dynamic code or markup.
const STRIP = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g

const IN_CODE: RegExp[] = [
  /\b(eval|Function|constructor|prototype|__proto__|Reflect|Proxy|globalThis|WebAssembly|importScripts)\b/,
  /\b(XMLHttpRequest|WebSocket|EventSource|BroadcastChannel|SharedWorker|Worker|fetch|sendBeacon)\b/,
  /\b(localStorage|sessionStorage|indexedDB|caches|serviceWorker|geolocation|mediaDevices|clipboard)\b/,
  /\bdocument\s*\.\s*(cookie|domain|write|writeln|execCommand|location)\b/,
  /\b(window|self|top|parent|opener|frames)\s*\.\s*(top|parent|opener|frames|location|history|open|name|close|stop|document)\b/,
  /\blocation\s*(\.|=(?!=))/,
  /\bimport\s*[(\w{*]/,
  /\brequire\s*\(/,
  /\bwith\s*\(/,
  /\bdebugger\b/,
  /\.\s*(innerHTML|outerHTML|insertAdjacentHTML|srcdoc|createContextualFragment|click|submit|requestSubmit|dispatchEvent|postMessage)\b/,
  /\b(window|document|globalThis|self)\s*\[/,
]
const IN_SOURCE: RegExp[] = [
  /\\u[0-9a-fA-F{]|\\x[0-9a-fA-F]{2}/,
  /\[\s*['"`]/,
  /createElement(NS)?\s*\(\s*['"`]\s*(script|iframe|frame|frameset|object|embed|link|meta|base|form|style)/i,
  /setAttribute\s*\(\s*['"`]\s*(on|href|src|srcdoc|action|formaction)/i,
  /<\s*\/?\s*(script|iframe|object|embed|link|meta|base|form)/i,
  /javascript\s*:/i,
]

export function jsProblem(code: string): string | null {
  if (code.length > 20000) return 'too long'
  const bare = code.replace(STRIP, '""')
  if (IN_CODE.some((r) => r.test(bare))) return 'uses something that is not allowed'
  if (IN_SOURCE.some((r) => r.test(code))) return 'uses something that is not allowed'
  return null
}

export function safeJs(code: unknown): string | null {
  if (typeof code !== 'string') return null
  const c = code.trim()
  if (!c) return null
  return jsProblem(c) ? null : c
}
