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

describe('loadFromServer (server-authoritative library, trips unioned)', () => {
  it('replaces the local library with the server library; unions trips by id', async () => {
    // Server library has DIFFERENT ids for the same-named items (the reseed case
    // that caused duplication). Taking server wholesale must NOT duplicate them.
    const serverData = {
      masterItems: [{ id: 's-razor', name: 'Razor' }, { id: 's-tooth', name: 'Toothbrush' }],
      kits: [{ id: 's-kit', name: 'International', items: [] }],
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
      masterItems: [{ id: 'l-razor', name: 'Razor' }, { id: 'l-tooth', name: 'Toothbrush' }] as any,
      kits: [{ id: 'l-kit', name: 'International', items: [] }] as any,
      trips: [
        { id: 'local-only', name: 'LocalTrip' },
        { id: 'shared', name: 'OldName' },
      ] as any,
    })

    resolveGet()
    const ok = await loadFromServer()
    expect(ok).toBe(true)

    const state = useStore.getState()
    // Library is exactly the server's — no duplication from differing ids
    expect(state.masterItems.map(i => i.id).sort()).toEqual(['s-razor', 's-tooth'])
    expect(state.kits.map(k => k.id)).toEqual(['s-kit'])

    // Trips: local-only preserved, server-only added, server wins the collision
    const trips = Object.fromEntries(state.trips.map(t => [t.id, t.name]))
    expect(trips['local-only']).toBe('LocalTrip')
    expect(trips['server-only']).toBe('FromServer')
    expect(trips['shared']).toBe('NewName')

    // Pushed back up: server library + unioned trips
    const pushed = JSON.parse(puts[puts.length - 1].options.body as string)
    expect(pushed.masterItems.map((i: { id: string }) => i.id).sort()).toEqual(['s-razor', 's-tooth'])
    expect(pushed.trips.map((t: { id: string }) => t.id).sort()).toEqual(
      ['local-only', 'server-only', 'shared']
    )
  })

  it('keeps the local library when the server library is empty (fresh server)', async () => {
    const serverData = { masterItems: [], kits: [], trips: [], settings: {} }
    const { mockFetch, resolveGet, puts } = makeFetch(serverData)
    vi.stubGlobal('fetch', mockFetch)

    const { useStore } = await import('../../src/store/index')
    const { loadFromServer } = await import('../../src/store/sync')

    useStore.setState({
      settings: { ...useStore.getState().settings, syncToken: 'token-abc' },
      masterItems: [{ id: 'l-razor', name: 'Razor' }] as any,
      kits: [{ id: 'l-kit', name: 'International', items: [] }] as any,
      trips: [{ id: 'local-trip', name: 'LocalTrip' }] as any,
    })

    resolveGet()
    await loadFromServer()

    const state = useStore.getState()
    // Empty server must NOT wipe the local library
    expect(state.masterItems.map(i => i.id)).toEqual(['l-razor'])
    expect(state.kits.map(k => k.id)).toEqual(['l-kit'])
    expect(state.trips.map(t => t.id)).toEqual(['local-trip'])

    // Local state pushed up to seed the fresh server
    const pushed = JSON.parse(puts[puts.length - 1].options.body as string)
    expect(pushed.masterItems.map((i: { id: string }) => i.id)).toEqual(['l-razor'])
  })
})
