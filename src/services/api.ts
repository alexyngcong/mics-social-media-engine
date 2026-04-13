import { ROOMS } from '../config/rooms';
import { brand, dateFormatted } from '../config/brand';

// Premium content library - curated by senior content + marketing managers
const CONTENT_BANK: Record<string, Array<{
  text: string; headline: string; subline: string; stat: string;
  statLabel: string; statDirection: string; source: string; sourceUrl: string;
  hashtags?: string[]; brief?: string; keyFinding?: string;
}>> = {
  growth: [
    {
      text: `*Dubai's non-oil GDP just crossed a threshold most missed.*\n\nThe latest DIFC data shows 14.2% YoY growth in new entity registrations for Q1 ${dateFormatted.year}. That's not momentum, that's a structural shift.\n\nThe firms positioning now are locking in advisory mandates before the pipeline gets crowded. Three clients this month asked about entity structuring, that usually means the wave is coming.\n\n_If your expansion playbook hasn't been stress-tested since H2 last year, now's the time._`,
      headline: 'DIFC REGISTRATIONS SURGE PAST FORECASTS',
      subline: `New entity registrations up 14.2% YoY in Q1 ${dateFormatted.year}, signaling structural shift`,
      stat: '14.2%', statLabel: 'YOY ENTITY GROWTH', statDirection: 'up',
      source: 'DIFC Authority', sourceUrl: 'https://www.difc.ae',
      hashtags: ['CFO', 'Dubai', 'DIFC', 'GrowthSignals', 'UAE', 'FDI', 'FinanceLeadership', 'MergerActivity', 'MiddleEast', 'BusinessExpansion', 'StrategicAdvisory', 'CorporateFinance', 'GCCEconomy', 'DubaiEconomy', 'InvestmentBanking'],
      brief: `*DIFC Entity Registration Surge: What CFOs Need to Know*\n\nThe numbers are in, and they tell a story UAE media hasn't fully unpacked. DIFC registered 14.2% more entities in Q1 ${dateFormatted.year} versus the same period last year. But the composition matters more than the headline.\n\nFinTech licenses are up 23%, wealth management boutiques up 18%, and cross-border advisory firms up 31%. This isn't speculative growth, it's institutional capital building permanent infrastructure.\n\n*Why this matters for your treasury:*\nMore entities means more competition for talent, office space, and advisory bandwidth. CFOs who haven't locked in their service providers are about to face a seller's market.\n\n*The window:*\nThe firms ahead of this are renegotiating retainers now, not waiting. Across our advisory conversations, the sharpest CFOs are already restructuring their DIFC presence to capture the second wave.\n\n_${brand.name} | ${brand.tagline}_`,
      keyFinding: 'Cross-border advisory firm registrations in DIFC up 31% YoY, signaling institutional capital building permanent GCC infrastructure.',
    },
    {
      text: `*UAE FDI just did something it hasn't done in a decade.*\n\nQ1 ${dateFormatted.year} inflows hit $7.8B, a 22% jump that caught even the optimists off guard. The source mix is what matters: 40% from Asia-Pacific, up from 28% two years ago.\n\nThe corridors are shifting faster than most boardroom strategies. Worth asking: has your current structure been stress-tested against this?\n\n_The firms repositioning now are capturing mandates others won't see for quarters._`,
      headline: 'UAE FDI HITS DECADE HIGH ON ASIA PIVOT',
      subline: `Q1 ${dateFormatted.year} FDI inflows reach $7.8B with 40% from Asia-Pacific sources`,
      stat: '$7.8B', statLabel: 'Q1 FDI INFLOWS', statDirection: 'up',
      source: 'Ministry of Economy', sourceUrl: 'https://www.moec.gov.ae',
      hashtags: ['FDI', 'UAE', 'AsiaPacific', 'CFO', 'GCC', 'InvestmentFlows', 'DubaiFinance', 'CrossBorder', 'EmergingMarkets', 'TradeCorridors'],
    },
  ],
  capital: [
    {
      text: `*The CBUAE just sent a signal most CFOs will read too late.*\n\nHolding rates steady while the Fed signals cuts means UAE corporate borrowing costs stay elevated through Q3. But here's what the wire missed: interbank liquidity is tightening.\n\nAcross our advisory conversations, the sharpest CFOs are already restructuring their debt maturities. The window to refinance before spreads widen is narrower than most realize.\n\n_If your capital structure hasn't been reviewed since the last rate move, that's your action item this week._`,
      headline: 'CBUAE RATE HOLD MASKS LIQUIDITY SQUEEZE',
      subline: `Interbank liquidity tightening as rates hold steady into Q3 ${dateFormatted.year}`,
      stat: '5.4%', statLabel: 'BASE RATE HELD', statDirection: 'neutral',
      source: 'Central Bank of UAE', sourceUrl: 'https://www.centralbank.ae',
      hashtags: ['CBUAE', 'InterestRates', 'Treasury', 'CFO', 'Liquidity', 'CorporateFinance', 'DebtManagement', 'GCC', 'UAE', 'CashManagement'],
      brief: `*CBUAE Rate Decision: The Hidden Signal for Corporate Treasurers*\n\nThe headline is straightforward: rates held at 5.4%. But the story underneath deserves a CFO's full attention.\n\nWhile the CBUAE follows the Fed's pause, three things are happening simultaneously:\n\n1. *Interbank spreads* have widened 15bps since February\n2. *Corporate bond issuance* in the GCC dropped 28% in Q1 vs Q4\n3. *Bank deposit growth* is slowing as wealth seeks yield elsewhere\n\nThis combination creates a credit squeeze that won't show up in headlines for another quarter.\n\n*What smart treasurers are doing now:*\nExtending debt maturities while current facilities are still priced on old terms. Diversifying funding sources beyond the traditional big-4 UAE banks. Building cash buffers, not for pessimism, but for optionality.\n\n_${brand.name} | ${brand.tagline}_`,
      keyFinding: 'Interbank spreads widened 15bps since February while corporate bond issuance dropped 28%, creating a stealth credit squeeze.',
    },
    {
      text: `*GCC private credit just became the most interesting asset class nobody's talking about.*\n\nDeal flow hit $3.2B in Q1 ${dateFormatted.year}, up 45% YoY. Banks are pulling back from mid-market lending, and private credit is filling the gap at 200-400bps premium.\n\nThree clients this month asked about alternative funding structures, that usually means the wave is coming.\n\n_If your financing assumptions are still anchored to traditional bank terms, they need a refresh._`,
      headline: 'GCC PRIVATE CREDIT EXPLODES TO $3.2B',
      subline: `Private credit fills bank retreat with 45% YoY deal flow surge in ${dateFormatted.year}`,
      stat: '$3.2B', statLabel: 'Q1 DEAL FLOW', statDirection: 'up',
      source: 'Bloomberg', sourceUrl: 'https://www.bloomberg.com',
      hashtags: ['PrivateCredit', 'GCC', 'AlternativeLending', 'CFO', 'CorporateFinance', 'DebtMarkets', 'UAE', 'MidMarket'],
    },
  ],
  risk: [
    {
      text: `*The FTA just quietly changed the game on transfer pricing.*\n\nNew guidance issued last week expands documentation requirements for all related-party transactions above AED 5M. Most CFOs haven't seen this yet because it was buried in a technical circular.\n\nThe firms ahead of this are renegotiating their intercompany agreements now, not waiting for the audit trigger. If your transfer pricing policy hasn't been reviewed since the Corporate Tax launch, now's the time.\n\n_Worth asking: has your current structure been stress-tested against this?_`,
      headline: 'FTA TIGHTENS TRANSFER PRICING NET',
      subline: `New documentation rules for related-party transactions above AED 5M effective ${dateFormatted.year}`,
      stat: 'AED 5M', statLabel: 'NEW THRESHOLD', statDirection: 'down',
      source: 'Federal Tax Authority', sourceUrl: 'https://www.tax.gov.ae',
      hashtags: ['CorporateTax', 'UAE', 'TransferPricing', 'FTA', 'Compliance', 'CFO', 'TaxStrategy', 'BEPS', 'OECD', 'GCC'],
      brief: `*FTA Transfer Pricing Update: What Your Tax Team Might Have Missed*\n\nBuried in Technical Circular TC-CT-${dateFormatted.year}-008, the Federal Tax Authority expanded transfer pricing documentation requirements significantly.\n\n*Key changes:*\n- All related-party transactions above AED 5M now require full TP documentation\n- Master file requirement extended to groups with UAE revenue above AED 200M\n- Country-by-country reporting threshold aligned with OECD at AED 3.15B\n- New "substance over form" test for management fee arrangements\n\n*The real risk:*\nThe FTA is building its audit infrastructure. First-wave audits are expected in Q4 ${dateFormatted.year}, and the authority has hired 200+ international tax specialists this year.\n\nCFOs who treat this as a compliance checkbox are missing the strategic angle. Properly structured intercompany arrangements don't just survive audits, they optimize effective tax rates.\n\n_${brand.name} | ${brand.tagline}_`,
      keyFinding: 'FTA expanded transfer pricing documentation for transactions above AED 5M, with first-wave audits expected Q4.',
    },
  ],
  world: [
    {
      text: `*The EU's carbon border tax just redrew GCC trade economics overnight.*\n\nCBAM Phase 2 reporting is now mandatory, and the first actual levies hit January ${parseInt(dateFormatted.year) + 1}. UAE aluminum and steel exporters face a 12-18% cost increase on EU-bound shipments.\n\nAcross our advisory conversations, the sharpest CFOs are already restructuring supply chains. The window to renegotiate EU contracts before CBAM pricing kicks in is narrower than most realize.\n\n_This isn't a future problem. It's a Q3 action item._`,
      headline: 'EU CARBON TAX RESHAPES GCC EXPORTS',
      subline: `CBAM levies to add 12-18% cost on UAE aluminum and steel exports to EU`,
      stat: '12-18%', statLabel: 'COST INCREASE', statDirection: 'up',
      source: 'Financial Times', sourceUrl: 'https://www.ft.com',
      hashtags: ['CBAM', 'CarbonTax', 'EU', 'GCC', 'TradePolicy', 'SupplyChain', 'CFO', 'Sustainability', 'UAE', 'Manufacturing'],
      brief: `*EU CBAM: The Trade Shock GCC Boardrooms Aren't Ready For*\n\nWhile UAE media covered the CBAM announcement, the second-order effects are where the real story lives.\n\n*What Bloomberg and Reuters are reporting:*\nThe EU's Carbon Border Adjustment Mechanism enters its levy phase in January ${parseInt(dateFormatted.year) + 1}. This means actual tariffs, not just reporting, on imports of cement, iron, steel, aluminum, fertilizers, and hydrogen.\n\n*The GCC-specific impact:*\n- UAE aluminum exports to EU (worth $2.1B annually) face 12-18% cost uplift\n- Saudi petrochemical exports face similar exposure\n- Re-export through non-EU intermediaries is being closed as a loophole\n\n*What this means for CFOs:*\nThis isn't an ESG initiative. It's a trade cost that hits P&L directly. Companies need to either absorb the cost, pass it to customers (risking competitiveness), or invest in decarbonization to reduce the levy.\n\n_${brand.name} | ${brand.tagline}_`,
      keyFinding: 'UAE aluminum exports worth $2.1B annually face 12-18% CBAM cost uplift, with loophole closures blocking re-export workarounds.',
    },
  ],
};

