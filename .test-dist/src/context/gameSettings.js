"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSettingsContext = exports.DEFAULT_GAME_SETTINGS = exports.DEFAULT_SUGGESTION_DISPLAY = exports.DEFAULT_DATA_FILTERS = exports.DEFAULT_CUSTOM_SETTINGS = exports.GAME_SETTINGS_KEY = exports.CUSTOM_SETTING_DEFINITIONS = exports.ALL_OFF_CUSTOM_SETTINGS = exports.ALL_ON_CUSTOM_SETTINGS = void 0;
exports.inferDifficultyPreset = inferDifficultyPreset;
exports.getDifficultyPresetSettings = getDifficultyPresetSettings;
exports.applyDifficultyToSuggestionDisplay = applyDifficultyToSuggestionDisplay;
exports.readStoredGameSettings = readStoredGameSettings;
exports.useGameSettings = useGameSettings;
const react_1 = require("react");
exports.ALL_ON_CUSTOM_SETTINGS = {
    "show-suggestions": true,
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
exports.ALL_OFF_CUSTOM_SETTINGS = {
    "show-suggestions": false,
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
exports.CUSTOM_SETTING_DEFINITIONS = [
    {
        id: "show-optimal-tracking",
        label: "Track optimal path",
        hint: "Keep hop comparison and shortest-path guidance visible during the run.",
    },
    {
        id: "show-suggestions",
        label: "Display suggestions",
        hint: "Keep the right-panel suggestion cards visible during play. A flat score penalty applies if this is still enabled when the run ends.",
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
        label: "Autosuggest write-ins",
        hint: "Offer type-ahead matches in the write-in field and resolve partial names to the closest catalog match.",
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
exports.GAME_SETTINGS_KEY = "co-stars-game-settings";
exports.DEFAULT_CUSTOM_SETTINGS = { ...exports.ALL_ON_CUSTOM_SETTINGS };
exports.DEFAULT_DATA_FILTERS = {
    actorPopularityCutoff: 1.8,
    releaseYearCutoff: null,
    movieSortMode: "releaseYear",
    actorSortMode: "popularity",
};
exports.DEFAULT_SUGGESTION_DISPLAY = {
    viewMode: "all",
    subsetCount: 10,
    allWindowMode: "scroll",
    orderMode: "ranked",
    sortMode: "default",
};
exports.DEFAULT_GAME_SETTINGS = {
    difficulty: "all-on",
    customSettings: { ...exports.DEFAULT_CUSTOM_SETTINGS },
    dataFilters: { ...exports.DEFAULT_DATA_FILTERS },
    suggestionDisplay: { ...exports.DEFAULT_SUGGESTION_DISPLAY },
};
exports.GameSettingsContext = (0, react_1.createContext)(null);
function isDifficultyOption(value) {
    return value === "all-on" || value === "all-off" || value === "custom";
}
function mapLegacyDifficultyOption(value) {
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
function isDifficultySettings(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    return Object.keys(exports.DEFAULT_CUSTOM_SETTINGS).every((key) => typeof value[key] === "boolean");
}
function isGameDataFilters(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const obj = value;
    const cutoff = obj.actorPopularityCutoff;
    const yearCutoff = obj.releaseYearCutoff;
    const movieSort = obj.movieSortMode;
    const actorSort = obj.actorSortMode;
    return ((cutoff === null || typeof cutoff === "number") &&
        (yearCutoff === null || typeof yearCutoff === "number") &&
        (movieSort === "releaseYear" || movieSort === "random") &&
        (actorSort === "popularity" || actorSort === "random"));
}
function isSuggestionDisplaySettings(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const obj = value;
    return ((obj.viewMode === "all" || obj.viewMode === "subset") &&
        typeof obj.subsetCount === "number" &&
        Number.isFinite(obj.subsetCount) &&
        obj.subsetCount >= 2 &&
        obj.subsetCount <= 10 &&
        (obj.allWindowMode === "pagination" || obj.allWindowMode === "scroll") &&
        (obj.orderMode === "ranked" || obj.orderMode === "shuffled") &&
        (obj.sortMode === "default" || obj.sortMode === "best-path" || obj.sortMode === "random"));
}
function matchesDifficultySettings(left, right) {
    return Object.keys(left).every((key) => left[key] === right[key]);
}
function inferDifficultyPreset(customSettings) {
    if (matchesDifficultySettings(customSettings, exports.ALL_ON_CUSTOM_SETTINGS)) {
        return "all-on";
    }
    if (matchesDifficultySettings(customSettings, exports.ALL_OFF_CUSTOM_SETTINGS)) {
        return "all-off";
    }
    return "custom";
}
function getDifficultyPresetSettings(difficulty) {
    if (difficulty === "all-on") {
        return { ...exports.ALL_ON_CUSTOM_SETTINGS };
    }
    if (difficulty === "all-off") {
        return { ...exports.ALL_OFF_CUSTOM_SETTINGS };
    }
    return null;
}
function applyDifficultyToSuggestionDisplay(difficulty, suggestionDisplay) {
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
function readStoredGameSettings() {
    if (typeof window === "undefined") {
        return exports.DEFAULT_GAME_SETTINGS;
    }
    const stored = window.localStorage.getItem(exports.GAME_SETTINGS_KEY);
    if (!stored) {
        return exports.DEFAULT_GAME_SETTINGS;
    }
    try {
        const parsed = JSON.parse(stored);
        const normalizedDifficulty = isDifficultyOption(parsed.difficulty)
            ? parsed.difficulty
            : mapLegacyDifficultyOption(parsed.difficulty);
        if (!normalizedDifficulty || !isDifficultySettings(parsed.customSettings)) {
            return exports.DEFAULT_GAME_SETTINGS;
        }
        const normalizedDataFilters = isGameDataFilters(parsed.dataFilters)
            ? parsed.dataFilters
            : { ...exports.DEFAULT_DATA_FILTERS };
        const inferredDifficulty = inferDifficultyPreset(parsed.customSettings);
        return {
            difficulty: normalizedDifficulty === "custom" ? inferredDifficulty : normalizedDifficulty,
            customSettings: parsed.customSettings,
            dataFilters: normalizedDataFilters,
            suggestionDisplay: isSuggestionDisplaySettings(parsed.suggestionDisplay)
                ? parsed.suggestionDisplay
                : { ...exports.DEFAULT_SUGGESTION_DISPLAY },
        };
    }
    catch {
        return exports.DEFAULT_GAME_SETTINGS;
    }
}
function useGameSettings() {
    const context = (0, react_1.useContext)(exports.GameSettingsContext);
    if (!context) {
        throw new Error("useGameSettings must be used within GameSettingsProvider.");
    }
    return context;
}
