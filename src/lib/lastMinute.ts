import { TripItem } from '../types'

export function computeLastMinuteItems(items: TripItem[], departureDate: string): TripItem[] {
  const today = new Date().toISOString().split('T')[0]
  const isDepartureDay = today >= departureDate

  return items.filter(item => {
    if (!item.isIncluded) return false
    if (item.isPacked) return false
    if (item.isLastMinute) return true
    if (isDepartureDay && !item.isPacked) return true
    return false
  })
}
