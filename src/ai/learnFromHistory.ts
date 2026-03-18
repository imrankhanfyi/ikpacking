import { Trip, PatternSuggestion } from '../types'
import { openRouterChat } from './client'

const SYSTEM_PROMPT = `You analyse packing trip history and identify actionable patterns.
Return a JSON array of suggestions (max 3), each with:
- type: "remove-default" | "promote-to-master" | "adjust-qty"
- itemName: string
- message: string (one sentence, friendly)
- tripCount: number (how many trips this is based on)

Only surface high-confidence patterns (3+ trips). Be specific and concise.
Return [] if no clear patterns yet.`

export async function learnFromHistory(apiKey: string, completedTrips: Trip[]): Promise<PatternSuggestion[]> {
  if (completedTrips.length < 3) return []

  const summary = completedTrips.slice(-10).map(t => ({
    profile: `${t.profile.duration}d, ${t.profile.weather}, ${t.profile.type}, ${t.profile.mode}`,
    packed: t.items.filter(i => i.isIncluded && i.isPacked).map(i => i.name),
    skipped: t.items.filter(i => !i.isIncluded || (!i.isPacked && i.isIncluded)).map(i => i.name),
  }))

  const raw = await openRouterChat(apiKey, 'anthropic/claude-sonnet-4-5', [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(summary) },
  ])

  try {
    return JSON.parse(raw.trim())
  } catch {
    return []
  }
}
