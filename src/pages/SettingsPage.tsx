import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import { useDataSourceMode } from "../context/dataSourceMode"
import { useSnapshotData } from "../context/snapshotData"
import { getApiSnapshotManifestUrl, getHostedSnapshotManifestUrl } from "../data/frontendSnapshot"

function formatRefreshHours(milliseconds: number) {
  return Math.max(1, Math.round(milliseconds / (1000 * 60 * 60)))
}

function formatSnapshotLoadSource(loadedFrom: string | null) {
  if (loadedFrom === "s3-snapshot") {
    return "snapshot fetched from s3"
  }

  if (loadedFrom === "api-snapshot") {
    return "snapshot fetched from api"
  }

  if (loadedFrom === "cache") {
    return "cached snapshot"
  }

  if (loadedFrom === "demo") {
    return "demo dataset"
  }

  return "none loaded yet"
}

function formatSnapshotErrorLabel(errorSource: "api" | "s3" | null) {
  if (errorSource === "api") {
    return "API snapshot fetch failed"
  }

  if (errorSource === "s3") {
    return "S3 snapshot fetch failed"
  }

  return "Snapshot fetch failed"
}

function SettingsPage() {
  const { mode, setMode } = useDataSourceMode()
  const { snapshot, manifest, errorMessage, errorSource, isLoading, loadedFrom, lastRefreshAt, recommendedRefreshMs, fetchSnapshotFromApi, fetchSnapshotFromS3, clearSnapshotCache } = useSnapshotData()
  const hostedManifestUrl = getHostedSnapshotManifestUrl()
  const apiManifestUrl = getApiSnapshotManifestUrl()
  const loadedSnapshotVersion = snapshot?.meta.version ?? "none loaded yet"
  const loadedManifestVersion = manifest?.version ?? "none loaded yet"
  const versionMatchLabel = !snapshot || !manifest ? "unknown" : snapshot.meta.version === manifest.version ? "yes" : "no"

  return (
    <div className="settingsPage">
      <div className="settingsPanel">
        <h1>Settings</h1>
        <p className="settingsIntro">Choose how gameplay data should load using a manually loaded snapshot, live API calls, or the built-in demo fallback.</p>

        <section className="settingsSection">
          <h2>Data Source</h2>
          <label className="settingsOption">
            <input type="radio" name="data-source" checked={mode === "auto"} onChange={() => setMode("auto")} />
            <span>
              <strong>Auto</strong>
              <span className="settingsHint">Use a loaded snapshot if one is already cached, otherwise fall back to live API calls, and finally use demo data if neither is available.</span>
            </span>
          </label>
          <label className="settingsOption">
            <input type="radio" name="data-source" checked={mode === "snapshot"} onChange={() => setMode("snapshot")} />
            <span>
              <strong>Snapshot</strong>
              <span className="settingsHint">Prefer the snapshot currently cached in the browser. You can manually load that snapshot from the API or from S3 below.</span>
            </span>
          </label>
          <label className="settingsOption">
            <input type="radio" name="data-source" checked={mode === "api"} onChange={() => setMode("api")} />
            <span>
              <strong>API</strong>
              <span className="settingsHint">Use direct backend calls first, then fall back to a manually loaded snapshot, and finally the demo dataset if needed.</span>
            </span>
          </label>
          <label className="settingsOption">
            <input type="radio" name="data-source" checked={mode === "demo"} onChange={() => setMode("demo")} />
            <span>
              <strong>Demo</strong>
              <span className="settingsHint">Use the built-in offline demo dataset with short preconfigured routes, even if a hosted snapshot or live API is available.</span>
            </span>
          </label>
        </section>

        <section className="settingsSection">
          <h2>Snapshot Status</h2>
          <p className="settingsHint">API manifest URL: {apiManifestUrl}</p>
          <p className="settingsHint">Hosted manifest URL: {hostedManifestUrl ?? "not configured"}</p>
          <p className="settingsHint">Last source: {formatSnapshotLoadSource(loadedFrom)}</p>
          <p className="settingsHint">Last refresh: {lastRefreshAt ?? "not refreshed yet"}</p>
          <p className="settingsHint">Recommended refresh interval: every {formatRefreshHours(recommendedRefreshMs)} hours</p>
          <p className="settingsHint">Loaded manifest version: {loadedManifestVersion}</p>
          <p className="settingsHint">Loaded snapshot version: {loadedSnapshotVersion}</p>
          <p className="settingsHint">Manifest and snapshot versions match: {versionMatchLabel}</p>
          <p className="settingsHint">Snapshot endpoint: {manifest?.snapshotEndpoint ?? "none loaded yet"}</p>
          <div className="settingsActions">
            <button type="button" onClick={() => void fetchSnapshotFromApi()} disabled={isLoading}>Fetch snapshot from API</button>
            <button type="button" onClick={() => void fetchSnapshotFromS3()} disabled={isLoading}>Fetch snapshot from S3</button>
            <button type="button" className="settingsDangerButton" onClick={clearSnapshotCache}>Clear cached snapshot</button>
          </div>
          {errorMessage ? <p className="settingsError">{formatSnapshotErrorLabel(errorSource)}: {errorMessage}</p> : null}
          <p className="settingsHint">These buttons manually replace the cached snapshot in browser storage. Clearing removes whichever snapshot is currently loaded.</p>
        </section>

        <section className="settingsSection">
          <h2>App Version</h2>
          <p className="settingsHint">Current release: {APP_VERSION}</p>
          <p className="settingsHint">This value is injected from <code>package.json</code> at build time and should match the latest released changelog entry.</p>
        </section>

        <Link to="/" className="settingsBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default SettingsPage