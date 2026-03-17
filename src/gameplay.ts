import type { GameNode, NodeSummary, SnapshotIndexes } from "./types";

export const MAX_PATH_LENGTH = 19;
export const SUGGESTION_LIMIT = 8;

type SuggestionBuildOptions = {
	shouldShuffle?: boolean;
	shouldGuaranteeBestPath?: boolean;
	suggestionLimit?: number | null;
	movieSortMode?: "releaseYear" | "random";
	actorSortMode?: "popularity" | "random";
	nodeType?: "actor" | "movie";
};

function shuffleSuggestions<T>(entries: T[]) {
	const nextEntries = [...entries];

	for (let index = nextEntries.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[nextEntries[index], nextEntries[swapIndex]] = [nextEntries[swapIndex], nextEntries[index]];
	}

	return nextEntries;
}

function normalizeLabel(label: string) {
	return label.trim().toLocaleLowerCase();
}

export function getNodeKey(node: Pick<GameNode, "type" | "label" | "id"> | Pick<NodeSummary, "type" | "label" | "id">) {
	return `${node.type}:${node.id ?? normalizeLabel(node.label)}`;
}

export function isSameNode(
	a: Pick<GameNode, "type" | "label" | "id"> | Pick<NodeSummary, "type" | "label" | "id">,
	b: Pick<GameNode, "type" | "label" | "id"> | Pick<NodeSummary, "type" | "label" | "id">,
) {
	if (a.type !== b.type) {
		return false;
	}

	if (a.id !== undefined && b.id !== undefined) {
		return a.id === b.id;
	}

	return normalizeLabel(a.label) === normalizeLabel(b.label);
}

export function nodeFromSummary(node: NodeSummary): GameNode {
	return {
		id: node.id,
		label: node.label,
		type: node.type,
	};
}

function hintReachesTarget(node: GameNode, target: GameNode) {
	const lastNode = node.pathHint?.path.at(-1);
	return lastNode ? isSameNode(lastNode, target) : false;
}

export function isDirectConnectionSuggestion(node: GameNode, target: GameNode) {
	if (!node.pathHint?.reachable || !hintReachesTarget(node, target)) {
		return false;
	}

	return (node.pathHint.stepsToTarget ?? Number.POSITIVE_INFINITY) <= 1;
}

function getHintScore(node: GameNode) {
	if (!node.pathHint?.reachable || node.pathHint.stepsToTarget === null) {
		return 0;
	}

	return Math.max(0, 90 - node.pathHint.stepsToTarget * 15);
}

function getPopularityScore(node: GameNode) {
	return Math.max(0, node.popularity ?? 0) * 0.45;
}

function getRecencyScore(node: GameNode) {
	if (!node.releaseDate) {
		return 0;
	}

	const releaseYear = new Date(node.releaseDate).getFullYear();
	return Number.isNaN(releaseYear) ? 0 : Math.max(0, releaseYear - 1980) * 0.22;
}

function getTieBreakerLabel(node: GameNode) {
	return normalizeLabel(node.label);
}

function createComparatorBySort(
	movieSortMode: "releaseYear" | "random" = "releaseYear",
	actorSortMode: "popularity" | "random" = "popularity",
) {
	return (a: GameNode, b: GameNode) => {
		const aSteps = a.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
		const bSteps = b.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;

		if (aSteps !== bSteps) {
			return aSteps - bSteps;
		}

		// Apply per-type sorting
		if (a.type === "movie" && b.type === "movie") {
			// Both are movies
			if (movieSortMode === "releaseYear" || movieSortMode === "random") {
				const aYear = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
				const bYear = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
				if (aYear !== bYear) {
					return bYear - aYear; // descending
				}
			}
		} else if (a.type === "actor" && b.type === "actor") {
			// Both are actors
			if (actorSortMode === "popularity" || actorSortMode === "random") {
				const popularityDelta = (b.popularity ?? -1) - (a.popularity ?? -1);
				if (popularityDelta !== 0) {
					return popularityDelta;
				}
			}
		}

		const recencyDelta = getRecencyScore(b) - getRecencyScore(a);
		if (recencyDelta !== 0) {
			return recencyDelta;
		}

		return getTieBreakerLabel(a).localeCompare(getTieBreakerLabel(b));
	};
}

