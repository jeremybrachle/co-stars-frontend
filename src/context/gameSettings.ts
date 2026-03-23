import { createContext, useContext } from "react";
import type {
	DifficultyOption,
	DifficultySettings,
	DifficultyToggleId,
	GameDataFilters,
	GameDifficultySettings,
	SuggestionDisplaySettings,
} from "../types";

export const ALL_ON_CUSTOM_SETTINGS: DifficultySettings = {
	"show-suggestions": true,
	"start-with-suggestion-panel": true,
	"show-hint-color": true,
	"write-in-autosuggest": true,
	"show-optimal-tracking": true,
	"guarantee-best-path-suggestion": true,
	"show-visited-suggestions": true,
	"shuffle-adds-penalty": true,
	"rewind-adds-penalty": true,
	"cycle-risk-click-adds-penalty": true,
	"show-cast-lock-risk": true,
};

export const ALL_OFF_CUSTOM_SETTINGS: DifficultySettings = {
	"show-suggestions": false,
	"start-with-suggestion-panel": true,
	"show-hint-color": false,
	"write-in-autosuggest": false,
	"show-optimal-tracking": false,
	"guarantee-best-path-suggestion": false,
	"show-visited-suggestions": false,
	"shuffle-adds-penalty": false,
	"rewind-adds-penalty": false,
	"cycle-risk-click-adds-penalty": false,
	"show-cast-lock-risk": false,
};

export type CustomSettingDefinition = {
	id: DifficultyToggleId;
	label: string;
	hint: string;
	performanceWarning?: string;
	section?: "helpers" | "suggestion-list" | "penalties";
	requires?: DifficultyToggleId;
};

export const CUSTOM_SETTING_DEFINITIONS: CustomSettingDefinition[] = [
	{
		id: "show-optimal-tracking",
		label: "Track optimal path",
		hint: "Keep intermediate-count comparison and shortest-path guidance visible during the run.",
	},
	{
		id: "show-suggestions",
		label: "Display suggestions",
		hint: "Keep the right-panel suggestion cards visible during play. A flat score penalty applies if this is still enabled when the run ends.",
	},
	{
		id: "start-with-suggestion-panel",
		label: "Start with suggestion panel visible",
		hint: "Choose whether new games open with the suggestion panel already shown. You can still hide or show it from the left panel at any time.",
		section: "helpers",
	},
	{
		id: "show-hint-color",
		label: "Show hint colors",
		hint: "Keep connection, best-path, and cycle-risk highlight colors enabled.",
		performanceWarning: "Hint colors are cheap by themselves, but they also enable the expensive cast-lock analysis when the cast-lock overlay is on.",
		requires: "show-suggestions",
	},
	{
		id: "write-in-autosuggest",
		label: "Autosuggest while typing",
		hint: "Show live type-ahead matches in the write-in field. Submit matching still stays fuzzy even when this is off.",
		section: "helpers",
	},
	{
		id: "show-visited-suggestions",
		label: "Show visited cards",
		hint: "Keep already-used nodes visible in the list.",
		section: "suggestion-list",
	},
	{
		id: "guarantee-best-path-suggestion",
		label: "Always show best-path card",
		hint: "Pin one shortest-path option when one exists.",
		section: "suggestion-list",
	},
	{
		id: "shuffle-adds-penalty",
		label: "Shuffle adds score penalty",
		hint: "Apply the shuffle or non-shuffled-game score penalty at the end of the run.",
		section: "penalties",
	},
	{
		id: "rewind-adds-penalty",
		label: "Rewind adds score penalty",
		hint: "Apply rewind penalties to the final score calculation.",
		section: "penalties",
	},
	{
		id: "cycle-risk-click-adds-penalty",
		label: "Cycle risk click adds penalty",
		hint: "Clicking a cycle-risk card adds a dead-end penalty instead of extending the path.",
		section: "penalties",
	},
	{
		id: "show-cast-lock-risk",
		label: "Show path risk overlay",
		hint: "Mark movies that only lead back into used routes.",
		performanceWarning: "This adds extra per-suggestion path analysis and is one of the biggest gameplay-time performance costs.",
		section: "suggestion-list",
	},
];

export const GAME_SETTINGS_KEY = "co-stars-game-settings";

export const DEFAULT_CUSTOM_SETTINGS: DifficultySettings = { ...ALL_ON_CUSTOM_SETTINGS };

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
	sortMode: "default",
};

