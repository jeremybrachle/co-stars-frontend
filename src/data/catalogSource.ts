import { fetchActors, fetchMovies, getApiBaseUrl } from "../api/costars"
import { getDemoSnapshotBundle, getDemoSourceLabel } from "./demoSnapshot"
import { isOfflineDemoMode, isOfflineSnapshotMode, isOnlineApiMode, isOnlineSnapshotMode } from "./dataSourcePreferences"
import type { Actor, DataSourceMode, EffectiveDataSource, FrontendSnapshot, Movie, SnapshotIndexes } from "../types"

export type CatalogSource = {
  actors: Actor[]
  movies: Movie[]
  indexes: SnapshotIndexes | null
  source: EffectiveDataSource
  statusMessage: string | null
}

type CatalogSourceOptions = {
  mode: DataSourceMode
  snapshot: FrontendSnapshot | null
  indexes: SnapshotIndexes | null
}

const DEMO_BUNDLE = getDemoSnapshotBundle()

function fromSnapshot(snapshot: FrontendSnapshot, indexes: SnapshotIndexes, statusMessage: string | null): CatalogSource {
  return {
    actors: snapshot.actors,
    movies: snapshot.movies,
    indexes,
    source: "snapshot",
    statusMessage,
  }
}

function fromDemo(statusMessage: string): CatalogSource {
  return {
    actors: DEMO_BUNDLE.snapshot.actors,
    movies: DEMO_BUNDLE.snapshot.movies,
    indexes: DEMO_BUNDLE.indexes,
    source: "demo",
    statusMessage,
  }
}

export async function resolveCatalogSource({ mode, snapshot, indexes }: CatalogSourceOptions): Promise<CatalogSource> {
  if (isOfflineDemoMode(mode)) {
    return fromDemo(`Offline demo mode is active using ${getDemoSourceLabel()}.`)
  }

  if ((isOfflineSnapshotMode(mode) || isOnlineSnapshotMode(mode)) && snapshot && indexes) {
    return fromSnapshot(snapshot, indexes, null)
  }

  if (isOfflineSnapshotMode(mode) || isOnlineSnapshotMode(mode)) {
    return fromDemo(`No cached snapshot was available, so this page switched to offline demo mode using ${getDemoSourceLabel()}.`)
  }

  try {
    const [actors, movies] = await Promise.all([fetchActors(), fetchMovies()])

    return {
      actors,
      movies,
      indexes: null,
      source: "api",
      statusMessage: snapshot && indexes && isOnlineApiMode(mode)
        ? `Live API data from ${getApiBaseUrl()} is active for this page.`
        : snapshot && indexes
          ? `Snapshot data was unavailable for this mode, so this page switched to live API data from ${getApiBaseUrl()}.`
          : `Using live API data from ${getApiBaseUrl()}.`,
    }
  } catch {
    if (snapshot && indexes) {
      return fromSnapshot(snapshot, indexes, "Live API data was unavailable, so this page switched to the currently loaded snapshot data.")
    }

    return fromDemo(`No API connection or cached snapshot was available, so this page switched to offline demo mode using ${getDemoSourceLabel()}.`)
  }
}