/**
 * BRIEF PARSER — Turns pasted Deep Research output into structured items
 *
 * Accepts any reasonable CFO-brief format and extracts:
 *   - title (headline)
 *   - source (publication name)
 *   - sourceUrl (direct URL)
 *   - date / publicationTime
 *   - priority (high / medium / watch)
 *   - cfoImplication (the deep analysis text)
 *   - tags (e.g. risk, treasury, growth)
 *
 * Three parsing strategies, applied in order:
 *   1. Markdown table — if a `|` table exists, extract its rows
 *   2. Structured blocks — `**Source**: X` / `URL: Y` patterns
 *   3. Free-form prose — heuristic detection of source-headline-implication
 *
 * The parser is intentionally lenient: it would rather over-extract items
 * with low confidence than fail. The UI lets the user trim before generating.
 */

import type { BriefItem, BriefPriority, RoomId } from '../types';

const URL_RE = /https?:\/\/[^\s)\]>"',]+/gi;
const TAG_HINTS: Record<RoomId, RegExp> = {
  growth:  /\b(growth|expansion|fdi|ipo|m&a|investment|hiring|capex)\b/i,
  capital: /\b(treasury|capital|funding|debt|bond|sukuk|cash|liquidity|rates?|yield|currency|fx|forex)\b/i,
  risk:    /\b(risk|compliance|regulation|tax|aml|sanctions|legal|audit|enforce|emiratisation|einvoicing)\b/i,
  world:   /\b(global|macro|oil|opec|fed|ecb|brics|tariff|trade|geopolit|energy|sanction)\b/i,
};

// ─── Public API ─────────────────────────────────────────────────

export function parseBrief(rawContent: string): BriefItem[] {
  if (!rawContent || rawContent.trim().length < 10) return [];

  // Strategy 1: markdown table
  const tableItems = parseMarkdownTable(rawContent);
  if (tableItems.length > 0) return tableItems;

  // Strategy 2 + 3: split into blocks, heuristically parse each
  return parseBlocks(rawContent);
}

// ─── Strategy 1: Markdown table ─────────────────────────────────

function parseMarkdownTable(text: string): BriefItem[] {
  // Find table-like sections: header row, separator row, data rows
  const lines = text.split('\n');
  const tables: string[][] = [];
  let inTable = false;
  let currentTable: string[] = [];

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      currentTable.push(line);
      inTable = true;
    } else if (inTable) {
      // End of table
      if (currentTable.length >= 3) tables.push(currentTable);
      currentTable = [];
      inTable = false;
    }
  }
  if (currentTable.length >= 3) tables.push(currentTable);

  if (tables.length === 0) return [];

  const items: BriefItem[] = [];
  for (const tbl of tables) {
    const headerRow = tbl[0];
    // Skip the separator row (index 1 contains ---)
    const dataRows = tbl.slice(2).filter(r => !/^\|[\s|-]+\|?$/.test(r.trim()));

    const headers = headerRow.split('|').map(c => c.trim().toLowerCase()).filter(Boolean);

    // Detect column positions
    const findCol = (...names: string[]): number => {
      for (let i = 0; i < headers.length; i++) {
        for (const n of names) {
          if (headers[i].includes(n)) return i;
        }
      }
      return -1;
    };

    const colPriority    = findCol('priority', 'tier');
    const colSource      = findCol('source', 'publication', 'publisher');
    const colHeadline    = findCol('headline', 'title', 'item');
    const colTime        = findCol('time', 'date', 'published');
    const colImplication = findCol('implication', 'cfo', 'why', 'meaning', 'impact');
    const colUrl         = findCol('url', 'link', 'direct');
    const colTags        = findCol('tag', 'topic', 'theme');

    for (const row of dataRows) {
      const cells = row.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 || arr.length > 0);
      // Drop the leading-empty cell if the row started with |
      const trimmedCells = cells[0] === '' ? cells.slice(1) : cells;

      const get = (idx: number): string =>
        idx >= 0 && idx < trimmedCells.length ? stripMarkdown(trimmedCells[idx]) : '';

      const title = get(colHeadline);
      const source = get(colSource);
      const implication = get(colImplication);
      const urlFromCol = get(colUrl);
      const allCells = trimmedCells.join(' ');
      const url = urlFromCol || (allCells.match(URL_RE)?.[0] || '');

      if (!title && !source && !implication) continue; // skip empty rows

      items.push(makeItem({
        title,
        source,
        sourceUrl: url,
        cfoImplication: implication,
        priority: parsePriority(get(colPriority)),
        publicationTime: get(colTime),
        tags: parseTags(get(colTags)),
        rawText: row,
      }));
    }
  }

  return items.filter(i => i.title.length > 4);
}

// ─── Strategy 2+3: Block-based parsing ──────────────────────────

function parseBlocks(text: string): BriefItem[] {
  // Split on blank lines OR numbered-list markers OR heading lines
  const blocks: string[] = [];

  // First try splitting on common item separators
  const sections = text
    .split(/\n\s*\n+/) // blank-line separated
    .flatMap(s => {
      // Further split if a section contains multiple numbered items
      const numbered = s.split(/(?=^\s*(?:\d+[.)]\s|[-*]\s+\*\*))/m);
      return numbered.length > 1 ? numbered : [s];
    })
    .map(s => s.trim())
    .filter(s => s.length > 20);

  for (const section of sections) {
    if (!isLikelyNewsItem(section)) continue;
    blocks.push(section);
  }

  return blocks
    .map(blockToItem)
    .filter(i => i !== null && i.title.length > 4) as BriefItem[];
}

