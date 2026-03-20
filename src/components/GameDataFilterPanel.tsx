import type { GameDataFilters } from "../types"

export default function GameDataFilterPanel({
  dataFilters,
  isSortedResultsEnabled,
  onSortedResultsChange,
  onActorPopularityCutoffChange,
  onReleaseYearCutoffChange,
  className = "",
}: {
  dataFilters: GameDataFilters
  isSortedResultsEnabled: boolean
  onSortedResultsChange: (enabled: boolean) => void
  onActorPopularityCutoffChange: (value: number | null) => void
  onReleaseYearCutoffChange: (year: number | null) => void
  className?: string
}) {
  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      <div className="settingsCustomHeader">
        <h3>Data Filter & Sort</h3>
        <p className="settingsHint">Control which actors and movies are eligible, and whether equal-quality results are sorted by popularity or release year.</p>
      </div>

      <div className="settingsToggleList">
        <label className="settingsToggleRow">
          <span className="settingsToggleText">
            <strong>Sort equal-quality results</strong>
            <span className="settingsHint">When on, actors prefer higher popularity and movies prefer newer release years. This is separate from shuffle mode.</span>
          </span>
          <button
            type="button"
            className={`settingsToggleSwitch${isSortedResultsEnabled ? " settingsToggleSwitch--on" : ""}`}
            onClick={() => onSortedResultsChange(!isSortedResultsEnabled)}
            aria-pressed={isSortedResultsEnabled}
          >
            <span className="settingsToggleThumb" aria-hidden="true" />
          </button>
        </label>
      </div>

      <div className="settingsDataFilterRow">
        <label className="settingsDataFilterField">
          <span>Actor obscurity cutoff</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={dataFilters.actorPopularityCutoff ?? ""}
            placeholder="No cutoff"
            onChange={(event) => {
              const nextValue = event.target.value.trim()
              if (!nextValue) {
                onActorPopularityCutoffChange(null)
                return
              }

              const parsed = Number(nextValue)
              if (!Number.isFinite(parsed)) {
                return
              }

              onActorPopularityCutoffChange(Math.max(0, parsed))
            }}
          />
        </label>
        <button type="button" className="settingsActionButton settingsActionButton--compact" onClick={() => onActorPopularityCutoffChange(null)}>
          Remove
        </button>
      </div>
      <p className="settingsHint">Default: 1.8. Hides actors below this popularity from suggestions. Set blank or remove to disable.</p>

      <div className="settingsDataFilterRow">
        <label className="settingsDataFilterField">
          <span>Movie release year cutoff</span>
          <input
            type="number"
            min="1800"
            step="1"
            value={dataFilters.releaseYearCutoff ?? ""}
            placeholder="No cutoff"
            onChange={(event) => {
            const nextValue = event.target.value.trim()
            if (!nextValue) {
              onReleaseYearCutoffChange(null)
              return
            }

            const parsed = Number(nextValue)
            if (Number.isFinite(parsed) && parsed >= 1800) {
              onReleaseYearCutoffChange(parsed)
            }
            }}
          />
        </label>
    <button type="button" className="settingsActionButton settingsActionButton--compact" onClick={() => onReleaseYearCutoffChange(null)}>
      Remove
    </button>
      </div>
    <p className="settingsHint">Leave empty or remove to disable. When set, movies released before that year are hidden from suggestions.</p>

  	  <p className="settingsHint">{isSortedResultsEnabled ? "Equal-quality movie results currently prefer newer releases, and actor results prefer higher popularity." : "Equal-quality results currently keep their source ordering instead of popularity or release-year sorting."}</p>
    </div>
  )
}
