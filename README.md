<div align="center">

<img src="https://img.shields.io/badge/STATUS-LIVE-00ff88?style=for-the-badge&labelColor=0a0a0a" />
<img src="https://img.shields.io/badge/PLATFORM-WEB-4f8ef7?style=for-the-badge&labelColor=0a0a0a" />
<img src="https://img.shields.io/badge/AI-ANOMALY%20DETECTION-ff6b35?style=for-the-badge&labelColor=0a0a0a" />
<img src="https://img.shields.io/badge/SATELLITES-REAL%20TIME-a855f7?style=for-the-badge&labelColor=0a0a0a" />

<br /><br />

```
 ███████╗ █████╗ ████████╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗
 ██╔════╝██╔══██╗╚══██╔══╝██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
 ███████╗███████║   ██║   ██║  ███╗██║   ██║███████║██████╔╝██║  ██║
 ╚════██║██╔══██║   ██║   ██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
 ███████║██║  ██║   ██║   ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
 ╚══════╝╚═╝  ╚═╝   ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝
```

### **Real-Time Satellite Telemetry Monitoring & AI-Powered Anomaly Detection**

*Because space doesn't wait — and neither should anomaly detection.*

<br />

**[🛰️ Live Demo](https://satguard-ai.vercel.app)** &nbsp;•&nbsp; **[📖 Docs](#documentation)** &nbsp;•&nbsp; **[🚀 Quick Start](#quick-start)** &nbsp;•&nbsp; **[🤝 Contributing](#contributing)**

<br />

---

</div>

## 🌌 The Problem We're Solving

Satellites are the backbone of modern civilization — GPS, weather forecasting, communication, internet connectivity. Yet satellite operations teams still rely on brittle threshold-based alerting systems that generate **thousands of false positives daily**, cause alert fatigue, and miss subtle multi-parameter anomalies that precede critical failures.

**SatGuard AI** changes that. We bring **AI-native anomaly detection** to satellite telemetry — giving ground control operators a real-time, intelligent co-pilot that sees what humans miss.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🛰️ **Live Satellite Tracking** | Real-time orbital positions rendered on an interactive globe |
| 🤖 **AI Anomaly Detection** | Multi-parameter anomaly analysis with severity classification (HIGH / MEDIUM / LOW) |
| 📡 **Telemetry Dashboard** | Live feeds for altitude, velocity, temperature, and battery |
| 📶 **Signal Strength Monitor** | S-band and other transmitter signal health tracking |
| ⚡ **Battery & Velocity Correlation** | Cross-parameter correlation charts for predictive insights |
| 🔔 **Prioritized Alert Feed** | Timestamped, categorized alerts (Thermal, Signal, Orbit) with instant drill-down |
| 🌐 **Multi-Satellite Support** | Track all active satellites simultaneously from a single pane of glass |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SatGuard AI Platform                     │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Telemetry   │───▶│  AI Anomaly  │───▶│  Alert Engine    │  │
│  │  Ingestion   │    │  Detection   │    │  (H/M/L Triage)  │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                                         │            │
│         ▼                                         ▼            │
│  ┌──────────────┐                       ┌──────────────────┐  │
│  │  Real-Time   │                       │  Dashboard UI    │  │
│  │  Satellite   │                       │  (Live Charts,   │  │
│  │  Positions   │                       │  Globe, Feeds)   │  │
│  └──────────────┘                       └──────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/satguard-ai.git
cd satguard-ai

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file in the root directory:

```env
# Satellite data API
NEXT_PUBLIC_SATELLITE_API_URL=your_api_url_here
NEXT_PUBLIC_SATELLITE_API_KEY=your_api_key_here

# AI inference endpoint (if self-hosted)
AI_MODEL_ENDPOINT=your_model_endpoint_here
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Frontend** | Next.js / React |
| **Deployment** | Vercel |
| **Visualization** | Custom Charts + Globe Renderer |
| **AI/ML** | Anomaly Detection Model |
| **Real-Time** | WebSockets / SSE |
| **Styling** | Tailwind CSS / Custom CSS |

</div>

---

## 📸 Screenshots

### 🖥️ Main Dashboard
> Live telemetry — altitude, velocity, temperature, battery — all at a glance with real-time updates.

### 🌍 Satellite Globe
> Interactive 3D globe with real-time satellite orbital positions and ground tracks.

### 🚨 AI Anomaly Alerts
> Intelligent alert feed with severity triage, category tagging, and timestamps — zero noise, pure signal.

### 📊 Correlation Charts
> Battery & velocity cross-parameter correlation to surface early warning patterns before anomalies escalate.

---

## 🤖 How the AI Works

SatGuard AI uses a multi-step anomaly detection pipeline:

1. **Ingest** — Continuous telemetry stream ingestion (altitude, velocity, temperature, battery, signal strength)
2. **Baseline** — Dynamic baseline modeling per satellite, per parameter
3. **Detect** — Statistical + ML anomaly detection on single and cross-parameter signals
4. **Classify** — Severity scoring → HIGH / MEDIUM / LOW with category tagging (Thermal, Signal, Orbit)
5. **Alert** — Real-time alert dispatch with human-readable context

> **Example:** A 3°C temperature spike in the solar panel array (Thermal / HIGH) is surfaced instantly — before it cascades into power degradation and attitude control failure.

---

## 📡 Monitored Parameters

```
✅ Orbital Altitude         — Stable orbit detection, drift alerts
✅ Velocity                 — Orbital velocity monitoring
✅ Thermal / Temperature    — Solar panel & onboard thermal anomalies  
✅ Battery                  — Charge state, solar charging health
✅ Signal Strength          — S-band transmitter degradation
✅ Orbital Drift            — Minor to critical drift classification
```

---

## 🗺️ Roadmap

- [x] Real-time telemetry dashboard
- [x] AI anomaly detection & severity triage
- [x] Live satellite position tracking
- [x] Signal strength monitoring
- [x] Battery-velocity correlation charts
- [ ] Predictive failure forecasting (72hr horizon)
- [ ] Multi-constellation support (LEO / MEO / GEO)
- [ ] Natural language alert summaries
- [ ] Historical telemetry replay & forensics
- [ ] Mobile app (iOS / Android)
- [ ] API access for ground station integration

---

## 🤝 Contributing

Contributions are what make the open source community thrive. Any contributions you make are **greatly appreciated**.

```bash
# 1. Fork the repository
# 2. Create your feature branch
git checkout -b feature/AmazingFeature

# 3. Commit your changes
git commit -m 'Add AmazingFeature'

# 4. Push to the branch
git push origin feature/AmazingFeature

# 5. Open a Pull Request
```

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for our code of conduct and contribution guidelines.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## 🙌 Acknowledgements

- Satellite telemetry standards inspired by ESA & NASA ground operations
- Real-time orbital mechanics powered by open TLE data sources
- Built with ❤️ for the space operations community

---

<div align="center">

**[🛰️ satguard-ai.vercel.app](https://satguard-ai.vercel.app)**

*SatGuard AI © 2026 — Real-time Satellite Monitoring System*

<br />

⭐ **If this project helped you, give it a star!** ⭐

</div>
