export async function openRouterChat(
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('You appear to be offline. Connect to the internet and try again.')
  }

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
    if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`)
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== 'string') throw new Error('Unexpected AI response format')
    return content
  }

  try {
    return await attempt()
  } catch (err: any) {
    if (err.name === 'AbortError') throw new Error('AI request timed out. Try again.')
    if (err.message?.includes('fetch')) {
      return await attempt()
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
