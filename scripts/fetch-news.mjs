#!/usr/bin/env node
/**
 * GDELT news fetcher — server-side, runs in GitHub Actions.
 *
 * Fetches the latest articles from GDELT DOC API for all four rooms,
 * filters with a TIERED approach (strict approved-source whitelist
 * first, broader trusted-news fallback second), and writes the result
 * to `news-latest.json`.
 *
 * Runs in Node 20+, no dependencies (uses built-in fetch).
 */

import { writeFile } from 'node:fs/promises';

// ─── TIER 1 — Highest-quality approved sources ──────────────────
// Matches src/services/newsFetcher.ts. Most CFO-actionable content.
const TIER_1_APPROVED = new Set([
  // UAE official regulators
  'mof.gov.ae', 'tax.gov.ae', 'centralbank.ae', 'cbuae.gov.ae',
  'dfsa.ae', 'adgm.com', 'difc.ae', 'sca.gov.ae',
  'economy.gov.ae', 'mohre.gov.ae', 'moiat.gov.ae',
  'mofaic.gov.ae', 'rera.gov.ae', 'dubailand.gov.ae',
  'moi.gov.ae', 'ded.ae', 'dubaichamber.com',
  // UAE state media
  'wam.ae', 'mediaoffice.ae', 'mediaoffice.abudhabi',
  // Gulf regional outlets
  'thenationalnews.com', 'gulfnews.com', 'zawya.com',
  'khaleejtimes.com', 'arabianbusiness.com', 'argaam.com',
  'agbi.com', 'economymiddleeast.com', 'gulfbusiness.com',
  'gulftoday.ae', 'emirates247.com',
  // Specialist tax/legal/advisory
  'mondaq.com', 'meed.com', 'lexology.com', 'bluej.com',
  'thomsonreuters.com', 'tax.thomsonreuters.com',
  'legal.thomsonreuters.com', 'bloombergtax.com',
  'taxnotes.com', 'internationaltaxreview.com', 'taxfoundation.org',
  'pinsentmasons.com', 'whitecase.com',
  // Global financial wires
  'bloomberg.com', 'reuters.com', 'ft.com', 'wsj.com',
  'economist.com', 'nikkei.com', 'scmp.com', 'cnbc.com',
  'marketwatch.com', 'forbes.com', 'businessinsider.com',
  'ftadviser.com', 'euromoney.com', 'thebanker.com', 'bankerme.com',
  // Multilaterals
  'imf.org', 'worldbank.org', 'oecd.org', 'bis.org',
  'federalreserve.gov', 'ecb.europa.eu', 'bankofengland.co.uk',
  'wto.org', 'unctad.org',
  // Ratings agencies
  'spglobal.com', 'moodys.com', 'fitchratings.com',
  // Energy bodies
  'opec.org', 'iea.org', 'eia.gov', 'argusmedia.com',
  // Policy / think tanks
  'brookings.edu', 'chathamhouse.org', 'cfr.org',
  'piie.com', 'rand.org', 'hbr.org',
  // Wire services
  'apnews.com', 'afp.com',
]);

// ─── TIER 2 — Broader trusted-news fallback ────────────────────
// Used only when TIER 1 returns 0 results. These are reputable
// international and regional outlets that GDELT indexes well.
const TIER_2_FALLBACK = new Set([
  // Major broadcasters and wires
  'bbc.com', 'bbc.co.uk', 'cnn.com', 'aljazeera.com', 'aljazeera.net',
  'theguardian.com', 'nytimes.com', 'washingtonpost.com',
  'usatoday.com', 'foxbusiness.com', 'cnbc.com',
  // Regional and trade press that often covers UAE
  'reuters.com', 'apnews.com', 'afp.com', 'dpa-international.com',
  'middleeasteye.net', 'arabnews.com', 'aawsat.com',
  'menafn.com', 'tradearabia.com', 'thearabianpost.com',
  'menabytes.com', 'wamda.com', 'al-monitor.com',
  // Business-news that covers MENA
  'businessinsider.com', 'fortune.com', 'cnbcarabia.com',
  'thenationalnews.com', 'gulfnews.com',
  // Financial press
  'investing.com', 'seekingalpha.com', 'morningstar.com',
  // Energy
  'rigzone.com', 'oilprice.com', 'energyintel.com',
]);

// ─── Simpler GDELT queries ─────────────────────────────────────
// GDELT's query parser handles simple keyword AND/OR better than
// complex quoted-phrase chains. Each room gets a short query that
// hits the maximum number of relevant articles.
const ROOM_QUERIES = {
  growth:  'UAE Dubai investment growth economy',
  capital: 'UAE Dubai bond sukuk treasury rate',
  risk:    'UAE tax compliance regulation FTA',
  world:   'oil OPEC Federal Reserve emerging markets',
};

const MAX_AGE_HOURS = 72;
const MAX_RESULTS_PER_ROOM = 20;

function isTier1(domain) {
  const d = (domain || '').toLowerCase().replace(/^www\./, '');
  if (TIER_1_APPROVED.has(d)) return true;
  for (const a of TIER_1_APPROVED) {
    if (d.endsWith('.' + a)) return true;
  }
  return false;
}

function isTier2(domain) {
  const d = (domain || '').toLowerCase().replace(/^www\./, '');
  if (TIER_2_FALLBACK.has(d)) return true;
  for (const a of TIER_2_FALLBACK) {
    if (d.endsWith('.' + a)) return true;
  }
  return false;
}

