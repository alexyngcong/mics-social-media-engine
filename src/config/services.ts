/**
 * MICS CANONICAL SERVICE TAXONOMY
 *
 * Source of truth — extracted from:
 *   - MICS International Corporate Profile May 2026
 *   - MICS International Corporate Presentation
 *
 * Structure:
 *   3 Pillars (client-facing pitch)
 *     └─ 42 Services (granular offerings)
 *
 * Each service maps to:
 *   - pillar         → for grouping in the picker
 *   - room           → for content-engine routing (existing 4-room architecture)
 *   - keywords[]     → fed to news-topic synthesizer
 *   - trackRecord    → optional stat used as advisory anchor
 */
import type { RoomId } from '../types';

export type PillarId = 'corporate_finance' | 'operational_compliance' | 'wealth_management';

export interface Pillar {
  id: PillarId;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  description: string;
}

export interface Service {
  id: string;
  pillar: PillarId;
  label: string;
  room: RoomId;
  keywords: string[];
  trackRecord?: string;
}

export const PILLARS: Pillar[] = [
  {
    id: 'corporate_finance',
    label: 'Corporate & Strategic Finance',
    shortLabel: 'Corporate Finance',
    icon: '📈', // 📈
    color: '#4ADE80',
    description: 'Capital raising, M&A, valuations and transaction advisory',
  },
  {
    id: 'operational_compliance',
    label: 'Operational Compliance',
    shortLabel: 'Compliance',
    icon: '🛡️', // 🛡️
    color: '#EF5555',
    description: 'Tax, audit, AML, licensing and regulatory frameworks',
  },
  {
    id: 'wealth_management',
    label: 'Wealth Management',
    shortLabel: 'Wealth',
    icon: '💎', // 💎
    color: '#F0C050',
    description: 'UHNWI strategic wealth advisory and portfolio modeling',
  },
];

