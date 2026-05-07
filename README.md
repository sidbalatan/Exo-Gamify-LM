🌌 ExoQuest / XQuest 🚀
"The stars are our lifeboat. The community is our crew."
Welcome to the ExoQuest & XQuest Ecosystem. This project is a first-of-its-kind "Human-in-the-Loop" (HITL) machine learning pipeline designed to find Earth 2.0 candidates around K-Dwarf stars. While Earth faces existential threats, we are using live NASA/ESA data to hunt for our next home.

## This repository

The code in this git tree is the **XQuest web app** (Next.js + Tailwind + Radix / shadcn-style UI). It was bootstrapped from [v0](https://v0.app) and is the layer you iterate on in Cursor. Backend services, the ExoQuest pipeline, and databases described in the vision may live in other repositories or future work—not everything below exists in this folder yet.

### Local development

Requirements: **Node.js 20.9+**. Dependencies are locked with **pnpm**; you can still run scripts with **`npm run …`** if you installed via npm.

**If `corepack` / `pnpm` are not found**, you do not have full **Node.js** on your PATH (Cursor’s bundled `node` alone does not ship `corepack`). Install [Node.js LTS](https://nodejs.org), then **open a new terminal** so PATH updates.

**One-shot setup on Windows (PowerShell 7+)** — enables Corepack, activates pnpm 9.15.9, and installs dependencies:

```powershell
cd path\to\Exo-Gamify-LM
pwsh ./scripts/setup-dev.ps1
```

If `winget install …` fails, times out, or never leaves “Waiting for another install…”, use the **Windows `.msi` installer** from [nodejs.org](https://nodejs.org) instead (choose LTS, enable “Add to PATH”), then rerun `setup-dev.ps1`.

After Node is installed, you can instead run manually:

```powershell
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

Or: `npm install -g pnpm` (requires `npm` on your PATH).

```bash
pnpm install   # or: npm install
pnpm dev       # or: npm run dev
```

Useful checks before a PR or deploy:

| Command | Purpose |
| --- | --- |
| `pnpm lint` | ESLint (flat config, Next.js core-web-vitals + TypeScript) |
| `pnpm lint:fix` | ESLint with auto-fix |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm build` | Production build (TypeScript errors fail the build) |
| `pnpm verify` or `npm run verify` | lint + typecheck + build (no nested pnpm/npm) |

🛰️ Project Components
1. ExoQuest (The Pipeline)
A professional-grade scientific engine that pulls live data from the Gaia DR3 and TESS/MAST archives. It handles the "heavy lifting":
The Scout: Automated target acquisition of K-Dwarf stars.
The Pulse: Data cleaning and detrending using the Wotan algorithm.
QuestX: A high-performance transit search using TransitLeastSquares.
2. XQuest (The Game)
A mobile-first, gamified discovery HUD. It turns complex light-curve analysis into an addictive experience:
Transit Toss: A "Swipe-to-Label" interface where your intuition trains the Master Learning Model (MLM).
Mission HUD: A narrative-driven interface that tracks your progress through 8 discovery modules.
Leaderboard: Compete with "Galactic Architects" globally to secure the most habitable candidates.
3. ExoReg (The Registry)
The "Library of Record." A searchable, relational database that archives every star processed by the pipeline—whether it's a "Confirmed Candidate" or a "Validated Null."
🧠 The MLM (Master Learning Model) Logic
XQuest isn't just a game; it's a Data Factory.
Active Learning: The ExoQuest pipeline identifies signals that are "ambiguous" to algorithms.
Human Intuition: XQuest players provide the labels.
Scaling: These labels are batched to retrain our MLM, making the automated search smarter with every swipe.
🛠️ Technology Stack
Backend: FastAPI (Python) + SQLAlchemy (PostgreSQL).
Frontend (this repo): Next.js (React) + Tailwind CSS + Radix UI.
Science: Astroquery (Gaia), Lightkurve (TESS), Wotan (Detrending), TransitLeastSquares (Search).
Deployment: Docker-containerized, deployed via Azure (Backend) and Vercel (Frontend).
🗺️ The 8-Module Discovery Roadmap
ExoReg Initialized: The database backbone.
The Scout: Live Gaia target fetching.
The Pulse: Signal conditioning.
QuestX: Deep transit search.
XQuest HUD: Mobile-first narrative UI.
The Transit Toss: Gamified MLM labeling.
The Leaderboard: Global ranking system.
The Discovery Feed: Real-time WebSocket alerts.
🚥 Live Data "Timer Monitor"
Because we deal with live satellite data, latency can occur.
Educational Wait: During downloads, XQuest provides an "Educational Wait Icon" featuring stellar facts.
Traffic Alert: If data fetching exceeds 7 seconds, the "Timer Monitor" triggers a notification, allowing users to stay on mission or return later.
🤝 Contributing
As a project built on Citizen Science, we welcome contributors from all backgrounds—astronomers, developers, and vibe-checkers.
Fork the repo.
Follow the Vibe Coder’s Daily Checklist in the documentation.
Submit a Pull Request to join the crew.
"Because Earth needs a backup plan." a Vibe Coder, Powered by the Universe.
