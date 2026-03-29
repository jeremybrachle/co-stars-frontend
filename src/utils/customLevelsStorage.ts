import type { NodeSummary } from "../types";

export type CustomLevelDraft = {
	startNode: NodeSummary;
	targetNode: NodeSummary;
	actorPopularityCutoff: number | null;
	releaseYearCutoff: number | null;
	optimalHops: number | null;
	optimalPath: NodeSummary[];
};

export type PlayerCustomLevel = CustomLevelDraft & {
	id: string;
	createdAt: number;
	updatedAt: number;
	savedFrom: "quick-play" | "archive";
};

type SavePlayerCustomLevelInput = CustomLevelDraft & {
	savedFrom?: PlayerCustomLevel["savedFrom"];
};

type SavePlayerCustomLevelResult = {
	savedLevel: PlayerCustomLevel;
	levels: PlayerCustomLevel[];
	didUpdate: boolean;
};

const PLAYER_CUSTOM_LEVELS_STORAGE_KEY = "costars.player-custom-levels.v1";
const PLAYER_CUSTOM_LEVELS_UPDATED_EVENT = "costars:player-custom-levels-updated";
const EMPTY_PLAYER_CUSTOM_LEVELS = [] as PlayerCustomLevel[];

let cachedRawPlayerLevels: string | null | undefined;
let cachedPlayerLevelsSnapshot = EMPTY_PLAYER_CUSTOM_LEVELS;

export const MAX_PLAYER_CUSTOM_LEVELS = 10;

function canUseBrowserStorage() {
	return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isNodeSummary(value: unknown): value is NodeSummary {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.id === "number"
		&& (candidate.type === "actor" || candidate.type === "movie")
		&& typeof candidate.label === "string"
	);
}

function isCustomLevelDraft(value: unknown): value is CustomLevelDraft {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return (
		isNodeSummary(candidate.startNode)
		&& isNodeSummary(candidate.targetNode)
		&& (candidate.actorPopularityCutoff === null || typeof candidate.actorPopularityCutoff === "number")
		&& (candidate.releaseYearCutoff === null || typeof candidate.releaseYearCutoff === "number")
		&& (candidate.optimalHops === null || typeof candidate.optimalHops === "number")
		&& Array.isArray(candidate.optimalPath)
		&& candidate.optimalPath.every(isNodeSummary)
	);
}

function isPlayerCustomLevel(value: unknown): value is PlayerCustomLevel {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	if (typeof candidate.id !== "string") {
		return false;
	}

	if (!isCustomLevelDraft(value)) {
		return false;
	}

	return (
		typeof candidate.createdAt === "number"
		&& typeof candidate.updatedAt === "number"
		&& (candidate.savedFrom === "quick-play" || candidate.savedFrom === "archive")
	);
}

function parseStoredLevels(rawValue: string | null) {
	if (!rawValue) {
		return EMPTY_PLAYER_CUSTOM_LEVELS;
	}

	try {
		const parsed = JSON.parse(rawValue);
		if (!Array.isArray(parsed)) {
			return EMPTY_PLAYER_CUSTOM_LEVELS;
		}

		return parsed
			.filter(isPlayerCustomLevel)
			.sort((left, right) => right.updatedAt - left.updatedAt);
	} catch {
		return EMPTY_PLAYER_CUSTOM_LEVELS;
	}
}

function readCollectionFromStorage() {
	if (!canUseBrowserStorage()) {
		return EMPTY_PLAYER_CUSTOM_LEVELS;
	}

	const rawValue = window.localStorage.getItem(PLAYER_CUSTOM_LEVELS_STORAGE_KEY);
	if (rawValue === cachedRawPlayerLevels) {
		return cachedPlayerLevelsSnapshot;
	}

	cachedRawPlayerLevels = rawValue;
	cachedPlayerLevelsSnapshot = parseStoredLevels(rawValue);
	return cachedPlayerLevelsSnapshot;
}

