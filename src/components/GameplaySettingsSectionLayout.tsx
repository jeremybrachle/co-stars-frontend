import CustomGameSettingsPanel from "./CustomGameSettingsPanel"
import GameDataFilterPanel from "./GameDataFilterPanel"
import SuggestionDisplaySettingsPanel from "./SuggestionDisplaySettingsPanel"
import { GAMEPLAY_SETTINGS_SECTIONS, type GameplaySectionId } from "./gameplaySettingsSections"
import type { FilterCountSummary } from "../data/filterCounts"
import type { DifficultyOption, DifficultySettings, DifficultyToggleId, GameDataFilters, SuggestionDisplaySettings } from "../types"

export default function GameplaySettingsSectionLayout({
  activeSection,
  onSectionSelect,
  difficulty,
  customSettings,
  suggestionDisplay,
  dataFilters,
  onDifficultyChange,
  onToggle,
  onSubsetCountChange,
  onOrderModeChange,
  onSortModeChange,
  onActorPopularityCutoffChange,
  onReleaseYearCutoffChange,
  actorCountSummary,
  movieCountSummary,
  filterValidationMessage,
  customPanelClassName = "",
  suggestionPanelClassName = "",
  dataFilterPanelClassName = "",
}: {
  activeSection: GameplaySectionId
  onSectionSelect: (sectionId: GameplaySectionId) => void
  difficulty: DifficultyOption
  customSettings: DifficultySettings
  suggestionDisplay: SuggestionDisplaySettings
  dataFilters: GameDataFilters
  onDifficultyChange: (difficulty: DifficultyOption) => void
  onToggle: (settingId: DifficultyToggleId, enabled: boolean) => void
  onSubsetCountChange: (count: number) => void
  onOrderModeChange: (mode: SuggestionDisplaySettings["orderMode"]) => void
  onSortModeChange: (mode: SuggestionDisplaySettings["sortMode"]) => void
  onActorPopularityCutoffChange: (value: number | null) => void
  onReleaseYearCutoffChange: (year: number | null) => void
  actorCountSummary?: FilterCountSummary | null
  movieCountSummary?: FilterCountSummary | null
  filterValidationMessage?: string | null
  customPanelClassName?: string
  suggestionPanelClassName?: string
  dataFilterPanelClassName?: string
}) {
  const customSectionId = activeSection === "data-filters" || activeSection === "sorting" ? null : activeSection

  return (
    <div className="settingsGameplayLayout">
      <nav className="settingsGameplayNav" aria-label="Gameplay settings sections">
        {GAMEPLAY_SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            className={`settingsGameplayNavButton${activeSection === section.id ? " settingsGameplayNavButton--active" : ""}`}
            onClick={() => onSectionSelect(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      <div className="settingsGameplayContent">
        {activeSection === "sorting" ? (
          <SuggestionDisplaySettingsPanel
            suggestionDisplay={suggestionDisplay}
            onSubsetCountChange={onSubsetCountChange}
            onOrderModeChange={onOrderModeChange}
            onSortModeChange={onSortModeChange}
            controlsMode="sorting"
            showHeader={false}
            className={suggestionPanelClassName}
          />
        ) : customSectionId ? (
          <CustomGameSettingsPanel
            difficulty={difficulty}
            customSettings={customSettings}
            onDifficultyChange={onDifficultyChange}
            onToggle={onToggle}
            visibleSections={[customSectionId]}
            suggestionListAddon={customSectionId === "suggestion-list" ? (
              <SuggestionDisplaySettingsPanel
                suggestionDisplay={suggestionDisplay}
                onSubsetCountChange={onSubsetCountChange}
                onOrderModeChange={onOrderModeChange}
                onSortModeChange={onSortModeChange}
                controlsMode="shuffle"
                showHeader={false}
                className={suggestionPanelClassName}
              />
            ) : undefined}
            title="Gameplay Helpers"
            hint="These preferences are shared with the in-game info menu and apply immediately during play."
            className={customPanelClassName}
          />
        ) : (
          <GameDataFilterPanel
            dataFilters={dataFilters}
            onActorPopularityCutoffChange={onActorPopularityCutoffChange}
            onReleaseYearCutoffChange={onReleaseYearCutoffChange}
            actorCountSummary={actorCountSummary}
            movieCountSummary={movieCountSummary}
            validationMessage={filterValidationMessage}
            className={dataFilterPanelClassName}
          />
        )}
      </div>
    </div>
  )
}