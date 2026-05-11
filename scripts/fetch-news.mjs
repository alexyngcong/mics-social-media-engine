#!/usr/bin/env node
/**
 * GDELT news fetcher — server-side, runs in GitHub Actions.
 *
 * Fetches the latest articles from GDELT DOC API for all four rooms,
 * filters to the same approved-source list used by the browser app,
 * and writes the result to `news-latest.json` for the app to consume.
 *
 * Runs in Node 20+, no dependencies (uses built-in fetch).
 */

import { writeFile } from 'node:fs/promises';

// ─── Approved sources (kept in sync with src/services/newsFetcher.ts) ───
const APPROVED_DOMAINS = [
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
];

const ROOM_QUERIES = {
  growth: '"UAE non-oil GDP" OR "Dubai FDI" OR "MoIAT financing" OR "DIFC" expansion OR "ADGM" registrations OR "Abu Dhabi investment"',
  capital: '"CBUAE" rate OR "UAE bond" OR "sukuk issuance" OR "DIFC private credit" OR "ADGM fund"',
  risk: '"Federal Tax Authority" OR "Ministry of Finance" UAE OR "eInvoicing" UAE OR "ADGM AML" OR "DFSA consultation"',
  world: '"Federal Reserve" rate OR "ECB" policy OR "OECD Pillar" OR "BRICS" trade OR oil OPEC',
};

const MAX_AGE_HOURS = 72;
const MAX_RESULTS_PER_ROOM = 15;

function isApproved(domain) {
  const d = (domain || '').toLowerCase().replace(/^www\./, '');
  return APPROVED_DOMAINS.some(a => d === a || d.endsWith('.' + a));
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
  };
  const clean = (domain || '').toLowerCase().replace(/^www\./, '');
  if (map[clean]) return map[clean];
  const first = clean.split('.')[0] || domain || '';
  return first.charAt(0).toUpperCase() + first.slice(1);
}

async function fetchRoom(room) {
  const query = encodeURIComponent(ROOM_QUERIES[room]);
  const start = gdeltDateParam(MAX_AGE_HOURS);
  const end = gdeltDateParam(0);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=ArtList&maxrecords=${MAX_RESULTS_PER_ROOM}&format=json&sort=DateDesc&startdatetime=${start}&enddatetime=${end}`;

  console.log(`[${room}] fetching GDELT...`);
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!resp.ok) {
      console.warn(`[${room}] HTTP ${resp.status}`);
      return [];
    }
    const data = await resp.json();
    const articles = (data.articles || [])
      .filter(a => (a.language === 'English' || !a.language) && isApproved(a.domain || ''))
      .map(a => {
        const hoursAgo = computeHoursAgo(a.seendate || '');
        return {
          title: a.title || '',
          url: a.url || '',
          source: prettifyDomain(a.domain || ''),
          date: (a.seendate || '').slice(0, 8).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
          description: a.title || '',
          imageUrl: a.socialimage || undefined,
          hoursAgo,
        };
      })
      .filter(a => a.hoursAgo >= 0 && a.hoursAgo <= MAX_AGE_HOURS);
    console.log(`[${room}] kept ${articles.length} of ${data.articles?.length || 0} articles`);
    return articles;
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
