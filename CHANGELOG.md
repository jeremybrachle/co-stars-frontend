# Changelog

All notable changes to this project should be documented in this file.

The version in `package.json` is the release source of truth. This project now starts its tracked release history at `1.0.0`.

## [Unreleased]

- No unreleased changes documented yet.

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