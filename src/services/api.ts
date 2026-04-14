/**
 * API SERVICE — Zero-key content generation
 *
 * Replaces Anthropic Claude API with:
 *   - GDELT + Google News RSS for live data (free, no key)
 *   - Content engine for post generation (template-based)
 *
 * The app works instantly — no API key, no setup, no cost.
 */

import { fetchNews } from './newsFetcher';
import { generatePost } from './contentEngine';
import type { GeneratedPost, RoomId, PostTypeId } from '../types';

/**
 * Generate a post using live news data. No API key required.
 *
 * @param room - The intelligence room (growth/capital/risk/world)
 * @param postTypeId - The post format (observation/alert/poll/etc.)
 * @param customTopic - Optional custom topic override
 * @returns GeneratedPost ready for QA validation and display
 */
export async function generateContent(
  room: RoomId,
  postTypeId: PostTypeId,
  customTopic?: string,
): Promise<GeneratedPost> {
  // Step 1: Fetch live news from approved sources
  const articles = await fetchNews(room, customTopic);

  // Step 2: Generate formatted post from articles
  const post = generatePost(articles, room, postTypeId, customTopic);

  return post;
}

/**
 * Legacy API key functions — kept as no-ops for backward compatibility.
 * These do nothing now since no API key is needed.
 */
export function setApiKey(_key: string): void { /* no-op */ }
export function getStoredApiKey(): string { return 'live-data'; }
export function clearApiKey(): void { /* no-op */ }