export const SERVICES: Service[] = [
  // ─── PILLAR 1: Corporate & Strategic Finance (13 services) ───
  {
    id: 'due_diligence',
    pillar: 'corporate_finance',
    label: 'Due Diligence',
    room: 'capital',
    keywords: ['due diligence', 'transaction risk', 'M&A diligence'],
    trackRecord: '300+ Valuations, DD & Modeling projects',
  },
  {
    id: 'ma_services',
    pillar: 'corporate_finance',
    label: 'Mergers & Acquisitions (M&A) Services',
    room: 'growth',
    keywords: ['M&A', 'mergers acquisitions', 'GCC deal flow'],
    trackRecord: 'Top 10 M&A Advisory Firm in Asia',
  },
  {
    id: 'capital_raising',
    pillar: 'corporate_finance',
    label: 'Capital Raising',
    room: 'capital',
    keywords: ['capital raising', 'funding round', 'private capital'],
    trackRecord: '$800M+ funding arranged',
  },
  {
    id: 'business_valuation',
    pillar: 'corporate_finance',
    label: 'Business Valuation',
    room: 'capital',
    keywords: ['business valuation', 'enterprise value', 'fair value'],
    trackRecord: '300+ valuation projects',
  },
  {
    id: 'financial_modeling',
    pillar: 'corporate_finance',
    label: 'Financial Modeling',
    room: 'capital',
    keywords: ['financial modeling', 'DCF', 'LBO', 'projections'],
    trackRecord: '250+ real estate financial models',
  },
  {
    id: 'feasibility_study',
    pillar: 'corporate_finance',
    label: 'Financial Feasibility Study',
    room: 'growth',
    keywords: ['feasibility study', 'project viability', 'market entry'],
  },
  {
    id: 'pe_financing',
    pillar: 'corporate_finance',
    label: 'PE Financing',
    room: 'capital',
    keywords: ['private equity', 'PE financing', 'growth capital'],
  },
  {
    id: 'debt_advisory',
    pillar: 'corporate_finance',
    label: 'Debt Advisory & Transaction Support',
    room: 'capital',
    keywords: ['debt advisory', 'syndicated loan', 'project finance', 'credit rating'],
    trackRecord: '$800M+ in debt structured',
  },
  {
    id: 'buy_sell_advisory',
    pillar: 'corporate_finance',
    label: 'Buy Side & Sell Side Advisory',
    room: 'growth',
    keywords: ['buy side', 'sell side', 'deal advisory'],
  },
  {
    id: 'equity_structuring',
    pillar: 'corporate_finance',
    label: 'Business Valuation & Equity Structuring',
    room: 'capital',
    keywords: ['equity structuring', 'cap table', 'shareholder structuring'],
  },
  {
    id: 'partnerships_jvs',
    pillar: 'corporate_finance',
    label: 'Strategic Partnerships & Joint Ventures',
    room: 'growth',
    keywords: ['joint venture', 'strategic partnership', 'GCC JV'],
  },
  {
    id: 'dd_support',
    pillar: 'corporate_finance',
    label: 'Due Diligence Support',
    room: 'capital',
    keywords: ['diligence support', 'deal support', 'transaction advisory'],
  },
  {
    id: 'transaction_management',
    pillar: 'corporate_finance',
    label: 'Negotiation & Transaction Management',
    room: 'growth',
    keywords: ['transaction management', 'negotiation', 'deal closing'],
  },

  // ─── PILLAR 2: Operational Compliance (25 services) ───
  {
    id: 'ct_registration',
    pillar: 'operational_compliance',
    label: 'Corporate Tax Registration',
    room: 'risk',
    keywords: ['UAE corporate tax registration', 'FTA registration', 'CT TRN'],
    trackRecord: '500+ Corporate Tax assessments',
  },
  {
    id: 'ct_filing',
    pillar: 'operational_compliance',
    label: 'Corporate Tax Filing',
    room: 'risk',
    keywords: ['corporate tax filing', 'CT return', 'FTA filing deadline'],
  },
  {
    id: 'audit_assurance',
    pillar: 'operational_compliance',
    label: 'Audit & Assurance',
    room: 'risk',
    keywords: ['financial audit', 'statutory audit', 'audit assurance UAE'],
    trackRecord: '300+ audit projects, 100% completion record',
  },
  {
    id: 'accounting_bookkeeping',
    pillar: 'operational_compliance',
    label: 'Accounting & Bookkeeping',
    room: 'risk',
    keywords: ['bookkeeping', 'accounting outsourced', 'CFO services'],
    trackRecord: '600+ implementations, 100% compliance record',
  },
  {
    id: 'e_invoicing',
    pillar: 'operational_compliance',
    label: 'E-Invoicing',
    room: 'risk',
    keywords: ['UAE e-invoicing', 'MoF e-invoicing mandate', 'PEPPOL UAE'],
  },
  {
    id: 'transfer_pricing',
    pillar: 'operational_compliance',
    label: 'Transfer Pricing',
    room: 'risk',
    keywords: ['transfer pricing UAE', 'TP documentation', 'intercompany pricing'],
    trackRecord: '500+ TP assessments',
  },
  {
    id: 'licensing_structuring',
    pillar: 'operational_compliance',
    label: 'Licensing & Structuring',
    room: 'growth',
    keywords: ['UAE licensing', 'free zone setup', 'mainland license', 'entity formation'],
    trackRecord: '5,000+ licenses delivered',
  },
  {
    id: 'vat_compliance',
    pillar: 'operational_compliance',
    label: 'VAT Compliance',
    room: 'risk',
    keywords: ['UAE VAT', 'VAT return', 'FTA VAT compliance'],
  },
  {
    id: 'vat_refund',
    pillar: 'operational_compliance',
    label: 'VAT Refund',
    room: 'risk',
    keywords: ['VAT refund UAE', 'FTA refund claim', 'input VAT recovery'],
    trackRecord: 'AED 1.5M+ refunds secured',
  },
  {
    id: 'benchmarking',
    pillar: 'operational_compliance',
    label: 'Benchmarking',
    room: 'risk',
    keywords: ['transfer pricing benchmarking', 'comparables study', 'arm length analysis'],
  },
  {
    id: 'dta_expertise',
    pillar: 'operational_compliance',
    label: 'DTA Expertise',
    room: 'world',
    keywords: ['double taxation agreement', 'DTA UAE', 'tax treaty'],
  },
  {
    id: 'poem_guidance',
    pillar: 'operational_compliance',
    label: 'POEM Guidance',
    room: 'risk',
    keywords: ['place of effective management', 'POEM UAE', 'tax residency'],
  },
  {
    id: 'cross_border_analysis',
    pillar: 'operational_compliance',
    label: 'Cross-Border & Jurisdictional Analysis',
    room: 'world',
    keywords: ['cross-border tax', 'jurisdictional analysis', 'multi-jurisdiction structuring'],
  },
  {
    id: 'tax_structure_advisory',
    pillar: 'operational_compliance',
    label: 'Tax Structure Optimization & Advisory',
    room: 'risk',
    keywords: ['tax structuring', 'tax optimization', 'holding structure UAE'],
  },
  {
    id: 'tax_group_formation',
    pillar: 'operational_compliance',
    label: 'Tax Group Formation',
    room: 'risk',
    keywords: ['tax group UAE', 'consolidated tax filing', 'group structuring'],
  },
  {
    id: 'tax_regime_advisory',
    pillar: 'operational_compliance',
    label: 'Tax Regime Advisory',
    room: 'risk',
    keywords: ['tax regime', 'free zone tax', 'qualifying free zone person'],
  },
  {
    id: 'aml_compliance',
    pillar: 'operational_compliance',
    label: 'AML Compliance & Framework',
    room: 'risk',
    keywords: ['UAE AML', 'anti money laundering', 'DNFBP compliance', 'FATF UAE'],
  },
  {
    id: 'bank_account_setup',
    pillar: 'operational_compliance',
    label: 'Bank Account Setup',
    room: 'capital',
    keywords: ['UAE bank account', 'corporate banking setup', 'KYC onboarding'],
    trackRecord: '200+ bank accounts opened',
  },
  {
    id: 'investor_visa',
    pillar: 'operational_compliance',
    label: 'Investor & Partner Visas',
    room: 'growth',
    keywords: ['UAE investor visa', 'partner visa', 'business residency'],
  },
  {
    id: 'golden_visa',
    pillar: 'operational_compliance',
    label: 'Golden Visa',
    room: 'growth',
    keywords: ['UAE Golden Visa', 'long-term residency', '10-year visa'],
  },
  {
    id: 'holdings_foundations',
    pillar: 'operational_compliance',
    label: 'Holdings & Foundations',
    room: 'capital',
    keywords: ['UAE foundation', 'ADGM foundation', 'DIFC trust', 'holding company'],
  },
  {
    id: 'family_offices',
    pillar: 'operational_compliance',
    label: 'Family Offices',
    room: 'capital',
    keywords: ['family office UAE', 'single family office', 'multi family office'],
  },
  {
    id: 're_holding_structures',
    pillar: 'operational_compliance',
    label: 'Real Estate Holding Structures',
    room: 'capital',
    keywords: ['real estate SPV', 'property holding structure', 'UAE real estate fund'],
  },
  {
    id: 'hr_solutions',
    pillar: 'operational_compliance',
    label: 'Human Resource Solutions — Talent management',
    room: 'growth',
    keywords: ['UAE talent management', 'HR outsourcing', 'workforce strategy'],
  },
  {
    id: 'pro_services',
    pillar: 'operational_compliance',
    label: 'PRO Services',
    room: 'risk',
    keywords: ['PRO services UAE', 'government liaison', 'MoHRE compliance'],
  },

  // ─── PILLAR 3: Wealth Management (4 services) ───
  {
    id: 'uhnwi_advisory',
    pillar: 'wealth_management',
    label: 'Strategic wealth advisory for UHNWIs',
    room: 'capital',
    keywords: ['UHNWI advisory', 'private wealth GCC', 'family wealth strategy'],
  },
  {
    id: 'asset_estate',
    pillar: 'wealth_management',
    label: 'Asset allocation + estate planning',
    room: 'capital',
    keywords: ['asset allocation', 'estate planning UAE', 'wills trusts'],
  },
  {
    id: 'portfolio_modeling',
    pillar: 'wealth_management',
    label: 'Multi-asset portfolio modeling',
    room: 'capital',
    keywords: ['portfolio modeling', 'multi-asset allocation', 'global equities'],
  },
  {
    id: 'behavioral_tax_optim',
    pillar: 'wealth_management',
    label: 'Behavioral finance integration + tax optimization',
    room: 'capital',
    keywords: ['behavioral finance', 'tax optimization wealth', 'jurisdictional tax planning'],
  },
];

/** Return all services for a given pillar */
export function servicesByPillar(pillar: PillarId): Service[] {
  return SERVICES.filter((s) => s.pillar === pillar);
}

/** Look up a service by id */
export function serviceById(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

/** All compliance preset = entire Operational Compliance pillar */
export const ALL_COMPLIANCE_PRESET: string[] = servicesByPillar('operational_compliance').map((s) => s.id);
