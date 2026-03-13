export type NodeType = "actor" | "movie";

export type GameNode = {
	id?: number;
	label: string;
	type: NodeType;
	popularity?: number | null;
	releaseDate?: string | null;
	pathHint?: PathHint;
	popularityRank?: number | null;
	highlight?: SuggestionHighlight;
};

export type NodeSummary = {
	id: number;
	type: NodeType;
	label: string;
};

export type PathHint = {
	reachable: boolean;
	stepsToTarget: number | null;
	path: NodeSummary[];
};

export type Actor = {
	id: number;
	name: string;
	popularity: number | null;
};

export type Movie = {
	id: number;
	title: string;
	releaseDate: string | null;
};

export type ActorSuggestion = Actor & {
	pathHint?: PathHint;
	popularityRank?: number | null;
};

export type MovieSuggestion = Movie & {
	pathHint?: PathHint;
};

export type Level = {
	actorA: string;
	actorB: string;
	stars: number;
	optimalHops?: number | null;
	optimalPath?: NodeSummary[];
};

export type PathEndpoint = {
	type: NodeType;
	value: string;
};

export type GeneratedPath = {
	path: string;
	nodes: NodeSummary[];
	steps: number;
	reason: string | null;
};

export type ValidatePathResponse = {
	valid: boolean;
	message?: string;
};

export type SuggestionHighlight = {
	kind: "connection" | "optimal";
	label: string;
	description: string;
};

export type HealthCheckResponse = {
	status: string;
	version: string;
};

export type FrontendManifest = {
	version: string;
	sourceUpdatedAt: string;
	actorCount: number;
	movieCount: number;
	relationshipCount: number;
	levelCount: number;
	recommendedRefreshIntervalHours: number;
	snapshotEndpoint: string;
};

export type FrontendSnapshotMeta = {
	version: string;
	exportedAt: string;
	actorCount: number;
	movieCount: number;
	relationshipCount: number;
	levelCount: number;
};

export type MovieActorLink = {
	movieId: number;
	actorId: number;
};

export type FrontendSnapshot = {
	meta: FrontendSnapshotMeta;
	actors: Actor[];
	movies: Movie[];
	movieActors: MovieActorLink[];
	adjacency: {
		actorToMovies: Record<string, number[]>;
		movieToActors: Record<string, number[]>;
	};
	levels: Level[];
};

export type SnapshotIndexes = {
	actorsById: Map<number, Actor>;
	moviesById: Map<number, Movie>;
	actorNameToId: Map<string, number>;
	movieTitleToId: Map<string, number>;
	actorToMovies: Record<string, number[]>;
	movieToActors: Record<string, number[]>;
};

export type SnapshotBundle = {
	manifest: FrontendManifest;
	snapshot: FrontendSnapshot;
	indexes: SnapshotIndexes;
	health?: HealthCheckResponse;
	loadedFrom: "cache" | "api-snapshot" | "s3-snapshot" | "demo";
};

export type DataSourceMode = "auto" | "snapshot" | "api" | "demo";

export type EffectiveDataSource = "snapshot" | "api" | "demo";
