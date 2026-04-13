import { useState } from 'react';
import { setApiKey, getStoredApiKey } from '../../services/api';
import { Button } from '../ui/Button';

interface ApiKeySetupProps {
  onKeySet: () => void;
}

export function ApiKeySetup({ onKeySet }: ApiKeySetupProps) {
  const [key, setKey] = useState(getStoredApiKey());
  const [error, setError] = useState('');
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    const trimmed = key.trim();
    if (!trimmed) {
      setError('Please enter your API key');
      return;
    }
    if (!trimmed.startsWith('sk-ant-')) {
      setError('Key should start with sk-ant-');
      return;
    }

    setTesting(true);
    setError('');

    // Quick validation call
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': trimmed,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });

      if (res.status === 401) {
        setError('Invalid API key. Please check and try again.');
        setTesting(false);
        return;
      }

      // Any other response means the key is valid
      setApiKey(trimmed);
      onKeySet();
    } catch {
      // Network error - save anyway, they might be offline temporarily
      setApiKey(trimmed);
      onKeySet();
    }
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-5">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-bronze to-bronze-light mb-4">
            <span className="text-ink font-serif text-3xl font-bold">M</span>
          </div>
          <h1 className="font-serif text-2xl font-semibold text-tx">
            MICS Content Engine
          </h1>
          <p className="text-tx-dim text-[12px] mt-1 tracking-wider">
            PREMIUM SOCIAL MEDIA POST GENERATOR
          </p>
        </div>

        {/* Key input card */}
        <div className="bg-ink-card border border-ink-border rounded-card-lg p-6">
          <div className="text-[10px] font-bold tracking-wider text-bronze mb-3">
            CONNECT YOUR API
          </div>
          <p className="text-tx-mid text-[13px] leading-relaxed mb-4">
            Enter your Anthropic API key to power AI content generation with live web research.
          </p>

          <label className="block text-tx-dim text-[10px] font-bold tracking-wider uppercase mb-2">
            API KEY
          </label>
          <input
            type="password"
            value={key}
            onChange={(e) => { setKey(e.target.value); setError(''); }}
            placeholder="sk-ant-api03-..."
            className="w-full px-3.5 py-3 rounded-card border border-ink-border bg-ink text-tx text-[13px] font-mono outline-none focus:border-bronze/50 transition-colors mb-4"
          />

          <Button
            variant="gold"
            fullWidth
            onClick={handleSave}
            disabled={testing || !key.trim()}
            className="!py-3.5 !text-[14px] !rounded-card-lg"
          >
            {testing ? 'Verifying...' : 'Connect & Start'}
          </Button>

          {error && (
            <div className="text-signal-red text-[12px] mt-3 text-center">{error}</div>
          )}

          <div className="mt-5 pt-4 border-t border-ink-border">
            <div className="text-tx-dim text-[11px] leading-relaxed">
              <p className="mb-2">
                <span className="text-signal-green font-semibold">Secure:</span> Your key is stored only in your browser's localStorage. It never touches any server.
              </p>
              <p>
                Get a key at{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-bronze underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-tx-ghost text-[10px] tracking-wider">
          MICS International | DIFC | v4.0
        </div>
      </div>
    </div>
  );
}
