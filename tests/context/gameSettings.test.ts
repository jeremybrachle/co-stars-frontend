import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_OFF_CUSTOM_SETTINGS,
  ALL_ON_CUSTOM_SETTINGS,
  applyDifficultyToSuggestionDisplay,
  CUSTOM_SETTING_DEFINITIONS,
  DEFAULT_CUSTOM_SETTINGS,
  DEFAULT_GAME_SETTINGS,
  GAME_SETTINGS_KEY,
  getDifficultyPresetSettings,
  inferDifficultyPreset,
  readStoredGameSettings,
} from "../../src/context/gameSettings";

function withMockWindow(storedValue: string | null, callback: () => void) {
  const originalWindow = globalThis.window;
  const storage = new Map<string, string>();

  if (storedValue !== null) {
    storage.set(GAME_SETTINGS_KEY, storedValue);
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    },
  });

  try {
    callback();
  } finally {
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: originalWindow,
      });
    }
  }
}

test("default custom settings include the new suggestion-list and penalty toggles", () => {
  assert.equal(DEFAULT_CUSTOM_SETTINGS["start-with-suggestion-panel"], true);
  assert.equal(DEFAULT_CUSTOM_SETTINGS["show-visited-suggestions"], true);
  assert.equal(DEFAULT_CUSTOM_SETTINGS["shuffle-adds-penalty"], true);
  assert.equal(DEFAULT_CUSTOM_SETTINGS["rewind-adds-penalty"], true);
  assert.equal(DEFAULT_CUSTOM_SETTINGS["cycle-risk-click-adds-penalty"], true);

  const ids = CUSTOM_SETTING_DEFINITIONS.map((setting) => setting.id);
  assert.ok(ids.includes("start-with-suggestion-panel"));
  assert.ok(ids.includes("show-visited-suggestions"));
  assert.ok(ids.includes("shuffle-adds-penalty"));
  assert.ok(ids.includes("rewind-adds-penalty"));
  assert.ok(ids.includes("cycle-risk-click-adds-penalty"));
  assert.ok(!ids.includes("sort-suggestions-by-risk-priority" as never));
});

test("readStoredGameSettings restores persisted values for toggles and suggestion display settings", () => {
  withMockWindow(
    JSON.stringify({
      difficulty: "custom",
      customSettings: {
        ...DEFAULT_CUSTOM_SETTINGS,
        "show-visited-suggestions": false,
        "shuffle-adds-penalty": false,
        "cycle-risk-click-adds-penalty": true,
      },
      dataFilters: DEFAULT_GAME_SETTINGS.dataFilters,
      suggestionDisplay: {
        ...DEFAULT_GAME_SETTINGS.suggestionDisplay,
        orderMode: "shuffled",
        sortMode: "best-path",
        subsetCount: 6,
        viewMode: "subset",
      },
    }),
    () => {
      const settings = readStoredGameSettings();

      assert.equal(settings.customSettings["show-visited-suggestions"], false);
      assert.equal(settings.customSettings["shuffle-adds-penalty"], false);
      assert.equal(settings.customSettings["cycle-risk-click-adds-penalty"], true);
      assert.equal(settings.difficulty, "custom");
      assert.equal(settings.suggestionDisplay.orderMode, "shuffled");
      assert.equal(settings.suggestionDisplay.sortMode, "best-path");
      assert.equal(settings.suggestionDisplay.subsetCount, 6);
    },
  );
});

test("readStoredGameSettings falls back to defaults when new toggle keys are missing", () => {
  withMockWindow(
    JSON.stringify({
      difficulty: "custom",
      customSettings: {
        "show-suggestions": true,
        "show-hint-color": true,
        "show-optimal-tracking": true,
        "guarantee-best-path-suggestion": false,
        "show-cast-lock-risk": true,
      },
    }),
    () => {
      assert.deepEqual(readStoredGameSettings(), DEFAULT_GAME_SETTINGS);
    },
  );
});

