import { createGameNodeFromSummary, findShortestPathWithFilter } from "../data/localGraph";
import type { GameDataFilters, GameNode, NodeSummary, SnapshotIndexes } from "../types";
import { getReleaseYear } from "./gameCompletionMetrics";
import type { CustomLevelDraft } from "./customLevelsStorage";

export type CustomLevelRoutePreview = {
	status: "idle" | "blocked" | "ready";
	message: string;
	path: NodeSummary[];
	steps: number | null;
	intermediates: number | null;
};

export function buildCustomLevelRoutePreview(
	startNode: NodeSummary | null,
	targetNode: NodeSummary | null,
	indexes: SnapshotIndexes,
	filters: Pick<GameDataFilters, "actorPopularityCutoff" | "releaseYearCutoff">,
): CustomLevelRoutePreview {
	if (!startNode || !targetNode) {
		return {
			status: "idle",
			message: "Choose a start and target node to preview the board.",
			path: [],
			steps: null,
			intermediates: null,
		};
	}

	if (startNode.id === targetNode.id && startNode.type === targetNode.type) {
		return {
			status: "blocked",
			message: "The start and target nodes must be different.",
			path: [],
			steps: null,
			intermediates: null,
		};
	}

	const startKey = `${startNode.type}:${startNode.id}`;
	const targetKey = `${targetNode.type}:${targetNode.id}`;
	const path = findShortestPathWithFilter(startNode, targetNode, indexes, (node) => {
		const nodeKey = `${node.type}:${node.id}`;
		if (nodeKey === startKey || nodeKey === targetKey) {
			return true;
		}

		if (node.type === "actor") {
			if (filters.actorPopularityCutoff === null) {
				return true;
			}

			const actor = indexes.actorsById.get(node.id);
			return (actor?.popularity ?? Number.NEGATIVE_INFINITY) >= filters.actorPopularityCutoff;
		}

		if (filters.releaseYearCutoff === null) {
			return true;
		}

		const movie = indexes.moviesById.get(node.id);
		const releaseYear = getReleaseYear(movie?.releaseDate ?? null);
		return releaseYear !== null && releaseYear >= filters.releaseYearCutoff;
	});

	if (!path) {
		return {
			status: "blocked",
			message: "No path exists with the current endpoint pairing and filter cutoffs. Loosen the filters or randomize again.",
			path: [],
			steps: null,
			intermediates: null,
		};
	}

	return {
		status: "ready",
		message: "A valid route exists for this pairing.",
		path,
		steps: Math.max(0, path.length - 1),
		intermediates: Math.max(0, path.length - 2),
	};
}

export function hydrateCustomLevelDraft(level: CustomLevelDraft, indexes: SnapshotIndexes) {
	const hasStoredRoute = level.optimalPath.length > 0 && level.optimalHops !== null;

	if (hasStoredRoute) {
		return {
			level,
			preview: {
				status: "ready" as const,
				message: "A valid route exists for this pairing.",
				path: level.optimalPath,
				steps: level.optimalHops,
				intermediates: Math.max(0, level.optimalHops - 1),
			},
		};
	}

	const preview = buildCustomLevelRoutePreview(level.startNode, level.targetNode, indexes, {
		actorPopularityCutoff: level.actorPopularityCutoff,
		releaseYearCutoff: level.releaseYearCutoff,
	});

	if (preview.status !== "ready") {
		return {
			level,
			preview,
		};
	}

	return {
		level: {
			...level,
			optimalHops: preview.steps,
			optimalPath: preview.path,
		},
		preview,
	};
}

export function createPreviewPathNodes(path: NodeSummary[], indexes: SnapshotIndexes): GameNode[] {
	return path.map((node) => createGameNodeFromSummary(node, indexes));
}