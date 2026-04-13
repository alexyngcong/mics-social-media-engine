import type { Room } from '../types';
import { dateFormatted } from './brand';

const MY = dateFormatted.monthYear;

export const ROOMS: Room[] = [
  {
    id: 'growth',
    label: 'Growth Signals + Decisions',
    icon: '\u{1F4E1}',
    short: 'Growth',
    color: '#4ADE80',
    description: 'Market indicators, sector shifts, expansion signals',
    micsServices: 'Strategic Advisory, Feasibility, M&A, Valuation',
    topics: [
      `UAE GDP forecast ${MY}`,
      `Dubai FDI Q2 ${dateFormatted.year}`,
      `GCC IPO ${dateFormatted.year}`,
      `DIFC registrations April ${dateFormatted.year}`,
      `UAE non-oil expansion ${dateFormatted.year}`,
    ],
  },
  {
    id: 'capital',
    label: 'Capital, Cash & Treasury',
    icon: '\u{1F3E6}',
    short: 'Capital',
    color: '#F0C050',
    description: 'Liquidity signals, cash discipline, capital allocation',
    micsServices: 'Wealth Management, Cash Flow, Capital Structuring, SPVs',
    topics: [
      `CBUAE rate decision April ${dateFormatted.year}`,
      `UAE bond market ${dateFormatted.year}`,
      `Dubai yields ${dateFormatted.year}`,
      `GCC private credit ${dateFormatted.year}`,
    ],
  },
  {
    id: 'risk',
    label: 'Risk, Compliance & Governance',
    icon: '\u{1F6E1}\uFE0F',
    short: 'Risk',
    color: '#EF5555',
    description: 'Tax, regulatory, governance, AML, OECD updates',
    micsServices: 'Corporate Tax, VAT, Audit, AML, OECD Pillar 2',
    topics: [
      `UAE corporate tax April ${dateFormatted.year}`,
      `FTA compliance ${dateFormatted.year}`,
      `FATF UAE ${dateFormatted.year}`,
      `OECD DMTT UAE ${dateFormatted.year}`,
    ],
  },
  {
    id: 'world',
    label: 'World Pulse',
    icon: '\u{1F30D}',
    short: 'World',
    color: '#5B8DEE',
    description: 'Global breaking news not yet covered by UAE media',
    micsServices: 'International Advisory, Cross-border Structuring',
    topics: [
      `global financial regulation April ${dateFormatted.year}`,
      `emerging markets shift ${dateFormatted.year}`,
      `US Fed policy impact GCC ${dateFormatted.year}`,
      `EU CBAM trade impact ${dateFormatted.year}`,
    ],
  },
];
