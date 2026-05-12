/**
 * BannerDoc — the data shape passed from BannerEditor into each template
 * component. Templates render at 1080×1080 (downscaled for preview).
 */

export type TemplateId = 'editorial-night' | 'newspaper-white' | 'dark-premium';

export interface BannerStat {
  value: string;   // e.g. "$57B"
  label: string;   // e.g. "Total Pipeline"
}

export interface BannerFields {
  eyebrow: string;          // "ABU DHABI INFRASTRUCTURE SUMMIT · 12 MAY 2026"
  headlineLine1: string;    // "Infrastructure"
  headlineLine2: string;    // "Pipeline 2026"
  subline: string;          // "ADIO · Aldar · Modon · Etihad Rail · …"
  stats: BannerStat[];      // up to 3
  tagline: string;          // italic short reading at bottom
  footer: string;           // "MICS Group · CFOs Private Insights Circle"
}

export type PhotoTreatment = 'fullbleed' | 'duotone' | 'side' | 'none';

export interface BannerPhoto {
  url: string;
  treatment: PhotoTreatment;
}

export interface BannerPalette {
  accent: string;   // theme accent — e.g. bronze, red, gold
  text: string;     // primary text — usually white or near-white
  bg: string;       // canvas base — ink navy / white / etc.
}

export interface BannerDoc {
  templateId: TemplateId;
  fields: BannerFields;
  photo: BannerPhoto;
  palette: BannerPalette;
}

/** Default doc used when the editor opens cold (no source post). */
export const DEFAULT_DOC: BannerDoc = {
  templateId: 'editorial-night',
  fields: {
    eyebrow: 'MICS · CFOs PRIVATE INSIGHTS · 12 MAY 2026',
    headlineLine1: 'Infrastructure',
    headlineLine2: 'Pipeline 2026',
    subline: 'ADIO · Aldar · Modon · Etihad Rail · Bloom · ADHA · Transport · Social Infrastructure · Core · 2026–2027',
    stats: [
      { value: '$57B', label: 'Total Pipeline' },
      { value: 'AED 55B', label: 'PPP Framework' },
      { value: '24', label: 'Active Projects' },
    ],
    tagline: 'Not aspirational. The next phase of a running engine.',
    footer: 'MICS Group · CFOs Private Insights Circle',
  },
  photo: {
    url: 'https://images.unsplash.com/photo-1582407947092-47f5835e3a28?w=1600&q=80&fit=crop&crop=entropy&auto=format',
    treatment: 'fullbleed',
  },
  palette: {
    accent: '#A8926A',
    text: '#EAE6DE',
    bg: '#06060f',
  },
};

/** Curated photo library — only verified Unsplash IDs that load reliably. */
export const PHOTO_LIBRARY: Array<{ url: string; label: string; tags: string[] }> = [
  { url: 'https://images.unsplash.com/photo-1582407947092-47f5835e3a28?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Abu Dhabi skyline', tags: ['uae', 'skyline'] },
  { url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Dubai skyline', tags: ['uae', 'skyline'] },
  { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Dubai marina', tags: ['uae', 'real-estate'] },
  { url: 'https://images.unsplash.com/photo-1546412414-e1885259563a?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Burj Khalifa', tags: ['uae', 'landmark'] },
  { url: 'https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Dubai aerial', tags: ['uae'] },
  { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Corporate tower', tags: ['business'] },
  { url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Big Tech HQ', tags: ['tech'] },
  { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Modern office', tags: ['business'] },
  { url: 'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Gold bars', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Trading screens', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Bank vault', tags: ['capital', 'banking'] },
  { url: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Stock exchange', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Finance abstract', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Legal documents', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Gavel / law', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Cybersecurity', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Tax documents', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Oil refinery', tags: ['world', 'energy'] },
  { url: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Pipeline / gas', tags: ['world', 'energy'] },
  { url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Shipping containers', tags: ['world', 'trade'] },
  { url: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Port', tags: ['world', 'trade'] },
  { url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Wind turbines', tags: ['world', 'climate'] },
  { url: 'https://images.unsplash.com/photo-1474314170901-f351b68f544f?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Solar / EU climate', tags: ['world', 'climate'] },
  { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Earth from space', tags: ['world'] },
  { url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'World map digital', tags: ['world'] },
  { url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'AI / robotics', tags: ['tech'] },
  { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Data centre / server', tags: ['tech'] },
  { url: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Airplane / aviation', tags: ['world'] },
  { url: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Construction crane', tags: ['growth'] },
  { url: 'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Sunrise skyline', tags: ['growth'] },
];

/** Three palette presets the user can switch between */
export const PALETTE_PRESETS: Array<{ id: string; label: string; palette: BannerPalette }> = [
  { id: 'bronze',   label: 'Bronze (default)', palette: { accent: '#A8926A', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'red',      label: 'Risk red',          palette: { accent: '#EF5555', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'gold',     label: 'Capital gold',      palette: { accent: '#F0C050', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'blue',     label: 'World blue',        palette: { accent: '#5B8DEE', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'green',    label: 'Growth green',      palette: { accent: '#4ADE80', text: '#EAE6DE', bg: '#06060f' } },
];
