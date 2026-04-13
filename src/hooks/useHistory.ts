import { useState, useEffect, useCallback } from 'react';
import type { HistoryItem } from '../types';

const STORAGE_KEY = 'mics_social_history';
const MAX_ITEMS = 30;

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* empty storage */ }
  }, []);

  const addItem = useCallback(
    (item: HistoryItem) => {
      setItems((prev) => {
        const next = [item, ...prev].slice(0, MAX_ITEMS);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch { /* storage full */ }
        return next;
      });
    },
    []
  );

  const clearHistory = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  return { items, addItem, clearHistory };
}
