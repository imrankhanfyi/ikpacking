// src/constants.ts

export const CATEGORIES = ['Toiletries', 'Meds', 'Clothing', 'Electronics', 'Misc'] as const
export type Category = typeof CATEGORIES[number]

export const CATEGORY_LAYOUT = {
  LEFT: ['Toiletries', 'Meds', 'Electronics'] as const,
  RIGHT: ['Clothing', 'Misc'] as const,
}

export const ITEM_TAGS = ['always', 'cold-weather', 'warm-weather', 'business', 'leisure'] as const

export const TAG_COLORS: Record<string, string> = {
  always: 'bg-[#f5f3ef] text-[#999] border border-[#ddd]',
  'cold-weather': 'bg-[#eef4f8] text-[#4a7fa5] border border-[#c5d9e8]',
  'warm-weather': 'bg-[#fef8f0] text-[#b07d3a] border border-[#e8d5b5]',
  business: 'bg-[#f3f0f8] text-[#6b5b8a] border border-[#d5cee5]',
  leisure: 'bg-[#f0f7f3] text-[#4a7f5e] border border-[#c5e0ce]',
}

export const WEATHER_TAGS: Record<string, string[]> = {
  cold: ['cold-weather'],
  warm: ['warm-weather'],
  mixed: ['cold-weather', 'warm-weather'],
}

export const TYPE_TAGS: Record<string, string[]> = {
  business: ['business'],
  leisure: ['leisure'],
  mixed: ['business', 'leisure'],
}

export const AI_MODEL = 'anthropic/claude-haiku-4-5'

// Single, fixed sync server. Hardcoded so the URL can never drift out of sync
// (an editable field repeatedly reverted to a stale IP and broke saves).
export const SYNC_URL = 'https://pack.imrankhan.fyi'
