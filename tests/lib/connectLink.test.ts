import { describe, it, expect } from 'vitest'
import { buildConnectLink, parseTokenFromHash } from '../../src/lib/connectLink'

describe('buildConnectLink', () => {
  it('encodes the token in the hash fragment', () => {
    expect(buildConnectLink('https://pack.example.com', 'my-token'))
      .toBe('https://pack.example.com/#token=my-token')
  })

  it('percent-encodes special characters', () => {
    expect(buildConnectLink('https://pack.example.com', 'tok en+value'))
      .toBe('https://pack.example.com/#token=tok%20en%2Bvalue')
  })
})

describe('parseTokenFromHash', () => {
  it('returns the token for a simple hash', () => {
    expect(parseTokenFromHash('#token=abc')).toBe('abc')
  })

  it('decodes a percent-encoded token', () => {
    expect(parseTokenFromHash('#token=abc%20d')).toBe('abc d')
  })

  it('handles extra params after the token', () => {
    expect(parseTokenFromHash('#token=x&y=z')).toBe('x')
  })

  it('returns null for an empty token value', () => {
    expect(parseTokenFromHash('#token=')).toBeNull()
  })

  it('returns null when there is no token param', () => {
    expect(parseTokenFromHash('#foo=bar')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseTokenFromHash('')).toBeNull()
  })

  it('returns null for just a hash with no params', () => {
    expect(parseTokenFromHash('#')).toBeNull()
  })

  it('round-trips with buildConnectLink', () => {
    const token = 'my-secret-sync-token'
    const link = buildConnectLink('https://pack.example.com', token)
    const hash = '#' + link.split('#')[1]
    expect(parseTokenFromHash(hash)).toBe(token)
  })
})
