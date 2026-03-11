# 🎭 Co-Stars

Co-Stars is a movie-connection game where you build a path between two endpoints by alternating between actors and movies. Pick a movie for an actor, then pick a co-star from that movie, and keep going until the two sides connect.

## How To Play

1. Start with the two nodes shown on the board.
2. If your current node is an actor, choose one of their movies.
3. If your current node is a movie, choose one of its actors.
4. Keep alternating actor → movie → actor until the path connects.
5. Try to finish in as few hops as possible compared with the precomputed optimal path.

Current gameplay rules:

- Adventure Mode loads live levels from the backend.
- Suggestion lists are built from real API data.
- The shuffle button rerolls the suggestion pool using popularity and shortest-path hints.
- Some suggestions are highlighted when they reveal an immediate or highly optimal connection.
- On a win, the game shows your completed path, hop count, turns, shuffles, rewinds, and the optimal comparison.

## Technical Overview

This is a React + TypeScript + Vite frontend. It uses a local backend graph API for levels, actor/movie lookups, shortest-path generation, and path validation.

During local development, Vite proxies `/api/*` requests to `http://localhost:8000` to avoid browser CORS issues.

## Run Locally

Frontend only:

```bash
npm install
npm run dev
```

For live gameplay data, run the separate backend project on `http://localhost:8000` as well.

For a more detailed technical overview, see [TECHNICAL_README.md](TECHNICAL_README.md).
