import type { MasterItem } from '../types'
import { openRouterChat } from './client'

const SYSTEM_PROMPT = `Parse a Notion packing list (markdown checkbox format) into a JSON array of items.
For each item return:
- name: string (clean item name, no quantities)
- category: "Toiletries" | "Meds" | "Clothing" | "Electronics" | "Misc"
- defaultQty: number (extract from name e.g. "3 pants" → qty 3, name "pants")
- qtyBasis: "fixed" | "per-day" (clothing counts > 1 → "per-day", everything else "fixed")
- tags: string[] (infer from item: meds → ["always"], cold gear → ["cold-weather"], business shirts → ["business"], etc.)
- isLastMinute: boolean (chargers, phone, toothbrush → true)
- isEssential: boolean (passport, meds → true)

Skip blank lines, section headers, and non-item text. Deduplicate similar items (flag as duplicate if names differ by ≤2 chars or are clear synonyms).`

export interface ImportedItem extends Omit<MasterItem, 'id'> {
  isDuplicate?: boolean
  duplicateOf?: string
}

export async function importNotionList(apiKey: string, markdown: string): Promise<ImportedItem[]> {
  const raw = await openRouterChat(apiKey, 'anthropic/claude-haiku-4-5', [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: markdown },
  ])
  return JSON.parse(raw.trim())
}
