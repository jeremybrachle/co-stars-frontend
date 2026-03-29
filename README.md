# 🎭 Co-Stars

Co-Stars is a movie-connection game where you build a path between two endpoints by alternating between actors and movies. Pick a movie for an actor, then pick a co-star from that movie, and keep going until the two sides connect.

## How To Play

1. Start with the two nodes shown on the board.
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
- On iPhone-sized screens, an active game hides the in-game info button and does not allow jumping into Settings until you leave the current game.

## Technical Overview

This is a React + TypeScript + Vite frontend. It now treats the backend as a periodic data source instead of the gameplay engine.

The app caches a frontend graph snapshot in browser storage and uses it for normal play. The backend is only needed to refresh that snapshot when the cached copy becomes stale.

You can switch between `Auto`, `Snapshot`, and `API` modes from the Settings page.

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

For a more detailed technical overview, see [TECHNICAL_README.md](TECHNICAL_README.md). For command-line refresh and recovery steps, see [DATA_REFRESH_USAGE.md](DATA_REFRESH_USAGE.md).

## Developer Levels

Developer archive levels now have a single source of truth: edit [public/data/developer-levels.json](public/data/developer-levels.json).

- Do not edit `dist/data/developer-levels.json` directly. That file is build output and should be treated as generated.
- Keep each level entry in the same JSON array format that already exists in [public/data/developer-levels.json](public/data/developer-levels.json).
- After updating the file, restart or rebuild the frontend if you need the generated `dist/` output to pick up the change.
