# Plan B: Solid Personal Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Pack app from prototype to a solid personal tool — fix bugs, make mobile usable, replace browser dialogs with proper UI, add robustness to AI calls, and fill UX gaps.

**Architecture:** No structural changes. Add 3 new files (ErrorBoundary, Toast, toastStore). Modify ~20 existing files. All changes are additive or corrective — no data model changes, no new dependencies.

**Tech Stack:** React 19, TypeScript 5.9, Zustand, Tailwind CSS v4, Vite 8

---

### Task 1: Toast notification system

New foundational component used by many later tasks. Build this first.

**Files:**
- Create: `src/store/toastStore.ts`
- Create: `src/components/common/Toast.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create toast store**

```typescript
// src/store/toastStore.ts
import { create } from 'zustand'

export interface ToastItem {
  id: string
  type: 'success' | 'error' | 'undo'
  message: string
  onUndo?: () => void
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id'>) => void
  removeToast: (id: string) => void
}

let nextId = 0

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = String(++nextId)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    if (toast.type !== 'undo') {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
    } else {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 6000)
    }
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function toast(message: string) {
  useToastStore.getState().addToast({ type: 'success', message })
}

export function toastError(message: string) {
  useToastStore.getState().addToast({ type: 'error', message })
}

export function toastUndo(message: string, onUndo: () => void) {
  useToastStore.getState().addToast({ type: 'undo', message, onUndo })
}
```

- [ ] **Step 2: Create Toast component**

```typescript
// src/components/common/Toast.tsx
import { useToastStore } from '../../store/toastStore'

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-[env(safe-area-inset-bottom,0px)] left-0 right-0 z-50 flex flex-col items-center gap-2 p-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm max-w-sm w-full animate-[slideUp_0.2s_ease-out] ${
            t.type === 'error'
              ? 'bg-red-950 border border-red-800 text-red-200'
              : t.type === 'undo'
              ? 'bg-slate-800 border border-slate-600 text-slate-200'
              : 'bg-green-950 border border-green-800 text-green-200'
          }`}
        >
          <span className="flex-1">{t.message}</span>
          {t.type === 'undo' && t.onUndo && (
            <button
              onClick={() => {
                t.onUndo!()
                removeToast(t.id)
              }}
              className="shrink-0 px-2 py-1 rounded bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
            >
              Undo
            </button>
          )}
          <button
            onClick={() => removeToast(t.id)}
            className="shrink-0 text-current opacity-50 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Add slide-up animation to CSS**

Add to `src/index.css` after the existing content:

```css
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 4: Mount ToastContainer in App.tsx**

