import type {
	Actor,
	FrontendManifest,
	FrontendSnapshot,
	HealthCheckResponse,
	Level,
	Movie,
	SnapshotBundle,
} from "../types";
import { buildSnapshotIndexes } from "./snapshotIndexes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const HEALTH_PATH = "/api/health";
const MANIFEST_PATH = "/api/export/frontend-manifest";
const BUNDLED_MANIFEST_PATH = "/data/frontend-manifest.json";
const BUNDLED_SNAPSHOT_PATH = "/data/frontend-snapshot.json";

const SNAPSHOT_KEY = "co-stars-frontend-snapshot";
const MANIFEST_KEY = "co-stars-frontend-manifest";

type ApiHealthCheckResponse = {
	status: string;
	version: string;
};

type ApiFrontendManifest = {
	version: string;
	source_updated_at: string;
	actor_count: number;
	movie_count: number;
	relationship_count: number;
	level_count: number;
	recommended_refresh_interval_hours: number;
	snapshot_endpoint: string;
};

type ApiFrontendSnapshot = {
	meta: {
		version: string;
		exported_at: string;
		actor_count: number;
		movie_count: number;
		relationship_count: number;
		level_count: number;
	};
	actors: Array<{ id: number; name: string; popularity: number | null }>;
	movies: Array<{ id: number; title: string; release_date: string | null }>;
	movie_actors: Array<{ movie_id: number; actor_id: number }>;
	adjacency: {
		actor_to_movies: Record<string, number[]>;
		movie_to_actors: Record<string, number[]>;
	};
	levels: Array<{ actor_a: string; actor_b: string; stars: number }>;
};

async function fetchJson<T>(path: string): Promise<T> {
	let response: Response;

	try {
		response = await fetch(`${API_BASE_URL}${path}`);
	} catch {
		throw new Error(`Network connection couldn't be established for ${path}`);
	}

	if (!response.ok) {
		throw new Error(`Snapshot request failed (${response.status}) for ${path}`);
	}

	return response.json() as Promise<T>;
}

function mapActor(actor: ApiFrontendSnapshot["actors"][number]): Actor {
	return {
		id: actor.id,
		name: actor.name,
		popularity: actor.popularity,
	};
}

function mapMovie(movie: ApiFrontendSnapshot["movies"][number]): Movie {
	return {
		id: movie.id,
		title: movie.title,
		releaseDate: movie.release_date,
	};
}

function mapLevel(level: ApiFrontendSnapshot["levels"][number]): Level {
	return {
		actorA: level.actor_a,
		actorB: level.actor_b,
		stars: level.stars,
	};
}

function mapManifest(manifest: ApiFrontendManifest): FrontendManifest {
	return {
		version: manifest.version,
		sourceUpdatedAt: manifest.source_updated_at,
		actorCount: manifest.actor_count,
		movieCount: manifest.movie_count,
		relationshipCount: manifest.relationship_count,
		levelCount: manifest.level_count,
		recommendedRefreshIntervalHours: manifest.recommended_refresh_interval_hours,
		snapshotEndpoint: manifest.snapshot_endpoint,
	};
}

function mapSnapshot(snapshot: ApiFrontendSnapshot): FrontendSnapshot {
	return {
		meta: {
			version: snapshot.meta.version,
			exportedAt: snapshot.meta.exported_at,
			actorCount: snapshot.meta.actor_count,
			movieCount: snapshot.meta.movie_count,
			relationshipCount: snapshot.meta.relationship_count,
			levelCount: snapshot.meta.level_count,
		},
		actors: snapshot.actors.map(mapActor),
		movies: snapshot.movies.map(mapMovie),
		movieActors: snapshot.movie_actors.map((link) => ({
			movieId: link.movie_id,
			actorId: link.actor_id,
		})),
		adjacency: {
			actorToMovies: snapshot.adjacency.actor_to_movies,
			movieToActors: snapshot.adjacency.movie_to_actors,
		},
		levels: snapshot.levels.map(mapLevel),
	};
}

