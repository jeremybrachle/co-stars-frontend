# 🎭 Co-Stars

Co-Stars is a movie-connection game where you build a path between two endpoints by alternating between actors and movies. Pick a movie for an actor, then pick a co-star from that movie, and keep going until the two sides connect.

## Game Modes

| Mode | Description |
|------|-------------|
| **Adventure Mode** | Curated levels with tracked optimal hop counts and difficulty ratings |
| **Speed Round** | Timed challenge flow *(in development)* |
| **Custom Level** | Pick your own start and end actors *(in development)* |
| **Find Path** | Ask the system to auto-generate a connection between any two actors |

## How To Play

1. Start with the two actor nodes shown on the board.
2. If your current node is an actor, choose one of their movies.
3. If your current node is a movie, choose one of its actors.
4. Keep alternating actor → movie → actor until the path connects.
5. Try to finish in as few hops as possible compared with the precomputed optimal path.

Current gameplay rules:

- Adventure Mode and Game Mode default to `Auto` mode, which prefers a locally cached graph snapshot and falls back to live API calls if that data is missing.
- Suggestion lists are built from stored actor, movie, and relationship data in the frontend.
- The shuffle button rerolls the suggestion pool using popularity and shortest-path hints computed locally.
- Some suggestions are highlighted when they reveal an immediate or highly optimal connection.
- On a win, the game shows your completed path, hop count, turns, shuffles, rewinds, and the optimal comparison.

## Architecture Overview

```
src/
├── pages/          # Route-level page components (HomePage, GamePage, AdventurePage, …)
├── components/     # Reusable UI components (NavigationMenu, EntityArtwork, Footer, …)
│   └── game/       # Core game board components (GameLeftPanel, GameRightPanel)
├── context/        # React context providers for app-wide state
│   ├── DataSourceModeContext  – Auto / Snapshot / API / Demo data source selection
│   ├── GameSettingsContext    – Gameplay helpers, filters, and display preferences
│   ├── SnapshotDataContext    – Graph snapshot loading and cache management
│   └── CountdownTimerContext  – Countdown timer for timed game modes
├── data/           # Graph logic and data helpers
│   ├── localGraph.ts      – BFS path-finding, suggestion generation, path validation
│   ├── frontendSnapshot.ts – Snapshot caching and refresh policy
│   └── demoSnapshot.ts    – Bundled offline demo dataset
├── api/            # Backend API client (costars.ts)
├── hooks/          # Custom React hooks (useBrowserOnlineStatus)
├── router/         # React Router configuration (AppRouter.tsx)
└── types.ts        # Shared TypeScript types
```

**Data Flow:**
1. On startup, `SnapshotDataProvider` loads the graph from `localStorage` or bundled `/public/data/` files.
2. During gameplay, all suggestion and path-finding calls run locally against the in-memory graph (`localGraph.ts`).
3. The backend is only contacted to refresh the snapshot when the cache expires, or when `API` mode is selected explicitly.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19 |
| Language | TypeScript 5 |
| Build Tool | Vite 7 |
| Routing | React Router DOM 7 |
| Testing | Node.js native `test` module |
| Linting | ESLint 9 + TypeScript-ESLint |

## Run Locally

Frontend only:

```bash
npm install
npm run dev
```

For live gameplay data, run the separate backend project on `http://localhost:8000` as well.

Current refresh approach:

- cache the snapshot in `localStorage`
- load bundled snapshot files from `public/data/` when available
- reuse it for normal play
- fall back to live API mode if snapshot data is unavailable
- only refresh from the backend when the cached export ages past the recommended refresh window

To manually pull a fresh bundled snapshot into this frontend project, run `npm run data:refresh`.

## Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript compile + production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript type check
npm test             # Lint + typecheck + unit tests
npm run test:unit    # Unit tests only
npm run data:refresh # Pull a fresh graph snapshot from the backend
```

For a more detailed technical overview, see [TECHNICAL_README.md](TECHNICAL_README.md). For command-line refresh and recovery steps, see [DATA_REFRESH_USAGE.md](DATA_REFRESH_USAGE.md).