In `src/App.tsx`, add import `import { ToastContainer } from './components/common/Toast'` and render `<ToastContainer />` just before the closing `</BrowserRouter>` tag (inside the router so it's always visible).

- [ ] **Step 5: Verify toast renders**

Run `npm run dev`, open browser console, run:
```js
// In browser console
window.__test_toast = true
```
We'll test toasts properly when we wire them up in later tasks. For now, verify the build works.

Run: `npm run build && npm test`
Expected: Build succeeds, 22 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/store/toastStore.ts src/components/common/Toast.tsx src/index.css src/App.tsx
git commit -m "feat: add toast notification system"
```

---

### Task 2: Error boundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create ErrorBoundary component**

```typescript
// src/components/ErrorBoundary.tsx
import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <h1 className="text-xl font-bold text-slate-100">Something went wrong</h1>
            <p className="text-sm text-slate-400">The app hit an unexpected error.</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/' }}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
```

- [ ] **Step 2: Wrap app in ErrorBoundary**

In `src/App.tsx`, import `ErrorBoundary` and wrap the `<BrowserRouter>` block with `<ErrorBoundary>...</ErrorBoundary>` (outside the router, so even router crashes are caught).

- [ ] **Step 3: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, 22 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/App.tsx
git commit -m "feat: add error boundary to prevent white screen crashes"
```

---

### Task 3: Bug fixes (kitApply, API client, learnFromHistory, console cleanup)

**Files:**
- Modify: `src/lib/kitApply.ts`
- Modify: `src/ai/client.ts`
- Modify: `src/ai/learnFromHistory.ts`
- Modify: `src/components/trips/NewTripForm.tsx`

- [ ] **Step 1: Fix kitApply name resolution**

In `src/lib/kitApply.ts`, change the function signature to accept `masterItems`:

```typescript
import type { TripItem, Kit, MasterItem } from '../types'
import { v4 as uuid } from 'uuid'

export function applyKits(baseItems: TripItem[], allKits: Kit[], activeKitIds: string[], masterItems: MasterItem[]): TripItem[] {
```

Then change the `result.push` block (around line 30-40) to resolve the name:

```typescript
      const master = masterItems.find(m => m.id === kitItem.masterItemId)
      result.push({
        id: uuid(),
        masterItemId: kitItem.masterItemId,
        name: master?.name ?? 'Unknown item',
        qty: kitItem.qty,
        isIncluded: true,
        isPacked: false,
        isLastMinute: master?.isLastMinute ?? false,
        isEssential: master?.isEssential ?? false,
        category: master?.category ?? 'Misc',
      })
```

- [ ] **Step 2: Update callers of applyKits**

Search for `applyKits` usage. It is called in `src/lib/generateTripItems.ts` — no, checking the code, `applyKits` is not currently called anywhere in the generation flow (kits are applied via the NewTripForm step). Search the codebase for `applyKits` calls and add the `masterItems` argument to each. If there are no call sites yet, the signature change is safe and the fix is ready for when it's used.

Run: `grep -r "applyKits" src/`

- [ ] **Step 3: Fix API client — referer and response validation**

Replace the full contents of `src/ai/client.ts`:

```typescript
export async function openRouterChat(
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Connect to the internet and try again.')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  async function attempt(): Promise<string> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://pack.app',
      },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('Unexpected AI response format')
    return content
  }

  try {
    return await attempt()
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI request timed out. Try again.')
    // Retry once on network errors (not on 4xx/5xx which already threw with status)
    if (err.message?.includes('fetch')) {
      return await attempt()
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
```

- [ ] **Step 4: Fix learnFromHistory error handling**

In `src/ai/learnFromHistory.ts`, add import at the top:

```typescript
import { toastError } from '../store/toastStore'
```

Replace the catch block at the end:

```typescript
  try {
    return JSON.parse(raw.trim())
  } catch (e) {
    console.error('learnFromHistory: failed to parse AI response', e)
    toastError('Learning from trip history failed — suggestions may be incomplete.')
    return []
  }
```

- [ ] **Step 5: Remove console.log from NewTripForm**

In `src/components/trips/NewTripForm.tsx`, remove these two lines:
- `console.log('[NewTripForm NL] masterItems:', masterItems.length, 'generated:', items.length, 'parsed:', parsed)`
- `console.log('[NewTripForm] masterItems:', masterItems.length, 'generated:', items.length, 'profile:', profile)`

- [ ] **Step 6: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/kitApply.ts src/ai/client.ts src/ai/learnFromHistory.ts src/components/trips/NewTripForm.tsx
git commit -m "fix: kit name resolution, API client robustness, learnFromHistory errors, console cleanup"
```

---

### Task 4: Modal improvements (Escape key, click-outside)

**Files:**
- Modify: `src/components/common/Modal.tsx`

- [ ] **Step 1: Add Escape key and click-outside dismissal**

Replace the full contents of `src/components/common/Modal.tsx`:

```typescript
import { useEffect, useRef } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, onClose, children }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div ref={backdropRef} onClick={handleBackdropClick} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 sticky top-0 bg-slate-900 rounded-t-xl z-10">
          <h2 className="font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/Modal.tsx
git commit -m "feat: modal escape key, click-outside dismiss, sticky header"
```

---

### Task 5: QtyBadge → inline stepper

**Files:**
- Modify: `src/components/common/QtyBadge.tsx`

- [ ] **Step 1: Replace QtyBadge with inline stepper**

Replace the full contents of `src/components/common/QtyBadge.tsx`:

```typescript
interface QtyStepper {
  qty: number
  onEdit?: (qty: number) => void
  compact?: boolean
}

