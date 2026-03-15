import type { GameNode, NodeSummary } from "./types";

export const MAX_PATH_LENGTH = 19;
export const SUGGESTION_LIMIT = 6;
export const OPTIMAL_PATH_INCLUSION_RATE = 0.65;

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

function compareByHintAndMetadata(a: GameNode, b: GameNode) {
	const aSteps = a.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
	const bSteps = b.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;

	if (aSteps !== bSteps) {
		return aSteps - bSteps;
	}

	const popularityDelta = (b.popularity ?? -1) - (a.popularity ?? -1);
	if (popularityDelta !== 0) {
		return popularityDelta;
	}

	const recencyDelta = getRecencyScore(b) - getRecencyScore(a);
	if (recencyDelta !== 0) {
		return recencyDelta;
	}

	return getTieBreakerLabel(a).localeCompare(getTieBreakerLabel(b));
}

export function buildSuggestionSet(rawSuggestions: GameNode[], target: GameNode, blockedLoopNodeKeys: ReadonlySet<string> = new Set()) {
	const uniqueSuggestions = Array.from(
		new Map(rawSuggestions.map((suggestion) => [getNodeKey(suggestion), suggestion])).values(),
	);

	const directConnections = uniqueSuggestions
		.filter((suggestion) => isDirectConnectionSuggestion(suggestion, target))
		.sort(compareByHintAndMetadata);

	const reachableSuggestions = uniqueSuggestions
		.filter((suggestion) => suggestion.pathHint?.reachable)
		.sort(compareByHintAndMetadata);

	const featured = new Map<string, GameNode>();

	if (directConnections.length > 0) {
		featured.set(getNodeKey(directConnections[0]), directConnections[0]);
	} else if (reachableSuggestions.length > 0 && Math.random() < OPTIMAL_PATH_INCLUSION_RATE) {
		featured.set(getNodeKey(reachableSuggestions[0]), reachableSuggestions[0]);
	}

	const rankedRemainder = uniqueSuggestions
		.filter((suggestion) => !featured.has(getNodeKey(suggestion)))
		.map((suggestion) => ({
			suggestion,
			score: getHintScore(suggestion) + getPopularityScore(suggestion) + getRecencyScore(suggestion) + Math.random() * 18,
		}))
		.sort((a, b) => b.score - a.score)
		.map((entry) => entry.suggestion);

	const selected = [...featured.values(), ...rankedRemainder].slice(0, SUGGESTION_LIMIT);
	const bestReachableSteps = reachableSuggestions[0]?.pathHint?.stepsToTarget ?? null;

	return selected.map((suggestion) => {
		if (blockedLoopNodeKeys.has(getNodeKey(suggestion))) {
			return {
				...suggestion,
				highlight: {
					kind: "loop" as const,
					label: "Cycle risk",
					description: "This node already appears in your route. Choosing it would create a loop.",
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