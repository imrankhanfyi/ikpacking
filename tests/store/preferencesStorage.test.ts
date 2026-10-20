import { describe, it, expect, vi, beforeEach } from 'vitest'

const { get, set, remove } = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() }))
vi.mock('@capacitor/preferences', () => ({ Preferences: { get, set, remove } }))

import { preferencesStorage } from '../../src/store/preferencesStorage'

beforeEach(() => { get.mockReset(); set.mockReset(); remove.mockReset() })

describe('preferencesStorage', () => {
  it('getItem returns the stored value or null', async () => {
    get.mockResolvedValueOnce({ value: 'abc' })
    expect(await preferencesStorage.getItem('k')).toBe('abc')
    expect(get).toHaveBeenCalledWith({ key: 'k' })
    get.mockResolvedValueOnce({ value: null })
    expect(await preferencesStorage.getItem('k')).toBeNull()
  })
  it('setItem and removeItem delegate', async () => {
    await preferencesStorage.setItem('k', 'v')
    expect(set).toHaveBeenCalledWith({ key: 'k', value: 'v' })
    await preferencesStorage.removeItem('k')
    expect(remove).toHaveBeenCalledWith({ key: 'k' })
  })
})
