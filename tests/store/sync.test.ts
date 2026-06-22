import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Isolated per test: module-level `loaded` and subscriptions persist across tests
// unless we reset the module graph each time.
beforeEach(() => {
  // Provide a working localStorage before the store module is imported
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  })
  vi.resetModules()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// Build a mock fetch: GET blocks until resolveGet() is called; PUT is recorded.
function makeFetch(serverData: Record<string, unknown>) {
  const puts: Array<{ url: string; options: RequestInit }> = []
  const { promise: getPromise, resolve: resolveGet } = Promise.withResolvers<void>()

  const mockFetch = vi.fn(async (url: string, options?: RequestInit) => {
    if (!options?.method || options.method === 'GET') {
      await getPromise
      return { ok: true, json: async () => serverData } as Response
    }
    puts.push({ url, options: options! })
    return { ok: true } as Response
  })

  return { mockFetch, resolveGet, puts }
}

describe('startSync', () => {
  it('(a) auto-save does NOT fire before loadFromServer resolves', async () => {
    const serverData = {
      masterItems: [{ id: '1', name: 'Toothbrush' }],
      kits: [],
      trips: [],
      settings: {},
    }
    const { mockFetch, resolveGet, puts } = makeFetch(serverData)
    vi.stubGlobal('fetch', mockFetch)

    // Fresh module graph so `loaded = false` and no leftover subscribers
    const { useStore } = await import('../../src/store/index')
    const { startSync } = await import('../../src/store/sync')

    useStore.setState({
      settings: {
        ...useStore.getState().settings,
        syncToken: 'token-abc',
        syncUrl: 'https://sync.example.com',
      },
    })

    // Start sync but do NOT await — GET is blocked on getPromise
    startSync()

    // Mutate the store while the initial GET is still in-flight
    useStore.setState({ trips: [] })

    // Advance past the 1500ms debounce window
    await vi.advanceTimersByTimeAsync(2000)

    // No PUT should have fired because the subscriber hasn't been attached yet
    expect(puts).toHaveLength(0)

    // Let the load complete so the module can settle
    resolveGet()
  })

  it('(b) auto-save DOES fire after loadFromServer resolves and a store change occurs', async () => {
    const serverData = {
      masterItems: [{ id: '1', name: 'Toothbrush' }],
      kits: [],
      trips: [],
      settings: {},
    }
    const { mockFetch, resolveGet, puts } = makeFetch(serverData)
    vi.stubGlobal('fetch', mockFetch)

    const { useStore } = await import('../../src/store/index')
    const { startSync } = await import('../../src/store/sync')

    useStore.setState({
      settings: {
        ...useStore.getState().settings,
        syncToken: 'token-abc',
        syncUrl: 'https://sync.example.com',
      },
    })

    // Resolve the GET immediately so startSync can fully initialise
    resolveGet()
    await startSync()

    // Mutate the store — subscriber is now attached
    useStore.setState({ trips: [] })

    // Fire the debounce
    await vi.advanceTimersByTimeAsync(2000)

    expect(puts.length).toBeGreaterThan(0)
  })
})

describe('loadFromServer (non-destructive merge)', () => {
  it('preserves a local-only trip, and the server wins on a colliding id', async () => {
    const serverData = {
      masterItems: [{ id: 'm1', name: 'Toothbrush' }],
      kits: [],
      trips: [
        { id: 'shared', name: 'NewName' },   // collides with local — server wins
        { id: 'server-only', name: 'FromServer' },
      ],
      settings: {},
    }
    const { mockFetch, resolveGet, puts } = makeFetch(serverData)
    vi.stubGlobal('fetch', mockFetch)

    const { useStore } = await import('../../src/store/index')
    const { loadFromServer } = await import('../../src/store/sync')

    useStore.setState({
      settings: { ...useStore.getState().settings, syncToken: 'token-abc' },
      trips: [
        { id: 'local-only', name: 'LocalTrip' },
        { id: 'shared', name: 'OldName' },
      ] as any,
    })

    resolveGet()
    const ok = await loadFromServer()
    expect(ok).toBe(true)

    const trips = useStore.getState().trips
    const byId = Object.fromEntries(trips.map(t => [t.id, t.name]))

    // local-only record survived the load
    expect(byId['local-only']).toBe('LocalTrip')
    // server record was added
    expect(byId['server-only']).toBe('FromServer')
    // server won the id collision
    expect(byId['shared']).toBe('NewName')

    // The merged union was pushed back up so the server gains the local-only trip
    expect(puts.length).toBeGreaterThan(0)
    const pushed = JSON.parse(puts[puts.length - 1].options.body as string)
    expect(pushed.trips.map((t: { id: string }) => t.id).sort()).toEqual(
      ['local-only', 'server-only', 'shared']
    )
  })
})
