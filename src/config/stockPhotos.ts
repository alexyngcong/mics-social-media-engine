import type { RoomId } from '../types';

/**
 * Topic-keyword-based photo library.
 * Photos are tagged by topic keywords so banners dynamically match content.
 * All Unsplash CDN - royalty-free, CORS-enabled.
 */

const UNSPLASH = 'https://images.unsplash.com';
const PARAMS = 'w=1200&q=80&fit=crop&crop=center&auto=format';

interface TaggedPhoto {
  url: string;
  tags: string[];
}

const PHOTO_LIBRARY: TaggedPhoto[] = [
  // ── Dubai / UAE / GCC ──
  { url: `${UNSPLASH}/photo-1512453979798-5ea266f8880c?${PARAMS}`, tags: ['dubai', 'skyline', 'uae', 'city', 'growth'] },
  { url: `${UNSPLASH}/photo-1518684079-3c830dcef090?${PARAMS}`, tags: ['dubai', 'marina', 'towers', 'real-estate', 'growth'] },
  { url: `${UNSPLASH}/photo-1582407947092-47f5835e3a28?${PARAMS}`, tags: ['abu-dhabi', 'skyline', 'uae', 'growth'] },
  { url: `${UNSPLASH}/photo-1547483238-f400e65ccd56?${PARAMS}`, tags: ['dubai', 'aerial', 'city', 'infrastructure'] },
  { url: `${UNSPLASH}/photo-1546412414-e1885259563a?${PARAMS}`, tags: ['dubai', 'burj', 'landmark', 'tourism', 'growth'] },

  // ── Corporate / Business ──
  { url: `${UNSPLASH}/photo-1486406146926-c627a92ad1ab?${PARAMS}`, tags: ['office', 'tower', 'corporate', 'business', 'growth'] },
  { url: `${UNSPLASH}/photo-1560179707-f14e90ef3623?${PARAMS}`, tags: ['corporate', 'buildings', 'headquarters', 'business'] },
  { url: `${UNSPLASH}/photo-1507679799987-c73779587ccf?${PARAMS}`, tags: ['executive', 'business', 'suit', 'leadership', 'cfo'] },
  { url: `${UNSPLASH}/photo-1556761175-5973dc0f32e7?${PARAMS}`, tags: ['meeting', 'boardroom', 'corporate', 'strategy'] },
  { url: `${UNSPLASH}/photo-1497366216548-37526070297c?${PARAMS}`, tags: ['office', 'modern', 'workspace', 'startup'] },

  // ── Finance / Gold / Capital ──
  { url: `${UNSPLASH}/photo-1618044733300-9472054094ee?${PARAMS}`, tags: ['gold', 'bars', 'wealth', 'capital', 'reserve'] },
  { url: `${UNSPLASH}/photo-1611974789855-9c2a0a7236a3?${PARAMS}`, tags: ['finance', 'abstract', 'markets', 'capital'] },
  { url: `${UNSPLASH}/photo-1554224155-8d04cb21cd6c?${PARAMS}`, tags: ['trading', 'screens', 'stock', 'markets', 'capital'] },
  { url: `${UNSPLASH}/photo-1642790106117-e829e14a795f?${PARAMS}`, tags: ['gold', 'coins', 'investment', 'capital', 'wealth'] },
  { url: `${UNSPLASH}/photo-1560520653-9e0e4c89eb11?${PARAMS}`, tags: ['stock', 'exchange', 'trading', 'ipo', 'capital'] },
  { url: `${UNSPLASH}/photo-1579532537598-459ecdaf39cc?${PARAMS}`, tags: ['currency', 'money', 'cash', 'dollar', 'capital'] },
  { url: `${UNSPLASH}/photo-1621761191319-c6fb62004040?${PARAMS}`, tags: ['crypto', 'blockchain', 'digital', 'bitcoin', 'capital'] },

  // ── Charts / Data / Analytics ──
  { url: `${UNSPLASH}/photo-1526304640581-d334cdbbf45e?${PARAMS}`, tags: ['chart', 'data', 'analytics', 'numbers', 'growth'] },
  { url: `${UNSPLASH}/photo-1504384308090-c894fdcc538d?${PARAMS}`, tags: ['tech', 'laptop', 'data', 'digital'] },
  { url: `${UNSPLASH}/photo-1551288049-bebda4e38f71?${PARAMS}`, tags: ['dashboard', 'data', 'analytics', 'metrics'] },
  { url: `${UNSPLASH}/photo-1460925895917-afdab827c52f?${PARAMS}`, tags: ['chart', 'screen', 'trading', 'growth', 'markets'] },

  // ── Real Estate / Construction ──
  { url: `${UNSPLASH}/photo-1496568816309-51d7c20e3b21?${PARAMS}`, tags: ['sunrise', 'city', 'real-estate', 'skyline', 'growth'] },
  { url: `${UNSPLASH}/photo-1545324418-cc1a3fa10c00?${PARAMS}`, tags: ['building', 'architecture', 'real-estate', 'construction'] },
  { url: `${UNSPLASH}/photo-1479839672679-a46483c0e7c8?${PARAMS}`, tags: ['construction', 'crane', 'development', 'real-estate'] },

  // ── Security / Risk / Compliance ──
  { url: `${UNSPLASH}/photo-1550751827-4bd374c3f58b?${PARAMS}`, tags: ['security', 'lock', 'cyber', 'risk', 'protection'] },
  { url: `${UNSPLASH}/photo-1563986768609-322da13575f2?${PARAMS}`, tags: ['cybersecurity', 'hacker', 'risk', 'digital', 'threat'] },
  { url: `${UNSPLASH}/photo-1454165804606-c3d57bc86b40?${PARAMS}`, tags: ['documents', 'legal', 'compliance', 'risk', 'audit'] },
  { url: `${UNSPLASH}/photo-1589829545856-d10d557cf95f?${PARAMS}`, tags: ['gavel', 'law', 'regulation', 'risk', 'legal'] },
  { url: `${UNSPLASH}/photo-1633265486064-086b219458ec?${PARAMS}`, tags: ['shield', 'security', 'digital', 'risk', 'protection'] },
  { url: `${UNSPLASH}/photo-1504868584819-f8e8b4b6d7e3?${PARAMS}`, tags: ['server', 'data-center', 'tech', 'risk', 'infrastructure'] },
  { url: `${UNSPLASH}/photo-1507925921958-8a62f3d1a50d?${PARAMS}`, tags: ['fingerprint', 'biometric', 'identity', 'risk', 'security'] },
  { url: `${UNSPLASH}/photo-1526374965328-7f61d4dc18c5?${PARAMS}`, tags: ['matrix', 'code', 'cyber', 'risk', 'hacking'] },

  // ── Tax / Government / Policy ──
  { url: `${UNSPLASH}/photo-1554224154-26032ffc0d07?${PARAMS}`, tags: ['tax', 'documents', 'accounting', 'compliance', 'vat'] },
  { url: `${UNSPLASH}/photo-1450101499163-c8848c66ca85?${PARAMS}`, tags: ['contract', 'signing', 'deal', 'legal', 'policy'] },
  { url: `${UNSPLASH}/photo-1541872703-74c5e44368f9?${PARAMS}`, tags: ['government', 'parliament', 'policy', 'regulation'] },

  // ── Global / World / Geopolitics ──
  { url: `${UNSPLASH}/photo-1451187580459-43490279c0fa?${PARAMS}`, tags: ['earth', 'space', 'global', 'world', 'planet'] },
  { url: `${UNSPLASH}/photo-1526778548025-fa2f459cd5c1?${PARAMS}`, tags: ['world-map', 'digital', 'global', 'world', 'network'] },
  { url: `${UNSPLASH}/photo-1477959858617-67f85cf4f1df?${PARAMS}`, tags: ['city', 'night', 'urban', 'world', 'lights'] },
  { url: `${UNSPLASH}/photo-1558618666-fcd25c85f82e?${PARAMS}`, tags: ['network', 'connections', 'global', 'world', 'digital'] },
  { url: `${UNSPLASH}/photo-1446776811953-b23d57bd21aa?${PARAMS}`, tags: ['earth', 'atmosphere', 'global', 'world', 'climate'] },
  { url: `${UNSPLASH}/photo-1521295121783-8a321d551ad2?${PARAMS}`, tags: ['shipping', 'port', 'trade', 'world', 'logistics'] },
  { url: `${UNSPLASH}/photo-1462899006636-339e08d1844e?${PARAMS}`, tags: ['globe', 'world', 'map', 'global', 'geography'] },
  { url: `${UNSPLASH}/photo-1534723452862-4c874018d66d?${PARAMS}`, tags: ['airport', 'travel', 'global', 'world', 'hub'] },

  // ── Oil / Energy ──
  { url: `${UNSPLASH}/photo-1513828583688-c52646db42da?${PARAMS}`, tags: ['oil', 'refinery', 'energy', 'opec', 'petroleum'] },
  { url: `${UNSPLASH}/photo-1474314170901-f351b68f544f?${PARAMS}`, tags: ['solar', 'energy', 'renewable', 'green', 'sustainability'] },
  { url: `${UNSPLASH}/photo-1466611653911-95081537e5b7?${PARAMS}`, tags: ['wind', 'turbine', 'energy', 'renewable', 'green'] },
  { url: `${UNSPLASH}/photo-1532601224476-15c79f2f7a51?${PARAMS}`, tags: ['pipeline', 'oil', 'gas', 'energy', 'industrial'] },

  // ── Banking / Fintech ──
  { url: `${UNSPLASH}/photo-1556742049-0cfed4f6a45d?${PARAMS}`, tags: ['bank', 'vault', 'banking', 'finance', 'capital'] },
  { url: `${UNSPLASH}/photo-1563013544-824ae1b704d3?${PARAMS}`, tags: ['payment', 'card', 'fintech', 'digital', 'banking'] },
  { url: `${UNSPLASH}/photo-1559526324-4b87b5e36e44?${PARAMS}`, tags: ['atm', 'banking', 'cash', 'finance'] },

  // ── Aviation / Shipping / Trade ──
  { url: `${UNSPLASH}/photo-1436491865332-7a61a109db05?${PARAMS}`, tags: ['airplane', 'aviation', 'travel', 'airline', 'trade'] },
  { url: `${UNSPLASH}/photo-1494412574643-ff11b0a5eb19?${PARAMS}`, tags: ['container', 'shipping', 'trade', 'logistics', 'port'] },

  // ── Healthcare / Pharma ──
  { url: `${UNSPLASH}/photo-1579684385127-1ef15d508118?${PARAMS}`, tags: ['healthcare', 'medical', 'pharma', 'science'] },
  { url: `${UNSPLASH}/photo-1576091160550-2173dba999ef?${PARAMS}`, tags: ['lab', 'research', 'science', 'biotech', 'pharma'] },

  // ── AI / Technology ──
  { url: `${UNSPLASH}/photo-1677442136019-21780ecad995?${PARAMS}`, tags: ['ai', 'artificial-intelligence', 'tech', 'robot', 'digital'] },
  { url: `${UNSPLASH}/photo-1518770660439-4636190af475?${PARAMS}`, tags: ['circuit', 'tech', 'chip', 'semiconductor', 'ai'] },
  { url: `${UNSPLASH}/photo-1488229297570-58520851e868?${PARAMS}`, tags: ['network', 'data', 'tech', 'cloud', 'digital'] },
];

