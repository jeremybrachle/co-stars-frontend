import type {
	Actor,
	FrontendManifest,
	FrontendSnapshot,
	Level,
	Movie,
	SnapshotBundle,
	SnapshotUpdateCheck,
	StoredSnapshotSource,
} from "../types";
import { buildSnapshotIndexes } from "./snapshotIndexes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const REMOTE_MANIFEST_URL = import.meta.env.VITE_SNAPSHOT_MANIFEST_URL ?? "";
const API_MANIFEST_PATH = "/api/export/frontend-manifest";
const INSTALLED_MANIFEST_PATH = "/data/installed/frontend-manifest.json";
const INSTALLED_SNAPSHOT_PATH = "/data/installed/frontend-snapshot.json";

const SNAPSHOT_STORAGE_KEYS: Record<StoredSnapshotSource, { manifest: string; snapshot: string }> = {
	api: {
		manifest: "co-stars-frontend-api-manifest",
		snapshot: "co-stars-frontend-api-snapshot",
	},
	s3: {
		manifest: "co-stars-frontend-s3-manifest",
		snapshot: "co-stars-frontend-s3-snapshot",
	},
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
	actors: Array<{
		id: number;
		name: string;
		popularity: number | null;
		birthday: string | null;
		deathday: string | null;
		place_of_birth: string | null;
		biography: string | null;
		profile_path: string | null;
		profile_url: string | null;
		known_for_department: string | null;
	}>;
	movies: Array<{
		id: number;
		title: string;
		release_date: string | null;
		genres: string[];
		overview: string | null;
		poster_path: string | null;
		poster_url: string | null;
		original_language: string | null;
		content_rating: string | null;
	}>;
	movie_actors: Array<{ movie_id: number; actor_id: number }>;
	adjacency: {
		actor_to_movies: Record<string, number[]>;
		movie_to_actors: Record<string, number[]>;
	};
	levels: Array<{ actor_a: string; actor_b: string; stars: number }>;
};

function isHostedSnapshotConfigured() {
	return REMOTE_MANIFEST_URL.trim().length > 0;
}

function getRuntimeOrigin() {
	if (typeof window !== "undefined") {
		return window.location.origin;
	}

	return "http://localhost";
}

function resolveRemoteUrl(pathOrUrl: string, baseUrl?: string) {
	return new URL(pathOrUrl, baseUrl ?? getRuntimeOrigin()).toString();
}

async function fetchJson<T>(url: string): Promise<T> {
	let response: Response;

	try {
		response = await fetch(url);
	} catch {
		throw new Error(`Network connection couldn't be established for ${url}`);
	}

	if (!response.ok) {
		throw new Error(`Snapshot request failed (${response.status}) for ${url}`);
	}

	return response.json() as Promise<T>;
}

async function fetchRemoteJson<T>(pathOrUrl: string, baseUrl?: string) {
	return fetchJson<T>(resolveRemoteUrl(pathOrUrl, baseUrl));
}

async function fetchApiJson<T>(path: string) {
	return fetchJson<T>(`${API_BASE_URL}${path}`);
}

function mapActor(actor: ApiFrontendSnapshot["actors"][number]): Actor {
	return {
		id: actor.id,
		name: actor.name,
		popularity: actor.popularity,
		birthday: actor.birthday,
		deathday: actor.deathday,
		placeOfBirth: actor.place_of_birth,
		biography: actor.biography,
		profilePath: actor.profile_path,
		profileUrl: actor.profile_url,
		knownForDepartment: actor.known_for_department,
	};
}

function mapMovie(movie: ApiFrontendSnapshot["movies"][number]): Movie {
	return {
		id: movie.id,
		title: movie.title,
		releaseDate: movie.release_date,
		genres: movie.genres,
		overview: movie.overview,
		posterPath: movie.poster_path,
		posterUrl: movie.poster_url,
		originalLanguage: movie.original_language,
		contentRating: movie.content_rating,
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

function getStorageKeys(source: StoredSnapshotSource) {
	return SNAPSHOT_STORAGE_KEYS[source];
}

function readCachedSnapshotBundle(source: StoredSnapshotSource): SnapshotBundle | null {
	if (typeof window === "undefined") {
		return null;
	}

	const storageKeys = getStorageKeys(source);
	const cachedManifestRaw = localStorage.getItem(storageKeys.manifest);
	const cachedSnapshotRaw = localStorage.getItem(storageKeys.snapshot);

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
			loadedFrom: source === "s3" ? "s3-snapshot" : "api-snapshot",
		};
	} catch {
		localStorage.removeItem(storageKeys.manifest);
		localStorage.removeItem(storageKeys.snapshot);
		return null;
	}
}

function writeCachedSnapshotBundle(source: StoredSnapshotSource, manifest: FrontendManifest, snapshot: FrontendSnapshot) {
	if (typeof window === "undefined") {
		return;
	}

	const storageKeys = getStorageKeys(source);
	localStorage.setItem(storageKeys.manifest, JSON.stringify(manifest));
	localStorage.setItem(storageKeys.snapshot, JSON.stringify(snapshot));
}

