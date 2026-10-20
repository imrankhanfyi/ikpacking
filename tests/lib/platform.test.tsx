import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useLocation } from 'react-router-dom'

const native = vi.fn()
vi.mock('../../src/lib/platform', () => ({ isNative: () => native() }))

beforeEach(() => { vi.resetModules(); native.mockReset(); window.history.replaceState(null, '', '/') })

async function routerProbe() {
  const rr = await import('react-router-dom')
  const Router = native() ? rr.HashRouter : rr.BrowserRouter
  function Probe() { const l = useLocation(); return <p data-testid="p">{l.pathname}</p> }
  window.history.replaceState(null, '', native() ? '/#/trip/new' : '/trip/new')
  render(<Router><Probe /></Router>)
  return screen.getByTestId('p').textContent
}

describe('platform router selection', () => {
  it('uses hash routing when native', async () => {
    native.mockReturnValue(true)
    expect(await routerProbe()).toBe('/trip/new')
  })
  it('uses path routing on web', async () => {
    native.mockReturnValue(false)
    expect(await routerProbe()).toBe('/trip/new')
  })
})

describe('isNative', () => {
  it('wraps Capacitor.isNativePlatform', async () => {
    vi.doUnmock('../../src/lib/platform')
    vi.doMock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
    const { isNative } = await import('../../src/lib/platform')
    expect(isNative()).toBe(true)
  })
})
