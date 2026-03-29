import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import EntityDetailsDialog, {
  type EntityDetailsDialogData,
  type EntityDetailsHistoryEntry,
  type EntityDetailsRelatedEntity,
} from "../components/EntityDetailsDialog"
import EntityArtwork from "../components/EntityArtwork"
import PageNavigationHeader from "../components/PageNavigationHeader"
import FullDataWaitingMessage from "../components/FullDataWaitingMessage"
import {
  buildCatalogDetailDialogData,
  type CatalogDetailEntry,
  loadCatalogRelatedEntities,
} from "../data/catalogEntityDetails"
import { useDataSourceMode } from "../context/dataSourceMode"
import { useSnapshotData } from "../context/snapshotData"
import { resolveCatalogSource } from "../data/catalogSource"
import { isOfflineDemoMode, isOnlineApiMode } from "../data/dataSourcePreferences"
import { buildNextDetailTrail, sortMoviesByReleaseDateDescending } from "../data/entityDetails"
import { formatActorInlineMeta, formatMovieInlineMeta } from "../data/presentation"
import type { Actor, EffectiveDataSource, GameDataFilters, Movie, SnapshotIndexes } from "../types"

type GameDataPageRouteState = {
  backTo?: string
  backLabel?: string
  focusEntity?: {
    type: "actor" | "movie"
    label: string
  }
}

type ActorSortMode = "name-asc" | "name-desc" | "popularity-desc" | "popularity-asc"

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

function getNextActorSortMode(current: ActorSortMode, column: "name" | "popularity"): ActorSortMode {
  if (column === "name") {
    return current === "name-asc" ? "name-desc" : "name-asc"
  }

  return current === "popularity-desc" ? "popularity-asc" : "popularity-desc"
}

function getSortIndicator(isAscending: boolean) {
  return isAscending ? "↑" : "↓"
}

function formatFilteredCount(filteredCount: number, totalCount: number, hasFilter: boolean) {
  return hasFilter ? `${filteredCount}/${totalCount}` : `${totalCount}`
}

function formatActorMeta(actor: Actor) {
  return formatActorInlineMeta(actor)
}

function formatMovieMeta(movie: Movie) {
  return formatMovieInlineMeta(movie)
}

