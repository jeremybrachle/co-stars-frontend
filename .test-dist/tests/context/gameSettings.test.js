"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const gameSettings_1 = require("../../src/context/gameSettings");
function withMockWindow(storedValue, callback) {
    const originalWindow = globalThis.window;
    const storage = new Map();
    if (storedValue !== null) {
        storage.set(gameSettings_1.GAME_SETTINGS_KEY, storedValue);
    }
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            localStorage: {
                getItem: (key) => storage.get(key) ?? null,
                setItem: (key, value) => {
                    storage.set(key, value);
                },
            },
        },
    });
    try {
        callback();
    }
    finally {
        if (originalWindow === undefined) {
            Reflect.deleteProperty(globalThis, "window");
        }
        else {
            Object.defineProperty(globalThis, "window", {
                configurable: true,
                value: originalWindow,
            });
        }
    }
}
(0, node_test_1.default)("default custom settings include the new suggestion-list and penalty toggles", () => {
    strict_1.default.equal(gameSettings_1.DEFAULT_CUSTOM_SETTINGS["start-with-suggestion-panel"], true);
    strict_1.default.equal(gameSettings_1.DEFAULT_CUSTOM_SETTINGS["show-visited-suggestions"], true);
    strict_1.default.equal(gameSettings_1.DEFAULT_CUSTOM_SETTINGS["shuffle-adds-penalty"], true);
    strict_1.default.equal(gameSettings_1.DEFAULT_CUSTOM_SETTINGS["rewind-adds-penalty"], true);
    strict_1.default.equal(gameSettings_1.DEFAULT_CUSTOM_SETTINGS["cycle-risk-click-adds-penalty"], true);
    const ids = gameSettings_1.CUSTOM_SETTING_DEFINITIONS.map((setting) => setting.id);
    strict_1.default.ok(ids.includes("start-with-suggestion-panel"));
    strict_1.default.ok(ids.includes("show-visited-suggestions"));
    strict_1.default.ok(ids.includes("shuffle-adds-penalty"));
    strict_1.default.ok(ids.includes("rewind-adds-penalty"));
    strict_1.default.ok(ids.includes("cycle-risk-click-adds-penalty"));
    strict_1.default.ok(!ids.includes("sort-suggestions-by-risk-priority"));
});
(0, node_test_1.default)("readStoredGameSettings restores persisted values for toggles and suggestion display settings", () => {
    withMockWindow(JSON.stringify({
        difficulty: "custom",
        customSettings: {
            ...gameSettings_1.DEFAULT_CUSTOM_SETTINGS,
            "show-visited-suggestions": false,
            "shuffle-adds-penalty": false,
            "cycle-risk-click-adds-penalty": true,
        },
        dataFilters: gameSettings_1.DEFAULT_GAME_SETTINGS.dataFilters,
        suggestionDisplay: {
            ...gameSettings_1.DEFAULT_GAME_SETTINGS.suggestionDisplay,
            orderMode: "shuffled",
            sortMode: "best-path",
            subsetCount: 6,
            viewMode: "subset",
        },
    }), () => {
        const settings = (0, gameSettings_1.readStoredGameSettings)();
        strict_1.default.equal(settings.customSettings["show-visited-suggestions"], false);
        strict_1.default.equal(settings.customSettings["shuffle-adds-penalty"], false);
        strict_1.default.equal(settings.customSettings["cycle-risk-click-adds-penalty"], true);
        strict_1.default.equal(settings.difficulty, "custom");
        strict_1.default.equal(settings.suggestionDisplay.orderMode, "shuffled");
        strict_1.default.equal(settings.suggestionDisplay.sortMode, "best-path");
        strict_1.default.equal(settings.suggestionDisplay.subsetCount, 6);
    });
});
(0, node_test_1.default)("readStoredGameSettings falls back to defaults when new toggle keys are missing", () => {
    withMockWindow(JSON.stringify({
        difficulty: "custom",
        customSettings: {
            "show-suggestions": true,
            "show-hint-color": true,
            "show-optimal-tracking": true,
            "guarantee-best-path-suggestion": false,
            "show-cast-lock-risk": true,
        },
    }), () => {
        strict_1.default.deepEqual((0, gameSettings_1.readStoredGameSettings)(), gameSettings_1.DEFAULT_GAME_SETTINGS);
    });
});
(0, node_test_1.default)("readStoredGameSettings preserves random sort preferences", () => {
    withMockWindow(JSON.stringify({
        difficulty: "custom",
        customSettings: gameSettings_1.DEFAULT_CUSTOM_SETTINGS,
        dataFilters: {
            ...gameSettings_1.DEFAULT_GAME_SETTINGS.dataFilters,
            movieSortMode: "random",
            actorSortMode: "random",
        },
        suggestionDisplay: {
            ...gameSettings_1.DEFAULT_GAME_SETTINGS.suggestionDisplay,
            sortMode: "random",
        },
    }), () => {
        const settings = (0, gameSettings_1.readStoredGameSettings)();
        strict_1.default.equal(settings.dataFilters.movieSortMode, "random");
        strict_1.default.equal(settings.dataFilters.actorSortMode, "random");
        strict_1.default.equal(settings.suggestionDisplay.sortMode, "random");
    });
});
(0, node_test_1.default)("readStoredGameSettings infers the all-on preset from stored settings", () => {
    withMockWindow(JSON.stringify({
        difficulty: "custom",
        customSettings: gameSettings_1.ALL_ON_CUSTOM_SETTINGS,
        dataFilters: gameSettings_1.DEFAULT_GAME_SETTINGS.dataFilters,
        suggestionDisplay: gameSettings_1.DEFAULT_GAME_SETTINGS.suggestionDisplay,
    }), () => {
        const settings = (0, gameSettings_1.readStoredGameSettings)();
        strict_1.default.equal(settings.difficulty, "all-on");
    });
});
(0, node_test_1.default)("readStoredGameSettings preserves the all-off preset", () => {
    withMockWindow(JSON.stringify({
        difficulty: "all-off",
        customSettings: gameSettings_1.ALL_OFF_CUSTOM_SETTINGS,
        dataFilters: gameSettings_1.DEFAULT_GAME_SETTINGS.dataFilters,
        suggestionDisplay: gameSettings_1.DEFAULT_GAME_SETTINGS.suggestionDisplay,
    }), () => {
        const settings = (0, gameSettings_1.readStoredGameSettings)();
        strict_1.default.equal(settings.difficulty, "all-off");
        strict_1.default.deepEqual(settings.customSettings, gameSettings_1.ALL_OFF_CUSTOM_SETTINGS);
    });
});
(0, node_test_1.default)("readStoredGameSettings maps legacy hard difficulty to all-on", () => {
    withMockWindow(JSON.stringify({
        difficulty: "hard",
        customSettings: gameSettings_1.ALL_ON_CUSTOM_SETTINGS,
        dataFilters: gameSettings_1.DEFAULT_GAME_SETTINGS.dataFilters,
        suggestionDisplay: gameSettings_1.DEFAULT_GAME_SETTINGS.suggestionDisplay,
    }), () => {
        const settings = (0, gameSettings_1.readStoredGameSettings)();
        strict_1.default.equal(settings.difficulty, "all-on");
    });
});
(0, node_test_1.default)("inferDifficultyPreset reports custom when any toggle differs from the presets", () => {
    strict_1.default.equal((0, gameSettings_1.inferDifficultyPreset)(gameSettings_1.ALL_ON_CUSTOM_SETTINGS), "all-on");
    strict_1.default.equal((0, gameSettings_1.inferDifficultyPreset)(gameSettings_1.ALL_OFF_CUSTOM_SETTINGS), "all-off");
    strict_1.default.equal((0, gameSettings_1.inferDifficultyPreset)({
        ...gameSettings_1.ALL_ON_CUSTOM_SETTINGS,
        "show-suggestions": false,
    }), "custom");
});
(0, node_test_1.default)("getDifficultyPresetSettings returns cloned preset values and null for custom", () => {
    const allOn = (0, gameSettings_1.getDifficultyPresetSettings)("all-on");
    const allOff = (0, gameSettings_1.getDifficultyPresetSettings)("all-off");
    strict_1.default.deepEqual(allOn, gameSettings_1.ALL_ON_CUSTOM_SETTINGS);
    strict_1.default.deepEqual(allOff, gameSettings_1.ALL_OFF_CUSTOM_SETTINGS);
    strict_1.default.notEqual(allOn, gameSettings_1.ALL_ON_CUSTOM_SETTINGS);
    strict_1.default.notEqual(allOff, gameSettings_1.ALL_OFF_CUSTOM_SETTINGS);
    strict_1.default.equal((0, gameSettings_1.getDifficultyPresetSettings)("custom"), null);
});
(0, node_test_1.default)("applyDifficultyToSuggestionDisplay normalizes all-on and all-off display defaults", () => {
    const base = {
        ...gameSettings_1.DEFAULT_GAME_SETTINGS.suggestionDisplay,
        viewMode: "subset",
        allWindowMode: "pagination",
        orderMode: "shuffled",
    };
    strict_1.default.deepEqual((0, gameSettings_1.applyDifficultyToSuggestionDisplay)("all-on", base), {
        ...base,
        viewMode: "all",
        allWindowMode: "scroll",
        orderMode: "ranked",
    });
    strict_1.default.deepEqual((0, gameSettings_1.applyDifficultyToSuggestionDisplay)("all-off", base), {
        ...base,
        viewMode: "subset",
        orderMode: "shuffled",
    });
    strict_1.default.equal((0, gameSettings_1.applyDifficultyToSuggestionDisplay)("custom", base), base);
});
