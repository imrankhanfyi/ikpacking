import type { TripProfile } from '../types'
import { openRouterChat } from './client'
import { AI_MODEL } from '../constants'

const SYSTEM_PROMPT = `You parse trip descriptions into structured JSON.
Return ONLY valid JSON with these fields:
- name: string (short trip name)
- duration: number (days)
- weather: "cold" | "warm" | "mixed"
- type: "business" | "leisure" | "mixed"
- mode: "checked" | "carry-on" | "road-trip"

Infer from context. "Edinburgh in October" → cold. "work dinner" → business. Default to "mixed" if unclear.`

export async function parseTripDescription(apiKey: string, description: string): Promise<TripProfile & { name: string }> {
  const raw = await openRouterChat(
    apiKey,
    AI_MODEL,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: description },
    ]
  )

  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(cleaned)
  return {
    name: parsed.name ?? description.slice(0, 40),
    duration: Number(parsed.duration) || 5,
    weather: parsed.weather ?? 'mixed',
    type: parsed.type ?? 'mixed',
    mode: parsed.mode ?? 'checked',
    nlDescription: description,
  }
}
