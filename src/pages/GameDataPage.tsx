import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import PageBackButton from "../components/PageBackButton"
import { useDataSourceMode } from "../context/dataSourceMode"
import { useSnapshotData } from "../context/snapshotData"
import { getCatalogSourceLabel, resolveCatalogSource } from "../data/catalogSource"
import type { Actor, EffectiveDataSource, Movie } from "../types"

type ActorSortMode = "name-asc" | "name-desc" | "popularity-desc" | "popularity-asc"
type MovieSortMode = "title-asc" | "title-desc" | "release-desc" | "release-asc"

function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase()
}

function compareNullableNumber(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return 0
  }

  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  return left - right
}

function compareNullableDate(left: string | null, right: string | null) {
  if (!left && !right) {
    return 0
  }

  if (!left) {
    return 1
  }

  if (!right) {
    return -1
  }

  return left.localeCompare(right)
}

function getNextActorSortMode(current: ActorSortMode, column: "name" | "popularity"): ActorSortMode {
  if (column === "name") {
    return current === "name-asc" ? "name-desc" : "name-asc"
  }

  return current === "popularity-desc" ? "popularity-asc" : "popularity-desc"
}

function getNextMovieSortMode(current: MovieSortMode, column: "title" | "release"): MovieSortMode {
  if (column === "title") {
    return current === "title-asc" ? "title-desc" : "title-asc"
  }

  return current === "release-desc" ? "release-asc" : "release-desc"
}

function getSortIndicator(isAscending: boolean) {
  return isAscending ? "↑" : "↓"
}