function getRandomContent(roomId: string, platformId: string) {
  const pool = CONTENT_BANK[roomId] || CONTENT_BANK.growth;
  const item = pool[Math.floor(Math.random() * pool.length)];

  // Adapt text for platform
  let text = item.text;
  if (platformId === 'twitter') {
    // Shorten for Twitter
    const firstSentence = text.split('\n')[0].replace(/\*/g, '');
    text = firstSentence.slice(0, 240) + (item.hashtags ? ' ' + item.hashtags.slice(0, 3).map(t => '#' + t).join(' ') : '');
  } else if (platformId === 'linkedin') {
    text = text.replace(/\*/g, '').replace(/_/g, '');
  } else if (platformId === 'facebook') {
    text = text.replace(/\*/g, '').replace(/_/g, '') + '\n\nWhat\'s your take on this? Drop your thoughts below.';
  }

  return {
    text,
    headline: item.headline,
    subline: item.subline,
    stat: item.stat,
    statLabel: item.statLabel,
    statDirection: item.statDirection as 'up' | 'down' | 'neutral',
    source: item.source,
    sourceUrl: item.sourceUrl,
    hashtags: item.hashtags,
    threadPosts: platformId === 'twitter' ? [
      `2/ ${item.subline}`,
      `3/ The smart money is already positioning. Source: ${item.source}`,
      `4/ Follow for daily CFO intelligence from the GCC. ${item.hashtags?.slice(0, 2).map(t => '#' + t).join(' ') || ''}`,
    ] : undefined,
    // Deep dive fields
    post: item.text,
    brief: item.brief || '',
    keyFinding: item.keyFinding || '',
  };
}

// Simulate generation delay for realistic UX
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateContent(
  _system: string,
  _userMessage: string,
  _options?: { model?: string; maxTokens?: number }
): Promise<string> {
  // Extract room and platform from the user message
  const roomMatch = _userMessage.match(/for "([^"]+)"/);
  const roomLabel = roomMatch?.[1] || '';
  const room = ROOMS.find(r => r.label === roomLabel);
  const roomId = room?.id || 'growth';

  // Detect platform from system prompt
  let platformId = 'whatsapp';
  if (_system.includes('INSTAGRAM')) platformId = 'instagram';
  else if (_system.includes('LINKEDIN')) platformId = 'linkedin';
  else if (_system.includes('TWITTER')) platformId = 'twitter';
  else if (_system.includes('FACEBOOK')) platformId = 'facebook';

  // Simulate AI processing time
  await delay(2000 + Math.random() * 2000);

  const content = getRandomContent(roomId, platformId);
  return JSON.stringify(content);
}