test("readStoredGameSettings preserves random sort preferences", () => {
  withMockWindow(
    JSON.stringify({
      difficulty: "custom",
      customSettings: DEFAULT_CUSTOM_SETTINGS,
      dataFilters: {
        ...DEFAULT_GAME_SETTINGS.dataFilters,
        movieSortMode: "random",
        actorSortMode: "random",
      },
      suggestionDisplay: {
        ...DEFAULT_GAME_SETTINGS.suggestionDisplay,
        sortMode: "random",
      },
    }),
    () => {
      const settings = readStoredGameSettings();

      assert.equal(settings.dataFilters.movieSortMode, "random");
      assert.equal(settings.dataFilters.actorSortMode, "random");
      assert.equal(settings.suggestionDisplay.sortMode, "random");
    },
  );
});

test("readStoredGameSettings infers the all-on preset from stored settings", () => {
  withMockWindow(
    JSON.stringify({
      difficulty: "custom",
      customSettings: ALL_ON_CUSTOM_SETTINGS,
      dataFilters: DEFAULT_GAME_SETTINGS.dataFilters,
      suggestionDisplay: DEFAULT_GAME_SETTINGS.suggestionDisplay,
    }),
    () => {
      const settings = readStoredGameSettings();
      assert.equal(settings.difficulty, "all-on");
    },
  );
});

test("readStoredGameSettings preserves the all-off preset", () => {
  withMockWindow(
    JSON.stringify({
      difficulty: "all-off",
      customSettings: ALL_OFF_CUSTOM_SETTINGS,
      dataFilters: DEFAULT_GAME_SETTINGS.dataFilters,
      suggestionDisplay: DEFAULT_GAME_SETTINGS.suggestionDisplay,
    }),
    () => {
      const settings = readStoredGameSettings();
      assert.equal(settings.difficulty, "all-off");
      assert.deepEqual(settings.customSettings, ALL_OFF_CUSTOM_SETTINGS);
    },
  );
});

test("readStoredGameSettings maps legacy hard difficulty to all-on", () => {
  withMockWindow(
    JSON.stringify({
      difficulty: "hard",
      customSettings: ALL_ON_CUSTOM_SETTINGS,
      dataFilters: DEFAULT_GAME_SETTINGS.dataFilters,
      suggestionDisplay: DEFAULT_GAME_SETTINGS.suggestionDisplay,
    }),
    () => {
      const settings = readStoredGameSettings();
      assert.equal(settings.difficulty, "all-on");
    },
  );
});

test("inferDifficultyPreset reports custom when any toggle differs from the presets", () => {
  assert.equal(inferDifficultyPreset(ALL_ON_CUSTOM_SETTINGS), "all-on");
  assert.equal(inferDifficultyPreset(ALL_OFF_CUSTOM_SETTINGS), "all-off");
  assert.equal(inferDifficultyPreset({
    ...ALL_ON_CUSTOM_SETTINGS,
    "show-suggestions": false,
  }), "custom");
});

test("getDifficultyPresetSettings returns cloned preset values and null for custom", () => {
  const allOn = getDifficultyPresetSettings("all-on");
  const allOff = getDifficultyPresetSettings("all-off");

  assert.deepEqual(allOn, ALL_ON_CUSTOM_SETTINGS);
  assert.deepEqual(allOff, ALL_OFF_CUSTOM_SETTINGS);
  assert.notEqual(allOn, ALL_ON_CUSTOM_SETTINGS);
  assert.notEqual(allOff, ALL_OFF_CUSTOM_SETTINGS);
  assert.equal(getDifficultyPresetSettings("custom"), null);
});

test("applyDifficultyToSuggestionDisplay normalizes all-on and all-off display defaults", () => {
  const base = {
    ...DEFAULT_GAME_SETTINGS.suggestionDisplay,
    viewMode: "subset" as const,
    allWindowMode: "pagination" as const,
    orderMode: "shuffled" as const,
  };

  assert.deepEqual(applyDifficultyToSuggestionDisplay("all-on", base), {
    ...base,
    viewMode: "all",
    allWindowMode: "scroll",
    orderMode: "ranked",
  });

  assert.deepEqual(applyDifficultyToSuggestionDisplay("all-off", base), {
    ...base,
    viewMode: "subset",
    orderMode: "shuffled",
  });

  assert.equal(applyDifficultyToSuggestionDisplay("custom", base), base);
});