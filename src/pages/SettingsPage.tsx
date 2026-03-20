import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import CustomGameSettingsPanel from "../components/CustomGameSettingsPanel"
import DataSettingsPanel from "../components/DataSettingsPanel"
import GameDataFilterPanel from "../components/GameDataFilterPanel"
import SuggestionDisplaySettingsPanel from "../components/SuggestionDisplaySettingsPanel"
import { CUSTOM_SETTING_DEFINITIONS, useGameSettings } from "../context/gameSettings"
import PageBackButton from "../components/PageBackButton"

type SettingsTabId = "info" | "how-to-play" | "data-settings" | "gameplay-settings"

const SETTINGS_TABS: Array<{ id: SettingsTabId; label: string }> = [
  { id: "info", label: "Info" },
  { id: "how-to-play", label: "How to Play" },
  { id: "data-settings", label: "Data Settings" },
  { id: "gameplay-settings", label: "Gameplay Settings" },
]

function SettingsPage() {
  const { settings, setCustomSetting, setActorPopularityCutoff, setReleaseYearCutoff, setSubsetCount, setSuggestionOrderMode, setSuggestionSortMode } = useGameSettings()
  const [activeTab, setActiveTab] = useState<SettingsTabId>("info")
  const { customSettings, dataFilters, suggestionDisplay } = settings
  const activeCustomLabel = useMemo(
    () => CUSTOM_SETTING_DEFINITIONS.filter((setting) => customSettings[setting.id]).map((setting) => setting.label).join(" • "),
    [customSettings],
  )

  return (
    <div className="settingsPage">
      <PageBackButton to="/" label="Back" />
      <div className="settingsPanel">
        <h1>Settings</h1>
        <div className="settingsTabs" role="tablist" aria-label="Settings sections">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              className={`settingsTabButton${activeTab === tab.id ? " settingsTabButton--active" : ""}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "info" ? (
          <section className="settingsSection settingsTabPanel" role="tabpanel" id="settings-panel-info" aria-labelledby="settings-tab-info">
            <h2>Info</h2>
            <p className="settingsIntro settingsIntro--tab">Co-Stars is a movie-and-actor pathfinding game where you connect two endpoints by building a valid alternating chain through the graph.</p>
            {/* <div className="settingsBuildRow">
              <span className="settingsBuildLabel">Frontend version</span>
              <span className="settingsBuildValue">v{APP_VERSION}</span>
            </div> */}
            
            <p className="settingsHint">Use this version when checking release notes, cache behavior, or troubleshooting data refreshes:</p>
            <p className="settingsHint">App version: v{APP_VERSION}</p>
          </section>
        ) : null}

        {activeTab === "how-to-play" ? (
          <section className="settingsSection settingsTabPanel" role="tabpanel" id="settings-panel-how-to-play" aria-labelledby="settings-tab-how-to-play">
            <h2>How To Play</h2>
            <div className="settingsHowToGrid">
              <p className="settingsHint">Build a path that alternates actor and movie nodes until the two endpoints connect.</p>
              <p className="settingsHint">Use the right panel to choose the next node and the left panel to inspect the route you are building.</p>
              <p className="settingsHint">By default you see the full ranked suggestion list. You can switch to shuffled suggestions later from Gameplay Settings if you want rerolls instead.</p>
            </div>
          </section>
        ) : null}

        {activeTab === "data-settings" ? (
          <section className="settingsSection settingsTabPanel" role="tabpanel" id="settings-panel-data-settings" aria-labelledby="settings-tab-data-settings">
            <h2>Data Settings</h2>
            <p className="settingsHint settingsTabHint">Pick your data source mode and manage snapshot refresh controls.</p>
            <DataSettingsPanel showHeading={false} />
          </section>
        ) : null}

        {activeTab === "gameplay-settings" ? (
          <section className="settingsSection settingsTabPanel" role="tabpanel" id="settings-panel-gameplay-settings" aria-labelledby="settings-tab-gameplay-settings">
            <h2>Gameplay Settings</h2>
            <p className="settingsHint">Current custom rule set: {activeCustomLabel || "No helpers selected"}.</p>

            <CustomGameSettingsPanel
              customSettings={customSettings}
              onToggle={setCustomSetting}
              title="Gameplay Helpers"
              hint="These preferences are shared with the in-game info menu and apply immediately during play."
            />

            <GameDataFilterPanel
              dataFilters={dataFilters}
              onActorPopularityCutoffChange={setActorPopularityCutoff}
              onReleaseYearCutoffChange={setReleaseYearCutoff}
            />

            <SuggestionDisplaySettingsPanel
              suggestionDisplay={suggestionDisplay}
              onSubsetCountChange={setSubsetCount}
              onOrderModeChange={setSuggestionOrderMode}
              onSortModeChange={setSuggestionSortMode}
            />
          </section>
        ) : null}

        <Link to="/" className="settingsBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default SettingsPage