import type { SuggestionDisplaySettings } from "../types"

export default function SuggestionDisplaySettingsPanel({
  suggestionDisplay,
  onViewModeChange,
  onSubsetCountChange,
  onAllWindowModeChange,
  className = "",
}: {
  suggestionDisplay: SuggestionDisplaySettings
  onViewModeChange: (mode: SuggestionDisplaySettings["viewMode"]) => void
  onSubsetCountChange: (count: number) => void
  onAllWindowModeChange: (mode: SuggestionDisplaySettings["allWindowMode"]) => void
  className?: string
}) {
  const isViewingAll = suggestionDisplay.viewMode === "all"
  const isViewingSubset = suggestionDisplay.viewMode === "subset"
  const isScrollMode = suggestionDisplay.allWindowMode === "scroll"

  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      <div className="settingsCustomHeader">
        <h3>Suggestion Display</h3>
  		<p className="settingsHint">Choose how many suggestions are visible at once and whether the full list scrolls or paginates.</p>
      </div>

      <div className="settingsToggleList">
        {/* View Mode Toggle */}
        <label className="settingsToggleRow">
          <span className="settingsToggleText">
            <strong>View all suggestions</strong>
            <span className="settingsHint">Show entire ranked list at once (all) or a subset (2-10).</span>
          </span>
          <button
            type="button"
            className={`settingsToggleSwitch${isViewingAll ? " settingsToggleSwitch--on" : ""}`}
            onClick={() => onViewModeChange(isViewingAll ? "subset" : "all")}
            aria-pressed={isViewingAll}
          >
            <span className="settingsToggleThumb" aria-hidden="true" />
          </button>
        </label>

        {/* All Window Mode - Only shown in full list mode */}
        {isViewingAll && (
          <label className="settingsToggleRow">
            <span className="settingsToggleText">
              <strong>Use scroll window</strong>
              <span className="settingsHint">Scroll through fixed-height window or page through suggestions.</span>
            </span>
            <button
              type="button"
              className={`settingsToggleSwitch${isScrollMode ? " settingsToggleSwitch--on" : ""}`}
              onClick={() => onAllWindowModeChange(isScrollMode ? "pagination" : "scroll")}
              aria-pressed={isScrollMode}
            >
              <span className="settingsToggleThumb" aria-hidden="true" />
            </button>
          </label>
        )}

        {/* Subset Count - Only shown in subset mode */}
        {isViewingSubset && (
          <label className="settingsDataFilterField">
            <span>Suggestions visible in subset</span>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={suggestionDisplay.subsetCount}
              onChange={(event) => onSubsetCountChange(Number(event.target.value))}
            />
            <span className="settingsHint">Current: {suggestionDisplay.subsetCount}</span>
          </label>
        )}

        {/* Count selector for All mode - shown when viewing all */}
        {isViewingAll && (
          <label className="settingsDataFilterField">
            <span>Items per window/page</span>
            <input
              type="range"
              min={2}
              max={10}
              step={1}
              value={suggestionDisplay.subsetCount}
              onChange={(event) => onSubsetCountChange(Number(event.target.value))}
            />
            <span className="settingsHint">Current: {suggestionDisplay.subsetCount}</span>
          </label>
        )}
      </div>
    </div>
  )
}