function gdeltDateParam(hoursAgo) {
  const d = new Date(Date.now() - hoursAgo * 3600 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

function computeHoursAgo(seendate) {
  try {
    const y = parseInt(seendate.slice(0, 4));
    const m = parseInt(seendate.slice(4, 6)) - 1;
    const d = parseInt(seendate.slice(6, 8));
    const h = parseInt(seendate.slice(9, 11)) || 0;
    const mi = parseInt(seendate.slice(11, 13)) || 0;
    const t = Date.UTC(y, m, d, h, mi);
    return Math.max(0, Math.round((Date.now() - t) / 3600000));
  } catch {
    return 999;
  }
}

function prettifyDomain(domain) {
  const map = {
    'mof.gov.ae': 'Ministry of Finance',
    'tax.gov.ae': 'Federal Tax Authority',
    'centralbank.ae': 'CBUAE',
    'cbuae.gov.ae': 'CBUAE',
    'dfsa.ae': 'DFSA',
    'adgm.com': 'ADGM',
    'difc.ae': 'DIFC',
    'wam.ae': 'WAM',
    'mohre.gov.ae': 'MoHRE',
    'moiat.gov.ae': 'MoIAT',
    'thenationalnews.com': 'The National',
    'gulfnews.com': 'Gulf News',
    'khaleejtimes.com': 'Khaleej Times',
    'arabianbusiness.com': 'Arabian Business',
    'zawya.com': 'Zawya',
    'bloomberg.com': 'Bloomberg',
    'reuters.com': 'Reuters',
    'ft.com': 'Financial Times',
    'wsj.com': 'Wall Street Journal',
    'cnbc.com': 'CNBC',
    'mondaq.com': 'Mondaq',
    'lexology.com': 'Lexology',
    'meed.com': 'MEED',
    'agbi.com': 'AGBI',
    'bbc.com': 'BBC',
    'bbc.co.uk': 'BBC',
    'aljazeera.com': 'Al Jazeera',
    'arabnews.com': 'Arab News',
    'theguardian.com': 'The Guardian',
    'nytimes.com': 'New York Times',
  };
  const clean = (domain || '').toLowerCase().replace(/^www\./, '');
  if (map[clean]) return map[clean];
  const first = clean.split('.')[0] || domain || '';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function articleFromGDELT(a) {
  const hoursAgo = computeHoursAgo(a.seendate || '');
  const date = (a.seendate || '').slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  return {
    title: a.title || '',
    url: a.url || '',
    source: prettifyDomain(a.domain || ''),
    date,
    description: a.title || '',
    imageUrl: a.socialimage || undefined,
    hoursAgo,
  };
}

async function fetchRoom(room) {
  const query = encodeURIComponent(ROOM_QUERIES[room]);
  const start = gdeltDateParam(MAX_AGE_HOURS);
  const end = gdeltDateParam(0);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=${MAX_RESULTS_PER_ROOM}&format=json&sort=DateDesc&startdatetime=${start}&enddatetime=${end}`;

  console.log(`\n[${room}] query: "${ROOM_QUERIES[room]}"`);
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) {
      console.warn(`[${room}] HTTP ${resp.status}`);
      return [];
    }
    const text = await resp.text();
    // GDELT sometimes returns non-JSON when results are empty or on error
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(`[${room}] non-JSON response (first 200 chars): ${text.slice(0, 200)}`);
      return [];
    }
    const allArticles = data.articles || [];
    console.log(`[${room}] GDELT returned ${allArticles.length} articles`);

    // Log domain distribution for diagnostics
    const domainCounts = {};
    for (const a of allArticles) {
      const d = (a.domain || '?').toLowerCase().replace(/^www\./, '');
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    }
    const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (topDomains.length) {
      console.log(`[${room}] top domains: ${topDomains.map(([d, c]) => `${d}(${c})`).join(', ')}`);
    }

    // Pass 1: English + Tier 1 approved sources
    const englishOnly = allArticles.filter(a => a.language === 'English' || !a.language);
    const tier1 = englishOnly
      .filter(a => isTier1(a.domain || ''))
      .map(articleFromGDELT)
      .filter(a => a.hoursAgo >= 0 && a.hoursAgo <= MAX_AGE_HOURS);
    console.log(`[${room}] Tier-1 approved: ${tier1.length}`);

    // Pass 2 (fallback): Tier 2 if Tier 1 yielded nothing
    if (tier1.length > 0) return tier1;

    const tier2 = englishOnly
      .filter(a => isTier2(a.domain || ''))
      .map(articleFromGDELT)
      .filter(a => a.hoursAgo >= 0 && a.hoursAgo <= MAX_AGE_HOURS);
    console.log(`[${room}] Tier-2 fallback: ${tier2.length}`);
    return tier2;
  } catch (e) {
    console.error(`[${room}] fetch error:`, e.message);
    return [];
  }
}

async function main() {
  const startedAt = Date.now();
  const rooms = ['growth', 'capital', 'risk', 'world'];
  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    cutoffHours: MAX_AGE_HOURS,
    rooms: {},
    totalCount: 0,
  };

  for (const room of rooms) {
    result.rooms[room] = await fetchRoom(room);
    result.totalCount += result.rooms[room].length;
  }

  await writeFile('news-latest.json', JSON.stringify(result, null, 2), 'utf8');

  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('Summary:');
  console.log(`  Generated at: ${result.generatedAt}`);
  console.log(`  Total articles: ${result.totalCount}`);
  for (const room of rooms) {
    console.log(`  ${room.padEnd(10)} ${result.rooms[room].length}`);
  }
  console.log(`  Took: ${Date.now() - startedAt}ms`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