function GameDataPage() {
  const location = useLocation()
  const routeState = (location.state as GameDataPageRouteState | null) ?? null
  const handledRouteEntityKeyRef = useRef<string | null>(null)
  const { mode, setMode } = useDataSourceMode()
  const { snapshot, indexes, isLoading: isSnapshotLoading } = useSnapshotData()
  const isWaitingForFullData = !isOfflineDemoMode(mode) && !isOnlineApiMode(mode) && (!snapshot || !indexes) && isSnapshotLoading
  const [actors, setActors] = useState<Actor[]>([])
  const [movies, setMovies] = useState<Movie[]>([])
  const [activeSource, setActiveSource] = useState<EffectiveDataSource>("demo")
  const [catalogIndexes, setCatalogIndexes] = useState<SnapshotIndexes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actorSearch, setActorSearch] = useState("")
  const [movieSearch, setMovieSearch] = useState("")
  const [actorSortMode, setActorSortMode] = useState<ActorSortMode>("popularity-desc")
  const [isActorFilterOpen, setIsActorFilterOpen] = useState(false)
  const [isMovieFilterOpen, setIsMovieFilterOpen] = useState(false)
  const [pageFilters, setPageFilters] = useState<GameDataFilters>({
    actorPopularityCutoff: null,
    releaseYearCutoff: null,
    movieSortMode: "releaseYear",
    actorSortMode: "popularity",
  })
  const [detailTrail, setDetailTrail] = useState<CatalogDetailEntry[]>([])
  const [relationSearch, setRelationSearch] = useState("")
  const [relatedEntities, setRelatedEntities] = useState<EntityDetailsRelatedEntity[]>([])
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const activeDetail = detailTrail.length > 0 ? detailTrail[detailTrail.length - 1] : null

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      if (isWaitingForFullData) {
        setIsLoading(true)
        setLoadError(null)
        return
      }

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
        setCatalogIndexes(catalog.indexes)
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
  }, [indexes, isSnapshotLoading, isWaitingForFullData, mode, snapshot])

  useEffect(() => {
    let isMounted = true

    const loadRelatedEntities = async () => {
      if (!activeDetail) {
        setRelationSearch("")
        setRelatedEntities([])
        setDetailError(null)
        return
      }

      setRelationSearch("")
      setIsDetailLoading(true)
      setDetailError(null)

      try {
        const nextRelations = await loadCatalogRelatedEntities({
          detail: activeDetail,
          activeSource,
          catalogIndexes,
          actors,
          movies,
        })

        if (!isMounted) {
          return
        }

        setRelatedEntities(nextRelations)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setDetailError(error instanceof Error ? error.message : "Failed to load connected entries.")
        setRelatedEntities([])
      } finally {
        if (isMounted) {
          setIsDetailLoading(false)
        }
      }
    }

    void loadRelatedEntities()

    return () => {
      isMounted = false
    }
  }, [activeDetail, activeSource, actors, catalogIndexes, movies])

  const detailDialogData = useMemo<EntityDetailsDialogData | null>(() => {
    return activeDetail ? buildCatalogDetailDialogData(activeDetail, relatedEntities.length) : null
  }, [activeDetail, relatedEntities.length])

  const detailHistory = useMemo<EntityDetailsHistoryEntry[]>(() => {
    return detailTrail.map((entry) => ({
      key: `${entry.type}-${entry.item.id}`,
      type: entry.type,
      label: entry.type === "actor" ? entry.item.name : entry.item.title,
    }))
  }, [detailTrail])

  const filteredActors = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(actorSearch)

    const filtered = actors.filter((actor) => {
      if (pageFilters.actorPopularityCutoff !== null && (actor.popularity ?? Number.NEGATIVE_INFINITY) < pageFilters.actorPopularityCutoff) {
        return false
      }

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
  }, [actorSearch, actorSortMode, actors, pageFilters.actorPopularityCutoff])

  const filteredMovies = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(movieSearch)

    const filtered = movies.filter((movie) => {
      if (pageFilters.releaseYearCutoff !== null) {
        const releaseYear = movie.releaseDate ? Number.parseInt(movie.releaseDate.slice(0, 4), 10) : Number.NaN
        if (!Number.isFinite(releaseYear) || releaseYear < pageFilters.releaseYearCutoff) {
          return false
        }
      }

      if (!normalizedSearch) {
        return true
      }

      return normalizeSearchValue(movie.title).includes(normalizedSearch)
    })

    return sortMoviesByReleaseDateDescending(filtered, (movie) => movie.releaseDate, (movie) => movie.title)
  }, [movieSearch, movies, pageFilters.releaseYearCutoff])

  const actorCanStageAdd = useMemo(() => {
    const normalized = normalizeSearchValue(actorSearch)

    if (!normalized) {
      return false
    }

    return !actors.some((actor) => normalizeSearchValue(actor.name) === normalized)
  }, [actorSearch, actors])

  const movieCanStageAdd = useMemo(() => {
    const normalized = normalizeSearchValue(movieSearch)

    if (!normalized) {
      return false
    }

    return !movies.some((movie) => normalizeSearchValue(movie.title) === normalized)
  }, [movieSearch, movies])

  const hasActorSearchFilter = normalizeSearchValue(actorSearch).length > 0
  const hasMovieSearchFilter = normalizeSearchValue(movieSearch).length > 0
  const hasActorDetailFilter = pageFilters.actorPopularityCutoff !== null
  const hasMovieDetailFilter = pageFilters.releaseYearCutoff !== null
  const actorCountLabel = formatFilteredCount(filteredActors.length, actors.length, hasActorSearchFilter || hasActorDetailFilter)
  const movieCountLabel = formatFilteredCount(filteredMovies.length, movies.length, hasMovieSearchFilter || hasMovieDetailFilter)

  const clearActorSearch = () => {
    setActorSearch("")
  }

  const clearMovieSearch = () => {
    setMovieSearch("")
  }

  const clearActorFilter = () => {
    setPageFilters((current) => ({
      ...current,
      actorPopularityCutoff: null,
    }))
    setIsActorFilterOpen(false)
  }

  const clearMovieFilter = () => {
    setPageFilters((current) => ({
      ...current,
      releaseYearCutoff: null,
    }))
    setIsMovieFilterOpen(false)
  }

  const handleOpenRelatedEntity = (entity: EntityDetailsRelatedEntity) => {
    if (entity.type === "actor") {
      const actor = actors.find((candidate) => candidate.id === entity.id)
      if (actor) {
        setDetailTrail((currentTrail) => buildNextDetailTrail(
          currentTrail,
          { type: "actor", item: actor },
          (left, right) => left.type === right.type && left.item.id === right.item.id,
        ))
      }
      return
    }

    const movie = movies.find((candidate) => candidate.id === entity.id)
    if (movie) {
      setDetailTrail((currentTrail) => buildNextDetailTrail(
        currentTrail,
        { type: "movie", item: movie },
        (left, right) => left.type === right.type && left.item.id === right.item.id,
      ))
    }
  }

  useEffect(() => {
    const focusEntity = routeState?.focusEntity
    if (!focusEntity) {
      return
    }

    const normalizedLabel = normalizeSearchValue(focusEntity.label)
    const requestKey = `${focusEntity.type}:${normalizedLabel}`
    if (handledRouteEntityKeyRef.current === requestKey) {
      return
    }

    if (focusEntity.type === "actor") {
      const actor = actors.find((candidate) => normalizeSearchValue(candidate.name) === normalizedLabel)
      if (!actor) {
        return
      }

      handledRouteEntityKeyRef.current = requestKey
      setDetailTrail([{ type: "actor", item: actor }])
      return
    }

    const movie = movies.find((candidate) => normalizeSearchValue(candidate.title) === normalizedLabel)
    if (!movie) {
      return
    }

    handledRouteEntityKeyRef.current = requestKey
    setDetailTrail([{ type: "movie", item: movie }])
  }, [actors, movies, routeState?.focusEntity])

  return (
    <div className="utilityPage utilityPage--catalog">
      <PageNavigationHeader backTo={routeState?.backTo ?? "/"} backLabel={routeState?.backLabel ?? "Back"} />
      <div className="utilityPanel utilityPanel--wide utilityPanel--catalog">
        <div className="pageEyebrow">Game Data</div>
        <h1>Browse the game catalog</h1>
        <p className="pageLead">Select any actor or movie to inspect its details, browse connected entries, and preview the future add-to-list workflow.</p>

        <div className="utilityPanelBody utilityPanelBody--catalog">

          {isWaitingForFullData ? <FullDataWaitingMessage onSwitchToDemo={() => setMode({ ...mode, connectionMode: "offline", offlineSource: "demo" })} /> : null}

          {isLoading ? <div className="pageStatus">Loading game data…</div> : null}
          {loadError ? <div className="pageStatus pageStatus--error">{loadError}</div> : null}

          <div className="catalogGrid">
          <section className="catalogPanel">
            <div className="catalogPanelHeader">
              <h2>Actors</h2>
              <span>{actorCountLabel}</span>
            </div>
            <div className="catalogControls">
              <div className="catalogSearchRow">
                <label className="catalogControlField">
                  <span>Search or stage an add</span>
                  <div className="catalogFilterInputRow">
                    <input
                      type="text"
                      value={actorSearch}
                      onChange={(event) => setActorSearch(event.target.value)}
                      placeholder="Search actors by name or type a new one"
                      disabled={isLoading}
                    />
                    <div className="catalogInputActions">
                      {hasActorSearchFilter ? (
                        <button
                          type="button"
                          className="catalogInputAction"
                          onClick={clearActorSearch}
                          aria-label="Clear actor search"
                          title="Clear actor search"
                        >
                          Clear
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`catalogFilterToggle${isActorFilterOpen ? " catalogFilterToggle--active" : ""}`}
                        onClick={() => setIsActorFilterOpen((current) => !current)}
                        aria-label="Toggle actor search filter"
                        title="Toggle actor search filter"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="catalogFilterToggleIcon">
                          <path d="M3.5 5.5h17l-6.8 7.6v4.7l-3.4 1.7v-6.4L3.5 5.5z" fill="currentColor" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isActorFilterOpen ? (
                    <div className="catalogInlineFilterRow">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={pageFilters.actorPopularityCutoff ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value.trim()
                          setPageFilters((current) => ({
                            ...current,
                            actorPopularityCutoff: nextValue ? Math.max(0, Number(nextValue)) : null,
                          }))
                        }}
                        placeholder="Actor popularity cutoff"
                        disabled={isLoading}
                      />
                      <button type="button" className="catalogInputAction catalogInputAction--secondary" onClick={clearActorFilter}>
                        Clear filter
                      </button>
                    </div>
                  ) : null}
                </label>
                <div className={`catalogFutureAction${actorCanStageAdd ? " catalogFutureAction--visible" : ""}`}>
                  <button type="button" disabled aria-disabled="true">Add</button>
                  <span className="catalogFutureHint">Add/edit support is planned for a future release.</span>
                </div>
              </div>
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
                  <button key={actor.id} type="button" className="catalogListItem catalogListItem--interactive" onClick={() => setDetailTrail([{ type: "actor", item: actor }])}>
          <div className="catalogListPrimary">
            <EntityArtwork
            type="actor"
            label={actor.name}
            imageUrl={actor.profileUrl}
            className="entityArtwork entityArtwork--row"
            imageClassName="entityArtwork__image"
            placeholderClassName="entityArtwork__emoji"
            />
            <div>
            <span>{actor.name}</span>
            <span className="catalogListMeta">{formatActorMeta(actor)}</span>
            </div>
          </div>
          <span>{actor.popularity?.toFixed(1) ?? "--"}</span>
                  </button>
                ))}
                {filteredActors.length === 0 ? <div className="catalogEmptyState">No actors matched the current search.</div> : null}
              </div>
            </div>
          </section>

          <section className="catalogPanel">
            <div className="catalogPanelHeader">
              <h2>Movies</h2>
              <span>{movieCountLabel}</span>
            </div>
            <div className="catalogControls">
              <div className="catalogSearchRow">
                <label className="catalogControlField">
                  <span>Search or stage an add</span>
                  <div className="catalogFilterInputRow">
                    <input
                      type="text"
                      value={movieSearch}
                      onChange={(event) => setMovieSearch(event.target.value)}
                      placeholder="Search movies by title or type a new one"
                      disabled={isLoading}
                    />
                    <div className="catalogInputActions">
                      {hasMovieSearchFilter ? (
                        <button
                          type="button"
                          className="catalogInputAction"
                          onClick={clearMovieSearch}
                          aria-label="Clear movie search"
                          title="Clear movie search"
                        >
                          Clear
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={`catalogFilterToggle${isMovieFilterOpen ? " catalogFilterToggle--active" : ""}`}
                        onClick={() => setIsMovieFilterOpen((current) => !current)}
                        aria-label="Toggle movie search filter"
                        title="Toggle movie search filter"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="catalogFilterToggleIcon">
                          <path d="M3.5 5.5h17l-6.8 7.6v4.7l-3.4 1.7v-6.4L3.5 5.5z" fill="currentColor" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isMovieFilterOpen ? (
                    <div className="catalogInlineFilterRow">
                      <input
                        type="number"
                        min="1800"
                        step="1"
                        value={pageFilters.releaseYearCutoff ?? ""}
                        onChange={(event) => {
                          const nextValue = event.target.value.trim()
                          setPageFilters((current) => ({
                            ...current,
                            releaseYearCutoff: nextValue ? Math.max(1800, Number(nextValue)) : null,
                          }))
                        }}
                        placeholder="Movie release year cutoff"
                        disabled={isLoading}
                      />
                      <button type="button" className="catalogInputAction catalogInputAction--secondary" onClick={clearMovieFilter}>
                        Clear filter
                      </button>
                    </div>
                  ) : null}
                </label>
                <div className={`catalogFutureAction${movieCanStageAdd ? " catalogFutureAction--visible" : ""}`}>
                  <button type="button" disabled aria-disabled="true">Add</button>
                  <span className="catalogFutureHint">Add/edit support is planned for a future release.</span>
                </div>
              </div>
            </div>
            <div className="catalogListShell">
              <div className="catalogList catalogList--withHeader">
                <div className="catalogListHeader">
                  <span className="catalogSortButton catalogSortButton--static">Title</span>
                  <span className="catalogSortButton catalogSortButton--numeric catalogSortButton--static">Release Date ↓</span>
                </div>
                {filteredMovies.map((movie) => (
                  <button key={movie.id} type="button" className="catalogListItem catalogListItem--interactive" onClick={() => setDetailTrail([{ type: "movie", item: movie }])}>
          <div className="catalogListPrimary">
            <EntityArtwork
            type="movie"
            label={movie.title}
            imageUrl={movie.posterUrl}
            className="entityArtwork entityArtwork--row"
            imageClassName="entityArtwork__image"
            placeholderClassName="entityArtwork__emoji"
            />
            <div>
            <span>{movie.title}</span>
            <span className="catalogListMeta">{formatMovieMeta(movie)}</span>
            </div>
          </div>
          <span>{movie.releaseDate ?? "--"}</span>
                  </button>
                ))}
                {filteredMovies.length === 0 ? <div className="catalogEmptyState">No movies matched the current search.</div> : null}
              </div>
            </div>
          </section>
          </div>

          <Link to="/" className="pageBackLink">Back to Home</Link>
        </div>
      </div>

      <EntityDetailsDialog
        detail={detailDialogData}
        history={detailHistory}
        relationSearch={relationSearch}
        relatedEntities={relatedEntities}
        isLoading={isDetailLoading}
        errorMessage={detailError}
        onClose={() => setDetailTrail([])}
        onRelationSearchChange={setRelationSearch}
        onOpenRelatedEntity={handleOpenRelatedEntity}
        onNavigateHistory={(index) => setDetailTrail((currentTrail) => currentTrail.slice(0, index + 1))}
      />
    </div>
  )
}

export default GameDataPage