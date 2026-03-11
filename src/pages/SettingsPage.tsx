import { Link } from "react-router-dom"
import { useDataSourceMode } from "../context/DataSourceModeContext"
import { useSnapshotData } from "../context/SnapshotDataContext"

function formatRefreshHours(milliseconds: number) {
  return Math.max(1, Math.round(milliseconds / (1000 * 60 * 60)))
}

function SettingsPage() {
  const { mode, setMode } = useDataSourceMode()
  const { loadedFrom, lastRefreshAt, recommendedRefreshMs, refreshSnapshot, clearSnapshotCache } = useSnapshotData()

  return (
    <div className="settingsPage">
      <div className="settingsPanel">
        <h1>Settings</h1>
        <p className="settingsIntro">Choose how gameplay data should load while the snapshot migration is in progress.</p>

        <section className="settingsSection">
          <h2>Data Source</h2>
          <label className="settingsOption">
            <input type="radio" name="data-source" checked={mode === "auto"} onChange={() => setMode("auto")} />
            <span>
              <strong>Auto</strong>
              <span className="settingsHint">Prefer snapshot data, but fall back to live API calls if snapshot data is unavailable.</span>
            </span>
          </label>
          <label className="settingsOption">
            <input type="radio" name="data-source" checked={mode === "snapshot"} onChange={() => setMode("snapshot")} />
            <span>
              <strong>Snapshot</strong>
              <span className="settingsHint">Use local snapshot-backed graph data whenever it exists.</span>
            </span>
          </label>
          <label className="settingsOption">
            <input type="radio" name="data-source" checked={mode === "api"} onChange={() => setMode("api")} />
            <span>
              <strong>API</strong>
              <span className="settingsHint">Use direct backend calls for levels, suggestions, and path validation.</span>
            </span>
          </label>
        </section>

        <section className="settingsSection">
          <h2>Snapshot Status</h2>
          <p className="settingsHint">Last source: {loadedFrom ?? "none loaded yet"}</p>
          <p className="settingsHint">Last refresh: {lastRefreshAt ?? "not refreshed yet"}</p>
          <p className="settingsHint">Recommended refresh interval: every {formatRefreshHours(recommendedRefreshMs)} hours</p>
          <div className="settingsActions">
            <button type="button" onClick={() => void refreshSnapshot(true)}>Refresh snapshot now</button>
            <button type="button" className="settingsDangerButton" onClick={clearSnapshotCache}>Clear cached snapshot</button>
          </div>
          <p className="settingsHint">For a file-based refresh that survives browser storage resets, run <code>npm run data:refresh</code> and see DATA_REFRESH_USAGE.md.</p>
        </section>

        <Link to="/" className="settingsBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default SettingsPage