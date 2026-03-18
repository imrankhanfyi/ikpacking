export async function openRouterChat(
  apiKey: string,
  model: string,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5173',
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  })
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}
