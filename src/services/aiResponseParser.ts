import type { GeneratedPost, DeepDivePost, StatDirection } from '../types';

const STANDARD_KEYS: (keyof GeneratedPost)[] = [
  'text', 'headline', 'subline', 'stat', 'statLabel', 'source', 'sourceUrl', 'statDirection',
];

const DEEP_KEYS: (keyof DeepDivePost)[] = [
  'post', 'brief', 'headline', 'subline', 'stat', 'statLabel', 'source', 'sourceUrl', 'statDirection', 'keyFinding',
];

function cleanText(value: string): string {
  return value
    .replace(/<cite[^>]*>.*?<\/cite>/gi, '')  // Strip <cite> tags and contents
    .replace(/<\/?cite[^>]*>/gi, '')           // Strip unclosed cite tags
    .replace(/<[^>]+>/g, '')                   // Strip any remaining HTML tags
    .replace(/\u2014/g, ', ')                  // Em dash to comma
    .replace(/\u2013/g, ', ')                  // En dash to comma
    .replace(/\s{2,}/g, ' ')                   // Collapse multiple spaces
    .trim();
}

function isValidDirection(value: string): value is StatDirection {
  return value === 'up' || value === 'down' || value === 'neutral';
}

export function parseStandardResponse(raw: string): GeneratedPost {
  const result: GeneratedPost = {
    text: '', headline: '', subline: '', stat: '', statLabel: '',
    statDirection: 'neutral', source: '', sourceUrl: '',
  };

  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      for (const key of STANDARD_KEYS) {
        if (parsed[key]) {
          (result as Record<string, string>)[key] = cleanText(String(parsed[key]));
        }
      }
      if (parsed.hashtags && Array.isArray(parsed.hashtags)) {
        result.hashtags = parsed.hashtags.map(String);
      }
      if (parsed.threadPosts && Array.isArray(parsed.threadPosts)) {
        result.threadPosts = parsed.threadPosts.map(String);
      }
    }
  } catch {
    // Regex fallback for malformed JSON
    for (const key of STANDARD_KEYS) {
      const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*?)"`);
      const match = raw.match(regex);
      if (match) {
        (result as Record<string, string>)[key] = cleanText(match[1]);
      }
    }
  }

  if (!isValidDirection(result.statDirection)) {
    result.statDirection = 'neutral';
  }

  return result;
}

export function parseDeepResponse(raw: string): DeepDivePost {
  const result: DeepDivePost = {
    text: '', headline: '', subline: '', stat: '', statLabel: '',
    statDirection: 'neutral', source: '', sourceUrl: '',
    post: '', brief: '', keyFinding: '',
  };

  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      for (const key of DEEP_KEYS) {
        if (parsed[key]) {
          (result as Record<string, string>)[key] = cleanText(String(parsed[key]));
        }
      }
    }
  } catch {
    for (const key of DEEP_KEYS) {
      const regex = new RegExp(`"${key}"\\s*:\\s*"([^"]*?)"`);
      const match = raw.match(regex);
      if (match) {
        (result as Record<string, string>)[key] = cleanText(match[1]);
      }
    }
  }

  if (!isValidDirection(result.statDirection)) {
    result.statDirection = 'neutral';
  }

  // Populate text from post for consistency
  if (result.post && !result.text) {
    result.text = result.post;
  }

  return result;
}
