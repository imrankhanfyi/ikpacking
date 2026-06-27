import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mergeData } from '../../shared/syncMerge.mjs'

// Isolated per test: module-level `loaded`/`stopped` and subscriptions persist
// across tests unless we reset the module graph each time.
beforeEach(() => {
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

// --- record builders ---------------------------------------------------------
const titem = (id: string, updatedAt: string, isPacked = false, extra: Record<string, unknown> = {}) =>
  ({ id, masterItemId: null, name: id, qty: 1, isIncluded: true, isPacked, isLastMinute: false, isEssential: false, category: 'Misc', updatedAt, deletedAt: null, ...extra }) as any

const ttrip = (id: string, updatedAt: string, items: unknown[] = [], extra: Record<string, unknown> = {}) =>
  ({ id, name: id, createdAt: updatedAt, departureDate: '2026-01-01', completedAt: null, profile: {}, activeKitIds: [], items, updatedAt, deletedAt: null, ...extra }) as any

const mitem = (id: string, updatedAt: string, extra: Record<string, unknown> = {}) =>
  ({ id, name: id, category: 'Misc', tags: [], defaultQty: 1, qtyBasis: 'fixed', isLastMinute: false, isEssential: false, updatedAt, deletedAt: null, ...extra }) as any

// Faithful mini-server: PUT merges via the REAL mergeData and returns the merged
// doc, exactly like server/server.mjs. GET returns current state (optionally
// blocked on a promise to test ordering).
function makeServer(initial: Record<string, unknown> = {}, opts: { blockGet?: Promise<void> } = {}) {
  let state: any = mergeData(initial, {})
  const puts: Array<{ url: string; options: RequestInit }> = []

  const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    const method = options?.method ?? 'GET'
    if (method === 'GET') {
      if (opts.blockGet) await opts.blockGet
      return { ok: true, status: 200, json: async () => state } as Response
    }
    puts.push({ url, options: options! })
    const body = JSON.parse(options!.body as string)
    if ((body.schemaVersion ?? 0) < 2) {
      return { ok: false, status: 426, json: async () => ({}) } as Response
    }
    state = mergeData(state, body)
    return { ok: true, status: 200, json: async () => state } as Response
  })

  return { fetchMock, puts, getState: () => state }
}

function setToken(useStore: any, masterItems: unknown[] = [], kits: unknown[] = [], trips: unknown[] = []) {
  useStore.setState({
    settings: { ...useStore.getState().settings, syncToken: 'token-abc', syncUrl: 'https://x' },
    masterItems, kits, trips,
  })
}

// --- ordering invariants (still valid under the new model) -------------------
describe('startSync ordering', () => {
  it('(a) auto-save does NOT fire before loadFromServer resolves', async () => {
    const { resolve: resolveGet, promise: blockGet } = Promise.withResolvers<void>()
    const { fetchMock, puts } = makeServer({}, { blockGet })
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { startSync } = await import('../../src/store/sync')
    setToken(useStore, [], [], [])

    startSync() // not awaited — GET is blocked
    useStore.setState({ trips: [ttrip('t1', '2026-01-01T00:00:00.000Z')] })
    await vi.advanceTimersByTimeAsync(2000)

    expect(puts).toHaveLength(0) // subscriber not attached until load resolves
    resolveGet()
  })

  it('(b) auto-save DOES fire after load resolves and a change occurs', async () => {
    const { fetchMock, puts } = makeServer({})
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { startSync } = await import('../../src/store/sync')
    setToken(useStore, [], [], [])

    await startSync()
    const before = puts.length
    useStore.setState({ trips: [ttrip('t1', '2026-06-01T00:00:00.000Z')] })
    await vi.advanceTimersByTimeAsync(2000)

    expect(puts.length).toBeGreaterThan(before)
  })
})

