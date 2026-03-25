import type { FilterCountSummary } from "../data/filterCounts"
import type { GameDataFilters } from "../types"

export default function GameDataFilterPanel({
  dataFilters,
  onActorPopularityCutoffChange,
  onReleaseYearCutoffChange,
  actorCountSummary,
  movieCountSummary,
  validationMessage = null,
  className = "",
}: {
  dataFilters: GameDataFilters
  onActorPopularityCutoffChange: (value: number | null) => void
  onReleaseYearCutoffChange: (year: number | null) => void
  actorCountSummary?: FilterCountSummary | null
  movieCountSummary?: FilterCountSummary | null
  validationMessage?: string | null
  className?: string
}) {
  const isBroadActorFilter = dataFilters.actorPopularityCutoff === null
  const isBroadMovieFilter = dataFilters.releaseYearCutoff === null

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
      <p className="settingsHint">Default: 1.8. Hide actors below this popularity. Leave blank to disable.</p>
      {actorCountSummary ? (
        <div className="settingsCountSummary" role="status" aria-live="polite">
          <span className="settingsCountSummaryLabel">Actors after filter</span>
          <span className="settingsCountSummaryValue">{actorCountSummary.remaining}</span>
          <span className="settingsCountSummaryMeta">/ {actorCountSummary.total}</span>
        </div>
      ) : null}
      {isBroadActorFilter ? (
        <p className="settingsWarning">Performance warning: Removing the actor cutoff allows more candidates into each turn, which can increase render and analysis work.</p>
      ) : null}

      <br />
      <br />

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
    <p className="settingsHint">Hide movies released before this year. Leave blank to disable.</p>
    {movieCountSummary ? (
      <div className="settingsCountSummary" role="status" aria-live="polite">
        <span className="settingsCountSummaryLabel">Movies after filter</span>
        <span className="settingsCountSummaryValue">{movieCountSummary.remaining}</span>
        <span className="settingsCountSummaryMeta">/ {movieCountSummary.total}</span>
      </div>
    ) : null}
    {isBroadMovieFilter ? (
      <p className="settingsWarning">Performance warning: Leaving the movie year cutoff empty keeps older movies in play and can increase suggestion volume on some boards.</p>
    ) : null}

	  <p className="settingsHint">Default sorting uses actor popularity and movie release year.</p>
        {validationMessage ? <p className="settingsError">{validationMessage}</p> : null}
    </div>
  )
}
