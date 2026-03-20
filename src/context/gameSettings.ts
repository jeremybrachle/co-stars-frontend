import { createContext, useContext } from "react";
import type {
	DifficultyOption,
	DifficultySettings,
	DifficultyToggleId,
	GameDataFilters,
	GameDifficultySettings,
	SuggestionDisplaySettings,
} from "../types";

export type CustomSettingDefinition = {
	id: DifficultyToggleId;
	label: string;
	hint: string;
	section?: "helpers" | "risk-overlays" | "suggestion-list" | "penalties";
	requires?: DifficultyToggleId;
};

export const CUSTOM_SETTING_DEFINITIONS: CustomSettingDefinition[] = [
	{
		id: "show-optimal-tracking",
		label: "Track optimal path",
		hint: "Keep hop comparison and shortest-path guidance visible during the run.",
	},
	{
		id: "show-suggestions",
		label: "Display suggestions",
		hint: "Keep the right-panel suggestion cards visible during play.",
	},
	{
		id: "show-hint-color",
		label: "Show hint colors",
		hint: "Keep connection, best-path, and cycle-risk highlight colors enabled.",
	},
	{
		id: "guarantee-best-path-suggestion",
		label: "Always include best-path card",
		hint: "Guarantee at least one shortest-path suggestion when a reachable option exists.",
	},
	{
		id: "show-visited-suggestions",
		label: "Show visited suggestions",
		hint: "Keep already-visited nodes visible in suggestion lists for awareness.",
		section: "suggestion-list",
	},
	{
		id: "sort-suggestions-by-risk-priority",
		label: "Sort suggestions by risk priority",
		hint: "Order cards as best-path, reachable neutral, risk overlays, then red dead-end cards.",
		section: "suggestion-list",
	},
	{
		id: "cycle-risk-click-adds-penalty",
		label: "Cycle risk click adds penalty",
		hint: "Clicking a cycle-risk card adds a dead-end penalty instead of extending the path.",
		section: "penalties",
	},
	{
		id: "show-cast-lock-risk",
		label: "Show cast lock risk",
		hint: "Highlight movies where cast members only branch to already-used movie nodes.",
		section: "risk-overlays",
	},
	{
		id: "show-full-cast-lock",
		label: "Show full cast lock",
		hint: "Highlight hard lock movies where every cast member points only back to that same movie.",
		section: "risk-overlays",
		requires: "show-cast-lock-risk",
	},
];

export const GAME_SETTINGS_KEY = "co-stars-game-settings";

export const DEFAULT_CUSTOM_SETTINGS: DifficultySettings = {
	"show-suggestions": true,
	"show-hint-color": true,
	"show-optimal-tracking": true,
	"guarantee-best-path-suggestion": false,
	"show-visited-suggestions": true,
	"sort-suggestions-by-risk-priority": false,
	"cycle-risk-click-adds-penalty": false,
	"show-cast-lock-risk": true,
	"show-full-cast-lock": true,
};

export const DEFAULT_DATA_FILTERS: GameDataFilters = {
	actorPopularityCutoff: 1.8,
	releaseYearCutoff: null,
	movieSortMode: "releaseYear",
	actorSortMode: "popularity",
};

export const DEFAULT_SUGGESTION_DISPLAY: SuggestionDisplaySettings = {
	viewMode: "all",
	subsetCount: 10,
	allWindowMode: "scroll",
	orderMode: "ranked",
};

export const DEFAULT_GAME_SETTINGS: GameDifficultySettings = {
	difficulty: "custom",
	customSettings: { ...DEFAULT_CUSTOM_SETTINGS },
	dataFilters: { ...DEFAULT_DATA_FILTERS },
	suggestionDisplay: { ...DEFAULT_SUGGESTION_DISPLAY },
};