function readCachedSnapshotBundle(): SnapshotBundle | null {
	const cachedManifestRaw = localStorage.getItem(MANIFEST_KEY);
	const cachedSnapshotRaw = localStorage.getItem(SNAPSHOT_KEY);

	if (!cachedManifestRaw || !cachedSnapshotRaw) {
		return null;
	}

	try {
		const manifest = JSON.parse(cachedManifestRaw) as FrontendManifest;
		const snapshot = JSON.parse(cachedSnapshotRaw) as FrontendSnapshot;

		return {
			manifest,
			snapshot,
			indexes: buildSnapshotIndexes(snapshot),
			loadedFrom: "cache",
		};
	} catch {
		localStorage.removeItem(MANIFEST_KEY);
		localStorage.removeItem(SNAPSHOT_KEY);
		return null;
	}
}

function writeCachedSnapshotBundle(manifest: FrontendManifest, snapshot: FrontendSnapshot) {
	localStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
	localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}

async function loadBundledSnapshotBundle(): Promise<SnapshotBundle> {
	const [manifestResponse, snapshotResponse] = await Promise.all([
		fetch(BUNDLED_MANIFEST_PATH),
		fetch(BUNDLED_SNAPSHOT_PATH),
	]);

	if (!manifestResponse.ok || !snapshotResponse.ok) {
		throw new Error("Bundled snapshot files are not available.");
	}

	const manifest = mapManifest((await manifestResponse.json()) as ApiFrontendManifest);
	const snapshot = mapSnapshot((await snapshotResponse.json()) as ApiFrontendSnapshot);
	writeCachedSnapshotBundle(manifest, snapshot);

	return {
		manifest,
		snapshot,
		indexes: buildSnapshotIndexes(snapshot),
		loadedFrom: "bundled",
	};
}

function shouldReuseCachedSnapshot(cachedManifest: FrontendManifest, nextManifest: FrontendManifest) {
	return (
		cachedManifest.version === nextManifest.version
		&& cachedManifest.sourceUpdatedAt === nextManifest.sourceUpdatedAt
	);
}

function isCacheWithinRecommendedRefreshWindow(cached: SnapshotBundle) {
	const exportedAtMs = new Date(cached.snapshot.meta.exportedAt).getTime();

	if (Number.isNaN(exportedAtMs)) {
		return false;
	}

	return Date.now() - exportedAtMs < getRecommendedRefreshMs(cached.manifest);
}

export function getCachedSnapshotBundle() {
	return readCachedSnapshotBundle();
}

export async function fetchBackendHealth() {
	const health = await fetchJson<ApiHealthCheckResponse>(HEALTH_PATH);
	return {
		status: health.status,
		version: health.version,
	} satisfies HealthCheckResponse;
}

export async function loadFrontendSnapshot(options?: { forceRefresh?: boolean }): Promise<SnapshotBundle> {
	const cached = readCachedSnapshotBundle();

	if (!options?.forceRefresh && cached && isCacheWithinRecommendedRefreshWindow(cached)) {
		return cached;
	}

	try {
		const [health, manifestResponse] = await Promise.all([
			fetchBackendHealth(),
			fetchJson<ApiFrontendManifest>(MANIFEST_PATH),
		]);
		const manifest = mapManifest(manifestResponse);

		if (!options?.forceRefresh && cached && shouldReuseCachedSnapshot(cached.manifest, manifest)) {
			return {
				...cached,
				manifest,
				health,
				loadedFrom: "cache",
			};
		}

		const snapshotResponse = await fetchJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint);
		const snapshot = mapSnapshot(snapshotResponse);
		writeCachedSnapshotBundle(manifest, snapshot);

		return {
			manifest,
			snapshot,
			indexes: buildSnapshotIndexes(snapshot),
			health,
			loadedFrom: "network",
		};
	} catch (error) {
		try {
			return await loadBundledSnapshotBundle();
		} catch {
			// Ignore bundled load failure and continue to cache fallback.
		}

		if (cached) {
			return {
				...cached,
				loadedFrom: "cache-fallback",
			};
		}

		throw error;
	}
}

export function getSnapshotStorageKeys() {
	return {
		manifest: MANIFEST_KEY,
		snapshot: SNAPSHOT_KEY,
	};
}

export function getSnapshotBaseUrl() {
	return API_BASE_URL || "/api via Vite dev proxy";
}

export function getRecommendedRefreshMs(manifest: FrontendManifest | null) {
	const hours = manifest?.recommendedRefreshIntervalHours ?? 168;
	return hours * 60 * 60 * 1000;
}

export function clearCachedSnapshot() {
	localStorage.removeItem(MANIFEST_KEY);
	localStorage.removeItem(SNAPSHOT_KEY);
}