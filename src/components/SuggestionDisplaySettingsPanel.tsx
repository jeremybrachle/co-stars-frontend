import type { SuggestionDisplaySettings } from "../types"

const SORT_OPTIONS: Array<{
  value: SuggestionDisplaySettings["sortMode"]
  label: string
  hint: string
}> = [
  {
    value: "default",
    label: "Default",
    hint: "Actors by popularity, movies by year.",
  },
  {
    value: "best-path",
    label: "Best path",
    hint: "Best route options first, with safer cards above risk cards.",
  },
  {
    value: "random",
    label: "Unsorted",
    hint: "Keep the list in a loose random order.",
  },
]

export default function SuggestionDisplaySettingsPanel({
  suggestionDisplay,
  onSubsetCountChange,
  onOrderModeChange,
  onSortModeChange,
  controlsMode = "all",
  showHeader = true,
  className = "",
}: {
  suggestionDisplay: SuggestionDisplaySettings
  onSubsetCountChange: (count: number) => void
  onOrderModeChange: (mode: SuggestionDisplaySettings["orderMode"]) => void
  onSortModeChange: (mode: SuggestionDisplaySettings["sortMode"]) => void
  controlsMode?: "all" | "sorting" | "shuffle"
  showHeader?: boolean
  className?: string
}) {
  const isShuffleMode = suggestionDisplay.orderMode === "shuffled"
  const showsLargeWindow = suggestionDisplay.subsetCount >= 8
  const showsSortingControls = controlsMode === "all" || controlsMode === "sorting"
  const showsShuffleControls = controlsMode === "all" || controlsMode === "shuffle"
  const shuffleModeLabel = controlsMode === "shuffle" ? "Shuffling" : "Suggestion Display"

  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      {showHeader ? (
        <div className="settingsCustomHeader">
	      <h3>{controlsMode === "sorting" ? "Sorting" : shuffleModeLabel}</h3>
		  <p className="settingsHint">
            {controlsMode === "sorting"
              ? "Choose how suggestion candidates are ordered."
              : controlsMode === "shuffle"
                ? "Start with shuffling off for the easier default. Turn it on when you want a harder run with rerolls."
                : "Choose between the full ranked list and a shuffled window."}
		  </p>
        </div>
      ) : null}

      <div className="settingsToggleList">
        {showsSortingControls ? (
          <label className="settingsDataFilterField">
            <span>Sorting</span>
            <div className="settingsChoiceList" role="radiogroup" aria-label="Suggestion sorting mode">
              {SORT_OPTIONS.map((option) => {
                const isSelected = suggestionDisplay.sortMode === option.value

                return (
                  <label key={option.value} className={`settingsChoiceRow${isSelected ? " settingsChoiceRow--selected" : ""}`}>
                    <input
                      type="radio"
                      name="suggestion-sort-mode"
                      checked={isSelected}
                      onChange={() => onSortModeChange(option.value)}
                    />
                    <span className="settingsChoiceRadio" aria-hidden="true" />
                    <span className="settingsChoiceText">
                      <strong className="settingsChoiceLabel">{option.label}</strong>
                      <span className="settingsHint">{option.hint}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </label>
        ) : null}

        {showsShuffleControls ? (
          <>
            <label className="settingsDataFilterField">
              <span>Shuffling</span>
              <div className="settingsChoiceList" role="radiogroup" aria-label="Suggestion list shuffling mode">
                <label className={`settingsChoiceRow${!isShuffleMode ? " settingsChoiceRow--selected settingsChoiceRow--shuffle-off-selected" : ""}`}>
                  <input
                    type="radio"
                    name="suggestion-order-mode"
                    checked={!isShuffleMode}
                    onChange={() => onOrderModeChange("ranked")}
                  />
                  <span className="settingsChoiceRadio" aria-hidden="true" />
                  <span className="settingsChoiceText">
                    <strong className="settingsChoiceLabel">Disable shuffling</strong>
                    <span className="settingsHint">Recommended default. Show the full list so it is easier to jump into a new game.</span>
                  </span>
                </label>

                <label className={`settingsChoiceRow${isShuffleMode ? " settingsChoiceRow--selected settingsChoiceRow--shuffle-on-selected" : ""}`}>
                  <input
                    type="radio"
                    name="suggestion-order-mode"
                    checked={isShuffleMode}
                    onChange={() => onOrderModeChange("shuffled")}
                  />
                  <span className="settingsChoiceRadio" aria-hidden="true" />
                  <span className="settingsChoiceText">
                    <strong className="settingsChoiceLabel">Enable shuffling</strong>
                    <span className="settingsHint">Harder mode. Show a smaller shuffled window and use rerolls when you want more challenge.</span>
                  </span>
                </label>
              </div>
            </label>

            {isShuffleMode ? (
              <>
                <label className="settingsDataFilterField">
                  <span>Visible cards</span>
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
                {showsLargeWindow ? (
                  <p className="settingsWarning">Performance warning: Larger shuffled windows render more cards at once and can feel heavier on dense rounds.</p>
                ) : null}
              </>
            ) : (
              <>
                <p className="settingsHint">Shuffle score shows N/A in ranked mode. The non-shuffle penalty still applies at the end.</p>
                <p className="settingsWarning">Performance warning: Ranked mode renders the full list, so it can feel slower on dense turns.</p>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
