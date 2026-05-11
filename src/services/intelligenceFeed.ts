/**
 * Intelligence Feed loader.
 *
 * Reads the news-latest.json file produced by the GitHub Actions
 * cron at `scripts/fetch-news.mjs`. Same-origin fetch — no CORS,
 * no proxy chain, works in any browser/network.
 *
 * The file is committed to the gh-pages branch and served from
 * the same origin as the app, so the fetch is unconditional and
 * fast (cached aggressively by the browser between cron updates).
 */

import type { IntelligenceFeed, IntelligenceItem, RoomId } from '../types';

const FEED_URL = `${import.meta.env.BASE_URL || '/'}news-latest.json`;
const CACHE_TTL_MS = 60_000; // re-fetch at most once per minute

let cached: { feed: IntelligenceFeed; fetchedAt: number } | null = null;

/**
 * Fetch the latest intelligence feed. Returns null if the file is
 * unreachable or malformed (e.g., before the first Actions run completes).
 */
export async function loadIntelligenceFeed(forceRefresh = false): Promise<IntelligenceFeed | null> {
  const now = Date.now();
  if (!forceRefresh && cached && (now - cached.fetchedAt) < CACHE_TTL_MS) {
    return cached.feed;
  }

  try {
    // Cache-bust at the minute level so users see updates as the cron commits them
    const url = `${FEED_URL}?t=${Math.floor(now / 60_000)}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const feed = (await resp.json()) as IntelligenceFeed;
    if (!feed || !feed.rooms) return null;
    cached = { feed, fetchedAt: now };
    return feed;
  } catch {
    return null;
  }
}

/** Get all items across all rooms, sorted by score desc. */
export function getAllItems(feed: IntelligenceFeed): IntelligenceItem[] {
  const all: IntelligenceItem[] = [];
  for (const room of ['growth', 'capital', 'risk', 'world'] as RoomId[]) {
    all.push(...feed.rooms[room]);
  }
  return all.sort((a, b) => b.score - a.score);
}

/** Get items for a specific room, already sorted by score desc by the fetcher. */
export function getRoomItems(feed: IntelligenceFeed, room: RoomId): IntelligenceItem[] {
  return feed.rooms[room] || [];
}

/** Format the feed's age relative to "now" for the UI. */
export function formatFeedAge(feed: IntelligenceFeed): string {
  const generated = Date.parse(feed.generatedAt);
  if (isNaN(generated)) return 'unknown';
  const minutes = Math.round((Date.now() - generated) / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
