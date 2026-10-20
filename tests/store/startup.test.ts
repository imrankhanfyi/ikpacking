import { describe, it, expect, vi, beforeEach } from 'vitest'

let hydrated = false
let listener: (() => void) | null = null
vi.mock('../../src/store/index', () => ({
  useStore: { persist: { hasHydrated: () => hydrated, onFinishHydration: (cb: () => void) => { listener = cb; return () => {} } } },
}))

import { whenHydrated } from '../../src/store/startup'

beforeEach(() => { hydrated = false; listener = null })

describe('whenHydrated', () => {
  it('runs immediately if already hydrated', () => {
    hydrated = true
    const fn = vi.fn()
    whenHydrated(fn)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(listener).toBeNull()
  })
  it('waits for hydration and runs once even if the callback fires twice', () => {
    const fn = vi.fn()
    whenHydrated(fn)
    expect(fn).not.toHaveBeenCalled()
    listener!(); listener!()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
