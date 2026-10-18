import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

beforeEach(() => {
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(key => delete store[key]) },
  })
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function renderReviewStep() {
  const { NewTripForm } = await import('../../src/components/trips/NewTripForm')
  const view = render(
    <MemoryRouter>
      <NewTripForm />
    </MemoryRouter>,
  )

  fireEvent.change(screen.getByPlaceholderText('Edinburgh Mar 26'), { target: { value: 'Test trip' } })
  fireEvent.change(view.container.querySelector('input[type="date"]')!, { target: { value: '2026-11-01' } })
  fireEvent.click(screen.getByRole('button', { name: 'Generate list →' }))
  fireEvent.click(screen.getByRole('button', { name: 'Review list →' }))

  return view
}

function addClothingItem(name: string, addToMaster = false) {
  fireEvent.click(screen.getByRole('button', { name: 'Add item to Clothing' }))
  fireEvent.change(screen.getByRole('textbox', { name: 'New Clothing item' }), { target: { value: name } })
  if (addToMaster) {
    fireEvent.click(screen.getByRole('checkbox', { name: 'Also add to master list' }))
  }
  fireEvent.click(screen.getByRole('button', { name: 'Add Clothing item' }))
}

describe('NewTripForm review step', () => {
  it('adds a trip-only item from the relevant category section', async () => {
    const { useStore } = await import('../../src/store')
    await renderReviewStep()

    addClothingItem('Wedding outfit')

    const clothingSection = screen.getByRole('heading', { name: 'Clothing' }).closest('section')!
    expect(within(clothingSection).getByText('Wedding outfit')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save trip →' }))
    const item = useStore.getState().trips[0].items.find(i => i.name === 'Wedding outfit')
    expect(item).toMatchObject({ category: 'Clothing', qty: 1, masterItemId: null })
    expect(useStore.getState().masterItems.some(i => i.name === 'Wedding outfit')).toBe(false)
  })

  it('defers master-list promotion until save and links the trip item to it', async () => {
    const { useStore } = await import('../../src/store')
    await renderReviewStep()

    addClothingItem('Dinner jacket', true)

    expect(useStore.getState().masterItems.some(i => i.name === 'Dinner jacket')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Save trip →' }))

    const masterItem = useStore.getState().masterItems.find(i => i.name === 'Dinner jacket')
    const tripItem = useStore.getState().trips[0].items.find(i => i.name === 'Dinner jacket')
    expect(masterItem).toMatchObject({
      category: 'Clothing', tags: ['always'], defaultQty: 1, qtyBasis: 'fixed',
      isLastMinute: false, isEssential: false,
    })
    expect(tripItem?.masterItemId).toBe(masterItem?.id)
  })
})
