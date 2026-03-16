import { fetchActorMovies, fetchMovieActors } from "../api/costars"
import type { EntityDetailsDialogData, EntityDetailsRelatedEntity } from "../components/EntityDetailsDialog"
import { sortByPopularityDescending, sortMoviesByReleaseDateDescending } from "./entityDetails"
import { formatActorInlineMeta, formatActorLifespan, formatMovieInlineMeta, getMovieBadges } from "./presentation"
import type { Actor, EffectiveDataSource, Movie, SnapshotIndexes } from "../types"

export type CatalogDetailEntry =
  | { type: "actor"; item: Actor }
  | { type: "movie"; item: Movie }

export function createActorRelations(actor: Actor, indexes: SnapshotIndexes): EntityDetailsRelatedEntity[] {
  const movieIds = indexes.actorToMovies[String(actor.id)] ?? []

  return sortMoviesByReleaseDateDescending(
    movieIds
      .map((movieId) => indexes.moviesById.get(movieId))
      .filter((movie): movie is Movie => !!movie),
    (movie) => movie.releaseDate,
    (movie) => movie.title,
  ).map((movie) => ({
    id: movie.id,
    type: "movie",
    label: movie.title,
    meta: formatMovieInlineMeta(movie),
    imageUrl: movie.posterUrl ?? null,
    badges: getMovieBadges(movie),
  }))
}

export function createMovieRelations(movie: Movie, indexes: SnapshotIndexes): EntityDetailsRelatedEntity[] {
  const actorIds = indexes.movieToActors[String(movie.id)] ?? []

  const actors = actorIds
    .map((actorId) => indexes.actorsById.get(actorId))
    .filter((actor): actor is Actor => !!actor)

  return sortByPopularityDescending(actors, (actor) => actor.popularity, (actor) => actor.name)
    .map((actor) => ({
      id: actor.id,
      type: "actor",
      label: actor.name,
      meta: formatActorInlineMeta(actor),
      imageUrl: actor.profileUrl ?? null,
      badges: actor.knownForDepartment ? [actor.knownForDepartment] : [],
      popularity: actor.popularity,
    }))
}

export function getActorDetailCards(actor: Actor, relatedCount: number) {
  return [
    { label: "Catalog id", value: String(actor.id) },
    { label: "Popularity", value: actor.popularity?.toFixed(1) ?? "--" },
    { label: "Department", value: actor.knownForDepartment ?? "Unknown" },
    { label: "Born", value: actor.birthday ?? "Unknown" },
    { label: "Lifespan", value: formatActorLifespan(actor) ?? "Unknown" },
    { label: "Connected entries", value: String(relatedCount) },
  ]
}

export function getMovieDetailCards(movie: Movie, relatedCount: number) {
  return [
    { label: "Catalog id", value: String(movie.id) },
    { label: "Release date", value: movie.releaseDate ?? "Unknown" },
    { label: "Rating", value: movie.contentRating ?? "Unknown" },
    { label: "Language", value: movie.originalLanguage?.toUpperCase() ?? "Unknown" },
    { label: "Genres", value: movie.genres && movie.genres.length > 0 ? movie.genres.join(", ") : "Unknown" },
    { label: "Connected entries", value: String(relatedCount) },
  ]
}

export function buildCatalogDetailDialogData(detail: CatalogDetailEntry, relatedCount: number): EntityDetailsDialogData {
  const isActor = detail.type === "actor"

  return {
    key: `${detail.type}-${detail.item.id}`,
    type: detail.type,
    title: isActor ? detail.item.name : detail.item.title,
    imageUrl: isActor ? detail.item.profileUrl ?? null : detail.item.posterUrl ?? null,
    lead: isActor ? formatActorInlineMeta(detail.item) : formatMovieInlineMeta(detail.item),
    subtle: isActor ? detail.item.placeOfBirth ?? null : null,
    badges: isActor
      ? detail.item.knownForDepartment
        ? [detail.item.knownForDepartment]
        : []
      : getMovieBadges(detail.item),
    cards: isActor
      ? getActorDetailCards(detail.item, relatedCount)
      : getMovieDetailCards(detail.item, relatedCount),
    narrativeTitle: isActor ? "Biography" : "Overview",
    narrative: isActor ? detail.item.biography ?? null : detail.item.overview ?? null,
    relationLabel: isActor ? "Movies in catalog" : "Actors in catalog",
    relationSearchPlaceholder: isActor ? "Search filmography" : "Search cast",
  }
}

export async function loadCatalogRelatedEntities({
  detail,
  activeSource,
  catalogIndexes,
  actors,
  movies,
}: {
  detail: CatalogDetailEntry
  activeSource: EffectiveDataSource
  catalogIndexes: SnapshotIndexes | null
  actors: Actor[]
  movies: Movie[]
}) {
  if ((activeSource === "snapshot" || activeSource === "demo") && catalogIndexes) {
    return detail.type === "actor"
      ? createActorRelations(detail.item, catalogIndexes)
      : createMovieRelations(detail.item, catalogIndexes)
  }

  if (detail.type === "actor") {
    const actorMovies = await fetchActorMovies(detail.item.id)

    return actorMovies.map((movie) => ({
      id: movie.id,
      type: "movie" as const,
      label: movie.title,
      meta: movies.find((candidate) => candidate.id === movie.id)
        ? formatMovieInlineMeta(movies.find((candidate) => candidate.id === movie.id) as Movie)
        : movie.releaseDate ?? "Release date unavailable",
      imageUrl: movies.find((candidate) => candidate.id === movie.id)?.posterUrl ?? movie.posterUrl ?? null,
      badges: movies.find((candidate) => candidate.id === movie.id)
        ? getMovieBadges(movies.find((candidate) => candidate.id === movie.id) as Movie)
        : getMovieBadges(movie),
    }))
  }

  const movieActors = await fetchMovieActors(detail.item.id, [])
  return sortByPopularityDescending(movieActors, (actor) => actor.popularity, (actor) => actor.name).map((actor) => ({
    id: actor.id,
    type: "actor" as const,
    label: actor.name,
    meta: formatActorInlineMeta(actor),
    imageUrl: actors.find((candidate) => candidate.id === actor.id)?.profileUrl ?? actor.profileUrl ?? null,
    badges: actors.find((candidate) => candidate.id === actor.id)?.knownForDepartment
      ? [actors.find((candidate) => candidate.id === actor.id)?.knownForDepartment as string]
      : actor.knownForDepartment
      ? [actor.knownForDepartment]
      : [],
    popularity: actor.popularity,
  }))
}
