import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY not found. Create a .env.local file with your key.');
  process.exit(1);
}

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Rate limit exceeded. Try again in a minute.' },
});
app.use('/api', limiter);

app.post('/api/generate', async (req, res) => {
  const { system, userMessage, model, maxTokens } = req.body;

  if (!system || !userMessage) {
    res.status(400).json({ error: 'Missing system or userMessage' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens || 1500,
        system,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      res.status(response.status).json({ error: `API error: ${response.status}` });
      return;
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const textBlocks = (data.content || [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text?: string }) => b.text || '')
      .join('\n');

    res.json({ text: textBlocks });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API proxy running on http://localhost:${PORT}`);
});
