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
    // Default to the first growth-room user photo (Dubai skyline at night) —
    // same-origin so always loads even without internet access to Unsplash.
    url: (import.meta.env.BASE_URL || '/') + 'photos/growth/01_dubai_skyline_night.jpg',
    treatment: 'fullbleed',
  },
  palette: {
    accent: '#A8926A',
    text: '#EAE6DE',
    bg: '#06060f',
  },
};

/** Curated photo library — combined list (80 photos):
 *    50 user-supplied (served same-origin from /public/photos/)
 *    30 Unsplash CDN (kept for breadth across themes the user library
 *        doesn't cover yet — e.g. aviation, healthcare, AI, solar)
 *
 *  Local photos appear FIRST in the picker so they're the default pick;
 *  the Unsplash overflow is shown after for additional options.
 *
 *  Local breakdown by room:
 *    growth/  — 17 (UAE skylines, towers, construction, city growth)
 *    capital/ — 11 (trading, gold, banking, finance buildings)
 *    risk/    — 14 (legal docs, audits, contracts, meetings)
 *    world/   —  8 (shipping, satellite, global trade)
 */
const PHOTO_BASE = (import.meta.env.BASE_URL || '/') + 'photos';

export const PHOTO_LIBRARY: Array<{ url: string; label: string; tags: string[] }> = [
  // ── GROWTH SIGNALS (17) ──────────────────────────────────────
  { url: `${PHOTO_BASE}/growth/01_dubai_skyline_night.jpg`,       label: 'Dubai skyline · night',       tags: ['growth', 'uae', 'skyline'] },
  { url: `${PHOTO_BASE}/growth/02_abu_dhabi_towers.jpg`,          label: 'Abu Dhabi towers',            tags: ['growth', 'uae'] },
  { url: `${PHOTO_BASE}/growth/03_uae_highway_aerial.jpg`,        label: 'UAE highway aerial',          tags: ['growth', 'uae'] },
  { url: `${PHOTO_BASE}/growth/04_abu_dhabi_corniche.jpg`,        label: 'Abu Dhabi corniche',          tags: ['growth', 'uae'] },
  { url: `${PHOTO_BASE}/growth/04_corporate_towers.jpg`,          label: 'Corporate towers',            tags: ['growth', 'corporate'] },
  { url: `${PHOTO_BASE}/growth/05_construction_site.jpg`,         label: 'Construction site',           tags: ['growth', 'construction'] },
  { url: `${PHOTO_BASE}/growth/06_infrastructure_bridge.jpg`,     label: 'Infrastructure bridge',       tags: ['growth', 'infrastructure'] },
  { url: `${PHOTO_BASE}/growth/06_investment_growth.jpg`,         label: 'Investment growth',           tags: ['growth', 'investment'] },
  { url: `${PHOTO_BASE}/growth/07_skyscraper_construction.jpg`,   label: 'Skyscraper construction',     tags: ['growth', 'construction'] },
  { url: `${PHOTO_BASE}/growth/08_city_skyline_dusk.jpg`,         label: 'City skyline · dusk',         tags: ['growth', 'skyline'] },
  { url: `${PHOTO_BASE}/growth/09_urban_city_aerial.jpg`,         label: 'Urban city aerial',           tags: ['growth', 'aerial'] },
  { url: `${PHOTO_BASE}/growth/10_night_city_lights.jpg`,         label: 'Night city lights',           tags: ['growth', 'skyline'] },
  { url: `${PHOTO_BASE}/growth/11_highway_interchange.jpg`,       label: 'Highway interchange',         tags: ['growth', 'infrastructure'] },
  { url: `${PHOTO_BASE}/growth/12_sunrise_city.jpg`,              label: 'Sunrise city',                tags: ['growth', 'skyline'] },
  { url: `${PHOTO_BASE}/growth/12_tech_cityscape.jpg`,            label: 'Tech cityscape',              tags: ['growth', 'tech'] },
  { url: `${PHOTO_BASE}/growth/13_skyscraper_glass.jpg`,          label: 'Skyscraper · glass',          tags: ['growth', 'corporate'] },
  { url: `${PHOTO_BASE}/growth/13_money_growth.jpg`,              label: 'Money / growth chart',        tags: ['growth', 'investment'] },

  // ── CAPITAL & TREASURY (11) ──────────────────────────────────
  { url: `${PHOTO_BASE}/capital/01_stock_market_charts.jpg`,      label: 'Stock-market charts',         tags: ['capital', 'trading'] },
  { url: `${PHOTO_BASE}/capital/02_trading_screen.jpg`,           label: 'Trading screen',              tags: ['capital', 'trading'] },
  { url: `${PHOTO_BASE}/capital/03_financial_charts.jpg`,         label: 'Financial charts',            tags: ['capital', 'analytics'] },
  { url: `${PHOTO_BASE}/capital/04_trading_floor.jpg`,            label: 'Trading floor',               tags: ['capital', 'trading'] },
  { url: `${PHOTO_BASE}/capital/05_finance_building.jpg`,         label: 'Finance building',            tags: ['capital', 'banking'] },
  { url: `${PHOTO_BASE}/capital/07_gold_finance.jpg`,             label: 'Gold · finance',              tags: ['capital', 'gold'] },
  { url: `${PHOTO_BASE}/capital/08_financial_data.jpg`,           label: 'Financial data',              tags: ['capital', 'analytics'] },
  { url: `${PHOTO_BASE}/capital/09_bank_architecture.jpg`,        label: 'Bank architecture',           tags: ['capital', 'banking'] },
  { url: `${PHOTO_BASE}/capital/10_gold_bars.jpg`,                label: 'Gold bars',                   tags: ['capital', 'gold', 'sukuk'] },
  { url: `${PHOTO_BASE}/capital/11_forex_trading.jpg`,            label: 'Forex / FX trading',          tags: ['capital', 'fx'] },
  { url: `${PHOTO_BASE}/capital/12_digital_finance.jpg`,          label: 'Digital finance',             tags: ['capital', 'fintech'] },

  // ── RISK & COMPLIANCE (14) ───────────────────────────────────
  { url: `${PHOTO_BASE}/risk/01_document_signing.jpg`,            label: 'Document signing',            tags: ['risk', 'legal'] },
  { url: `${PHOTO_BASE}/risk/02_business_handshake.jpg`,          label: 'Business handshake',          tags: ['risk', 'deal'] },
  { url: `${PHOTO_BASE}/risk/03_corporate_meeting.jpg`,           label: 'Corporate meeting',           tags: ['risk', 'meeting'] },
  { url: `${PHOTO_BASE}/risk/04_boardroom_meeting.jpg`,           label: 'Boardroom meeting',           tags: ['risk', 'governance'] },
  { url: `${PHOTO_BASE}/risk/05_audit_documents.jpg`,             label: 'Audit documents',             tags: ['risk', 'audit'] },
  { url: `${PHOTO_BASE}/risk/06_boardroom.jpg`,                   label: 'Boardroom',                   tags: ['risk', 'governance'] },
  { url: `${PHOTO_BASE}/risk/06_financial_newspaper.jpg`,         label: 'Financial newspaper',         tags: ['risk', 'press'] },
  { url: `${PHOTO_BASE}/risk/07_office_meeting.jpg`,              label: 'Office meeting',              tags: ['risk', 'meeting'] },
  { url: `${PHOTO_BASE}/risk/08_contract_review.jpg`,             label: 'Contract review',             tags: ['risk', 'legal'] },
  { url: `${PHOTO_BASE}/risk/09_risk_analysis.jpg`,               label: 'Risk analysis',               tags: ['risk', 'analytics'] },
  { url: `${PHOTO_BASE}/risk/10_financial_audit.jpg`,             label: 'Financial audit',             tags: ['risk', 'audit'] },
  { url: `${PHOTO_BASE}/risk/11_data_network.jpg`,                label: 'Data network',                tags: ['risk', 'cyber'] },
  { url: `${PHOTO_BASE}/risk/11_professional_meeting.jpg`,        label: 'Professional meeting',        tags: ['risk', 'meeting'] },
  { url: `${PHOTO_BASE}/risk/12_compliance_data.jpg`,             label: 'Compliance data',             tags: ['risk', 'compliance'] },

  // ── WORLD PULSE (8) ──────────────────────────────────────────
  { url: `${PHOTO_BASE}/world/01_world_digital_map.jpg`,          label: 'World · digital map',         tags: ['world', 'global'] },
  { url: `${PHOTO_BASE}/world/02_shipping_port.jpg`,              label: 'Shipping port',               tags: ['world', 'trade'] },
  { url: `${PHOTO_BASE}/world/03_cargo_ship.jpg`,                 label: 'Cargo ship',                  tags: ['world', 'shipping'] },
  { url: `${PHOTO_BASE}/world/05_world_globe.jpg`,                label: 'World globe',                 tags: ['world', 'global'] },
  { url: `${PHOTO_BASE}/world/07_international_trade.jpg`,        label: 'International trade',         tags: ['world', 'trade'] },
  { url: `${PHOTO_BASE}/world/08_oil_sea.jpg`,                    label: 'Oil at sea',                  tags: ['world', 'energy'] },
  { url: `${PHOTO_BASE}/world/09_satellite_earth.jpg`,            label: 'Satellite · earth',           tags: ['world', 'global'] },
  { url: `${PHOTO_BASE}/world/10_global_network.jpg`,             label: 'Global network',              tags: ['world', 'network'] },

  // ── UNSPLASH overflow (30) — additional themes the local set doesn't cover yet:
  //    aviation, healthcare, AI/tech, solar, real-estate variations, etc.
  { url: 'https://images.unsplash.com/photo-1582407947092-47f5835e3a28?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Abu Dhabi skyline (Unsplash)', tags: ['uae', 'skyline'] },
  { url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Dubai skyline (Unsplash)', tags: ['uae', 'skyline'] },
  { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Dubai marina', tags: ['uae', 'real-estate'] },
  { url: 'https://images.unsplash.com/photo-1546412414-e1885259563a?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Burj Khalifa', tags: ['uae', 'landmark'] },
  { url: 'https://images.unsplash.com/photo-1547483238-f400e65ccd56?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Dubai aerial', tags: ['uae'] },
  { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Corporate tower', tags: ['business'] },
  { url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Big Tech HQ', tags: ['tech'] },
  { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Modern office', tags: ['business'] },
  { url: 'https://images.unsplash.com/photo-1618044733300-9472054094ee?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Gold bars (Unsplash)', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Trading screens (Unsplash)', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Bank vault', tags: ['capital', 'banking'] },
  { url: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Stock exchange', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Finance abstract', tags: ['capital'] },
  { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Legal documents (Unsplash)', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Gavel / law', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Cybersecurity', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Tax documents', tags: ['risk'] },
  { url: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Oil refinery', tags: ['world', 'energy'] },
  { url: 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Pipeline / gas', tags: ['world', 'energy'] },
  { url: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5eb19?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Shipping containers (Unsplash)', tags: ['world', 'trade'] },
  { url: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Port (Unsplash)', tags: ['world', 'trade'] },
  { url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Wind turbines', tags: ['world', 'climate'] },
  { url: 'https://images.unsplash.com/photo-1474314170901-f351b68f544f?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Solar / EU climate', tags: ['world', 'climate'] },
  { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Earth from space', tags: ['world'] },
  { url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'World map digital', tags: ['world'] },
  { url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'AI / robotics', tags: ['tech', 'ai'] },
  { url: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Data centre / server', tags: ['tech'] },
  { url: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Airplane / aviation', tags: ['world', 'aviation'] },
  { url: 'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Construction crane (Unsplash)', tags: ['growth'] },
  { url: 'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=1600&q=80&fit=crop&crop=entropy&auto=format', label: 'Sunrise skyline (Unsplash)', tags: ['growth'] },
];

/** Three palette presets the user can switch between */
export const PALETTE_PRESETS: Array<{ id: string; label: string; palette: BannerPalette }> = [
  { id: 'bronze',   label: 'Bronze (default)', palette: { accent: '#A8926A', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'red',      label: 'Risk red',          palette: { accent: '#EF5555', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'gold',     label: 'Capital gold',      palette: { accent: '#F0C050', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'blue',     label: 'World blue',        palette: { accent: '#5B8DEE', text: '#EAE6DE', bg: '#06060f' } },
  { id: 'green',    label: 'Growth green',      palette: { accent: '#4ADE80', text: '#EAE6DE', bg: '#06060f' } },
];
