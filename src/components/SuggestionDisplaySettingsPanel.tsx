import type { SuggestionDisplaySettings } from "../types"

export default function SuggestionDisplaySettingsPanel({
  suggestionDisplay,
  onSubsetCountChange,
  onOrderModeChange,
  onSortModeChange,
  className = "",
}: {
  suggestionDisplay: SuggestionDisplaySettings
  onSubsetCountChange: (count: number) => void
  onOrderModeChange: (mode: SuggestionDisplaySettings["orderMode"]) => void
  onSortModeChange: (mode: SuggestionDisplaySettings["sortMode"]) => void
  className?: string
}) {
  const isShuffleMode = suggestionDisplay.orderMode === "shuffled"

  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      <div className="settingsCustomHeader">
        <h3>Suggestion Display</h3>
		<p className="settingsHint">Choose between a full ranked scroll list or a shuffled card window.</p>
      </div>

      <div className="settingsToggleList">
        <label className="settingsDataFilterField">
          <span>Suggestion sorting</span>
          <div className="settingsChoiceList" role="radiogroup" aria-label="Suggestion sorting mode">
            <label className="settingsChoiceRow">
              <input
                type="radio"
                name="suggestion-sort-mode"
                checked={suggestionDisplay.sortMode === "default"}
                onChange={() => onSortModeChange("default")}
              />
              <span>
                <strong>Default setting</strong>
                <span className="settingsHint">Actors use popularity and movies use release year.</span>
              </span>
            </label>
            <label className="settingsChoiceRow">
              <input
                type="radio"
                name="suggestion-sort-mode"
                checked={suggestionDisplay.sortMode === "best-path"}
                onChange={() => onSortModeChange("best-path")}
              />
              <span>
                <strong>Best path</strong>
                <span className="settingsHint">Prefer the suggestions that get closest to the optimal route first.</span>
              </span>
            </label>
            <label className="settingsChoiceRow">
              <input
                type="radio"
                name="suggestion-sort-mode"
                checked={suggestionDisplay.sortMode === "random"}
                onChange={() => onSortModeChange("random")}
              />
              <span>
                <strong>Unsorted</strong>
                <span className="settingsHint">Keep suggestions in a randomized order.</span>
              </span>
            </label>
          </div>
        </label>

        <label className="settingsToggleRow">
          <span className="settingsToggleText">
            <strong>Shuffle suggestion list</strong>
            <span className="settingsHint">When off, the board shows every ranked suggestion in one scrollable list. When on, the board shows a shuffled fixed-size set and enables rerolls.</span>
          </span>
          <button
            type="button"
            className={`settingsToggleSwitch${isShuffleMode ? " settingsToggleSwitch--on" : ""}`}
            onClick={() => onOrderModeChange(isShuffleMode ? "ranked" : "shuffled")}
            aria-pressed={isShuffleMode}
          >
            <span className="settingsToggleThumb" aria-hidden="true" />
          </button>
        </label>

        {isShuffleMode ? (
          <label className="settingsDataFilterField">
            <span>Visible cards in shuffled mode</span>
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
        ) : (
          <p className="settingsHint">Shuffle score shows N/A in ranked mode. A fixed penalty is applied only if the game ends with shuffle mode turned off.</p>
        )}
      </div>
    </div>
  )
}
