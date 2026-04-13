export type PlatformId = 'whatsapp' | 'instagram' | 'linkedin' | 'twitter' | 'facebook';
export type RoomId = 'growth' | 'capital' | 'risk' | 'world';
export type PostTypeId = 'observation' | 'alert' | 'poll' | 'generic';
export type StatDirection = 'up' | 'down' | 'neutral';

export interface Room {
  id: RoomId;
  label: string;
  icon: string;
  short: string;
  color: string;
  description: string;
  micsServices: string;
  topics: string[];
}

export interface PostType {
  id: PostTypeId;
  label: string;
  icon: string;
  day: string;
  promptFragment: string;
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

export interface BannerTemplate {
  bg: string;
  bgColors: string[];
  orbs: OrbConfig[];
  statColor: string;
  headlineSize: number;
  accent: string;
  leftBar?: boolean;
}

export type TemplateFactory = (roomColor: string, accentColor: string) => BannerTemplate;
