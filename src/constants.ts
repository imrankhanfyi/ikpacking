// src/constants.ts

export const CATEGORIES = ['Toiletries', 'Meds', 'Clothing', 'Electronics', 'Misc'] as const
export type Category = typeof CATEGORIES[number]

export const CATEGORY_LAYOUT = {
  LEFT: ['Toiletries', 'Meds', 'Electronics'] as const,
  RIGHT: ['Clothing', 'Misc'] as const,
}

export const ITEM_TAGS = ['always', 'cold-weather', 'warm-weather', 'business', 'leisure'] as const

export const TAG_COLORS: Record<string, string> = {
  always: 'bg-slate-700 text-slate-300',
  'cold-weather': 'bg-blue-900 text-blue-300',
  'warm-weather': 'bg-amber-900 text-amber-300',
  business: 'bg-violet-900 text-violet-300',
  leisure: 'bg-green-900 text-green-300',
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