export function QtyBadge({ qty, onEdit, compact }: QtyStepper) {
  if (!onEdit) {
    if (qty <= 1) return null
    return <span className="inline-block bg-slate-800 text-indigo-400 text-xs font-bold rounded px-1.5 py-0.5 ml-1">×{qty}</span>
  }

  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(Math.max(1, qty - 1)) }}
        className={`flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 ${compact ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
      >−</button>
      <span className={`text-indigo-400 text-center ${compact ? 'w-4 text-xs' : 'w-6 text-xs'}`}>{qty}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(qty + 1) }}
        className={`flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 ${compact ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
      >+</button>
    </span>
  )
}
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/common/QtyBadge.tsx
git commit -m "feat: replace QtyBadge prompt() with inline stepper"
```

---

### Task 6: Mobile packing view overhaul

**Files:**
- Modify: `src/components/packing/PackingView.tsx`
- Modify: `src/components/packing/PackingItem.tsx`
- Modify: `src/components/packing/PackingColumn.tsx`
- Modify: `src/components/packing/LastMinuteSection.tsx`
- Modify: `src/components/packing/EssentialsGate.tsx`

- [ ] **Step 1: Fix PackingView layout — single column on mobile, back button**

In `src/components/packing/PackingView.tsx`:

Change the grid from `grid grid-cols-2 gap-6` to `grid grid-cols-1 sm:grid-cols-2 gap-6`.

The existing back button (`← Trips`) is already present in PackingView but is tiny (`text-xs`). Make it more visible by changing:

```tsx
        <button onClick={() => navigate('/')} className="text-xs text-slate-500 hover:text-slate-300 mb-1">← Trips</button>
```

to:

```tsx
        <button onClick={() => navigate('/')} className="text-sm text-slate-400 hover:text-slate-200 mb-1">← Trips</button>
```

Replace the `handleAddItem` function to use the toast system instead of prompt():

```typescript
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')

  function handleAddItem(category: string) {
    if (!newItemName.trim()) return
    addTripItem(trip!.id, {
      masterItemId: null, name: newItemName.trim(), qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: false, isEssential: false, category
    })
    setNewItemName('')
    setAddingCategory(null)
  }
```

Replace the "+ Add item" button area with an inline input:

```tsx
      <div className="mt-4">
        {addingCategory ? (
          <div className="flex gap-2">
            <input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(addingCategory); if (e.key === 'Escape') setAddingCategory(null) }}
              placeholder="Item name..."
              autoFocus
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={() => handleAddItem(addingCategory)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button>
            <button onClick={() => setAddingCategory(null)} className="px-3 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingCategory('Misc')} className="text-sm text-indigo-400 hover:text-indigo-300">+ Add item</button>
        )}
      </div>
```

Also add empty state when no items exist:

```tsx
      {included.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-12">This trip has no items. Go back and add some.</p>
      )}
```

- [ ] **Step 2: Redesign PackingItem — always-visible controls, bigger tap targets**

Replace the full contents of `src/components/packing/PackingItem.tsx`:

```typescript
import type { TripItem } from '../../types'
import { QtyBadge } from '../common/QtyBadge'
import { toastUndo } from '../../store/toastStore'

interface Props {
  item: TripItem
  onToggle: () => void
  onQtyChange: (qty: number) => void
  onRemove: () => void
  onRestore: () => void
}

