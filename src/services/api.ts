export async function generateContent(
  system: string,
  userMessage: string,
  options?: { model?: string; maxTokens?: number }
): Promise<string> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system,
      userMessage,
      model: options?.model ?? 'claude-sonnet-4-20250514',
      maxTokens: options?.maxTokens ?? 1500,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || `API error: ${response.status}`);
  }

  const data = await response.json() as { text: string };
  return data.text;
}
