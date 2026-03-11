# Co-Stars Frontend

React + TypeScript frontend for the local Co-Stars graph game.

## Run Locally

To run the frontend only:

```bash
npm install
npm run dev
```

That is enough to start the React app itself.

If you want the live API-backed gameplay features, you also need the separate backend server running on `http://localhost:8000`.

This repository does not provide that Python backend process. The commands for starting it belong in the backend project, not this frontend project.

Default frontend API target in local development:

```text
/api
```

The Vite dev server now proxies `/api/*` requests to:

```text
http://localhost:8000
```

That avoids browser CORS failures during normal `npm run dev` usage, because the browser only talks to the Vite dev server on the same origin.

Override the API target when needed:

```text
/api
```

Set a custom backend URL with:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

If the backend is not running, frontend pages that depend on live levels, actor/movie suggestions, shortest-path generation, or path validation will fail to load their data.

## CORS Notes

For this frontend project:

1. During local development, `npm run dev` should use the built-in Vite proxy and not hit CORS for `/api/*` requests.
2. If you explicitly set `VITE_API_BASE_URL=http://localhost:8000`, the browser will call the backend directly and CORS must be enabled on the backend.
3. In production, if the frontend and backend are served from different origins, the backend must send the correct CORS headers.

For the backend project, the usual FastAPI fix is to add `CORSMiddleware` allowing your frontend origin such as `http://localhost:5173`.

## Backend Endpoints Used

- `GET /api/levels`
- `GET /api/actors`
- `GET /api/movies`
- `GET /api/actor/{name}`
- `GET /api/actor/{actor_id}/movies`
- `GET /api/movie/{movie_id}/costars`
- `POST /api/path/generate`
- `POST /api/path/validate`

## Current Gameplay Integration

Adventure Mode now loads live levels from the backend and precomputes the shortest path for each level before launch. The level list shows the optimal hop count so the player can compare it against the route they build in-game.

Game Mode now uses live API data instead of mock suggestion lists:

- If the current node is an actor, the frontend requests that actor's movies.
- If the current node is a movie, the frontend requests the movie's actors and excludes actors already used on the board, except the current target endpoint.
- The frontend requests target-aware path hints on each suggestion fetch.
- The frontend validates the completed path with the backend after a win.

## Suggestion Ranking And Shuffle Logic

The backend returns raw graph data. The frontend applies its own selection rules:

1. The full suggestion list is fetched from the backend.
2. If a suggestion can reveal the target immediately on the next alternating node, it is always surfaced and highlighted as `Connection found`.
3. If no direct connection exists, one best-path suggestion has a `65%` chance to be included in the displayed pool.
4. Remaining visible suggestions are filled by a weighted score:

   - actors: shortest-path hint first, then popularity, then a small reroll randomizer
   - movies: shortest-path hint first, then recency, then a small reroll randomizer

5. The shuffle button does not simply permute the current six buttons. It reruns the weighted sampling step against the live data so the next panel can surface a different mix of optimal, popularity-heavy, and random options.

## Win Detection

The first pass win logic supports two completion paths:

1. If the top and bottom searches meet on the same node, the board combines into one validated path.
2. If a suggestion is on the opposite node type and its path hint shows that the target is immediately reachable, that suggestion is highlighted and the frontend auto-completes the remaining optimal tail after the player picks it.

Example:

```text
George Clooney -> Babylon (2022) -> Tobey Maguire
```

If `Babylon (2022)` is returned while searching from George Clooney toward Tobey Maguire, the movie button is highlighted because the target actor is immediately reachable from that movie.

## Completion Screen

When a level is completed, the frontend shows:

- the completed path preview
- completed hops
- optimal hops
- turns used
- shuffles
- rewinds
- backend validation status

The board also switches from the split search layout into a single completed path layout so the solved route can be compared against the optimal count.