export type GameSettingsContextValue = {
	settings: GameDifficultySettings;
	setDifficulty: (difficulty: DifficultyOption) => void;
	setCustomSetting: (settingId: keyof DifficultySettings, enabled: boolean) => void;
	setActorPopularityCutoff: (cutoff: number | null) => void;
	setReleaseYearCutoff: (year: number | null) => void;
	setMovieSortMode: (mode: GameDataFilters["movieSortMode"]) => void;
	setActorSortMode: (mode: GameDataFilters["actorSortMode"]) => void;
	setSuggestionViewMode: (mode: SuggestionDisplaySettings["viewMode"]) => void;
	setSubsetCount: (count: number) => void;
	setAllWindowMode: (mode: SuggestionDisplaySettings["allWindowMode"]) => void;
	setSuggestionOrderMode: (mode: SuggestionDisplaySettings["orderMode"]) => void;
};

export const GameSettingsContext = createContext<GameSettingsContextValue | null>(null);

function isDifficultyOption(value: unknown): value is DifficultyOption {
	return value === "easy" || value === "medium" || value === "hard" || value === "custom";
}

function isDifficultySettings(value: unknown): value is DifficultySettings {
	if (!value || typeof value !== "object") {
		return false;
	}

	return Object.keys(DEFAULT_CUSTOM_SETTINGS).every((key) => typeof (value as Record<string, unknown>)[key] === "boolean");
}

function isGameDataFilters(value: unknown): value is GameDataFilters {
	if (!value || typeof value !== "object") {
		return false;
	}

	const obj = value as Record<string, unknown>;
	const cutoff = obj.actorPopularityCutoff;
	const yearCutoff = obj.releaseYearCutoff;
	const movieSort = obj.movieSortMode;
	const actorSort = obj.actorSortMode;

	return (
		(cutoff === null || typeof cutoff === "number") &&
		(yearCutoff === null || typeof yearCutoff === "number") &&
		(movieSort === "releaseYear" || movieSort === "random") &&
		(actorSort === "popularity" || actorSort === "random")
	);
}

function isSuggestionDisplaySettings(value: unknown): value is SuggestionDisplaySettings {
	if (!value || typeof value !== "object") {
		return false;
	}

	const obj = value as Record<string, unknown>;
	return (
		(obj.viewMode === "all" || obj.viewMode === "subset") &&
		typeof obj.subsetCount === "number" &&
		Number.isFinite(obj.subsetCount) &&
		obj.subsetCount >= 2 &&
		obj.subsetCount <= 10 &&
		(obj.allWindowMode === "pagination" || obj.allWindowMode === "scroll") &&
		(obj.orderMode === "ranked" || obj.orderMode === "shuffled")
	);
}

export function readStoredGameSettings(): GameDifficultySettings {
	if (typeof window === "undefined") {
		return DEFAULT_GAME_SETTINGS;
	}

	const stored = window.localStorage.getItem(GAME_SETTINGS_KEY);
	if (!stored) {
		return DEFAULT_GAME_SETTINGS;
	}

	try {
		const parsed = JSON.parse(stored) as Partial<GameDifficultySettings>;
		if (!isDifficultyOption(parsed.difficulty) || !isDifficultySettings(parsed.customSettings)) {
			return DEFAULT_GAME_SETTINGS;
		}

		const normalizedDataFilters = isGameDataFilters(parsed.dataFilters)
			? parsed.dataFilters
			: { ...DEFAULT_DATA_FILTERS };

		return {
			difficulty: parsed.difficulty,
			customSettings: parsed.customSettings,
			dataFilters: normalizedDataFilters,
			suggestionDisplay: isSuggestionDisplaySettings(parsed.suggestionDisplay)
				? parsed.suggestionDisplay
				: { ...DEFAULT_SUGGESTION_DISPLAY },
		};
	} catch {
		return DEFAULT_GAME_SETTINGS;
	}
}

export function useGameSettings() {
	const context = useContext(GameSettingsContext);

	if (!context) {
		throw new Error("useGameSettings must be used within GameSettingsProvider.");
	}

	return context;
}