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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

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
	path_hint?: ApiPathHint;
	popularity_rank?: number | null;
};

type ApiMovie = {
	id: number;
	title: string;
	release_date: string | null;
	path_hint?: ApiPathHint;
};

type ApiGeneratedPath = {
	path: string;
	nodes: ApiNodeSummary[];
	steps: number;
	reason: string | null;
};

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${path}`, init);

	if (!response.ok) {
		throw new Error(`API request failed (${response.status}) for ${path}`);
	}

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
	};
}

function mapMovie(movie: ApiMovie): Movie {
	return {
		id: movie.id,
		title: movie.title,
		releaseDate: movie.release_date,
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
	return movies.map(mapMovie);
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

	return movies.map((movie) => ({
		...mapMovie(movie),
		pathHint: mapPathHint(movie.path_hint),
	}));
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