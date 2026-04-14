export type PlatformId = 'whatsapp' | 'instagram' | 'linkedin' | 'twitter' | 'facebook';
export type RoomId = 'growth' | 'capital' | 'risk' | 'world';
export type PostTypeId = 'observation' | 'alert' | 'poll' | 'generic' | 'pulse' | 'voicenote' | 'exclusive';
export type StatDirection = 'up' | 'down' | 'neutral';

export interface Room {
  id: RoomId;
  label: string;
  icon: string;
  short: string;
  color: string;
  description: string;
  cfoQuestion: string;
  micsServices: string;
  serviceDetails: string[];
  topics: string[];
}

export interface PostType {
  id: PostTypeId;
  label: string;
  icon: string;
  day: string;
  promptFragment: string;
  category: 'core' | 'engagement';
  description?: string;
  noBanner?: boolean;
}

export interface ImageDimension {
  label: string;
  width: number;
  height: number;
  isDefault: boolean;
}

export interface Platform {
  id: PlatformId;
  name: string;
  icon: string;
  color: string;
  maxLength: number;
  hashtagSupport: boolean;
  formattingStyle: 'whatsapp' | 'markdown' | 'plaintext';
  imageDimensions: ImageDimension[];
  voiceModifier: string;
  structureRules: string;
}

export interface GeneratedPost {
  text: string;
  headline: string;
  subline: string;
  stat: string;
  statLabel: string;
  statDirection: StatDirection;
  source: string;
  sourceUrl: string;
  hashtags?: string[];
  threadPosts?: string[];
}

export interface DeepDivePost extends GeneratedPost {
  post: string;
  brief: string;
  keyFinding: string;
}

export interface HistoryItem extends GeneratedPost {
  id: number;
  room: string;
  type: string;
  timestamp: string;
  mode: 'standard' | 'deep';
  platform: PlatformId;
}

export interface OrbConfig {
  top: string;
  left: string;
  size: number;
  color: string;
  opacity: number;
}

export type PhotoLayout =
  | 'none'           // gradient-only (existing templates)
  | 'fullbleed'      // full photo + dark gradient overlay
  | 'split-left'     // photo left half, content right
  | 'split-right'    // photo right half, content left
  | 'duotone'        // photo with room-color duotone effect
  | 'frosted'        // blurred photo bg + frosted glass panel
  | 'vignette';      // photo with heavy dark vignette, content centered

export interface BannerTemplate {
  bg: string;
  bgColors: string[];
  orbs: OrbConfig[];
  statColor: string;
  headlineSize: number;
  accent: string;
  leftBar?: boolean;
  photoLayout: PhotoLayout;
  photoOverlayOpacity?: number;   // 0-1, strength of dark overlay on photo
  photoDuotoneColor?: string;     // tint color for duotone mode
}

export type TemplateFactory = (roomColor: string, accentColor: string) => BannerTemplate;

// ─── QA Validator types ─────────────────────────────────────────

export type QAVerdict = 'APPROVED' | 'FLAGGED' | 'REJECTED';
export type QASeverity = 'critical' | 'warning' | 'info';
export type QACategory =
  | 'freshness'
  | 'source'
  | 'voice'
  | 'format'
  | 'platform'
  | 'integrity'
  | 'conversion';

export interface QACheckResult {
  id: string;
  category: QACategory;
  severity: QASeverity;
  passed: boolean;
  label: string;
  detail: string;
}

export interface QAReport {
  verdict: QAVerdict;
  score: number;
  timestamp: string;
  checks: QACheckResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  summary: string;
}

// ─── Calendar types ─────────────────────────────────────────────

export type CalendarDayStatus = 'planned' | 'generating' | 'generated' | 'copied' | 'skipped';

export interface CalendarEntry {
  date: string;             // YYYY-MM-DD
  room: RoomId;
  topic: string;
  postTime: string;         // e.g. "08:30"
  postTimeLabel: string;    // e.g. "8:30 AM UAE"
  status: CalendarDayStatus;
  result?: GeneratedPost;
  bannerVariant?: number;
  qaReport?: QAReport;
}

export interface CalendarMonth {
  year: number;
  month: number;            // 0-based (JS Date convention)
  entries: Record<string, CalendarEntry>; // keyed by YYYY-MM-DD
}
