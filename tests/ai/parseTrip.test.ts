import { describe, it, expect, vi } from 'vitest'
import { parseTripDescription } from '../../src/ai/parseTrip'

vi.mock('../../src/ai/client', () => ({
  openRouterChat: vi.fn().mockResolvedValue(JSON.stringify({
    name: 'Edinburgh Mar 26',
    duration: 5,
    weather: 'cold',
    type: 'business',
    mode: 'carry-on',
  }))
}))

describe('parseTripDescription', () => {
  it('returns a structured TripProfile from NL description', async () => {
    const result = await parseTripDescription('fake-key', '5 days Edinburgh, cold, carry-on, work dinner')
    expect(result.duration).toBe(5)
    expect(result.weather).toBe('cold')
    expect(result.type).toBe('business')
    expect(result.mode).toBe('carry-on')
  })
})
