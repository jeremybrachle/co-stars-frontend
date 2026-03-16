export function compareNullableNumberDescending(left: number | null | undefined, right: number | null | undefined) {
  const normalizedLeft = left ?? null
  const normalizedRight = right ?? null

  if (normalizedLeft === null && normalizedRight === null) {
    return 0
  }

  if (normalizedLeft === null) {
    return 1
  }

  if (normalizedRight === null) {
    return -1
  }

  return normalizedRight - normalizedLeft
}

export function compareNullableDateDescending(left: string | null | undefined, right: string | null | undefined) {
  const normalizedLeft = left ?? null
  const normalizedRight = right ?? null

  if (normalizedLeft === null && normalizedRight === null) {
    return 0
  }

  if (normalizedLeft === null) {
    return 1
  }

  if (normalizedRight === null) {
    return -1
  }

  return normalizedRight.localeCompare(normalizedLeft)
}

export function sortByPopularityDescending<T>(
  entries: T[],
  getPopularity: (entry: T) => number | null | undefined,
  getLabel: (entry: T) => string,
) {
  return [...entries].sort((left, right) => {
    const popularityDelta = compareNullableNumberDescending(getPopularity(left), getPopularity(right))

    if (popularityDelta !== 0) {
      return popularityDelta
    }

    return getLabel(left).localeCompare(getLabel(right))
  })
}

export function sortMoviesByReleaseDateDescending<T>(
  entries: T[],
  getReleaseDate: (entry: T) => string | null | undefined,
  getLabel: (entry: T) => string,
) {
  return [...entries].sort((left, right) => {
    const releaseDateDelta = compareNullableDateDescending(getReleaseDate(left), getReleaseDate(right))

    if (releaseDateDelta !== 0) {
      return releaseDateDelta
    }

    return getLabel(left).localeCompare(getLabel(right))
  })
}

export function buildNextDetailTrail<T>(
  currentTrail: T[],
  nextEntry: T,
  isSameEntry: (left: T, right: T) => boolean,
) {
  const existingIndex = currentTrail.findIndex((entry) => isSameEntry(entry, nextEntry))

  if (existingIndex >= 0) {
    return currentTrail.slice(0, existingIndex + 1)
  }

  return [...currentTrail, nextEntry]
}
