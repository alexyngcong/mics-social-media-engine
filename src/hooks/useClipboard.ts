import { useRef, useCallback } from 'react';
import { useAppStore } from '../store/appStore';

export function useClipboard() {
  const fallbackRef = useRef<HTMLTextAreaElement | null>(null);
  const setCopied = useAppStore((s) => s.setCopied);

  const copy = useCallback(
    async (text: string, label: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // Fallback for older browsers
        if (fallbackRef.current) {
          fallbackRef.current.value = text;
          fallbackRef.current.select();
          document.execCommand('copy');
        }
      }
      setCopied(label);
      setTimeout(() => setCopied(''), 2500);
    },
    [setCopied]
  );

  return { copy, fallbackRef };
}
