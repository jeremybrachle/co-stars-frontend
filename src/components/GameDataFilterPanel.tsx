import type { GameDataFilters } from "../types"

export default function GameDataFilterPanel({
  dataFilters,
  onActorPopularityCutoffChange,
  onReleaseYearCutoffChange,
  onMovieSortModeChange,
  onActorSortModeChange,
  className = "",
}: {
  dataFilters: GameDataFilters
  onActorPopularityCutoffChange: (value: number | null) => void
  onReleaseYearCutoffChange: (year: number | null) => void
	 onMovieSortModeChange: (mode: "releaseYear" | "random") => void
	 onActorSortModeChange: (mode: "popularity" | "random") => void
  className?: string
}) {
  const isSortingMoviesByReleaseYear = dataFilters.movieSortMode === "releaseYear"
  const isSortingActorsByPopularity = dataFilters.actorSortMode === "popularity"

  return (
    <div className={`settingsCustomPanel${className ? ` ${className}` : ""}`}>
      <div className="settingsCustomHeader">
        <h3>Data Filter & Sort</h3>
        <p className="settingsHint">Control how suggestions are filtered and sorted by type.</p>
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

      <div className="settingsToggleList">
        <label className="settingsToggleRow">
          <span className="settingsToggleText">
			<strong>Sort movies by release year</strong>
			<span className="settingsHint">When off, movie suggestion lists use a random order. When on, they sort newest first.</span>
          </span>
          <button
            type="button"
            className={`settingsToggleSwitch${isSortingMoviesByReleaseYear ? " settingsToggleSwitch--on" : ""}`}
			onClick={() => onMovieSortModeChange(isSortingMoviesByReleaseYear ? "random" : "releaseYear")}
            aria-pressed={isSortingMoviesByReleaseYear}
          >
            <span className="settingsToggleThumb" aria-hidden="true" />
          </button>
        </label>

        <label className="settingsToggleRow">
          <span className="settingsToggleText">
			<strong>Sort actors by popularity</strong>
			<span className="settingsHint">When off, actor suggestion lists use a random order. When on, they sort most popular first.</span>
          </span>
          <button
            type="button"
            className={`settingsToggleSwitch${isSortingActorsByPopularity ? " settingsToggleSwitch--on" : ""}`}
			onClick={() => onActorSortModeChange(isSortingActorsByPopularity ? "random" : "popularity")}
            aria-pressed={isSortingActorsByPopularity}
          >
            <span className="settingsToggleThumb" aria-hidden="true" />
          </button>
        </label>
      </div>
    </div>
  )
}
