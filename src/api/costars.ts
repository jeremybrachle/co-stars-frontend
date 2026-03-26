import type {
	Actor,
	ActorSuggestion,
	GeneratedPath,
	Level,
	Movie,
	MovieSuggestion,
	NodeSummary,
	NodeType,
	PathEndpoint,
	PathHint,
	ValidatePathResponse,
} from "../types";
import { sortMoviesByReleaseDateDescending } from "../data/entityDetails";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type ApiConnectionStatus = "idle" | "attempting" | "available" | "unavailable";

export type ApiConnectionState = {
	status: ApiConnectionStatus;
	lastError: string | null;
	lastAttemptAt: string | null;
};

let apiConnectionState: ApiConnectionState = {
	status: "idle",
	lastError: null,
	lastAttemptAt: null,
};

const apiConnectionListeners = new Set<() => void>();

function emitApiConnectionState() {
	for (const listener of apiConnectionListeners) {
		listener();
	}
}

function setApiConnectionState(nextState: ApiConnectionState) {
	apiConnectionState = nextState;
	emitApiConnectionState();
}

function markApiAttemptStarted() {
	setApiConnectionState({
		status: "attempting",
		lastError: null,
		lastAttemptAt: new Date().toISOString(),
	});
}

function markApiAttemptSucceeded() {
	setApiConnectionState({
		status: "available",
		lastError: null,
		lastAttemptAt: new Date().toISOString(),
	});
}

function markApiAttemptFailed(message: string) {
	setApiConnectionState({
		status: "unavailable",
		lastError: message,
		lastAttemptAt: new Date().toISOString(),
	});
}

export function getApiConnectionState() {
	return apiConnectionState;
}

export function subscribeToApiConnectionState(listener: () => void) {
	apiConnectionListeners.add(listener);
	return () => {
		apiConnectionListeners.delete(listener);
	};
}

type ApiNodeSummary = {
	id: number;
	type: NodeType;
	label: string;
};

type ApiPathHint = {
	reachable: boolean;
	steps_to_target: number | null;
	path: ApiNodeSummary[];
};

type ApiLevel = {
	actor_a: string;
	actor_b: string;
	stars: number;
};

type ApiActor = {
	id: number;
	name: string;
	popularity: number | null;
	birthday?: string | null;
	deathday?: string | null;
	place_of_birth?: string | null;
	biography?: string | null;
	profile_path?: string | null;
	profile_url?: string | null;
	known_for_department?: string | null;
	path_hint?: ApiPathHint;
	popularity_rank?: number | null;
};

type ApiMovie = {
	id: number;
	title: string;
	release_date: string | null;
	genres?: string[];
	overview?: string | null;
	poster_path?: string | null;
	poster_url?: string | null;
	original_language?: string | null;
	content_rating?: string | null;
	path_hint?: ApiPathHint;
};

type ApiGeneratedPath = {
	path: string;
	nodes: ApiNodeSummary[];
	steps: number;
	reason: string | null;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	let response: Response;
	markApiAttemptStarted();

	try {
		response = await fetch(`${API_BASE_URL}${path}`, init);
	} catch {
		const message = `Network connection couldn't be established for ${path}`;
		markApiAttemptFailed(message);
		throw new Error(message);
	}

	if (!response.ok) {
		const message = `API request failed (${response.status}) for ${path}`;
		markApiAttemptFailed(message);
		throw new Error(message);
	}

	markApiAttemptSucceeded();

	return response.json() as Promise<T>;
}

function mapNodeSummary(node: ApiNodeSummary): NodeSummary {
	return {
		id: node.id,
		type: node.type,
		label: node.label,
	};
}

function mapPathHint(pathHint?: ApiPathHint): PathHint | undefined {
	if (!pathHint) {
		return undefined;
	}

	return {
		reachable: pathHint.reachable,
		stepsToTarget: pathHint.steps_to_target,
		path: pathHint.path.map(mapNodeSummary),
	};
}