function writeCollectionToStorage(levels: PlayerCustomLevel[]) {
	if (!canUseBrowserStorage()) {
		return;
	}

	const serializedLevels = JSON.stringify(levels);
	cachedRawPlayerLevels = serializedLevels;
	cachedPlayerLevelsSnapshot = levels;
	window.localStorage.setItem(PLAYER_CUSTOM_LEVELS_STORAGE_KEY, serializedLevels);
	if (typeof window.dispatchEvent === "function") {
		window.dispatchEvent(new Event(PLAYER_CUSTOM_LEVELS_UPDATED_EVENT));
	}
}

function createLevelId() {
	return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function readPlayerCustomLevels() {
	return readCollectionFromStorage();
}

export function getPlayerCustomLevelsStorageSizeBytes(levels = readCollectionFromStorage()) {
	return new TextEncoder().encode(JSON.stringify(levels)).length;
}

export function getPlayerCustomLevel(levelId: string) {
	return readCollectionFromStorage().find((level) => level.id === levelId) ?? null;
}

export const resolvePlayerCustomLevel = getPlayerCustomLevel;

export function savePlayerCustomLevel(
	input: SavePlayerCustomLevelInput,
	existingLevelId?: string | null,
): SavePlayerCustomLevelResult {
	const existingLevels = readCollectionFromStorage();
	const now = Date.now();
	const existingLevel = existingLevelId
		? existingLevels.find((level) => level.id === existingLevelId) ?? null
		: null;

	if (!existingLevel && existingLevels.length >= MAX_PLAYER_CUSTOM_LEVELS) {
		throw new Error(`You can save at most ${MAX_PLAYER_CUSTOM_LEVELS} custom levels.`);
	}

	const savedLevel: PlayerCustomLevel = {
		id: existingLevel?.id ?? createLevelId(),
		createdAt: existingLevel?.createdAt ?? now,
		updatedAt: now,
		savedFrom: input.savedFrom ?? existingLevel?.savedFrom ?? "quick-play",
		startNode: input.startNode,
		targetNode: input.targetNode,
		actorPopularityCutoff: input.actorPopularityCutoff,
		releaseYearCutoff: input.releaseYearCutoff,
		optimalHops: input.optimalHops,
		optimalPath: input.optimalPath,
	};

	const nextLevels = existingLevel
		? existingLevels.map((level) => level.id === existingLevel.id ? savedLevel : level)
		: [savedLevel, ...existingLevels];

	const sortedLevels = [...nextLevels].sort((left, right) => right.updatedAt - left.updatedAt);
	writeCollectionToStorage(sortedLevels);

	return {
		savedLevel,
		levels: sortedLevels,
		didUpdate: Boolean(existingLevel),
	};
}

export function deletePlayerCustomLevel(levelId: string) {
	const nextLevels = readCollectionFromStorage().filter((level) => level.id !== levelId);
	writeCollectionToStorage(nextLevels);
	return nextLevels;
}

export function clearPlayerCustomLevels() {
	writeCollectionToStorage(EMPTY_PLAYER_CUSTOM_LEVELS);
	return EMPTY_PLAYER_CUSTOM_LEVELS;
}

export function subscribeToPlayerCustomLevels(listener: () => void) {
	if (typeof window === "undefined") {
		return () => undefined;
	}

	const handleStorage = (event: StorageEvent) => {
		if (!event.key || event.key === PLAYER_CUSTOM_LEVELS_STORAGE_KEY) {
			listener();
		}
	};
	const handleUpdate = () => listener();

	window.addEventListener("storage", handleStorage);
	window.addEventListener(PLAYER_CUSTOM_LEVELS_UPDATED_EVENT, handleUpdate);

	return () => {
		window.removeEventListener("storage", handleStorage);
		window.removeEventListener(PLAYER_CUSTOM_LEVELS_UPDATED_EVENT, handleUpdate);
	};
}

export function buildCustomLevelLabel(level: Pick<CustomLevelDraft, "startNode" | "targetNode">) {
	return `${level.startNode.label} -> ${level.targetNode.label}`;
}