// --- LWW load behavior -------------------------------------------------------
describe('loadFromServer (LWW, non-destructive)', () => {
  it('preserves local-only trips, adds server-only, merges collisions by updatedAt', async () => {
    const server = {
      masterItems: [mitem('m1', '2026-01-01T00:00:00.000Z')],
      trips: [
        ttrip('shared', '2026-02-01T00:00:00.000Z', [], { name: 'ServerNewer' }),
        ttrip('server-only', '2026-01-01T00:00:00.000Z'),
      ],
    }
    const { fetchMock } = makeServer(server)
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { loadFromServer } = await import('../../src/store/sync')
    setToken(useStore,
      [mitem('m2', '2026-01-01T00:00:00.000Z')],
      [],
      [ttrip('local-only', '2026-01-01T00:00:00.000Z'), ttrip('shared', '2026-01-01T00:00:00.000Z', [], { name: 'LocalOlder' })],
    )

    expect(await loadFromServer()).toBe(true)
    const s = useStore.getState()
    const trips = Object.fromEntries(s.trips.map((t: any) => [t.id, t.name]))
    expect(trips['local-only']).toBeDefined()       // local-only preserved (NOT wiped)
    expect(trips['server-only']).toBeDefined()       // server-only added
    expect(trips['shared']).toBe('ServerNewer')      // newer updatedAt wins
    // Library is unioned, not wholesale-replaced.
    expect(s.masterItems.map((i: any) => i.id).sort()).toEqual(['m1', 'm2'])
  })

  it('the reported bug: a locally-newer packed item is NOT reverted by older server state', async () => {
    const server = { trips: [ttrip('montana', '2026-06-01T00:00:00.000Z', [titem('i1', '2026-06-01T00:00:00.000Z', false)])] }
    const { fetchMock } = makeServer(server)
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { loadFromServer } = await import('../../src/store/sync')
    setToken(useStore, [], [], [
      ttrip('montana', '2026-06-10T00:00:00.000Z', [titem('i1', '2026-06-10T12:00:00.000Z', true)]),
    ])

    await loadFromServer()
    const item = useStore.getState().trips.find((t: any) => t.id === 'montana').items[0]
    expect(item.isPacked).toBe(true)
  })
})

// --- the ping-pong / fixpoint guard (the critical concurrency invariant) ------
describe('remote-apply guard', () => {
  it('loading an already-converged server produces ZERO puts and no churn', async () => {
    const records = { masterItems: [mitem('m1', '2026-01-01T00:00:00.000Z')], trips: [ttrip('t1', '2026-01-01T00:00:00.000Z')] }
    const { fetchMock, puts } = makeServer(records)
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { loadFromServer } = await import('../../src/store/sync')
    // Local is canonically identical to the server.
    setToken(useStore, records.masterItems, [], records.trips)

    await loadFromServer()
    expect(puts).toHaveLength(0) // nothing new either way -> no save
  })

  it('applying a server response twice is a fixpoint (second load adds no puts)', async () => {
    const { fetchMock, puts } = makeServer({ trips: [ttrip('t1', '2026-02-01T00:00:00.000Z')] })
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { startSync, loadFromServer } = await import('../../src/store/sync')
    setToken(useStore, [], [], [ttrip('t1', '2026-01-01T00:00:00.000Z')]) // local older -> first load adopts server

    await startSync()
    await vi.advanceTimersByTimeAsync(2000)
    const afterFirst = puts.length
    await loadFromServer() // converged now
    await vi.advanceTimersByTimeAsync(2000)
    expect(puts.length).toBe(afterFirst) // no further traffic
  })
})

// --- secrets + version gate --------------------------------------------------
describe('saveToServer', () => {
  it('never sends secrets and always tags the schema version', async () => {
    const { fetchMock, puts } = makeServer({})
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { saveToServer } = await import('../../src/store/sync')
    useStore.setState({
      settings: { ...useStore.getState().settings, syncToken: 'token-abc', openRouterApiKey: 'sk-or-SECRET' },
      masterItems: [], kits: [], trips: [ttrip('t1', '2026-01-01T00:00:00.000Z')],
    })

    await saveToServer()
    const body = JSON.parse(puts[0].options.body as string)
    expect(body.schemaVersion).toBe(2)
    expect(body.openRouterApiKey).toBeUndefined()
    expect(body.syncToken).toBeUndefined()
    expect(body.settings).toBeUndefined()
  })
})

describe('schema-version gate (426)', () => {
  it('a 426 from the server stops syncing for the session', async () => {
    // Server that returns 426 on GET.
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      if ((options?.method ?? 'GET') === 'GET') return { ok: false, status: 426, json: async () => ({}) } as Response
      return { ok: true, status: 200, json: async () => ({}) } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    const { useStore } = await import('../../src/store/index')
    const { startSync } = await import('../../src/store/sync')
    setToken(useStore, [], [], [])

    await startSync()
    const callsAfterBoot = fetchMock.mock.calls.length
    useStore.setState({ trips: [ttrip('t1', '2026-06-01T00:00:00.000Z')] })
    await vi.advanceTimersByTimeAsync(2000)
    // Syncing halted: the post-boot change does not produce another request.
    expect(fetchMock.mock.calls.length).toBe(callsAfterBoot)
  })
})