export function PackingItem({ item, onToggle, onQtyChange, onRemove, onRestore }: Props) {
  function handleRemove() {
    onRemove()
    toastUndo(`"${item.name}" removed`, onRestore)
  }

  return (
    <div className={`flex items-center gap-3 py-2 border-b border-slate-800 min-h-[44px] ${item.isPacked ? 'opacity-40' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600 hover:border-slate-400'
        }`}
      >
        {item.isPacked && '✓'}
      </button>
      <span className={`text-sm flex-1 min-w-0 truncate ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
        {item.name}
      </span>
      <QtyBadge qty={item.qty} onEdit={onQtyChange} compact />
      <button
        onClick={handleRemove}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded bg-red-950 text-red-400 hover:bg-red-900 text-xs"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Update PackingColumn to pass onRestore**

In `src/components/packing/PackingColumn.tsx`, add `onRestore` to the Props interface:

```typescript
interface Props {
  categories: string[]
  items: TripItem[]
  onToggle: (id: string) => void
  onQtyChange: (id: string, qty: number) => void
  onRemove: (id: string) => void
  onRestore: (id: string) => void
}
```

And pass it through to PackingItem:

```tsx
              <PackingItem key={item.id} item={item}
                onToggle={() => onToggle(item.id)}
                onQtyChange={qty => onQtyChange(item.id, qty)}
                onRemove={() => onRemove(item.id)}
                onRestore={() => onRestore(item.id)}
              />
```

- [ ] **Step 4: Update PackingView to provide onRestore**

In `src/components/packing/PackingView.tsx`, use `isIncluded: false` for removal and `isIncluded: true` for restore. This avoids needing to stash and re-add item data — the item stays in the array, just hidden.

Replace `handleRemove` in PackingView:

```typescript
  function handleRemove(itemId: string) {
    updateTripItem(trip!.id, itemId, { isIncluded: false })
  }

  function handleRestore(itemId: string) {
    updateTripItem(trip!.id, itemId, { isIncluded: true })
  }
```

Pass both to PackingColumn:

```tsx
        <PackingColumn categories={LEFT_CATS} items={trip.items} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} onRestore={handleRestore} />
        <PackingColumn categories={RIGHT_CATS} items={trip.items} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} onRestore={handleRestore} />
```

- [ ] **Step 5: Improve LastMinuteSection — better visual separator, bigger targets**

Replace the full contents of `src/components/packing/LastMinuteSection.tsx`:

```typescript
import { useState } from 'react'
import type { TripItem } from '../../types'
import { useStore } from '../../store'

interface Props { items: TripItem[]; onToggle: (id: string) => void; tripId: string }

export function LastMinuteSection({ items, onToggle, tripId }: Props) {
  const addTripItem = useStore(s => s.addTripItem)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (items.length === 0) return null

  function handleAdd() {
    if (!newName.trim()) return
    addTripItem(tripId, {
      masterItemId: null, name: newName.trim(), qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: true, isEssential: false, category: 'Misc'
    })
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500">Last-minute</h3>
        <span className="text-xs text-slate-600">pack when you're done using them</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map(item => (
          <button key={item.id} onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors min-h-[44px] ${
              item.isEssential ? 'border-amber-800 bg-amber-950/50' : 'border-slate-700 bg-slate-900'
            } ${item.isPacked ? 'opacity-40' : ''}`}
          >
            <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
              item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : item.isEssential ? 'border-amber-700' : 'border-slate-600'
            }`}>
              {item.isPacked && '✓'}
            </span>
            <span className={item.isPacked ? 'line-through text-slate-500' : 'text-slate-300'}>{item.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-3">
        {adding ? (
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Item name..."
              autoFocus
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button onClick={handleAdd} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-sm text-amber-500 hover:text-amber-400">+ Add last-minute item</button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Improve EssentialsGate — proper checkboxes**

In `src/components/packing/EssentialsGate.tsx`, replace the button rendering for each item:

```tsx
            <label key={item.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                isConfirmed ? 'bg-green-900 text-green-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={() => setConfirmed(s => { const n = new Set(s); isConfirmed ? n.delete(item.id) : n.add(item.id); return n })}
                className="rounded border-slate-600"
              />
              {item.name}
            </label>
```

- [ ] **Step 7: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/packing/
git commit -m "feat: mobile packing view overhaul — single column, bigger targets, undo on remove"
```

---

### Task 7: Replace browser dialogs across manage views

**Files:**
- Modify: `src/components/manage/MasterListView.tsx`
- Modify: `src/components/manage/KitsView.tsx`
- Modify: `src/components/manage/ExportImport.tsx`
- Modify: `src/components/manage/NotionImport.tsx`
- Modify: `src/components/manage/TrashView.tsx`

- [ ] **Step 1: MasterListView — soft delete with undo toast instead of confirm()**

In `src/components/manage/MasterListView.tsx`, add import: `import { toastUndo } from '../../store/toastStore'`

Also import `restoreMasterItem` from the store:
```typescript
  const restoreMasterItem = useStore(s => s.restoreMasterItem)
```

Replace the delete button:

```tsx
<button onClick={() => {
  deleteMasterItem(item.id)
  toastUndo(`"${item.name}" moved to trash`, () => restoreMasterItem(item.id))
}} className="text-xs text-slate-600 hover:text-red-400">del</button>
```

- [ ] **Step 2: KitsView — delete with undo toast**

In `src/components/manage/KitsView.tsx`, add import: `import { toastUndo } from '../../store/toastStore'`

The kit delete is a hard delete. Add a `restoreKit` approach: instead of undo (which requires keeping the kit data), use a confirm modal. Actually, keep it simple — save the kit data before deleting, undo re-adds it.

```tsx
<button onClick={() => {
  const savedKit = { name: kit.name, items: [...kit.items] }
  deleteKit(kit.id)
  toastUndo(`Kit "${kit.name}" deleted`, () => addKit(savedKit))
}} className="text-xs text-slate-500 hover:text-red-400">delete</button>
```

Add `addKit` to the store destructuring: `const addKit = useStore(s => s.addKit)`

- [ ] **Step 3: ExportImport — toast instead of alert()**

In `src/components/manage/ExportImport.tsx`, add import: `import { toast, toastError } from '../../store/toastStore'`

Replace the import handler's alert calls:

```typescript
        importData(ev.target?.result as string)
        toast('Data imported successfully.')
```

```typescript
      } catch {
        toastError('Failed to parse backup file.')
      }
```

- [ ] **Step 4: NotionImport — inline error instead of alert()**

In `src/components/manage/NotionImport.tsx`:

Add state: `const [error, setError] = useState('')`

Replace the alert in `handleParse`:
```typescript
    } catch (e) {
      setError('Failed to parse. Try again or paste fewer items.')
    }
```

Replace the alert for missing API key:
```typescript
    if (!settings.openRouterApiKey) { setError('Set an API key first in API Settings.'); return }
```

Add error display before the textarea:
```tsx
      {error && <p className="text-sm text-red-400">{error}</p>}
```

Clear error on successful parse: add `setError('')` at the start of `handleParse`.

Replace the import success alert with toast:
```typescript
import { toast } from '../../store/toastStore'
// ...
    toast(`Imported ${selected.size} items.`)
```

Also add empty state when no results:
```tsx
      {parsed && parsed.length === 0 && (
        <p className="text-sm text-slate-500">No items found in that file.</p>
      )}
```

- [ ] **Step 5: TrashView — keep confirm() for permanent delete (intentionally destructive)**

In `src/components/manage/TrashView.tsx`, the existing confirm() dialogs for "permanently delete" and "empty trash" are appropriate — these are genuinely destructive with no recovery. Leave them as-is.

- [ ] **Step 6: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/manage/MasterListView.tsx src/components/manage/KitsView.tsx src/components/manage/ExportImport.tsx src/components/manage/NotionImport.tsx
git commit -m "feat: replace alert/confirm with toasts and inline errors in manage views"
```

---

### Task 8: TripCard — inline rename, undo delete, duplicate

**Files:**
- Modify: `src/components/trips/TripCard.tsx`
- Modify: `src/store/index.ts`

- [ ] **Step 1: Add duplicateTrip action to store**

In `src/store/index.ts`, add to the interface:

```typescript
  duplicateTrip: (id: string) => string
```

Add the implementation after `deleteTrip`:

```typescript
      duplicateTrip: (id) => {
        const trip = get().trips.find(t => t.id === id)
        if (!trip) return ''
        const newId = uuid()
        set(s => ({
          trips: [...s.trips, {
            ...trip,
            id: newId,
            name: `${trip.name} (copy)`,
            createdAt: new Date().toISOString(),
            departureDate: new Date().toISOString().split('T')[0],
            completedAt: null,
            items: trip.items.map(item => ({
              ...item,
              id: uuid(),
              isPacked: false,
              isIncluded: true,
            })),
          }]
        }))
        return newId
      },
```

- [ ] **Step 2: Rewrite TripCard with inline rename, undo delete, duplicate**

Replace the full contents of `src/components/trips/TripCard.tsx`:

```typescript
import { useState } from 'react'
import type { Trip } from '../../types'
import { ProgressBar } from '../common/ProgressBar'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { toastUndo } from '../../store/toastStore'

export function TripCard({ trip }: { trip: Trip }) {
  const included = trip.items.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const isComplete = !!trip.completedAt
  const isActive = !isComplete
  const navigate = useNavigate()
  const renameTrip = useStore(s => s.renameTrip)
  const deleteTrip = useStore(s => s.deleteTrip)
  const addTrip = useStore(s => s.addTrip)
  const duplicateTrip = useStore(s => s.duplicateTrip)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(trip.name)

  function handleRename(e: React.MouseEvent) {
    e.stopPropagation()
    setEditName(trip.name)
    setEditing(true)
  }

  function commitRename() {
    if (editName.trim() && editName.trim() !== trip.name) {
      renameTrip(trip.id, editName.trim())
    }
    setEditing(false)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const savedTrip = { ...trip, items: [...trip.items] }
    deleteTrip(trip.id)
    toastUndo(`"${trip.name}" deleted`, () => {
      addTrip({
        name: savedTrip.name,
        departureDate: savedTrip.departureDate,
        profile: savedTrip.profile,
        activeKitIds: savedTrip.activeKitIds,
        items: savedTrip.items,
        completedAt: savedTrip.completedAt,
      })
    })
  }

  function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    const newId = duplicateTrip(trip.id)
    if (newId) navigate(`/trip/${newId}`)
  }

  return (
    <div
      onClick={() => !editing && navigate(`/trip/${trip.id}`)}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false) }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none"
            />
          ) : (
            <h3 className="font-semibold text-slate-100 truncate">{trip.name}</h3>
          )}
          <p className="text-xs text-slate-500 mt-0.5">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={handleDuplicate} className="text-xs text-slate-600 hover:text-indigo-400">copy</button>
          <button onClick={handleRename} className="text-xs text-slate-600 hover:text-indigo-400">rename</button>
          <button onClick={handleDelete} className="text-xs text-slate-600 hover:text-red-400">del</button>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isComplete ? 'bg-slate-800 text-slate-500' : 'bg-indigo-900 text-indigo-300'}`}>
            {isComplete ? 'done' : 'packing'}
          </span>
        </div>
      </div>
      {isActive && <ProgressBar packed={packed.length} total={included.length} />}
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/trips/TripCard.tsx src/store/index.ts
git commit -m "feat: trip card inline rename, undo delete, duplicate trip"
```

---

### Task 9: NewTripForm — validation, AI error handling, loading skeleton

**Files:**
- Modify: `src/components/trips/NewTripForm.tsx`

- [ ] **Step 1: Add validation, inline AI errors, and loading skeleton**

This is a large file. Make these changes to `src/components/trips/NewTripForm.tsx`:

Add state for validation errors and AI error:
```typescript
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [aiError, setAiError] = useState('')
```

Replace `handleNlSubmit` to use inline error:
```typescript
  async function handleNlSubmit() {
    if (!nlInput.trim() || !settings.openRouterApiKey) return
    setNlLoading(true)
    setAiError('')
    try {
      const parsed = await parseTripDescription(settings.openRouterApiKey, nlInput)
      const items = generateTripItems(masterItems, parsed)
      setProfile({ duration: parsed.duration, weather: parsed.weather, type: parsed.type, mode: parsed.mode, nlDescription: nlInput })
      setName(parsed.name)
      setGeneratedItems(items)
      setStep('kits')
    } catch (e: any) {
      setAiError(e.message || 'AI parsing failed. Fill in manually below.')
    } finally {
      setNlLoading(false)
    }
  }
```

Add validation to `handleGenerate`:
```typescript
  function handleGenerate() {
    const errs: Record<string, string> = {}
    if (!name.trim() && !nlInput.trim()) errs.name = 'Trip name is required'
    if (!departureDate) errs.date = 'Departure date is required'
    if (profile.duration < 1) errs.duration = 'Duration must be at least 1 day'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const items = generateTripItems(masterItems, profile)
    setGeneratedItems(items)
    setStep('kits')
  }
```

Show AI error inline (after the Generate button):
```tsx
          {aiError && (
            <div className="text-sm text-red-400 bg-red-950/50 rounded-lg px-3 py-2">
              {aiError}
              <button onClick={handleNlSubmit} className="ml-2 text-indigo-400 hover:text-indigo-300 underline">Try again</button>
            </div>
          )}
```

Add validation error display below each field. Example for name:
```tsx
        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
```

For departure date:
```tsx
        {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
```

For duration:
```tsx
        {errors.duration && <p className="text-xs text-red-400 mt-1">{errors.duration}</p>}
```

Also update the "Generate list" button to be disabled when required fields are missing:

```tsx
      <button onClick={handleGenerate} disabled={!name.trim() || !departureDate || profile.duration < 1} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold">Generate list →</button>
```

Add a loading skeleton when NL is generating. After `setStep('kits')` in the NL flow, show a skeleton in the review step by adding a `loading` state check:

```tsx
  if (step === 'review' && nlLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-slate-100">Generating your list...</h2>
        {['Toiletries', 'Clothing', 'Electronics'].map(cat => (
          <section key={cat}>
            <div className="h-3 w-24 bg-slate-800 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-800/50 rounded animate-pulse" />)}
            </div>
          </section>
        ))}
      </div>
    )
  }
