type ActorLike = {
  popularity?: number | null
}

type MovieLike = {
  releaseDate?: string | null
}

export type FilterCountSummary = {
  remaining: number
  total: number
}

function getReleaseYear(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value.slice(0, 4), 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function getActorFilterCountSummary(actors: Iterable<ActorLike>, cutoff: number | null): FilterCountSummary {
  const entries = Array.from(actors)

  return {
    remaining: cutoff === null
      ? entries.length
      : entries.filter((actor) => (actor.popularity ?? Number.NEGATIVE_INFINITY) >= cutoff).length,
    total: entries.length,
  }
}

export function getMovieFilterCountSummary(movies: Iterable<MovieLike>, cutoff: number | null): FilterCountSummary {
  const entries = Array.from(movies)

  return {
    remaining: cutoff === null
      ? entries.length
      : entries.filter((movie) => {
        const releaseYear = getReleaseYear(movie.releaseDate ?? null)
        return releaseYear !== null && releaseYear >= cutoff
      }).length,
    total: entries.length,
  }
}