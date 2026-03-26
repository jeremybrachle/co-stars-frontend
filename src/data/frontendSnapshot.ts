import type {
	Actor,
	FrontendManifest,
	FrontendSnapshot,
	Level,
	Movie,
	SnapshotBundle,
} from "../types";
import { buildSnapshotIndexes } from "./snapshotIndexes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const REMOTE_MANIFEST_URL = import.meta.env.VITE_SNAPSHOT_MANIFEST_URL ?? "";
const API_MANIFEST_PATH = "/api/export/frontend-manifest";

const SNAPSHOT_KEY = "co-stars-frontend-snapshot";
const MANIFEST_KEY = "co-stars-frontend-manifest";

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

function estimateStringStorageBytes(value: string) {
	if (typeof TextEncoder !== "undefined") {
		return new TextEncoder().encode(value).length;
	}

	return value.length * 2;
}

export function getCachedSnapshotBundle() {
	return readCachedSnapshotBundle();
}

export async function fetchSnapshotFromS3(): Promise<SnapshotBundle> {
	if (!isHostedSnapshotConfigured()) {
		throw new Error("Hosted snapshot manifest URL is not configured.");
	}

	const manifest = mapManifest(await fetchRemoteJson<ApiFrontendManifest>(REMOTE_MANIFEST_URL));
	const snapshot = mapSnapshot(
		await fetchRemoteJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint, REMOTE_MANIFEST_URL),
	);
	writeCachedSnapshotBundle(manifest, snapshot);

	return {
		manifest,
		snapshot,
		indexes: buildSnapshotIndexes(snapshot),
		loadedFrom: "s3-snapshot",
	};
}

export async function fetchSnapshotFromApi(): Promise<SnapshotBundle> {
	const manifest = mapManifest(await fetchApiJson<ApiFrontendManifest>(API_MANIFEST_PATH));
	const snapshot = mapSnapshot(
		manifest.snapshotEndpoint.startsWith("http://") || manifest.snapshotEndpoint.startsWith("https://")
			? await fetchJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint)
			: await fetchApiJson<ApiFrontendSnapshot>(manifest.snapshotEndpoint),
	);
	writeCachedSnapshotBundle(manifest, snapshot);

	return {
		manifest,
		snapshot,
		indexes: buildSnapshotIndexes(snapshot),
		loadedFrom: "api-snapshot",
	};
}

export function getSnapshotStorageKeys() {
	return {
		manifest: MANIFEST_KEY,
		snapshot: SNAPSHOT_KEY,
	};
}

export function getCachedSnapshotStorageStats() {
	const manifestRaw = localStorage.getItem(MANIFEST_KEY);
	const snapshotRaw = localStorage.getItem(SNAPSHOT_KEY);
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

export function getRecommendedRefreshMs(manifest: FrontendManifest | null) {
	const hours = manifest?.recommendedRefreshIntervalHours ?? 168;
	return hours * 60 * 60 * 1000;
}

export function clearCachedSnapshot() {
	localStorage.removeItem(MANIFEST_KEY);
	localStorage.removeItem(SNAPSHOT_KEY);
}