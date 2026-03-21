import { useCallback, useMemo, useRef, useState, type WheelEvent } from "react"
import { Link, useLocation } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import DataSettingsPanel from "../components/DataSettingsPanel"
import GameplaySettingsSectionLayout from "../components/GameplaySettingsSectionLayout"
import { GAMEPLAY_SETTINGS_SECTIONS, type GameplaySectionId } from "../components/gameplaySettingsSections"
import { CUSTOM_SETTING_DEFINITIONS, useGameSettings } from "../context/gameSettings"
import { useDataSourceMode } from "../context/dataSourceMode"
import { useSnapshotData } from "../context/snapshotData"
import { getDemoSnapshotBundle } from "../data/demoSnapshot"
import { getActorFilterCountSummary, getMovieFilterCountSummary } from "../data/filterCounts"
import { isOfflineDemoMode } from "../data/dataSourcePreferences"
import PageBackButton from "../components/PageBackButton"

type SettingsTabId = "info" | "how-to-play" | "data-settings" | "gameplay-settings"

const SETTINGS_TABS: Array<{ id: SettingsTabId; label: string }> = [
  { id: "info", label: "Info" },
  { id: "how-to-play", label: "How to Play" },
  { id: "data-settings", label: "Data Settings" },
  { id: "gameplay-settings", label: "Gameplay Settings" },
]

const MOBILE_GAME_DIFFERENCE_NOTES = [
  "On iPhone-sized screens, the game page removes the in-game info button so the board has more room.",
  "While a mobile game is in progress, you cannot jump into the Settings page or open in-game gameplay settings.",
  "Leave the current game first if you need to change helper rules, data mode, or other settings.",
]

const DEMO_BUNDLE = getDemoSnapshotBundle()

function SettingsPage() {
  const location = useLocation()
  const routeState = (location.state as { returnTo?: string } | null) ?? null
  const { mode } = useDataSourceMode()
  const { indexes } = useSnapshotData()
  const { settings, setDifficulty, setCustomSetting, setActorPopularityCutoff, setReleaseYearCutoff, setSubsetCount, setSuggestionOrderMode, setSuggestionSortMode } = useGameSettings()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const requestedTab = searchParams.get("tab")
  const requestedSection = searchParams.get("section")
  const requestedTabId = requestedTab === "gameplay-settings" || requestedTab === "data-settings" || requestedTab === "how-to-play" || requestedTab === "info"
    ? requestedTab
    : null
  const requestedSectionId = useMemo(() => {
    const matchedSection = GAMEPLAY_SETTINGS_SECTIONS.find((section) => section.id === requestedSection)
    return matchedSection?.id ?? null
  }, [requestedSection])
  const [selectedTab, setSelectedTab] = useState<SettingsTabId>(requestedTabId ?? "info")
  const [selectedGameplaySection, setSelectedGameplaySection] = useState<GameplaySectionId>(requestedSectionId ?? "presets")
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const { difficulty, customSettings, dataFilters, suggestionDisplay } = settings
  const filterCountIndexes = isOfflineDemoMode(mode) ? DEMO_BUNDLE.indexes : indexes
  const activeTab = requestedTabId ?? selectedTab
  const activeGameplaySection = requestedSectionId ?? selectedGameplaySection
  const actorCountSummary = useMemo(() => {
    if (!filterCountIndexes) {
      return null
    }

    return getActorFilterCountSummary(filterCountIndexes.actorsById.values(), dataFilters.actorPopularityCutoff)
  }, [dataFilters.actorPopularityCutoff, filterCountIndexes])
  const movieCountSummary = useMemo(() => {
    if (!filterCountIndexes) {
      return null
    }

    return getMovieFilterCountSummary(filterCountIndexes.moviesById.values(), dataFilters.releaseYearCutoff)
  }, [dataFilters.releaseYearCutoff, filterCountIndexes])
  const activeCustomLabel = useMemo(
    () => CUSTOM_SETTING_DEFINITIONS.filter((setting) => customSettings[setting.id]).map((setting) => setting.label).join(" • "),
    [customSettings],
  )
  const difficultyLabel = difficulty === "all-on" ? "All on" : difficulty === "all-off" ? "All off" : "Custom"
  const handleSettingsWheelCapture = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const scrollArea = scrollAreaRef.current
    if (!scrollArea) {
      return
    }

    const target = event.target
    if (target instanceof Node && scrollArea.contains(target)) {
      return
    }

    if (scrollArea.scrollHeight <= scrollArea.clientHeight) {
      return
    }

    scrollArea.scrollTop += event.deltaY
    event.preventDefault()
  }, [])

  return (
    <div className="settingsPage" onWheelCapture={handleSettingsWheelCapture}>
      <PageBackButton to={routeState?.returnTo ?? "/"} label="Back" />
      <div className="settingsPanel">
        <div className="settingsPanelHeader">
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
                onClick={() => setSelectedTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div ref={scrollAreaRef} className="settingsPanelScrollArea">
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
              <h3>Mobile game differences</h3>
              {MOBILE_GAME_DIFFERENCE_NOTES.map((note) => (
                <p key={note} className="settingsHint">{note}</p>
              ))}
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
              <p className="settingsHint">Current helper preset: {difficultyLabel}{difficulty === "custom" ? ` • ${activeCustomLabel || "No helpers selected"}` : ""}.</p>
              {/* <p className="settingsWarning">Speed note: the settings most likely to slow gameplay are the cast-lock risk overlay, full ranked suggestion lists, and removing suggestion filters.</p> */}

              <GameplaySettingsSectionLayout
                activeSection={activeGameplaySection}
                onSectionSelect={setSelectedGameplaySection}
                difficulty={difficulty}
                customSettings={customSettings}
                suggestionDisplay={suggestionDisplay}
                dataFilters={dataFilters}
                onDifficultyChange={setDifficulty}
                onToggle={setCustomSetting}
                onSubsetCountChange={setSubsetCount}
                onOrderModeChange={setSuggestionOrderMode}
                onSortModeChange={setSuggestionSortMode}
                onActorPopularityCutoffChange={setActorPopularityCutoff}
                onReleaseYearCutoffChange={setReleaseYearCutoff}
                actorCountSummary={actorCountSummary}
                movieCountSummary={movieCountSummary}
                suggestionPanelClassName="settingsSuggestionListAddon"
              />
            </section>
          ) : null}

          <div className="settingsPanelFooter">
            <Link to={routeState?.returnTo ?? "/"} className="settingsBackLink">{routeState?.returnTo ? "Back" : "Back to Home"}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage