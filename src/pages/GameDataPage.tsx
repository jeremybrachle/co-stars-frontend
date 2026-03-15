import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { fetchActorMovies, fetchMovieActors } from "../api/costars"
import EntityArtwork from "../components/EntityArtwork"
import PageBackButton from "../components/PageBackButton"
import { useDataSourceMode } from "../context/dataSourceMode"
import { useSnapshotData } from "../context/snapshotData"
import { resolveCatalogSource } from "../data/catalogSource"
import { isOnlineSnapshotMode } from "../data/dataSourcePreferences"
import { formatActorInlineMeta, formatActorLifespan, formatMovieInlineMeta, getMovieBadges } from "../data/presentation"
import type { Actor, EffectiveDataSource, Movie, SnapshotIndexes } from "../types"

type ActorSortMode = "name-asc" | "name-desc" | "popularity-desc" | "popularity-asc"
type MovieSortMode = "title-asc" | "title-desc" | "release-desc" | "release-asc"

type CatalogDetail =
  | { type: "actor"; item: Actor }
  | { type: "movie"; item: Movie }
  | null

type RelatedEntity = {
  id: number
  type: "actor" | "movie"
  label: string
  meta: string
	imageUrl: string | null
	badges: string[]
}

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

function formatActorMeta(actor: Actor) {
  return formatActorInlineMeta(actor)
}

function formatMovieMeta(movie: Movie) {
  return formatMovieInlineMeta(movie)
}

function createActorRelations(actor: Actor, indexes: SnapshotIndexes): RelatedEntity[] {
  const movieIds = indexes.actorToMovies[String(actor.id)] ?? []

  return movieIds
    .map((movieId) => indexes.moviesById.get(movieId))
    .filter((movie): movie is Movie => !!movie)
    .map((movie) => ({
      id: movie.id,
      type: "movie",
      label: movie.title,
      meta: formatMovieMeta(movie),
		imageUrl: movie.posterUrl ?? null,
		badges: getMovieBadges(movie),
    }))
}

function createMovieRelations(movie: Movie, indexes: SnapshotIndexes): RelatedEntity[] {
  const actorIds = indexes.movieToActors[String(movie.id)] ?? []

  return actorIds
    .map((actorId) => indexes.actorsById.get(actorId))
    .filter((actor): actor is Actor => !!actor)
    .map((actor) => ({
      id: actor.id,
      type: "actor",
      label: actor.name,
      meta: formatActorMeta(actor),
		imageUrl: actor.profileUrl ?? null,
    badges: actor.knownForDepartment ? [actor.knownForDepartment] : [],
    }))
}

function getActorDetailCards(actor: Actor, relatedCount: number) {
  return [
    { label: "Catalog id", value: String(actor.id) },
    { label: "Popularity", value: actor.popularity?.toFixed(1) ?? "--" },
    { label: "Department", value: actor.knownForDepartment ?? "Unknown" },
    { label: "Born", value: actor.birthday ?? "Unknown" },
    { label: "Lifespan", value: formatActorLifespan(actor) ?? "Unknown" },
    { label: "Connected entries", value: String(relatedCount) },
  ]
}

function getMovieDetailCards(movie: Movie, relatedCount: number) {
  return [
    { label: "Catalog id", value: String(movie.id) },
    { label: "Release date", value: movie.releaseDate ?? "Unknown" },
    { label: "Rating", value: movie.contentRating ?? "Unknown" },
    { label: "Language", value: movie.originalLanguage?.toUpperCase() ?? "Unknown" },
    { label: "Genres", value: movie.genres && movie.genres.length > 0 ? movie.genres.join(", ") : "Unknown" },
    { label: "Connected entries", value: String(relatedCount) },
  ]
}

function CatalogDetailDialog({
  detail,
  relationSearch,
  relatedEntities,
  isLoading,
  errorMessage,
  onClose,
  onRelationSearchChange,
  onOpenRelatedEntity,
}: {
  detail: CatalogDetail
  relationSearch: string
  relatedEntities: RelatedEntity[]
  isLoading: boolean
  errorMessage: string | null
  onClose: () => void
  onRelationSearchChange: (value: string) => void
  onOpenRelatedEntity: (entity: RelatedEntity) => void
}) {
  if (!detail) {
    return null
  }

  const detailKey = `${detail.type}-${detail.item.id}`
  const [isNarrativeExpanded, setIsNarrativeExpanded] = useState(false)

  useEffect(() => {
    setIsNarrativeExpanded(false)
  }, [detailKey])

  const relationshipLabel = detail.type === "actor" ? "Movies in catalog" : "Actors in catalog"
  const detailBadges = detail.type === "movie"
    ? getMovieBadges(detail.item)
    : detail.item.knownForDepartment
    ? [detail.item.knownForDepartment]
    : []
  const detailCards = detail.type === "actor"
    ? getActorDetailCards(detail.item, relatedEntities.length)
    : getMovieDetailCards(detail.item, relatedEntities.length)
  const narrative = detail.type === "actor" ? detail.item.biography : detail.item.overview
  const filteredEntities = relatedEntities.filter((entity) => {
    if (!relationSearch.trim()) {
      return true
    }

    return normalizeSearchValue(entity.label).includes(normalizeSearchValue(relationSearch))
  })

  return (
    <div className="catalogDialogOverlay" onClick={onClose}>
      <div className="catalogDialog" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="catalogDialogClose" onClick={onClose} aria-label="Close details">×</button>

        <div className="catalogDialogHeader">
        <div className="catalogDialogHero">
        <EntityArtwork
          type={detail.type}
          label={detail.type === "actor" ? detail.item.name : detail.item.title}
          imageUrl={detail.type === "actor" ? detail.item.profileUrl : detail.item.posterUrl}
          className="entityArtwork entityArtwork--hero"
          imageClassName="entityArtwork__image"
          placeholderClassName="entityArtwork__emoji"
        />
        <div>
            <div className="pageEyebrow">{detail.type === "actor" ? "Actor Details" : "Movie Details"}</div>
            <h2>{detail.type === "actor" ? detail.item.name : detail.item.title}</h2>
          <p className="catalogDetailLead">{detail.type === "actor" ? formatActorMeta(detail.item) : formatMovieMeta(detail.item)}</p>
          {detail.type === "actor" && detail.item.placeOfBirth ? <p className="catalogDetailSubtle">{detail.item.placeOfBirth}</p> : null}
        </div>
        </div>
          <div className={`searchSelectionBadge searchSelectionBadge--${detail.type}`}>{detail.type}</div>
        </div>

    {detailBadges.length > 0 ? (
      <div className="entityBadgeRow entityBadgeRow--detail">
      {detailBadges.map((badge) => <span key={badge} className="entityBadge">{badge}</span>)}
      </div>
    ) : null}

        <div className="catalogDetailMetaGrid">
        {detailCards.map((card) => (
        <div key={card.label} className="catalogDetailMetaCard">
          <span className="catalogDetailMetaLabel">{card.label}</span>
          <strong>{card.value}</strong>
        </div>
        ))}
        </div>

    {narrative ? (
      <div className={`catalogDetailNarrative${isNarrativeExpanded ? " catalogDetailNarrative--expanded" : ""}`}>
      <div className="catalogDetailNarrativeHeader">
        <h3>{detail.type === "actor" ? "Biography" : "Overview"}</h3>
        <button type="button" className="catalogDetailNarrativeToggle" onClick={() => setIsNarrativeExpanded((currentValue) => !currentValue)} aria-label={isNarrativeExpanded ? "Collapse text" : "Expand text"}>
          {isNarrativeExpanded ? "−" : "+"}
        </button>
      </div>
      <p>{narrative}</p>
      </div>
    ) : null}

        <div className="catalogRelationToolbar">
          <label className="catalogControlField">
            <span>Search this list</span>
            <input
              type="text"
              value={relationSearch}
              onChange={(event) => onRelationSearchChange(event.target.value)}
              placeholder={detail.type === "actor" ? "Search filmography" : "Search cast"}
              autoFocus
            />
          </label>
        </div>

        <div className="catalogDialogListHeader">
          <h3>{relationshipLabel}</h3>
          <span>{filteredEntities.length}</span>
        </div>

        {isLoading ? <div className="pageStatus">Loading connected entries…</div> : null}
        {errorMessage ? <div className="pageStatus pageStatus--error">{errorMessage}</div> : null}

        <div className="catalogDialogList">
          {!isLoading && !errorMessage && filteredEntities.length === 0 ? (
            <div className="catalogEmptyState">No connected entries matched the current search.</div>
          ) : null}
          {filteredEntities.map((entity) => (
            <button
              key={`${entity.type}-${entity.id}`}
              type="button"
              className="catalogDialogListItem"
              onClick={() => onOpenRelatedEntity(entity)}
            >
          <div className="catalogDialogListPrimary">
          <EntityArtwork
            type={entity.type}
            label={entity.label}
            imageUrl={entity.imageUrl}
            className="entityArtwork entityArtwork--row"
            imageClassName="entityArtwork__image"
            placeholderClassName="entityArtwork__emoji"
          />
          <div>
            <span>{entity.label}</span>
            <span className="catalogDialogListMeta">{entity.meta}</span>
          </div>
          </div>
          <div className="catalogDialogListSecondary">
          {entity.badges.slice(0, 3).map((badge) => <span key={badge} className="entityBadge">{badge}</span>)}
          </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function GameDataPage() {
  const { mode } = useDataSourceMode()
  const { snapshot, indexes, isLoading: isSnapshotLoading } = useSnapshotData()
  const [actors, setActors] = useState<Actor[]>([])
  const [movies, setMovies] = useState<Movie[]>([])
  const [activeSource, setActiveSource] = useState<EffectiveDataSource>("demo")
  const [catalogIndexes, setCatalogIndexes] = useState<SnapshotIndexes | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actorSearch, setActorSearch] = useState("")
  const [movieSearch, setMovieSearch] = useState("")
  const [actorSortMode, setActorSortMode] = useState<ActorSortMode>("name-asc")
  const [movieSortMode, setMovieSortMode] = useState<MovieSortMode>("title-asc")
  const [activeDetail, setActiveDetail] = useState<CatalogDetail>(null)
  const [relationSearch, setRelationSearch] = useState("")
  const [relatedEntities, setRelatedEntities] = useState<RelatedEntity[]>([])
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadCatalog = async () => {
      if (isOnlineSnapshotMode(mode) && !snapshot && isSnapshotLoading) {
        setIsLoading(true)
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
  }, [indexes, isSnapshotLoading, mode, snapshot])

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
        let nextRelations: RelatedEntity[]

        if ((activeSource === "snapshot" || activeSource === "demo") && catalogIndexes) {
          nextRelations = activeDetail.type === "actor"
            ? createActorRelations(activeDetail.item, catalogIndexes)
            : createMovieRelations(activeDetail.item, catalogIndexes)
        } else if (activeDetail.type === "actor") {
          const actorMovies = await fetchActorMovies(activeDetail.item.id)
          nextRelations = actorMovies.map((movie) => ({
            id: movie.id,
            type: "movie",
            label: movie.title,
			meta: movies.find((candidate) => candidate.id === movie.id) ? formatMovieMeta(movies.find((candidate) => candidate.id === movie.id) as Movie) : movie.releaseDate ?? "Release date unavailable",
			imageUrl: movies.find((candidate) => candidate.id === movie.id)?.posterUrl ?? null,
			badges: movies.find((candidate) => candidate.id === movie.id) ? getMovieBadges(movies.find((candidate) => candidate.id === movie.id) as Movie) : [],
          }))
        } else {
          const movieActors = await fetchMovieActors(activeDetail.item.id, [])
          nextRelations = movieActors.map((actor) => ({
            id: actor.id,
            type: "actor",
            label: actor.name,
            meta: formatActorMeta(actor),
			imageUrl: actors.find((candidate) => candidate.id === actor.id)?.profileUrl ?? null,
			badges: actors.find((candidate) => candidate.id === actor.id)?.knownForDepartment ? [actors.find((candidate) => candidate.id === actor.id)?.knownForDepartment as string] : [],
          }))
        }

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

  const handleOpenRelatedEntity = (entity: RelatedEntity) => {
    if (entity.type === "actor") {
      const actor = actors.find((candidate) => candidate.id === entity.id)
      if (actor) {
        setActiveDetail({ type: "actor", item: actor })
      }
      return
    }

    const movie = movies.find((candidate) => candidate.id === entity.id)
    if (movie) {
      setActiveDetail({ type: "movie", item: movie })
    }
  }

  return (
    <div className="utilityPage">
      <PageBackButton to="/" label="Back" />
      <div className="utilityPanel utilityPanel--wide">
        <div className="pageEyebrow">Game Data</div>
        <h1>Browse the game catalog</h1>
        <p className="pageLead">Select any actor or movie to inspect its details, browse connected entries, and preview the future add-to-list workflow.</p>

        {isLoading ? <div className="pageStatus">Loading game data…</div> : null}
        {loadError ? <div className="pageStatus pageStatus--error">{loadError}</div> : null}

        <div className="catalogGrid">
          <section className="catalogPanel">
            <div className="catalogPanelHeader">
              <h2>Actors</h2>
              <span>{filteredActors.length}</span>
            </div>
            <div className="catalogControls">
              <div className="catalogSearchRow">
                <label className="catalogControlField">
                  <span>Search or stage an add</span>
                  <input
                    type="text"
                    value={actorSearch}
                    onChange={(event) => setActorSearch(event.target.value)}
                    placeholder="Search actors by name or type a new one"
                    disabled={isLoading}
                  />
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
                  <button key={actor.id} type="button" className="catalogListItem catalogListItem--interactive" onClick={() => setActiveDetail({ type: "actor", item: actor })}>
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
              <span>{filteredMovies.length}</span>
            </div>
            <div className="catalogControls">
              <div className="catalogSearchRow">
                <label className="catalogControlField">
                  <span>Search or stage an add</span>
                  <input
                    type="text"
                    value={movieSearch}
                    onChange={(event) => setMovieSearch(event.target.value)}
                    placeholder="Search movies by title or type a new one"
                    disabled={isLoading}
                  />
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
                  <button key={movie.id} type="button" className="catalogListItem catalogListItem--interactive" onClick={() => setActiveDetail({ type: "movie", item: movie })}>
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

      <CatalogDetailDialog
        detail={activeDetail}
        relationSearch={relationSearch}
        relatedEntities={relatedEntities}
        isLoading={isDetailLoading}
        errorMessage={detailError}
        onClose={() => setActiveDetail(null)}
        onRelationSearchChange={setRelationSearch}
        onOpenRelatedEntity={handleOpenRelatedEntity}
      />
    </div>
  )
}

export default GameDataPage