export type NodeType = "actor" | "movie";

export type GameNode = {
	id?: number;
	label: string;
	type: NodeType;
	popularity?: number | null;
	releaseDate?: string | null;
	imageUrl?: string | null;
	knownForDepartment?: string | null;
	placeOfBirth?: string | null;
	genres?: string[];
	contentRating?: string | null;
	originalLanguage?: string | null;
	overview?: string | null;
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
	birthday?: string | null;
	deathday?: string | null;
	placeOfBirth?: string | null;
	biography?: string | null;
	profilePath?: string | null;
	profileUrl?: string | null;
	knownForDepartment?: string | null;
};

export type Movie = {
	id: number;
	title: string;
	releaseDate: string | null;
	genres?: string[];
	overview?: string | null;
	posterPath?: string | null;
	posterUrl?: string | null;
	originalLanguage?: string | null;
	contentRating?: string | null;
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
	kind: "connection" | "optimal" | "loop" | "deep-loop" | "cast-lock" | "full-cast-lock" | "blocked";
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

export type ConnectionMode = "online" | "offline";

export type OnlineDataPreference = "snapshot" | "api";

export type OfflineDataPreference = "snapshot" | "demo";

export type DataSourceMode = {
	connectionMode: ConnectionMode;
	onlineSource: OnlineDataPreference;
	offlineSource: OfflineDataPreference;
};

export type EffectiveDataSource = "snapshot" | "api" | "demo";

export type DifficultyOption = "easy" | "medium" | "hard" | "custom";

export type DifficultyToggleId =
	| "show-suggestions"
	| "show-hint-color"
	| "show-optimal-tracking"
	| "guarantee-best-path-suggestion"
	| "show-visited-suggestions"
	| "sort-suggestions-by-risk-priority"
	| "cycle-risk-click-adds-penalty"
	| "show-cast-lock-risk"
	| "show-full-cast-lock";

export type DifficultySettings = Record<DifficultyToggleId, boolean>;

export type SuggestionViewMode = "all" | "subset";
export type SuggestionWindowMode = "pagination" | "scroll";

export type SuggestionDisplaySettings = {
	viewMode: SuggestionViewMode;
	subsetCount: number;
	allWindowMode: SuggestionWindowMode;
};

export type GameDataFilters = {
	actorPopularityCutoff: number | null;
	releaseYearCutoff: number | null;
	movieSortMode: "releaseYear" | "random";
	actorSortMode: "popularity" | "random";
};

export type GameDifficultySettings = {
	difficulty: DifficultyOption;
	customSettings: DifficultySettings;
	dataFilters: GameDataFilters;
	suggestionDisplay: SuggestionDisplaySettings;
};

export type DataIndicatorVariant =
	| "online-snapshot"
	| "online-api"
	| "offline-snapshot"
	| "offline-demo";
