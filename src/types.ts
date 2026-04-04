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

export type LevelNode = {
	id?: number;
	type: NodeType;
	label: string;
};

export type LevelNotes = {
	text: string;
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
	levelGroupId: string;
	levelGroupName: string;
	gameId: string;
	gameType: string;
	startNode: LevelNode;
	targetNode: LevelNode;
	notes: LevelNotes | null;
	settings: Record<string, unknown>;
	optimalHops?: number | null;
	optimalPath?: NodeSummary[];
};

export type LevelGroup = {
	levelId: string;
	levelName: string;
	games: Level[];
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
	kind: "connection" | "optimal" | "loop" | "deep-loop" | "cast-lock" | "blocked";
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
	levelGroupCount: number;
	normalGameCount: number;
	bossGameCount: number;
	levelSchemaVersion: number;
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
	levelGroupCount: number;
	normalGameCount: number;
	bossGameCount: number;
	levelSchemaVersion: number;
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
	levels: LevelGroup[];
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
	loadedFrom: "installed-snapshot" | "api-snapshot" | "s3-snapshot" | "demo";
};

export type StoredSnapshotSource = "s3" | "api";

export type SnapshotUpdateCheck = {
	status: "idle" | "checking" | "up-to-date" | "update-available" | "error";
	message: string | null;
	checkedAt: string | null;
	remoteManifest: FrontendManifest | null;
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

export type DifficultyOption = "all-on" | "all-off" | "custom";

export type DifficultyToggleId =
	| "show-suggestions"
	| "start-with-suggestion-panel"
	| "show-hint-color"
	| "write-in-autosuggest"
	| "show-optimal-tracking"
	| "guarantee-best-path-suggestion"
	| "show-visited-suggestions"
	| "shuffle-adds-penalty"
	| "rewind-adds-penalty"
	| "cycle-risk-click-adds-penalty"
	| "show-cast-lock-risk";

export type DifficultySettings = Record<DifficultyToggleId, boolean>;

export type SuggestionViewMode = "all" | "subset";
export type SuggestionWindowMode = "pagination" | "scroll";
export type SuggestionOrderMode = "ranked" | "shuffled";
export type SuggestionSortMode = "default" | "best-path" | "random";

export type SuggestionDisplaySettings = {
	viewMode: SuggestionViewMode;
	subsetCount: number;
	allWindowMode: SuggestionWindowMode;
	orderMode: SuggestionOrderMode;
	sortMode: SuggestionSortMode;
};

export type GameDataFilters = {
	actorPopularityCutoff: number | null;
	releaseYearCutoff: number | null;
	movieSortMode: "releaseYear" | "random";
	actorSortMode: "popularity" | "random";
};

export type BoardThemeTone = "light" | "dark" | "custom";

export type BoardThemePalette = "original" | "classic" | "light" | "dark" | "ocean" | "sunset" | "forest";

export type BoardThemeScope = "adventure" | "standard" | "shell";

export type BoardThemePreset = "dynamic" | "classic" | "light" | "dark" | "custom";

export type BoardThemeSettings = {
	preset: BoardThemePreset;
	adventureTone: BoardThemeTone;
	standardTone: BoardThemeTone;
	shellTone: BoardThemeTone;
	adventurePalette: BoardThemePalette;
	standardPalette: BoardThemePalette;
	shellPalette: BoardThemePalette;
};

export type GameDifficultySettings = {
	difficulty: DifficultyOption;
	customSettings: DifficultySettings;
	dataFilters: GameDataFilters;
	suggestionDisplay: SuggestionDisplaySettings;
	boardTheme: BoardThemeSettings;
};

export type DataIndicatorVariant =
	| "online-snapshot"
	| "online-api"
	| "online-api-unavailable"
	| "offline-snapshot"
	| "offline-demo";
