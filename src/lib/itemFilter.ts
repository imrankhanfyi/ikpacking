import type { MasterItem, TripProfile } from '../types'
import { WEATHER_TAGS, TYPE_TAGS } from '../constants'

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
