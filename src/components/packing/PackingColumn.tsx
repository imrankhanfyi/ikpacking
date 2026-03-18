import type { TripItem } from '../../types'
import { PackingItem } from './PackingItem'

interface Props {
  categories: string[]
  items: TripItem[]
  onToggle: (id: string) => void
  onQtyChange: (id: string, qty: number) => void
  onRemove: (id: string) => void
}

export function PackingColumn({ categories, items, onToggle, onQtyChange, onRemove }: Props) {
  return (
    <div className="space-y-4">
      {categories.map(cat => {
        const catItems = items.filter(i => i.category === cat && i.isIncluded && !i.isLastMinute)
        if (catItems.length === 0) return null
        return (
          <section key={cat}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">{cat}</h3>
            {catItems.map(item => (
              <PackingItem key={item.id} item={item}
                onToggle={() => onToggle(item.id)}
                onQtyChange={qty => onQtyChange(item.id, qty)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </section>
        )
      })}
    </div>
  )
}