function estimateStringStorageBytes(value: string) {
	if (typeof TextEncoder !== "undefined") {
		return new TextEncoder().encode(value).length;
	}

	return value.length * 2;
}

function createSnapshotBundle(
	manifest: FrontendManifest,
	snapshot: FrontendSnapshot,
	loadedFrom: SnapshotBundle["loadedFrom"],
): SnapshotBundle {
	return {
		manifest,
		snapshot,
		indexes: buildSnapshotIndexes(snapshot),
		loadedFrom,
	};
}

export function getCachedSnapshotBundle(source: StoredSnapshotSource) {
	return readCachedSnapshotBundle(source);
}

export async function fetchInstalledSnapshot(): Promise<SnapshotBundle> {
	const manifestUrl = resolveRemoteUrl(INSTALLED_MANIFEST_PATH);
	const manifest = mapManifest(await fetchJson<ApiFrontendManifest>(manifestUrl));
	const snapshot = mapSnapshot(
		await fetchRemoteJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint || INSTALLED_SNAPSHOT_PATH, manifestUrl),
	);

	return createSnapshotBundle(manifest, snapshot, "installed-snapshot");
}

export async function fetchSnapshotFromS3(): Promise<SnapshotBundle> {
	if (!isHostedSnapshotConfigured()) {
		throw new Error("Hosted snapshot manifest URL is not configured.");
	}

	const manifest = mapManifest(await fetchRemoteJson<ApiFrontendManifest>(REMOTE_MANIFEST_URL));
	const snapshot = mapSnapshot(
		await fetchRemoteJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint, REMOTE_MANIFEST_URL),
	);
	writeCachedSnapshotBundle("s3", manifest, snapshot);

	return createSnapshotBundle(manifest, snapshot, "s3-snapshot");
}

export async function fetchSnapshotFromApi(): Promise<SnapshotBundle> {
	const manifest = mapManifest(await fetchApiJson<ApiFrontendManifest>(API_MANIFEST_PATH));
	const snapshot = mapSnapshot(
		manifest.snapshotEndpoint.startsWith("http://") || manifest.snapshotEndpoint.startsWith("https://")
			? await fetchJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint)
			: await fetchApiJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint),
	);
	writeCachedSnapshotBundle("api", manifest, snapshot);

	return createSnapshotBundle(manifest, snapshot, "api-snapshot");
}

export async function checkForS3SnapshotUpdate(currentVersion: string | null): Promise<SnapshotUpdateCheck> {
	if (!isHostedSnapshotConfigured()) {
		throw new Error("Hosted snapshot manifest URL is not configured.");
	}

	const remoteManifest = mapManifest(await fetchRemoteJson<ApiFrontendManifest>(REMOTE_MANIFEST_URL));
	const checkedAt = new Date().toISOString();

	if (currentVersion && remoteManifest.version === currentVersion) {
		return {
			status: "up-to-date",
			message: `Hosted S3 already matches version ${remoteManifest.version}.`,
			checkedAt,
			remoteManifest,
		};
	}

	return {
		status: "update-available",
		message: `Hosted S3 has version ${remoteManifest.version} ready to download.`,
		checkedAt,
		remoteManifest,
	};
}

export function createIdleSnapshotUpdateCheck(): SnapshotUpdateCheck {
	return {
		status: "idle",
		message: null,
		checkedAt: null,
		remoteManifest: null,
	};
}

export function getCachedSnapshotStorageStats(source: StoredSnapshotSource) {
	if (typeof window === "undefined") {
		return {
			manifestBytes: 0,
			snapshotBytes: 0,
			totalBytes: 0,
		};
	}

	const storageKeys = getStorageKeys(source);
	const manifestRaw = localStorage.getItem(storageKeys.manifest);
	const snapshotRaw = localStorage.getItem(storageKeys.snapshot);
	const manifestBytes = manifestRaw ? estimateStringStorageBytes(manifestRaw) : 0;
	const snapshotBytes = snapshotRaw ? estimateStringStorageBytes(snapshotRaw) : 0;

	return {
		manifestBytes,
		snapshotBytes,
		totalBytes: manifestBytes + snapshotBytes,
	};
}

export function getHostedSnapshotManifestUrl() {
	return isHostedSnapshotConfigured() ? REMOTE_MANIFEST_URL : null;
}

export function getApiSnapshotManifestUrl() {
	return `${API_BASE_URL}${API_MANIFEST_PATH}`;
}

export function clearCachedSnapshot(source: StoredSnapshotSource) {
	if (typeof window === "undefined") {
		return;
	}

	const storageKeys = getStorageKeys(source);
	localStorage.removeItem(storageKeys.manifest);
	localStorage.removeItem(storageKeys.snapshot);
}