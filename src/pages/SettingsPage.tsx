import { useMemo } from "react"
import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import CustomGameSettingsPanel from "../components/CustomGameSettingsPanel"
import DataSettingsPanel from "../components/DataSettingsPanel"
import GameDataFilterPanel from "../components/GameDataFilterPanel"
import SuggestionDisplaySettingsPanel from "../components/SuggestionDisplaySettingsPanel"
import { CUSTOM_SETTING_DEFINITIONS, useGameSettings } from "../context/gameSettings"
import PageBackButton from "../components/PageBackButton"

function SettingsPage() {
  const { settings, setCustomSetting, setActorPopularityCutoff, setReleaseYearCutoff, setMovieSortMode, setActorSortMode, setSuggestionViewMode, setSubsetCount, setAllWindowMode } = useGameSettings()
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
        <p className="settingsIntro">Choose preferred online and offline data sources, then refresh or clear the snapshot cache when needed.</p>

        <section className="settingsSection settingsBuildSection settingsSection--first">
          <h2>Build Info</h2>
          <div className="settingsBuildRow">
            <span className="settingsBuildLabel">Frontend version</span>
            <span className="settingsBuildValue">{APP_VERSION}</span>
          </div>
          <p className="settingsHint">This is the client build currently bundled into the app, which makes it the right reference point when you are checking refresh behavior, cache state, or release notes.</p>
        </section>

        <section className="settingsSection">
          <h2>Difficulty</h2>
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
                onMovieSortModeChange={setMovieSortMode}
                onActorSortModeChange={setActorSortMode}
              />

              <SuggestionDisplaySettingsPanel
                suggestionDisplay={suggestionDisplay}
                onViewModeChange={setSuggestionViewMode}
                onSubsetCountChange={setSubsetCount}
                onAllWindowModeChange={setAllWindowMode}
              />
        </section>

        <DataSettingsPanel showHeading={false} />

        <section className="settingsSection">
          <h2>How To Play</h2>
          <div className="settingsHowToGrid">
            <p className="settingsHint">Build a path that alternates actor and movie nodes until the two endpoints connect.</p>
            <p className="settingsHint">Use the right panel to choose the next node and the left panel to inspect the route you are building.</p>
            <p className="settingsHint">Shuffle rerolls suggestions, rewinds remove the latest move on the active branch, and the run ends when both sides meet or the target is reached directly.</p>
          </div>
        </section>

        <Link to="/" className="settingsBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default SettingsPage