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
- storing and indexing a frontend graph snapshot
- loading predefined levels from cached graph data
- resolving actors and movies locally for gameplay
- constructing and displaying suggestion pools
- surfacing path-hint and popularity-driven guidance
- comparing the player route against the shortest known route
- validating the final path after completion locally

## Current Route Structure

Defined in `src/router/AppRouter.tsx`:

- `/`
- `/speed-round`
- `/adventure`
- `/custom-level`
- `/settings`
- `/game`

## API Integration Design

Snapshot sync logic is now centralized in `src/data/frontendSnapshot.ts`.

Local graph traversal and validation logic lives in `src/data/localGraph.ts`.

Legacy gameplay-oriented API helpers still exist in `src/api/costars.ts` for compatibility, but the intended direction is snapshot-first local gameplay.

Current backend calls used by the frontend:

- `GET /api/health`
- `GET /api/export/frontend-manifest`
- `GET /api/export/frontend-snapshot`

The frontend defaults to a relative API base path so that local development goes through the Vite proxy. A custom backend origin can still be provided with `VITE_API_BASE_URL`.

## Local Development Networking

Vite dev server config in `vite.config.ts` proxies:

- `/api/*` → `http://localhost:8000`

This means that in normal development:

- the browser talks to the Vite server on `http://localhost:5173`
- Vite forwards API traffic to the backend
- browser-side CORS errors are avoided during local development

If `VITE_API_BASE_URL` is set to an absolute origin such as `http://localhost:8000`, the browser will bypass the proxy and the backend must provide CORS headers itself.

## Snapshot Storage And Refresh

Current storage model:

- manifest cached in `localStorage`
- snapshot cached in `localStorage`
- optional bundled manifest and snapshot files in `public/data/`
- derived indexes built in memory on load

Current refresh strategy:

- if a cached snapshot exists and is still within the recommended refresh interval, the app reuses it without fetching
- once the cached export ages beyond the recommended interval, the frontend refreshes from the backend manifest and snapshot endpoints
- if backend refresh fails, the frontend attempts to load bundled snapshot files from `public/data/`
- if snapshot data is unavailable and the selected data mode allows it, the app falls back to direct API mode
- the backend handoff currently recommends a weekly cadence of `168` hours

This means normal play can run with no backend calls between refresh windows, as long as a valid snapshot already exists in the browser.

Manual snapshot export command:

- `npm run data:refresh`

That script downloads the current backend manifest and snapshot and writes them to:

- `public/data/frontend-manifest.json`
- `public/data/frontend-snapshot.json`

For full recovery and refresh instructions, see `DATA_REFRESH_USAGE.md`.

## Gameplay Logic

Shared gameplay helpers live in `src/gameplay.ts`.

Snapshot provider lives in `src/context/SnapshotDataContext.tsx`.

Current behavior:

- maximum placed selections are capped at 19
- suggestion panels display up to 6 options
- a best-path suggestion has a 65% chance to be surfaced when no direct connection is available
- direct connection suggestions are always highlighted when the backend hint indicates the target can be revealed immediately
- the completed board can collapse into a single solved path view
- shortest-path generation and move validation now run against locally stored adjacency data

## Game Flow

Current live flow in `src/pages/GamePage.tsx`:

1. Read the selected data mode from Settings.
2. In `Auto`, prefer snapshot-backed play and fall back to API mode if snapshot data is unavailable.
3. Resolve the route endpoints from either snapshot indexes or legacy API helpers.
4. Precompute the optimal path locally with BFS or by calling the backend path endpoint.
5. Load suggestions from local adjacency or from the backend depending on the effective mode.
6. Use weighted suggestion selection and path hints to build the visible suggestion pool.
7. Validate the completed path locally or through the backend validation endpoint.
8. Display completion stats and optimal comparison.

## Adventure Mode

Current live flow in `src/pages/AdventurePage.tsx`:

- read levels from the cached snapshot
- precompute shortest-path metadata locally for each displayed level
- show optimal hop counts directly on level cards
- pass the selected level and precomputed optimal data into the game route

## Main UI Areas

- `src/pages/GamePage.tsx`: live game orchestration
- `src/components/game/GameLeftPanel.tsx`: board rendering and completed path view
- `src/components/game/GameRightPanel.tsx`: suggestion panel, toolbar, score stats, write-in flow
- `src/pages/AdventurePage.tsx`: live level selection
- `src/context/SnapshotDataContext.tsx`: snapshot loading and refresh orchestration
- `src/data/frontendSnapshot.ts`: manifest/snapshot cache and refresh policy
- `src/data/localGraph.ts`: local selectors, BFS, and validation

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
- Once a snapshot has been loaded, normal gameplay does not require live backend calls until the cache expires or is manually refreshed.
- Initial snapshot sync and later refreshes do require the backend at `http://localhost:8000` unless a different API origin is configured.
- The backend is a separate project and is not managed by this repository.

## Milestone Notes

At this milestone, the frontend has moved beyond the original API-driven loop into a snapshot-first architecture with an offline demo fallback.

That includes:

- bundled or cached frontend snapshot loading
- local actor/movie graph traversal and validation
- runtime switching between `Auto`, `Snapshot`, `API`, and `Demo`
- manual snapshot refresh tooling
- standalone-friendly offline demo gameplay when no backend data is available
- named unit tests and summary-style test reporting

## Versioning And Releases

Current tracked release is `2.0.0`.

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

- `package.json` version: `2.0.0`
- changelog section: `## [2.0.0] - YYYY-MM-DD`
- git tag: `v2.0.0`

This repo no longer creates GitHub Releases automatically from tags.

Git tags are not used as deployment triggers. The AWS deployment workflow is manual-only and is started from GitHub Actions.

Deployment configuration lives outside the repo in GitHub Actions repository settings:

- repository variables: `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DISTRIBUTION_ID`, `AWS_ROLE_ARN`
- no long-lived AWS keys are required when using GitHub OIDC with `aws-actions/configure-aws-credentials`
- do not commit deployment AWS values in a project `.env` file

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

AWS deployment workflow lives at `.github/workflows/deploy.yml`.

It currently deploys on:

- manual runs through `workflow_dispatch`

You can start that workflow from GitHub Actions and choose the branch you want to deploy, including `main` or a branch backing an open pull request.

This is the GitHub Actions equivalent of a basic GitLab CI verification pipeline for the current state of the project.

## Follow-Up Areas

Natural next technical areas after this milestone:

- move any remaining legacy gameplay API helpers fully behind snapshot-compatible fallbacks or remove them
- custom level creation using the full actor and movie catalogs
- speed round integration with the live API
- production deployment configuration for frontend/backend origins
- backend-assisted telemetry or saved results