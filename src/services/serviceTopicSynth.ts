/**
 * SERVICE TOPIC SYNTHESIZER
 *
 * Converts a list of selected MICS services into:
 *   1. a news-search topic string (fed to newsFetcher / GDELT)
 *   2. the dominant room (for content-engine routing)
 *   3. the consolidated track-record stat (for advisory anchoring)
 *
 * Pure functions — no side effects, no I/O.
 */
import type { RoomId } from '../types';
import { SERVICES, serviceById } from '../config/services';
import { dateFormatted } from '../config/brand';

const KEYWORD_CAP = 6; // GDELT works best with short, focused queries

/**
 * Build a news-search topic string from selected service ids.
 * Picks the highest-signal keyword from each service, dedups,
 * caps at KEYWORD_CAP, and anchors to UAE + current month/year.
 */
export function synthesizeServiceTopic(serviceIds: string[]): string {
  if (serviceIds.length === 0) return `UAE business compliance ${dateFormatted.monthYear}`;

  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const id of serviceIds) {
    const svc = serviceById(id);
    if (!svc) continue;
    // First keyword is the most representative
    const primary = svc.keywords[0];
    if (!primary) continue;
    const lc = primary.toLowerCase();
    if (seen.has(lc)) continue;
    seen.add(lc);
    keywords.push(primary);
    if (keywords.length >= KEYWORD_CAP) break;
  }

  // Prepend UAE anchor if not already present, append current month/year
  const hasUAE = keywords.some((k) => /\b(uae|gcc|dubai|abu dhabi)\b/i.test(k));
  const parts = [
    ...(hasUAE ? [] : ['UAE']),
    ...keywords,
    dateFormatted.monthYear,
  ];
  return parts.join(' ');
}

/**
 * Find the dominant room for a set of selected services.
 * Tally the room assignments, return the winner. Tie-break: 'risk'
 * (compliance posts are MICS's densest service area, sensible default).
 */
export function dominantRoom(serviceIds: string[]): RoomId {
  const counts: Record<RoomId, number> = { growth: 0, capital: 0, risk: 0, world: 0 };
  for (const id of serviceIds) {
    const svc = serviceById(id);
    if (svc) counts[svc.room] += 1;
  }
  const sorted = (Object.entries(counts) as [RoomId, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return 'risk';
  // If risk is tied for top, prefer risk
  if (sorted[0][1] === counts.risk && counts.risk > 0) return 'risk';
  return sorted[0][0];
}

/**
 * Pick the strongest track-record stat from selected services
 * (the one with the largest leading number, falling back to the
 * first non-empty stat). Used as an advisory anchor on the post.
 */
export function dominantTrackRecord(serviceIds: string[]): string | undefined {
  const stats = serviceIds
    .map((id) => serviceById(id)?.trackRecord)
    .filter((s): s is string => Boolean(s));
  if (stats.length === 0) return undefined;
  // Prefer largest leading number (e.g. "5,000+" beats "200+")
  const scored = stats.map((s) => {
    const m = s.match(/([\d,]+)/);
    const n = m ? parseInt(m[1].replace(/,/g, ''), 10) : 0;
    return { s, n };
  });
  scored.sort((a, b) => b.n - a.n);
  return scored[0].s;
}

/** Sanity helper used by the picker footer */
export function countByPillar(serviceIds: string[]) {
  const counts = { corporate_finance: 0, operational_compliance: 0, wealth_management: 0 };
  for (const id of serviceIds) {
    const svc = serviceById(id);
    if (svc) counts[svc.pillar] += 1;
  }
  return counts;
}

/** Defensive — strip ids not in the canonical taxonomy */
export function sanitizeServiceIds(ids: string[]): string[] {
  const valid = new Set(SERVICES.map((s) => s.id));
  return ids.filter((id) => valid.has(id));
}