```

- [ ] **Step 2: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/trips/NewTripForm.tsx
git commit -m "feat: trip form validation, inline AI errors, loading skeleton"
```

---

### Task 10: Navigation — manage default route, empty states, TripList polish

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/trips/TripList.tsx`
- Modify: `src/components/manage/MasterListView.tsx`
- Modify: `src/components/manage/KitsView.tsx`
- Modify: `src/components/manage/ItemForm.tsx`
- Modify: `src/components/manage/KitForm.tsx`

- [ ] **Step 1: Default /manage to /manage/items**

In `src/App.tsx`, add import: `import { Navigate } from 'react-router-dom'`

Add an index route inside the manage layout:
```tsx
          <Route path="/manage" element={<ManageLayout />}>
            <Route index element={<Navigate to="items" replace />} />
            <Route path="items" element={<MasterListView />} />
```

- [ ] **Step 2: TripList — "all completed" empty state**

In `src/components/trips/TripList.tsx`, after the existing "no trips" empty state, add:

```tsx
      {active.length === 0 && past.length > 0 && (
        <p className="text-slate-500 text-center py-6">All packed! <Link to="/trip/new" className="text-indigo-400 underline">Plan your next trip.</Link></p>
      )}
```

- [ ] **Step 3: MasterListView — no-filter-results message**

In `src/components/manage/MasterListView.tsx`, after the grouped sections, add:

```tsx
      {filter && Object.keys(grouped).length === 0 && (
        <p className="text-sm text-slate-500 text-center py-6">No items match "{filter}".</p>
      )}