function isLikelyNewsItem(block: string): boolean {
  // Heuristic: has a URL OR substantial length + at least one known indicator
  const hasUrl = URL_RE.test(block);
  URL_RE.lastIndex = 0;
  const indicators = /(source:|published:|url:|reuters|bloomberg|ft\.com|implication|cfo|priority:|^\s*\d+[.)]\s)/im;
  return hasUrl || (block.length > 80 && indicators.test(block));
}

function blockToItem(block: string): BriefItem | null {
  // Extract URL
  URL_RE.lastIndex = 0;
  const urlMatch = block.match(URL_RE);
  const url = urlMatch?.[0] || '';

  // Extract source — look for "Source: X" or known publication names
  let source = '';
  const sourceFieldMatch = block.match(/\bsource\s*:\s*\*?\*?([^*\n,(]+)/i);
  if (sourceFieldMatch) {
    source = stripMarkdown(sourceFieldMatch[1]).trim();
  } else {
    const knownSourceMatch = block.match(/\b(Reuters|Bloomberg|Bloomberg Tax|Financial Times|FT|WSJ|Wall Street Journal|CNBC|MarketWatch|Forbes|MEED|Mondaq|Lexology|The National|Gulf News|Khaleej Times|Arabian Business|Zawya|AGBI|S&P Global|Moody|Fitch|Blue J|Checkpoint Edge|CoCounsel|Thomson Reuters|Pinsent Masons|Euromoney|The Banker|IMF|World Bank|OECD|BIS|Federal Reserve|ECB|WAM|CBUAE|DFSA|ADGM|DIFC|MoF|FTA|MoHRE|MoIAT)\b/i);
    if (knownSourceMatch) source = knownSourceMatch[1];
  }

  // Extract publication time (UTC / GST mentions)
  const timeMatch = block.match(/\b(\d{1,2}:\d{2}\s*(?:UTC|GST|GMT|EST|EDT|UAE))/i);
  const publicationTime = timeMatch?.[1] || '';

  // Extract priority (High / Medium / Watch / Low)
  const priorityMatch = block.match(/\b(High|Medium|Med|Watch|Low|Critical)\b/i);
  const priority = parsePriority(priorityMatch?.[1] || '');

  // Extract tags — look for "Tags: x, y, z" or comma-separated keywords in the block
  let tags: string[] = [];
  const tagsFieldMatch = block.match(/\btags?\s*:\s*([^\n]+)/i);
  if (tagsFieldMatch) tags = parseTags(tagsFieldMatch[1]);

  // Extract headline — first bold text, or first line, or first sentence
  let title = '';
  const boldMatch = block.match(/\*\*([^*]+)\*\*/);
  if (boldMatch) title = boldMatch[1].trim();
  if (!title) {
    // First line of the block (likely the headline)
    const firstLine = block.split('\n')[0]
      .replace(/^\s*\d+[.)]\s+/, '')   // strip numbering
      .replace(/^[-*]\s+/, '')         // strip bullet
      .replace(/^#+\s+/, '')           // strip heading
      .trim();
    title = stripMarkdown(firstLine.slice(0, 200));
  }

  // CFO implication = everything after the headline / source / metadata lines
  let cfoImplication = block;
  // Remove the headline if it's at the start
  cfoImplication = cfoImplication.replace(/^.*?\n/, '').trim();
  // Strip metadata lines
  cfoImplication = cfoImplication
    .split('\n')
    .filter(l => !/^\s*(source|url|date|published|priority|tags?|implication|publication time)\s*:/i.test(l.trim()))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  // Cap at a sensible length for a paragraph
  if (cfoImplication.length > 800) cfoImplication = cfoImplication.slice(0, 797) + '…';
  // Strip URLs from the implication body
  cfoImplication = cfoImplication.replace(URL_RE, '').replace(/\s{2,}/g, ' ').trim();

  if (!title) return null;

  return makeItem({
    title: title.replace(/[*_`]/g, '').trim(),
    source: source || 'External brief',
    sourceUrl: url,
    cfoImplication,
    priority,
    publicationTime,
    tags,
    rawText: block,
  });
}

// ─── Helpers ────────────────────────────────────────────────────

function makeItem(input: Partial<BriefItem> & { title: string; cfoImplication: string }): BriefItem {
  const tags = input.tags || [];
  const suggestedRoom = inferRoom(`${input.title} ${input.cfoImplication} ${tags.join(' ')}`);
  return {
    id: `brief_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: input.title.trim(),
    source: (input.source || '').trim(),
    sourceUrl: (input.sourceUrl || '').trim(),
    date: input.date || todayISO(),
    publicationTime: input.publicationTime,
    priority: input.priority || 'unknown',
    cfoImplication: input.cfoImplication.trim(),
    tags,
    suggestedRoom,
    rawText: input.rawText || '',
  };
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#+\s+/g, '')
    .trim();
}

function parsePriority(text: string): BriefPriority {
  const t = text.toLowerCase();
  if (t.includes('high') || t.includes('critical')) return 'high';
  if (t.includes('med')) return 'medium';
  if (t.includes('watch') || t.includes('low')) return 'watch';
  return 'unknown';
}

function parseTags(text: string): string[] {
  if (!text) return [];
  return text
    .split(/[,;|]/)
    .map(t => stripMarkdown(t).trim().toLowerCase())
    .filter(t => t.length > 0 && t.length < 30)
    .slice(0, 6);
}

function inferRoom(text: string): RoomId | undefined {
  let bestRoom: RoomId | undefined;
  let bestScore = 0;
  for (const [room, re] of Object.entries(TAG_HINTS) as Array<[RoomId, RegExp]>) {
    const matches = text.match(new RegExp(re.source, 'gi'));
    const score = matches?.length || 0;
    if (score > bestScore) {
      bestScore = score;
      bestRoom = room;
    }
  }
  return bestRoom;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
