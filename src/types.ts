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
