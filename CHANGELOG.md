# Changelog

All notable changes to this project should be documented in this file.

The version in `package.json` is the release source of truth and is the value displayed in the frontend UI.

This changelog is updated manually. When you cut a new version, update `package.json` and then add or rename the matching changelog section yourself.

This project now starts its tracked release history at `1.0.0`.

## [Unreleased]

## [2.0.2] - 2026-03-12

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