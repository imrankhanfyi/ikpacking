export class ApiError extends Error {
  kind: 'offline' | 'timeout' | 'auth' | 'rate-limit' | 'server' | 'parse'
  status?: number

  constructor(
    kind: 'offline' | 'timeout' | 'auth' | 'rate-limit' | 'server' | 'parse',
    message: string,
    status?: number
  ) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

// Deduplication: if an identical request is in-flight, reuse its promise
const pending = new Map<string, Promise<string>>()

export async function openRouterChat(
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new ApiError('offline', 'You appear to be offline. Connect to the internet and try again.')
  }

  // Dedup key: hash of the user message content (system prompts are static per function)
  const dedupKey = messages.map(m => m.content).join('|')
  const inflight = pending.get(dedupKey)
  if (inflight) return inflight

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  async function attempt(): Promise<string> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://pack.app',
      },
      body: JSON.stringify({ model, messages, temperature: 0.2 }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const body = await res.text()
      if (res.status === 401) throw new ApiError('auth', 'Invalid API key. Check your OpenRouter key in Settings.', 401)
      if (res.status === 429) throw new ApiError('rate-limit', 'Rate limited. Wait a moment and try again.', 429)
      throw new ApiError('server', `OpenRouter error ${res.status}: ${body}`, res.status)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new ApiError('parse', 'Unexpected AI response format')
    return content
  }

  const promise = (async () => {
    try {
      return await attempt()
    } catch (err: unknown) {
      if (err instanceof ApiError) throw err
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError('timeout', 'AI request timed out. Try again.')
      }
      // Retry once on network errors
      if (err instanceof TypeError) {
        return await attempt()
      }
      throw err
    } finally {
      clearTimeout(timeout)
      pending.delete(dedupKey)
    }
  })()

  pending.set(dedupKey, promise)
  return promise
}