function mapActor(actor: ApiActor): Actor {
	return {
		id: actor.id,
		name: actor.name,
		popularity: actor.popularity,
		birthday: actor.birthday ?? null,
		deathday: actor.deathday ?? null,
		placeOfBirth: actor.place_of_birth ?? null,
		biography: actor.biography ?? null,
		profilePath: actor.profile_path ?? null,
		profileUrl: actor.profile_url ?? null,
		knownForDepartment: actor.known_for_department ?? null,
	};
}

function mapMovie(movie: ApiMovie): Movie {
	return {
		id: movie.id,
		title: movie.title,
		releaseDate: movie.release_date,
		genres: movie.genres ?? [],
		overview: movie.overview ?? null,
		posterPath: movie.poster_path ?? null,
		posterUrl: movie.poster_url ?? null,
		originalLanguage: movie.original_language ?? null,
		contentRating: movie.content_rating ?? null,
	};
}

export function getApiBaseUrl() {
	return API_BASE_URL || "/api via Vite dev proxy";
}

export async function fetchLevels(): Promise<Level[]> {
	const levels = await fetchJson<ApiLevel[]>("/api/levels");

	return levels.map((level) => ({
		actorA: level.actor_a,
		actorB: level.actor_b,
		stars: level.stars,
	}));
}

export async function fetchActors(): Promise<Actor[]> {
	const actors = await fetchJson<ApiActor[]>("/api/actors");
	return actors.map(mapActor);
}

export async function fetchMovies(): Promise<Movie[]> {
	const movies = await fetchJson<ApiMovie[]>("/api/movies");
	return sortMoviesByReleaseDateDescending(movies.map(mapMovie), (movie) => movie.releaseDate, (movie) => movie.title);
}

export async function fetchActorByName(name: string): Promise<Actor> {
	const actor = await fetchJson<ApiActor>(`/api/actor/${encodeURIComponent(name)}`);
	return mapActor(actor);
}

export async function fetchActorMovies(
	actorId: number,
	targetType?: NodeType,
	targetId?: number,
): Promise<MovieSuggestion[]> {
	const params = new URLSearchParams();

	if (targetType && targetId !== undefined) {
		params.set("target_type", targetType);
		params.set("target_id", String(targetId));
	}

	const suffix = params.toString() ? `?${params.toString()}` : "";
	const movies = await fetchJson<ApiMovie[]>(`/api/actor/${actorId}/movies${suffix}`);

	return sortMoviesByReleaseDateDescending(
		movies.map((movie) => ({
			...mapMovie(movie),
			pathHint: mapPathHint(movie.path_hint),
		})),
		(movie) => movie.releaseDate,
		(movie) => movie.title,
	);
}

export async function fetchMovieActors(
	movieId: number,
	excludedNames: string[],
	targetType?: NodeType,
	targetId?: number,
): Promise<ActorSuggestion[]> {
	const params = new URLSearchParams();

	for (const name of excludedNames) {
		params.append("exclude", name);
	}

	if (targetType && targetId !== undefined) {
		params.set("target_type", targetType);
		params.set("target_id", String(targetId));
	}

	const suffix = params.toString() ? `?${params.toString()}` : "";
	const actors = await fetchJson<ApiActor[]>(`/api/movie/${movieId}/costars${suffix}`);

	return actors.map((actor) => ({
		...mapActor(actor),
		pathHint: mapPathHint(actor.path_hint),
		popularityRank: actor.popularity_rank ?? null,
	}));
}

export async function generatePath(a: PathEndpoint, b: PathEndpoint): Promise<GeneratedPath> {
	const generated = await fetchJson<ApiGeneratedPath>("/api/path/generate", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ a, b }),
	});

	return {
		path: generated.path,
		nodes: generated.nodes.map(mapNodeSummary),
		steps: generated.steps,
		reason: generated.reason,
	};
}

export async function validatePath(path: string[]): Promise<ValidatePathResponse> {
	return fetchJson<ValidatePathResponse>("/api/path/validate", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ path }),
	});
}