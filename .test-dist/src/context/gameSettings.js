"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSettingsContext = exports.DEFAULT_GAME_SETTINGS = exports.DEFAULT_SUGGESTION_DISPLAY = exports.DEFAULT_DATA_FILTERS = exports.DEFAULT_CUSTOM_SETTINGS = exports.GAME_SETTINGS_KEY = exports.CUSTOM_SETTING_DEFINITIONS = void 0;
exports.readStoredGameSettings = readStoredGameSettings;
exports.useGameSettings = useGameSettings;
const react_1 = require("react");
exports.CUSTOM_SETTING_DEFINITIONS = [
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
exports.GAME_SETTINGS_KEY = "co-stars-game-settings";
exports.DEFAULT_CUSTOM_SETTINGS = {
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
exports.DEFAULT_DATA_FILTERS = {
    actorPopularityCutoff: 1.8,
    releaseYearCutoff: null,
    movieSortMode: "releaseYear",
    actorSortMode: "popularity",
};
exports.DEFAULT_SUGGESTION_DISPLAY = {
    viewMode: "subset",
    subsetCount: 8,
    allWindowMode: "pagination",
};
exports.DEFAULT_GAME_SETTINGS = {
    difficulty: "custom",
    customSettings: { ...exports.DEFAULT_CUSTOM_SETTINGS },
    dataFilters: { ...exports.DEFAULT_DATA_FILTERS },
    suggestionDisplay: { ...exports.DEFAULT_SUGGESTION_DISPLAY },
};
exports.GameSettingsContext = (0, react_1.createContext)(null);
function isDifficultyOption(value) {
    return value === "easy" || value === "medium" || value === "hard" || value === "custom";
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
        (obj.allWindowMode === "pagination" || obj.allWindowMode === "scroll"));
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
        if (!isDifficultyOption(parsed.difficulty) || !isDifficultySettings(parsed.customSettings)) {
            return exports.DEFAULT_GAME_SETTINGS;
        }
        return {
            difficulty: parsed.difficulty,
            customSettings: parsed.customSettings,
            dataFilters: isGameDataFilters(parsed.dataFilters) ? parsed.dataFilters : { ...exports.DEFAULT_DATA_FILTERS },
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