```

- [ ] **Step 4: KitsView — empty state**

Read `src/components/manage/KitsView.tsx` and add after the kit list:

```tsx
      {kits.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-6">No kits yet. Create one to group items for specific trip types.</p>
      )}
```

- [ ] **Step 5: ItemForm — validation feedback**

In `src/components/manage/ItemForm.tsx`, add state: `const [nameError, setNameError] = useState(false)`

Update handleSave:
```typescript
  function handleSave() {
    if (!form.name.trim()) { setNameError(true); return }
    setNameError(false)
    if (item) updateMasterItem(item.id, form)
    else addMasterItem(form)
    onClose()
  }
```

Add error display below the name input:
```tsx
        <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(false) }} placeholder="Item name" className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 ${nameError ? 'border-red-500' : 'border-slate-700'}`} />
        {nameError && <p className="text-xs text-red-400">Name is required</p>}
```

- [ ] **Step 6: KitForm — validation feedback**

In `src/components/manage/KitForm.tsx`, add state: `const [nameError, setNameError] = useState(false)`

Update handleSave:
```typescript
  function handleSave() {
    if (!name.trim()) { setNameError(true); return }
    setNameError(false)
    if (kit) updateKit(kit.id, { name, items })
    else addKit({ name, items })
    onClose()
  }
```

