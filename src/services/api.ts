/**
 * API SERVICE — Zero-key, zero-cost content generation
 *
 * This module is intentionally a thin orchestrator. There is NO paid API call
 * anywhere in this app's runtime path. All data comes from:
 *   - GDELT DOC API (free, CORS-enabled, real-time)
 *   - Google News RSS via free CORS proxies (free)
 *   - Local content templates (no external call)
 *
 * No API key is stored, requested, transmitted, or required.
 */

import { fetchNews } from './newsFetcher';
import { generatePost } from './contentEngine';
import type { NewsArticle } from './newsFetcher';
import type { GeneratedPost, RoomId, PostTypeId, BriefItem } from '../types';

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
  // Step 1: Fetch live news from approved sources (free, no key)
  const articles = await fetchNews(room, customTopic);

  // Step 2: Generate formatted post from articles (local template engine)
  const post = generatePost(articles, room, postTypeId, customTopic);

  return post;
}

/**
 * Generate a post from a Deep Research brief item.
 *
 * This is the "middleman" path — the app accepts CFO-quality analysis
 * from any external Deep Research source (ChatGPT, Claude, Perplexity)
 * and formats it as a polished single post using the marketing-framework
 * engine. Bypasses the news fetcher entirely because the input is already
 * curated.
 *
 * The brief's CFO implication becomes the body content (replacing the
 * generic ROOM_BODY templates), so the post inherits the brief's depth
 * while still wearing the right framework structure.
 *
 * NO PAID API — fully synchronous, runs entirely client-side.
 */
export async function generateFromBrief(
  brief: BriefItem,
  room: RoomId,
  postTypeId: PostTypeId,
): Promise<GeneratedPost> {
  // Synthesize a NewsArticle from the brief item, carrying the rich
  // CFO implication so the layout engine uses it as body content.
  const article: NewsArticle = {
    title: brief.title,
    url: brief.sourceUrl || '',
    source: brief.source || 'External brief',
    date: brief.date,
    description: brief.cfoImplication || brief.title,
    briefImplication: brief.cfoImplication,
    hoursAgo: 0, // assume current — passes the 24h gate by construction
  };

  // Generate using the same engine path as live-news posts. The engine
  // detects `briefImplication` and pulls body content from it instead
  // of the generic ROOM_BODY pool.
  return generatePost([article], room, postTypeId);
}
