import type { GameDataFilters } from "../types"

export default function GameDataFilterPanel({
  dataFilters,
  onActorPopularityCutoffChange,
  onReleaseYearCutoffChange,
  className = "",
}: {
  dataFilters: GameDataFilters
  onActorPopularityCutoffChange: (value: number | null) => void
  onReleaseYearCutoffChange: (year: number | null) => void
  className?: string
}) {
  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      <div className="settingsCustomHeader">
        <h3>Data Filter & Sort</h3>
        <p className="settingsHint">Control which actors and movies are eligible before the current suggestion sorting mode is applied.</p>
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

  	  <p className="settingsHint">Default suggestion sorting uses actor popularity and movie release year when the Suggestion Display sorting mode is set to Default setting.</p>
    </div>
  )
}
