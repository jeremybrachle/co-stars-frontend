# Data Refresh Usage

This project supports two runtime data styles:

- snapshot-backed frontend data
- direct API-backed gameplay calls

## Manual Snapshot Refresh

Use the command line to pull the latest manifest and snapshot from the backend and write them into this frontend project:

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

- refresh the frontend data after backend updates
- restore the bundled snapshot files if they are missing
- prepare a newer local snapshot before testing or deployment

## Runtime Behavior

At runtime the app prefers data in this order:

1. cached browser snapshot in `localStorage`
2. bundled files in `public/data/`
3. direct API calls, if the app is set to API mode or auto mode falls back

## If Cached Data Is Lost

If browser storage is cleared, the app can recover in two ways:

1. Load the bundled snapshot files written by `npm run data:refresh`
2. Fall back to direct API mode if snapshot data is unavailable

## Switching Modes

Use the Settings page to switch between:

- `Auto`: prefer snapshot data and fall back to API if needed
- `Snapshot`: prefer local snapshot-backed data
- `API`: use direct backend calls

`Auto` is the safest temporary mode during migration.