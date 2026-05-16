# SATGUARD AI

### Real-time Satellite Telemetry Monitoring & AI Anomaly Detection

**Problem:** Satellite operators manually monitor dozens of parameters across multiple spacecraft. Anomalies are caught late, explanations take time, and there is no predictive capability.

**Solution:** SATGUARD AI ingests live TLE orbital data, derives real-time telemetry, detects anomalies using statistical and rule-based AI, generates natural-language explanations via Claude, and forecasts failures before they happen.

## Architecture

CelesTrak TLE API → satellite.js propagation → Telemetry Engine → Anomaly Detection (statistical + rules) → Claude Haiku (narration + assistant) → React Dashboard

## Tech Stack

- **Frontend:** React 18 + TypeScript + Next.js 14
- **3D Visualization:** Three.js + satellite.js
- **Charts:** Recharts
- **AI:** Anthropic Claude Haiku (anomaly narration + RAG assistant)
- **Data:** CelesTrak TLE API (free, real-time)
- **Deployment:** Vercel

## Features

- Live orbital mechanics for 5 real satellites (ISS, NOAA 19, TERRA, AQUA, Sentinel-2A)
- Statistical z-score + rule-based anomaly detection with confidence scoring
- AI-generated alert narration (Claude Haiku, streamed)
- 30-minute predictive forecasting with danger threshold warnings
- 3D interactive orbital globe with real orbit tracks
- Mission control command simulation terminal
- RAG-powered satellite operations chat assistant
- Dark/light mode, fully responsive
- Mobile-first responsive design

## Tracked Satellites

| Satellite | NORAD ID | Orbit |
|-----------|----------|-------|
| ISS (ZARYA) | 25544 | LEO |
| NOAA 19 | 33591 | LEO |
| TERRA | 25994 | LEO |
| AQUA | 27424 | LEO |
| SENTINEL-2A | 40697 | LEO |

## Running Locally

```bash
git clone https://github.com/Nilashini28/satguard-ai
cd satguard-ai
npm install
cp .env.example .env.local
# Add your Anthropic API key to .env.local (free tier works)
npm run dev
```

## Environment Variables

Create a `.env.local` file:

```
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

The free tier of Anthropic API works with the Haiku model at no cost.

## Deployment

Deploy to Vercel:

```bash
npm install -g vercel
vercel --prod
```

Set `VITE_ANTHROPIC_API_KEY` in Vercel project settings.

## Data Sources

- **Satellite TLE:** CelesTrak SOCRATES API (free, no auth required)
- **Position Propagation:** satellite.js library
- **Ground Station:** Chennai, India (13.08°N, 80.27°E)

## License

MIT