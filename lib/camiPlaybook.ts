// Starting points the pros reach for in common light. Values are slider positions (-100 to 100).
export type Play = { id: string; label: string; words: RegExp; line: string; set: Record<string, number> }

export const PLAYBOOK: Play[] = [
  { id: 'golden', label: 'Golden hour', words: /golden|magic hour|sunrise/i, line: 'Golden hour: keep the warmth, pull highlights down, lift shadows.', set: { temp: 15, highlights: -30, shadows: 20, contrast: 8, vibrance: 10 } },
  { id: 'overcast', label: 'Gloomy', words: /gloom|overcast|cloud|gr[ae]y (day|sky)|rain|drizzl|dull|flat light/i, line: 'Gloomy light: add contrast and warmth, lift whites and exposure.', set: { exposure: 15, contrast: 25, whites: 15, blacks: -10, temp: 12, vibrance: 20 } },
  { id: 'harsh', label: 'Harsh sun', words: /harsh|midday|noon|high sun|bright sun|direct sun|hard light/i, line: 'Harsh sun: pull highlights hard, open shadows, soften contrast.', set: { exposure: -5, highlights: -50, shadows: 40, contrast: -10, vibrance: 10 } },
  { id: 'shade', label: 'Open shade', words: /open shade|in the shade|\bshade\b/i, line: 'Open shade: warm it up, add a little contrast and brightness.', set: { temp: 20, exposure: 10, contrast: 10, shadows: 10, highlights: -10 } },
  { id: 'backlit', label: 'Backlit', words: /backlit|back-lit|backlight|silhouette|sun behind/i, line: 'Backlit: lift shadows and exposure, pull highlights.', set: { exposure: 15, shadows: 45, highlights: -35, whites: 10, blacks: 10 } },
  { id: 'window', label: 'Window light', words: /window/i, line: 'Window light: pull highlights, warm slightly, add a touch of contrast.', set: { exposure: 5, highlights: -25, shadows: 15, temp: 10, contrast: 8, whites: 10 } },
  { id: 'low', label: 'Low light', words: /low light|dark venue|\bdim\b|flash|reception|night|dark room/i, line: 'Low light: lift exposure and shadows, reduce noise.', set: { exposure: 20, shadows: 25, blacks: -10, noise: 30, contrast: 8, sharpen: 10 } },
  { id: 'sunset', label: 'Sunset', words: /sunset|dusk|blue hour/i, line: 'Sunset: protect the highlights, lift shadows, boost color.', set: { temp: 8, highlights: -40, shadows: 25, contrast: 15, vibrance: 20, saturation: 5 } },
  { id: 'tungsten', label: 'Indoor yellow', words: /tungsten|incandescent|yellow light|yellow indoor/i, line: 'Indoor yellow light: cool the white balance, lift shadows.', set: { temp: -20, shadows: 10, contrast: 8 } },
  { id: 'fog', label: 'Fog or haze', words: /fog|mist|haze|hazy/i, line: 'Fog or haze: add contrast, deepen blacks, lift whites.', set: { contrast: 30, blacks: -25, whites: 10, vibrance: 10 } },
  { id: 'snow', label: 'Snow', words: /snow|bright white/i, line: 'Snow: raise exposure and whites, cool it slightly.', set: { exposure: 25, whites: 20, temp: -8, contrast: 10 } },
]

export const PLAY_CHIPS = ['golden', 'overcast', 'harsh', 'shade', 'backlit', 'window', 'low', 'sunset']

export function matchPlay(message: string): Play | null {
  const m = message.trim()
  if (m.length === 0 || m.length > 60) return null
  return PLAYBOOK.find((p) => p.words.test(m)) ?? null
}

export function playbookPrompt(): string {
  return PLAYBOOK.map((p) => `${p.label}: ${Object.entries(p.set).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ')}`).join('\n')
}
