# Data Refresh Usage

This project supports three runtime data sources:

- manually loaded snapshot-backed frontend data
- direct API-backed gameplay calls
- built-in demo data

## Manual Snapshot Refresh

Use the Settings page buttons to manually fetch a snapshot into browser storage from either the backend API or a published S3 or CloudFront URL.

The S3 manifest location is configured at build time with:

```text
VITE_SNAPSHOT_MANIFEST_URL
```

The loaded snapshot version can be verified from the Settings page after either fetch completes.

## Local Export Helper

The command line export helper still exists for backend-side local inspection, but it is no longer part of the runtime snapshot resolution path for the deployed frontend:

```bash
npm run data:refresh
```

By default this pulls from:

```text
http://localhost:8000
```

You can override the backend source:

```bash
npm run data:refresh -- --base-url https://your-backend.example.com
```

Current outputs:

- `public/data/frontend-manifest.json`
- `public/data/frontend-snapshot.json`

## What This Is For

Use the same command when you want to:

- inspect or compare exported snapshot files locally
- prepare local fixtures while working on snapshot generation

## Runtime Behavior

At runtime the app prefers data in this order:

1. cached browser snapshot in `localStorage`
2. direct API calls when the selected mode allows API fallback
3. built-in demo data if snapshot and API loading both fail

The snapshot cache is only updated when you explicitly use one of the Settings page fetch buttons.

## Snapshot Fetch Sources

The Settings page supports two manual snapshot fetch paths:

1. Fetch snapshot from API
2. Fetch snapshot from S3

If `VITE_SNAPSHOT_MANIFEST_URL` is not set, the S3 fetch button remains unavailable.

## If Cached Data Is Lost

If browser storage is cleared, the app can recover in three ways:

1. Fetch the snapshot again from the API in Settings
2. Fetch the snapshot again from S3 in Settings
3. Fall back to direct API mode if snapshot data is unavailable

## Switching Modes

Use the Settings page to switch between:

- `Auto`: use a previously loaded snapshot if one exists, otherwise use API, then demo
- `Snapshot`: prefer the snapshot currently cached in the browser, then fall back to API, then demo
- `API`: use direct backend calls first, then fall back to a loaded snapshot, then demo
- `Demo`: force the built-in offline demo dataset

`Auto` is the safest default mode when you want the app to use a loaded snapshot when available without requiring one.