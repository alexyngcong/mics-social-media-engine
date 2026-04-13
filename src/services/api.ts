const API_URL = 'https://api.anthropic.com/v1/messages';

function getApiKey(): string {
  const key = localStorage.getItem('mics_api_key') || '';
  if (!key) throw new Error('No API key set. Go to Settings to add your Anthropic API key.');
  return key;
}

export function setApiKey(key: string): void {
  localStorage.setItem('mics_api_key', key.trim());
}

export function getStoredApiKey(): string {
  return localStorage.getItem('mics_api_key') || '';
}

export function clearApiKey(): void {
  localStorage.removeItem('mics_api_key');
}

export async function generateContent(
  system: string,
  userMessage: string,
  options?: { model?: string; maxTokens?: number }
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: options?.model ?? 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens ?? 1500,
      system,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const msg = errorData?.error?.message || `API error: ${response.status}`;
    if (response.status === 401) throw new Error('Invalid API key. Check your key in Settings.');
    throw new Error(msg);
  }

  const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text || '')
    .join('\n');
}