function GameDataPage() {
  const { mode } = useDataSourceMode()
  const { snapshot, indexes } = useSnapshotData()
  const [actors, setActors] = useState<Actor[]>([])
  const [movies, setMovies] = useState<Movie[]>([])
  const [activeSource, setActiveSource] = useState<EffectiveDataSource>("demo")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actorSearch, setActorSearch] = useState("")
  const [movieSearch, setMovieSearch] = useState("")
  const [actorSortMode, setActorSortMode] = useState<ActorSortMode>("name-asc")
  const [movieSortMode, setMovieSortMode] = useState<MovieSortMode>("title-asc")

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      setIsLoading(true)
      setLoadError(null)

      try {
        const catalog = await resolveCatalogSource({ mode, snapshot, indexes })

        if (!isMounted) {
          return
        }

        setActors(catalog.actors)
        setMovies(catalog.movies)
        setActiveSource(catalog.source)
        setStatusMessage(catalog.statusMessage)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setLoadError(error instanceof Error ? error.message : "Failed to load game data.")
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadCatalog()

    return () => {
      isMounted = false
    }
  }, [indexes, mode, snapshot])

  const filteredActors = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(actorSearch)

    const filtered = actors.filter((actor) => {
      if (!normalizedSearch) {
        return true
      }

      return normalizeSearchValue(actor.name).includes(normalizedSearch)
    })

    return filtered.sort((left, right) => {
      if (actorSortMode === "name-asc") {
        return left.name.localeCompare(right.name)
      }

      if (actorSortMode === "name-desc") {
        return right.name.localeCompare(left.name)
      }

      if (actorSortMode === "popularity-desc") {
        return compareNullableNumber(right.popularity, left.popularity) || left.name.localeCompare(right.name)
      }

      return compareNullableNumber(left.popularity, right.popularity) || left.name.localeCompare(right.name)
    })
  }, [actorSearch, actorSortMode, actors])

  const filteredMovies = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(movieSearch)

    const filtered = movies.filter((movie) => {
      if (!normalizedSearch) {
        return true
      }

      return normalizeSearchValue(movie.title).includes(normalizedSearch)
    })

    return filtered.sort((left, right) => {
      if (movieSortMode === "title-asc") {
        return left.title.localeCompare(right.title)
      }

      if (movieSortMode === "title-desc") {
        return right.title.localeCompare(left.title)
      }

      if (movieSortMode === "release-desc") {
        return compareNullableDate(right.releaseDate, left.releaseDate) || left.title.localeCompare(right.title)
      }

      return compareNullableDate(left.releaseDate, right.releaseDate) || left.title.localeCompare(right.title)
    })
  }, [movieSearch, movieSortMode, movies])

  return (
    <div className="utilityPage">
      <PageBackButton to="/" label="Back" />
      <div className="utilityPanel utilityPanel--wide">
        <div className="pageEyebrow">Game Data</div>
        <h1>Browse the game catalog</h1>
        <p className="pageLead">These lists show the actors and movies currently available to the frontend. When a snapshot is loaded, this page reads directly from that snapshot; otherwise it falls back to live API data or the demo dataset.</p>

        {isLoading ? <div className="pageStatus">Loading game data…</div> : null}
        {statusMessage ? <div className="pageStatus">{statusMessage}</div> : null}
        <div className="pageStatus">{getCatalogSourceLabel(activeSource)}</div>
        {loadError ? <div className="pageStatus pageStatus--error">{loadError}</div> : null}

        <div className="catalogGrid">
          <section className="catalogPanel">
            <div className="catalogPanelHeader">
              <h2>Actors</h2>
              <span>{filteredActors.length}</span>
            </div>
            <div className="catalogControls">
              <label className="catalogControlField">
                <span>Search</span>
                <input
                  type="text"
                  value={actorSearch}
                  onChange={(event) => setActorSearch(event.target.value)}
                  placeholder="Search actors by name"
                  disabled={isLoading}
                />
              </label>
            </div>
            <div className="catalogListShell">
              <div className="catalogList catalogList--withHeader">
                <div className="catalogListHeader">
                  <button type="button" className="catalogSortButton" onClick={() => setActorSortMode(getNextActorSortMode(actorSortMode, "name"))}>
                    <span>Name</span>
                    {actorSortMode === "name-asc" || actorSortMode === "name-desc" ? <span>{getSortIndicator(actorSortMode === "name-asc")}</span> : null}
                  </button>
                  <button type="button" className="catalogSortButton catalogSortButton--numeric" onClick={() => setActorSortMode(getNextActorSortMode(actorSortMode, "popularity"))}>
                    <span>Popularity</span>
                    {actorSortMode === "popularity-asc" || actorSortMode === "popularity-desc" ? <span>{getSortIndicator(actorSortMode === "popularity-asc")}</span> : null}
                  </button>
                </div>
                {filteredActors.map((actor) => (
                  <div key={actor.id} className="catalogListItem">
                    <span>{actor.name}</span>
                    <span>{actor.popularity ?? "--"}</span>
                  </div>
                ))}
                {filteredActors.length === 0 ? <div className="catalogEmptyState">No actors matched the current search.</div> : null}
              </div>
            </div>
          </section>

          <section className="catalogPanel">
            <div className="catalogPanelHeader">
              <h2>Movies</h2>
              <span>{filteredMovies.length}</span>
            </div>
            <div className="catalogControls">
              <label className="catalogControlField">
                <span>Search</span>
                <input
                  type="text"
                  value={movieSearch}
                  onChange={(event) => setMovieSearch(event.target.value)}
                  placeholder="Search movies by title"
                  disabled={isLoading}
                />
              </label>
            </div>
            <div className="catalogListShell">
              <div className="catalogList catalogList--withHeader">
                <div className="catalogListHeader">
                  <button type="button" className="catalogSortButton" onClick={() => setMovieSortMode(getNextMovieSortMode(movieSortMode, "title"))}>
                    <span>Title</span>
                    {movieSortMode === "title-asc" || movieSortMode === "title-desc" ? <span>{getSortIndicator(movieSortMode === "title-asc")}</span> : null}
                  </button>
                  <button type="button" className="catalogSortButton catalogSortButton--numeric" onClick={() => setMovieSortMode(getNextMovieSortMode(movieSortMode, "release"))}>
                    <span>Release Date</span>
                    {movieSortMode === "release-asc" || movieSortMode === "release-desc" ? <span>{getSortIndicator(movieSortMode === "release-asc")}</span> : null}
                  </button>
                </div>
                {filteredMovies.map((movie) => (
                  <div key={movie.id} className="catalogListItem">
                    <span>{movie.title}</span>
                    <span>{movie.releaseDate ?? "--"}</span>
                  </div>
                ))}
                {filteredMovies.length === 0 ? <div className="catalogEmptyState">No movies matched the current search.</div> : null}
              </div>
            </div>
          </section>
        </div>

        <Link to="/" className="pageBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default GameDataPage