// Room fallback tags (used when no topic keywords match)
const ROOM_FALLBACK_TAGS: Record<RoomId, string[]> = {
  growth: ['dubai', 'skyline', 'corporate', 'growth', 'business'],
  capital: ['gold', 'finance', 'trading', 'capital', 'markets'],
  risk: ['security', 'risk', 'compliance', 'legal', 'cyber'],
  world: ['earth', 'global', 'world', 'network', 'trade'],
};

/**
 * Finds the best matching photo for a given topic string and room.
 * Scores each photo by counting keyword matches against the topic text.
 * Uses room fallback if no strong match found.
 * Returns different photos for the same topic by using a variant offset.
 */
export function getPhotoForTopic(topic: string, roomId: RoomId, variant: number = 0): string {
  const topicLower = topic.toLowerCase();
  const topicWords = topicLower.split(/[\s,.\-/()]+/).filter(w => w.length > 2);

  // Score each photo by keyword matches
  const scored = PHOTO_LIBRARY.map((photo, idx) => {
    let score = 0;
    for (const tag of photo.tags) {
      // Direct tag match in topic text
      if (topicLower.includes(tag)) score += 3;
      // Word-level match
      for (const word of topicWords) {
        if (tag.includes(word) || word.includes(tag)) score += 1;
      }
      // Room affinity bonus
      if (ROOM_FALLBACK_TAGS[roomId].includes(tag)) score += 0.5;
    }
    return { url: photo.url, score, idx };
  });

  // Sort by score descending, then by index for determinism
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  // Take top matches and pick one using variant offset for variety
  const topMatches = scored.filter(s => s.score > 0).slice(0, 8);

  if (topMatches.length > 0) {
    return topMatches[variant % topMatches.length].url;
  }

  // Fallback: room-based photos
  const roomPhotos = PHOTO_LIBRARY.filter(p =>
    p.tags.some(t => ROOM_FALLBACK_TAGS[roomId].includes(t))
  );
  if (roomPhotos.length > 0) {
    return roomPhotos[variant % roomPhotos.length].url;
  }

  return PHOTO_LIBRARY[variant % PHOTO_LIBRARY.length].url;
}

/** Legacy compat - returns a room-based photo URL */
export function getPhotoUrl(roomId: RoomId, index: number): string {
  return getPhotoForTopic(roomId, roomId, index);
}

export function getPhotoCount(): number {
  return PHOTO_LIBRARY.length;
}
