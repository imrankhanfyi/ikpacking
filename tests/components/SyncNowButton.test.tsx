import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../../src/store/sync', () => ({ syncNow: vi.fn() }))

beforeEach(() => {
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  })
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SyncNowButton', () => {
  it('renders nothing when no sync token is set', async () => {
    const { useStore } = await import('../../src/store/index')
    const { SyncNowButton } = await import('../../src/components/common/SyncNowButton')
    useStore.setState({ settings: { ...useStore.getState().settings, syncToken: '' } })

    const { container } = render(<SyncNowButton />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the button when a token is set, and clicking it calls syncNow', async () => {
    const { useStore } = await import('../../src/store/index')
    const { SyncNowButton } = await import('../../src/components/common/SyncNowButton')
    const { syncNow } = await import('../../src/store/sync')
    useStore.setState({ settings: { ...useStore.getState().settings, syncToken: 'token-abc' } })

    render(<SyncNowButton />)
    fireEvent.click(screen.getByText('⟳ Sync now'))
    expect(syncNow).toHaveBeenCalled()
  })

  it('renders the green ok status line from the sync status store', async () => {
    const { useStore } = await import('../../src/store/index')
    const { useSyncStatusStore } = await import('../../src/store/syncStatusStore')
    const { SyncNowButton } = await import('../../src/components/common/SyncNowButton')
    useStore.setState({ settings: { ...useStore.getState().settings, syncToken: 'token-abc' } })
    useSyncStatusStore.setState({ status: 'ok', lastSyncedAt: new Date().toISOString(), lastError: null })

    render(<SyncNowButton />)
    expect(screen.getByText(/✓ Synced/)).toBeInTheDocument()
  })

  it('renders the error status line from the sync status store', async () => {
    const { useStore } = await import('../../src/store/index')
    const { useSyncStatusStore } = await import('../../src/store/syncStatusStore')
    const { SyncNowButton } = await import('../../src/components/common/SyncNowButton')
    useStore.setState({ settings: { ...useStore.getState().settings, syncToken: 'token-abc' } })
    useSyncStatusStore.setState({ status: 'error', lastError: 'boom', lastSyncedAt: null })

    render(<SyncNowButton />)
    expect(screen.getByText('⚠ boom')).toBeInTheDocument()
  })
})
