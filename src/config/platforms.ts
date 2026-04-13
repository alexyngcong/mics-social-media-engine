import type { Platform } from '../types';

export const PLATFORMS: Platform[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '\u{1F4AC}',
    color: '#25D366',
    maxLength: 700,
    hashtagSupport: false,
    formattingStyle: 'whatsapp',
    imageDimensions: [
      { label: 'Portrait Post', width: 1080, height: 1350, isDefault: true },
      { label: 'Square', width: 1080, height: 1080, isDefault: false },
    ],
    voiceModifier:
      'Write for an exclusive WhatsApp community of CFOs. Use WhatsApp formatting: *bold* for emphasis, _italic_ for nuance. 60-120 words. No URLs in the text body.',
    structureRules:
      'Output a single continuous message. No bullet points. Lead with signal, then context, then advisory seed. Contractions OK. Senior partner at dinner tone.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '\u{1F4F8}',
    color: '#E1306C',
    maxLength: 2200,
    hashtagSupport: true,
    formattingStyle: 'plaintext',
    imageDimensions: [
      { label: 'Portrait Story', width: 1080, height: 1350, isDefault: true },
      { label: 'Square Feed', width: 1080, height: 1080, isDefault: false },
    ],
    voiceModifier:
      'Write for a professional finance Instagram audience. Use 2-3 line breaks for readability. Strategic emoji at section starts. End with a hashtag block of 15-20 relevant finance/CFO hashtags separated by spaces.',
    structureRules:
      'Structure: Hook line (bold idea), blank line, 2-3 short paragraphs with line breaks, blank line, CTA question, blank line, hashtag block. Include "hashtags" array in JSON output.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '\u{1F4BC}',
    color: '#0A66C2',
    maxLength: 3000,
    hashtagSupport: true,
    formattingStyle: 'plaintext',
    imageDimensions: [
      { label: 'Article Banner', width: 1200, height: 627, isDefault: true },
      { label: 'Square', width: 1080, height: 1080, isDefault: false },
    ],
    voiceModifier:
      'Write for a senior finance LinkedIn audience. Open with a hook line (under 15 words) that compels the scroll. Professional but not stiff. 3-5 hashtags at end.',
    structureRules:
      'Structure: One-line hook, blank line, 3-4 short paragraphs using Unicode bullets where appropriate, blank line, forward-looking closing with advisory seed, blank line, 3-5 hashtags. Include "hashtags" array in JSON.',
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: '\u{1D54F}',
    color: '#000000',
    maxLength: 280,
    hashtagSupport: true,
    formattingStyle: 'plaintext',
    imageDimensions: [
      { label: 'Card', width: 1200, height: 675, isDefault: true },
      { label: 'Square', width: 1080, height: 1080, isDefault: false },
    ],
    voiceModifier:
      'Write a primary tweet (under 250 chars) and 3 thread follow-ups (each under 280 chars). Sharp, punchy, no filler. 2-3 hashtags in primary tweet only.',
    structureRules:
      'The "text" field is the primary tweet. Include a "threadPosts" array with 3 follow-up tweets. Each starts with a number like "2/" etc. Primary tweet is the hook, thread adds depth.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '\u{1F30E}',
    color: '#1877F2',
    maxLength: 5000,
    hashtagSupport: false,
    formattingStyle: 'plaintext',
    imageDimensions: [
      { label: 'Link Preview', width: 1200, height: 630, isDefault: true },
      { label: 'Square', width: 1080, height: 1080, isDefault: false },
    ],
    voiceModifier:
      'Write for a CFO community Facebook group. Conversational, 40-80 words. Ask a question at the end to drive engagement. No hashtags.',
    structureRules:
      'Structure: Lead with an observation or surprising fact, expand with 1-2 sentences of context, close with an engagement question. Keep it conversational and accessible.',
  },
];