export function buildSuggestionSet(
	rawSuggestions: GameNode[],
	target: GameNode,
	blockedLoopNodeKeys: ReadonlySet<string> = new Set(),
	options: SuggestionBuildOptions = {},
	indexes?: SnapshotIndexes,
	popularityCutoff?: number | null,
) {
	const shouldShuffle = options.shouldShuffle ?? true;
	const shouldGuaranteeBestPath = options.shouldGuaranteeBestPath ?? false;
	const suggestionLimit = options.suggestionLimit === undefined ? SUGGESTION_LIMIT : options.suggestionLimit;
	const movieSortMode = options.movieSortMode ?? "releaseYear";
	const actorSortMode = options.actorSortMode ?? "popularity";
	const comparator = createComparatorBySort(movieSortMode, actorSortMode);

	const uniqueSuggestions = Array.from(
		new Map(rawSuggestions.map((suggestion) => [getNodeKey(suggestion), suggestion])).values(),
	);

	const directConnections = uniqueSuggestions
		.filter((suggestion) => isDirectConnectionSuggestion(suggestion, target))
		.sort(comparator);

	const reachableSuggestions = uniqueSuggestions
		.filter((suggestion) => suggestion.pathHint?.reachable)
		.sort(comparator);

	const featured = new Map<string, GameNode>();

	if (directConnections.length > 0) {
		featured.set(getNodeKey(directConnections[0]), directConnections[0]);
	} else if (reachableSuggestions.length > 0 && shouldGuaranteeBestPath) {
		featured.set(getNodeKey(reachableSuggestions[0]), reachableSuggestions[0]);
	}

	const rankedRemainder = uniqueSuggestions
		.filter((suggestion) => !featured.has(getNodeKey(suggestion)))
		.map((suggestion) => ({
			suggestion,
			score: getHintScore(suggestion) + getPopularityScore(suggestion) + getRecencyScore(suggestion),
		}))
		.sort((a, b) => {
			if (b.score !== a.score) {
				return b.score - a.score;
			}

			return comparator(a.suggestion, b.suggestion);
		})
		.map((entry) => entry.suggestion);

	const allRanked = [...featured.values(), ...rankedRemainder];
	const shuffledAll = shouldShuffle ? shuffleSuggestions(allRanked) : allRanked;
	const selected = suggestionLimit === null ? shuffledAll : shuffledAll.slice(0, suggestionLimit);
	const bestReachableSteps = reachableSuggestions[0]?.pathHint?.stepsToTarget ?? null;

	return selected.map((suggestion) => {
		const status = indexes ? getSuggestionStatusRecursive(suggestion, target, blockedLoopNodeKeys, popularityCutoff ?? null, indexes) : "valid";
		if (status === "warning" || status === "blocked") {
			return {
				...suggestion,
				highlight: {
					kind: "blocked" as const,
					label: status === "warning" ? "Cycle risk or dead end" : "Possible path",
					description: status === "warning" ? "All child nodes are dead ends or cycle risks." : "Grandchild nodes have valid paths.",
				},
			};
		}
		if (status === "deadend") {
			return {
				...suggestion,
				highlight: {
					kind: "blocked" as const,
					label: "Dead end",
					description: "No valid paths from this node.",
				},
			};
		}

		if (blockedLoopNodeKeys.has(getNodeKey(suggestion))) {
			return {
				...suggestion,
				highlight: {
					kind: "blocked" as const,
					label: "Already in path",
					description: "This node already appears in your route and cannot be added again.",
				},
			};
		}

		if (isDirectConnectionSuggestion(suggestion, target)) {
			return {
				...suggestion,
				highlight: {
					kind: "connection" as const,
					label: "Connection found",
					description: "Choosing this option reveals the target immediately.",
				},
			};
		}

		if (
			bestReachableSteps !== null
			&& suggestion.pathHint?.reachable
			&& suggestion.pathHint.stepsToTarget === bestReachableSteps
		) {
			return {
				...suggestion,
				highlight: {
					kind: "optimal" as const,
					label: "Best path",
					description: `One of the shortest currently known routes to ${target.label}.`,
				},
			};
		}

		return {
			...suggestion,
			highlight: undefined,
		};
	});
}

export function combineMeetingPath(startA: GameNode, topPath: GameNode[], startB: GameNode, bottomPath: GameNode[]) {
	const topFullPath = [startA, ...topPath];
	const bottomFullPath = [startB, ...bottomPath];
	const topLast = topFullPath.at(-1);
	const bottomLast = bottomFullPath.at(-1);

	if (!topLast || !bottomLast || !isSameNode(topLast, bottomLast)) {
		return null;
	}

	return [...topFullPath, ...bottomFullPath.slice(0, -1).reverse()];
}

function getSuggestionStatusRecursive(
	node: GameNode,
	target: GameNode,
	blockedLoopNodeKeys: ReadonlySet<string>,
	popularityCutoff: number | null,
	indexes: SnapshotIndexes,
	depth = 1,
): "valid" | "warning" | "blocked" | "deadend" {
	if (depth > 3) return "blocked";
	if (!node.pathHint?.reachable) return "deadend";
	if (blockedLoopNodeKeys.has(getNodeKey(node))) return "warning";
	if (isDirectConnectionSuggestion(node, target)) return "valid";

	const children: GameNode[] = [];
	if (node.type === "actor" && node.id != null) {
		const movieIds = indexes.actorToMovies[node.id ?? ""] ?? [];
		for (const movieId of movieIds) {
			const movie = indexes.moviesById.get(movieId);
			if (movie) children.push({
				id: movie.id,
				label: movie.title,
				type: "movie",
				releaseDate: movie.releaseDate,
				genres: movie.genres,
				contentRating: movie.contentRating,
				originalLanguage: movie.originalLanguage,
				overview: movie.overview,
				imageUrl: movie.posterUrl,
			});
		}
	} else if (node.type === "movie" && node.id != null) {
		const actorIds = indexes.movieToActors[node.id ?? ""] ?? [];
		for (const actorId of actorIds) {
			const actor = indexes.actorsById.get(actorId);
			if (actor && (popularityCutoff == null || actor.popularity! >= popularityCutoff)) {
				children.push({
					id: actor.id,
					label: actor.name,
					type: "actor",
					popularity: actor.popularity,
					imageUrl: actor.profileUrl,
					knownForDepartment: actor.knownForDepartment,
					placeOfBirth: actor.placeOfBirth,
				});
			}
		}
	}
	if (children.length === 0) return "deadend";
	let allDeadOrWarning = true;
	let hasValidGrandchild = false;
	for (const child of children) {
		const status = getSuggestionStatusRecursive(child, target, blockedLoopNodeKeys, popularityCutoff, indexes, depth + 1);
		if (status === "valid") allDeadOrWarning = false;
		if (status === "blocked") hasValidGrandchild = true;
	}
	if (allDeadOrWarning) return "warning";
	if (hasValidGrandchild) return "blocked";
	return "valid";
}