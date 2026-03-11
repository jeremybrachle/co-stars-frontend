# Co-Stars Technical README

This document captures the current technical state of the frontend at the milestone where live backend connectivity and full gameplay flow are working together.

## Stack

- React 19
- TypeScript 5
- Vite 7
- React Router 7
- ESLint 9

## Purpose

This project is the frontend for Co-Stars, a graph-based movie connection game. The frontend is responsible for:

- rendering the game UI and route structure
- loading predefined levels from the backend
- resolving actors and movies for live play
- constructing and displaying suggestion pools
- surfacing path-hint and popularity-driven guidance
- comparing the player route against the shortest known route
- validating the final path after completion

## Current Route Structure

Defined in `src/router/AppRouter.tsx`:

- `/`
- `/speed-round`
- `/adventure`
- `/custom-level`
- `/settings`
- `/game`

## API Integration Design

API requests are centralized in `src/api/costars.ts`.

Current backend calls used by the frontend:

- `GET /api/levels`
- `GET /api/actors`
- `GET /api/movies`
- `GET /api/actor/{name}`
- `GET /api/actor/{actor_id}/movies`
- `GET /api/movie/{movie_id}/costars`
- `POST /api/path/generate`
- `POST /api/path/validate`

The frontend defaults to a relative API base path so that local development goes through the Vite proxy. A custom backend origin can still be provided with `VITE_API_BASE_URL`.

## Local Development Networking

Vite dev server config in `vite.config.ts` proxies:

- `/api/*` → `http://localhost:8000`

This means that in normal development:

- the browser talks to the Vite server on `http://localhost:5173`
- Vite forwards API traffic to the backend
- browser-side CORS errors are avoided during local development

If `VITE_API_BASE_URL` is set to an absolute origin such as `http://localhost:8000`, the browser will bypass the proxy and the backend must provide CORS headers itself.

## Gameplay Logic

Shared gameplay helpers live in `src/gameplay.ts`.

Current behavior:

- maximum placed selections are capped at 19
- suggestion panels display up to 6 options
- a best-path suggestion has a 65% chance to be surfaced when no direct connection is available
- direct connection suggestions are always highlighted when the backend hint indicates the target can be revealed immediately
- the completed board can collapse into a single solved path view

## Game Flow

Current live flow in `src/pages/GamePage.tsx`:

1. Resolve the route endpoints.
2. Load actor and movie catalogs.
3. Precompute the optimal path with `/api/path/generate`.
4. When the active node is an actor, fetch movies for that actor.
5. When the active node is a movie, fetch actors for that movie and exclude already-used actors.
6. Use target-aware path hints to build the visible suggestion pool.
7. Allow shuffling to reroll the weighted suggestion set.
8. Validate the completed path with `/api/path/validate`.
9. Display completion stats and optimal comparison.

## Adventure Mode

Current live flow in `src/pages/AdventurePage.tsx`:

- fetch levels from the backend
- precompute shortest-path metadata for each displayed level
- show optimal hop counts directly on level cards
- pass the selected level and precomputed optimal data into the game route

## Main UI Areas

- `src/pages/GamePage.tsx`: live game orchestration
- `src/components/game/GameLeftPanel.tsx`: board rendering and completed path view
- `src/components/game/GameRightPanel.tsx`: suggestion panel, toolbar, score stats, write-in flow
- `src/pages/AdventurePage.tsx`: live level selection

## Commands

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run linting:

```bash
npm run lint
```

Run the current automated verification suite:

```bash
npm test
```

Current `npm test` behavior:

- ESLint
- TypeScript type-check/build validation

Version bump commands:

```bash
npm run release:patch
npm run release:minor
npm run release:major
```

These use `npm version`, which updates `package.json`, updates the lockfile version metadata, and creates the corresponding git version tag when run in a normal git workflow.

## Environment Notes

- Frontend-only startup does not require the backend.
- Live gameplay features do require the backend at `http://localhost:8000` unless a different API origin is configured.
- The backend is a separate project and is not managed by this repository.

## Milestone Notes

At this milestone, the frontend has moved from mock suggestion data to a fully API-driven gameplay loop.

That includes:

- live level loading
- live actor/movie suggestion fetching
- shortest-path precomputation
- weighted shuffle behavior
- direct-connection highlighting
- post-win path validation
- completed-path stats and comparison UI

## Versioning And Releases

Release tracking now starts at `1.0.0`.

Current release management approach:

- `package.json` holds the canonical application version
- `CHANGELOG.md` records notable released changes
- `Unreleased` is the staging area for the next version notes
- `npm version patch|minor|major` is the intended version bump mechanism

Recommended release flow:

1. Move finished work into the `Unreleased` section of `CHANGELOG.md` while it is in development.
2. When cutting a release, choose the correct semver bump.
3. Run one of the release scripts.
4. Rename the `Unreleased` notes into the new version section.
5. Push the commit and tag.

GitHub Release mapping:

- `package.json` version: `1.0.0`
- changelog section: `## [1.0.0] - YYYY-MM-DD`
- git tag: `v1.0.0`
- GitHub Release title: `Co-Stars v1.0.0`

The release workflow in `.github/workflows/release.yml` creates a GitHub Release automatically when a `v*.*.*` tag is pushed.

It also verifies that:

- the git tag version matches `package.json`
- a matching section exists in `CHANGELOG.md`

If either check fails, the release job stops instead of publishing a mismatched release.

Semver guidance for this project:

- patch: bug fixes, UI fixes, docs fixes, non-breaking tuning
- minor: new modes, new gameplay features, new screens, non-breaking API integration changes
- major: breaking route changes, breaking config changes, or incompatible gameplay/data contract changes

## GitHub Actions CI

GitHub Actions workflow lives at `.github/workflows/ci.yml`.

It currently runs on:

- pushes to `main`
- pushes to other branches
- pull requests that are opened, synchronized, reopened, or marked ready for review

Current jobs:

- `test`: installs dependencies, runs linting, and runs TypeScript verification via `npm test`
- `build`: installs dependencies and runs `npm run build` after the test job passes

This is the GitHub Actions equivalent of a basic GitLab CI verification pipeline for the current state of the project.

## Follow-Up Areas

Natural next technical areas after this milestone:

- custom level creation using the full actor and movie catalogs
- speed round integration with the live API
- production deployment configuration for frontend/backend origins
- backend-assisted telemetry or saved results