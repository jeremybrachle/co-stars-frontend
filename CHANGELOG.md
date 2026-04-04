# Changelog

All notable changes to this project should be documented in this file.

The version in `package.json` is the release source of truth and is the value displayed in the frontend UI.

This changelog is updated manually. When you cut a new version, update `package.json` and then add or rename the matching changelog section yourself.

This project now starts its tracked release history at `1.0.0`.

## [Unreleased]

## [2.1.0] - 2026-03-31

Frontend Levels V2 migration

### Changed

- Snapshot and live API ingestion now target the grouped v2 level endpoints, with frontend normalization for typed start and target nodes plus the new manifest metadata fields
- Adventure Mode now uses grouped level selection and launches gameplay from typed endpoint records instead of assuming a flat actor-to-actor list
- Level completion and history storage now use typed endpoint identities so actor and movie matchups do not collide during the v2 rollout

### Added

- Grouped v2 developer level sample data and archive loading support so local developer JSON matches the new backend contract

## [2.0.10] - 2026-03-28

Quick Play and Level Archive

### Added

- New game play mode for "quick play". This will enable the player to create and save new custom levels. On demand they can generate as many levels as they want but they can save up to 10 locally. These levels can be either player generated or randomly generated
- Also added a new page for Level Archive. This will be a combined list of player created levels and pre-defined levels that I created locally and uploaded as the developer
- Simplification for data to be either online or offline
    - Offline will be installed snapshot or demo data
    - Online will be fetching the hosted s3 snapshot or connecting to the API

## [2.0.9] - 2026-03-26

Data Load Default

### Changed

- Data will now default to loading the current snapshot locally without any external data lookup to s3 or an API
- API connection will display a flashing symbol until successful connection. NOTE: you might be able to implement a better refresh logic since you had to do the whole "turn it off and on again" manually until it updated

## [2.0.8] - 2026-03-19

Scoring and mobile layout resizing

### Added

- Calculation, display, and stored local history of player scores for each level

## Changed

- Viewing size for iPhone devices

## [2.0.7] - 2026-03-17

Data refresh logic

### Changed

- Looping logic for full data to to refresh from s3 by default so the user doesn't manually have to pull data

## [2.0.6] - 2026-03-14

UI updates for displaying new meta data

### Added

- New display for data like actor picture ande movie poster
- Difficulty toggles

## [2.0.5] - 2026-03-14

UI updates for data and connection status

### Added

- New footer button for data and online connection status that lets the player control the settings from any page


## [2.0.4] - 2026-03-14

More game data visualizations

### Added

- Pages for path finding and game data

## [2.0.3] - 2026-03-13

Hosted snapshot caching support for S3 and CloudFront-backed snapshot refreshes.

### Added

- Settings page support for manually fetching a published frontend snapshot from a configured S3 or CloudFront manifest URL.
- Build-time `VITE_SNAPSHOT_MANIFEST_URL` wiring so deployments can point the app at a hosted snapshot manifest without code changes.
- Browser-side caching of the fetched manifest and snapshot in `localStorage` so hosted data can be reused across sessions.

### Changed

- Snapshot refresh is now an explicit user action: the app keeps using the cached hosted snapshot until it is manually refreshed or cleared.
- The deployed runtime no longer depends on `public/data/` files for snapshot loading; that export path remains only for local inspection and recovery workflows.

## [2.0.2] - 2026-03-12

Disable user input

### Removed

- Text input field entry on game page

## [2.0.1] - 2026-03-12

Display version number on front end

### Added

- Version number that gets dsiaplyed in the home and settings pages. This maps to the package.json API version

## [2.0.0] - 2026-03-11

Snapshot-first frontend milestone with built-in offline demo mode.

### Added

- Frontend snapshot manifest loading, local cache management, and graph indexes for frontend-owned gameplay data.
- Snapshot provider and runtime data-source selection with `Auto`, `Snapshot`, `API`, and `Demo` modes.
- Built-in offline demo dataset so the app remains playable without a backend connection or preloaded snapshot files.
- Manual snapshot export script via `npm run data:refresh` and a companion recovery guide in `DATA_REFRESH_USAGE.md`.
- Data-side unit tests and summary-style test output for lint, typecheck, and unit test runs.

### Changed

- Adventure Mode now hydrates levels from snapshot or demo data and computes optimal paths locally.
- Game Mode now uses local adjacency, local shortest-path generation, and local move validation instead of relying on per-move gameplay API calls.
- Auto mode now falls back through snapshot, live API, and finally demo mode, with source status reflected in the UI.
- Release tracking now moves from the initial stable API milestone into the standalone-friendly `2.0.0` demo-capable architecture.

## [1.0.0] - 2026-03-11

Initial stable gameplay milestone.

### Added

- Live backend integration for levels, actors, movies, shortest-path generation, and path validation.
- Adventure Mode level loading with precomputed optimal hop counts.
- Real API-driven suggestion flow in Game Mode.
- Weighted suggestion shuffling using popularity and path-hint metadata.
- Direct-connection highlighting and completed-path win flow.
- Completion dialog with route stats and optimal-path comparison.
- Vite development proxy for `/api/*` requests to reduce local CORS friction.
- Project versioning scripts and GitHub Actions CI workflow.

### Changed

- Promoted the project from `0.0.0` to `1.0.0` as the first tracked stable configuration.
- Split documentation into a short main README and a dedicated technical README.