export const DEFAULT_GAME_SETTINGS: GameDifficultySettings = {
	difficulty: "all-on",
	customSettings: { ...DEFAULT_CUSTOM_SETTINGS },
	dataFilters: { ...DEFAULT_DATA_FILTERS },
	suggestionDisplay: { ...DEFAULT_SUGGESTION_DISPLAY },
	completionDarkMode: false,
};

export type GameSettingsContextValue = {
	settings: GameDifficultySettings;
	setDifficulty: (difficulty: DifficultyOption) => void;
	setCustomSetting: (settingId: keyof DifficultySettings, enabled: boolean) => void;
	setCompletionDarkMode: (enabled: boolean) => void;
	setActorPopularityCutoff: (cutoff: number | null) => void;
	setReleaseYearCutoff: (year: number | null) => void;
	setMovieSortMode: (mode: GameDataFilters["movieSortMode"]) => void;
	setActorSortMode: (mode: GameDataFilters["actorSortMode"]) => void;
	setSuggestionViewMode: (mode: SuggestionDisplaySettings["viewMode"]) => void;
	setSubsetCount: (count: number) => void;
	setAllWindowMode: (mode: SuggestionDisplaySettings["allWindowMode"]) => void;
	setSuggestionOrderMode: (mode: SuggestionDisplaySettings["orderMode"]) => void;
	setSuggestionSortMode: (mode: SuggestionDisplaySettings["sortMode"]) => void;
};

export const GameSettingsContext = createContext<GameSettingsContextValue | null>(null);

function isDifficultyOption(value: unknown): value is DifficultyOption {
	return value === "all-on" || value === "all-off" || value === "custom";
}

function mapLegacyDifficultyOption(value: unknown): DifficultyOption | null {
	if (value === "hard") {
		return "all-on";
	}

	if (value === "easy") {
		return "all-off";
	}

	if (value === "medium") {
		return "custom";
	}

	return null;
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
		(obj.orderMode === "ranked" || obj.orderMode === "shuffled") &&
		(obj.sortMode === "default" || obj.sortMode === "best-path" || obj.sortMode === "random")
	);
}

function matchesDifficultySettings(left: DifficultySettings, right: DifficultySettings) {
	return Object.keys(left).every((key) => left[key as keyof DifficultySettings] === right[key as keyof DifficultySettings]);
}

export function inferDifficultyPreset(customSettings: DifficultySettings): DifficultyOption {
	if (matchesDifficultySettings(customSettings, ALL_ON_CUSTOM_SETTINGS)) {
		return "all-on";
	}

	if (matchesDifficultySettings(customSettings, ALL_OFF_CUSTOM_SETTINGS)) {
		return "all-off";
	}

	return "custom";
}

export function getDifficultyPresetSettings(difficulty: DifficultyOption): DifficultySettings | null {
	if (difficulty === "all-on") {
		return { ...ALL_ON_CUSTOM_SETTINGS };
	}

	if (difficulty === "all-off") {
		return { ...ALL_OFF_CUSTOM_SETTINGS };
	}

	return null;
}

export function applyDifficultyToSuggestionDisplay(
	difficulty: DifficultyOption,
	suggestionDisplay: SuggestionDisplaySettings,
): SuggestionDisplaySettings {
	if (difficulty === "all-on") {
		return {
			...suggestionDisplay,
			viewMode: "all",
			allWindowMode: "scroll",
			orderMode: "ranked",
		};
	}

	if (difficulty === "all-off") {
		return {
			...suggestionDisplay,
			viewMode: "subset",
			orderMode: "shuffled",
		};
	}

	return suggestionDisplay;
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
		const normalizedDifficulty = isDifficultyOption(parsed.difficulty)
			? parsed.difficulty
			: mapLegacyDifficultyOption(parsed.difficulty);

		if (!normalizedDifficulty || !isDifficultySettings(parsed.customSettings)) {
			return DEFAULT_GAME_SETTINGS;
		}

		const normalizedDataFilters = isGameDataFilters(parsed.dataFilters)
			? parsed.dataFilters
			: { ...DEFAULT_DATA_FILTERS };
		const inferredDifficulty = inferDifficultyPreset(parsed.customSettings);

		return {
			difficulty: normalizedDifficulty === "custom" ? inferredDifficulty : normalizedDifficulty,
			customSettings: parsed.customSettings,
			dataFilters: normalizedDataFilters,
			suggestionDisplay: isSuggestionDisplaySettings(parsed.suggestionDisplay)
				? parsed.suggestionDisplay
				: { ...DEFAULT_SUGGESTION_DISPLAY },
			completionDarkMode: parsed.completionDarkMode === true,
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