Update the name input:
```tsx
        <input value={name} onChange={e => { setName(e.target.value); setNameError(false) }} placeholder="Kit name (e.g. Hiking)" className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 ${nameError ? 'border-red-500' : 'border-slate-700'}`} />
        {nameError && <p className="text-xs text-red-400">Name is required</p>}
```

- [ ] **Step 7: Verify**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/components/trips/TripList.tsx src/components/manage/MasterListView.tsx src/components/manage/KitsView.tsx src/components/manage/ItemForm.tsx src/components/manage/KitForm.tsx
git commit -m "feat: manage default route, empty states, form validation"
```

---

### Task 11: Final verification and deploy

**Files:**
- None new

- [ ] **Step 1: Full build and test**

Run: `npm run build && npm test`
Expected: Build succeeds, all tests pass.

- [ ] **Step 2: Manual smoke test**

Run `npm run dev` and verify:
1. Trip list loads, shows trips
2. Create a new trip (manual flow) — validation shows if name empty
3. Packing view: single column on mobile-width, items have visible remove button, qty stepper works
4. Remove an item → toast appears with Undo
5. Manage → defaults to Master list
6. Delete a master item → toast with Undo
7. Essentials gate uses checkboxes
8. Modals dismiss with Escape key
9. Duplicate a trip from trip card

- [ ] **Step 3: Deploy to server**

```bash
git push
scp -r dist/* root@94.130.96.213:/var/www/pack/
```

- [ ] **Step 4: Commit deploy script if not already tracked**

If any final fixes were needed, commit them:
```bash
git add -A && git commit -m "fix: post-verification fixes" || echo "nothing to fix"
git push
```
