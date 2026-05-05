🌌 ExoQuest / XQuest 🚀
"The stars are our lifeboat. The community is our crew."
Welcome to the ExoQuest & XQuest Ecosystem. This project is a first-of-its-kind "Human-in-the-Loop" (HITL) machine learning pipeline designed to find Earth 2.0 candidates around K-Dwarf stars. While Earth faces existential threats, we are using live NASA/ESA data to hunt for our next home.
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
Frontend: Next.js (React) + Tailwind CSS + Framer Motion.
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
