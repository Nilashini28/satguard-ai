import { AnomalyAlert, ChatMessage, SatelliteState } from '@/types/satellite'

const URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.1-8b-instant'

function headers() {
  const key = process.env.NEXT_PUBLIC_GROQ_API_KEY ?? ''
  if (!key || key.includes('your_key')) {
    console.error('[SATGUARD AI] NEXT_PUBLIC_GROQ_API_KEY is not set correctly in .env.local')
  }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }
}

export async function narrate(alert: AnomalyAlert): Promise<string> {
  console.log('[SATGUARD AI] Generating narration for:', alert.satelliteName, alert.metric)
  try {
    const res = await fetch(URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        model: MODEL, max_tokens: 120,
        messages: [
          { role: 'system', content: 'You are SATGUARD AI. Respond with exactly 2 sentences: first explains the likely cause of this satellite anomaly, second tells the operator what to check. Be specific and technical. Under 55 words total.' },
          { role: 'user', content: `Satellite: ${alert.satelliteName}. Anomaly: ${alert.metric} = ${alert.currentValue} (baseline ${alert.baselineValue}). Severity: ${alert.severity}. Detection: ${alert.detectionMethod}, ${alert.confidence}% confidence.` },
        ],
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[SATGUARD AI] Narration error:', res.status, err)
      if (res.status === 401) return 'API key invalid. Add your real Groq key from console.groq.com to .env.local'
      return 'Anomaly confirmed. Review current telemetry and compare against mission nominal parameters.'
    }
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    console.log('[SATGUARD AI] Narration generated:', text.slice(0, 60) + '...')
    return text
  } catch (e) {
    console.error('[SATGUARD AI] Narration fetch failed:', e)
    return 'Anomaly detected. Cross-reference with mission parameters and initiate diagnostic.'
  }
}

export async function* chat(
  messages: ChatMessage[],
  satellites: SatelliteState[],
  alertCount: number
): AsyncGenerator<string, void, unknown> {
  const ctx = satellites.map(s => ({
    name: s.name, alt: s.altitude, vel: s.velocity,
    temp: s.temperature, bat: s.battery,
    sig: s.signalStrength, status: s.status,
    eclipse: s.eclipseStatus, source: s.dataSource,
  }))
  const system = `You are SATGUARD AI, expert satellite operations assistant with live telemetry access. Answer concisely and technically. Reference specific satellite names and values. Under 80 words unless detail is requested.

Live telemetry (${new Date().toISOString()}): ${JSON.stringify(ctx)}
Active anomaly alerts: ${alertCount}
Data source: CelesTrak TLE + satellite.js orbital propagation
Ground station: Chennai, India (13.08°N, 80.27°E)`

  console.log('[SATGUARD AI] Chat request with', messages.length, 'messages, alertCount:', alertCount)
  try {
    const res = await fetch(URL, {
      method: 'POST', headers: headers(),
      body: JSON.stringify({
        model: MODEL, max_tokens: 300, stream: true,
        messages: [
          { role: 'system', content: system },
          ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })
    if (!res.ok || !res.body) {
      const err = await res.text().catch(() => '')
      console.error('[SATGUARD AI] Chat error:', res.status, err)
      if (res.status === 401) { yield 'Error: Invalid API key. Add your Groq key to .env.local and Vercel env vars.'; return }
      yield 'AI service temporarily unavailable. Please try again.'; return
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue
        const json = trimmed.slice(6)
        if (json === '[DONE]') return
        try {
          const p = JSON.parse(json)
          const text = p?.choices?.[0]?.delta?.content
          if (text) yield text
        } catch { /* skip */ }
      }
    }
  } catch (e) {
    console.error('[SATGUARD AI] Chat stream failed:', e)
    yield 'Connection error. Check your network and try again.'
  }
}