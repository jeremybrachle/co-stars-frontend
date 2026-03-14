import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import DataSettingsPanel from "../components/DataSettingsPanel"
import PageBackButton from "../components/PageBackButton"

function SettingsPage() {
  return (
    <div className="settingsPage">
      <PageBackButton to="/" label="Back" />
      <div className="settingsPanel">
        <h1>Settings</h1>
        <p className="settingsIntro">Manage the same connection, snapshot, and fallback controls that are available from the footer data indicator.</p>

        <DataSettingsPanel />

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