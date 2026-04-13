# MICS Social Media Engine

Premium multi-platform social media post generator for MICS International's CFOs Private Insights Circle. Powered by AI with real-time web research, automated graphic generation, and one-click copy-to-post workflow.

## Features

- **5 Platforms**: WhatsApp, Instagram, LinkedIn, X (Twitter), Facebook
- **4 Intelligence Rooms**: Growth Signals, Capital & Treasury, Risk & Compliance, World Pulse
- **4 Post Formats**: Market Observation, CFO Alert, Poll/Discussion, Value Post
- **AI Deep Dive**: Multi-pass research with cross-referenced briefs
- **Canvas Graphics**: Professional banners auto-sized per platform (1080x1350, 1080x1080, 1200x627, etc.)
- **6 Design Templates**: Shuffleable dark premium themes with room-colored accents
- **Secure API**: Server-side proxy keeps your API key safe
- **Copy & Post**: One-click copy for text, hashtags, and thread tweets

## Prerequisites

- Node.js 18+
- Anthropic API key with web search access

## Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/mics-social-media-engine.git
cd mics-social-media-engine

# Install dependencies
npm install

# Configure API key
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start development (client + server)
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
src/
  config/       - Brand, platforms, rooms, post types, design tokens
  types/        - TypeScript interfaces
  services/     - API client, prompt builder, AI response parser
  store/        - Zustand state management
  hooks/        - useGenerate, useClipboard, useHistory, useBannerExport
  components/
    banner/     - Canvas renderer + CSS preview + 6 templates
    steps/      - Wizard flow: CommandCenter, PlatformSelect, RoomSelect, etc.
    ui/         - Button, Card, Spinner, Label
server/
  index.ts      - Express API proxy with rate limiting
```

## Configuration

**Brand**: Edit `src/config/brand.ts` to change company name, tagline, advisory seeds.

**Rooms**: Edit `src/config/rooms.ts` to modify intelligence categories and topics.

**Platforms**: Edit `src/config/platforms.ts` to adjust platform voice, formatting rules, and image dimensions.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client (5173) + server (3001) |
| `npm run dev:client` | Vite dev server only |
| `npm run dev:server` | Express API proxy only |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## License

MIT
