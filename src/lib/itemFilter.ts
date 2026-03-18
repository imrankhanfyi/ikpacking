import type { MasterItem, TripProfile } from '../types'

const WEATHER_TAGS: Record<string, string[]> = {
  cold: ['cold-weather'],
  warm: ['warm-weather'],
  mixed: ['cold-weather', 'warm-weather'],
}

const TYPE_TAGS: Record<string, string[]> = {
  business: ['business'],
  leisure: ['leisure'],
  mixed: ['business', 'leisure'],
}

export function filterItemsByProfile(items: MasterItem[], profile: TripProfile): MasterItem[] {
  const allowedTags = new Set([
    'always',
    ...WEATHER_TAGS[profile.weather],
    ...TYPE_TAGS[profile.type],
  ])

  return items.filter(item => {
    if (item.tags.length === 0) return true
    return item.tags.some(tag => allowedTags.has(tag))
  })
}
