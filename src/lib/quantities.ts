import type { MasterItem } from '../types'

const PER_DAY_CAP = 14

export function computeQty(item: MasterItem, durationDays: number): number {
  if (item.qtyBasis === 'fixed') return item.defaultQty
  return Math.min(Math.ceil(item.defaultQty * durationDays), PER_DAY_CAP)
}
