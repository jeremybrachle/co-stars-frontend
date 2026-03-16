import test from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOM_SETTING_DEFINITIONS,
  DEFAULT_CUSTOM_SETTINGS,
  DEFAULT_GAME_SETTINGS,
  GAME_SETTINGS_KEY,
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
  assert.equal(DEFAULT_CUSTOM_SETTINGS["show-visited-suggestions"], true);
  assert.equal(DEFAULT_CUSTOM_SETTINGS["sort-suggestions-by-risk-priority"], false);
  assert.equal(DEFAULT_CUSTOM_SETTINGS["cycle-risk-click-adds-penalty"], false);

  const ids = CUSTOM_SETTING_DEFINITIONS.map((setting) => setting.id);
  assert.ok(ids.includes("show-visited-suggestions"));
  assert.ok(ids.includes("sort-suggestions-by-risk-priority"));
  assert.ok(ids.includes("cycle-risk-click-adds-penalty"));
});

test("readStoredGameSettings restores persisted values for the new toggles", () => {
  withMockWindow(
    JSON.stringify({
      difficulty: "custom",
      customSettings: {
        ...DEFAULT_CUSTOM_SETTINGS,
        "show-visited-suggestions": false,
        "sort-suggestions-by-risk-priority": true,
        "cycle-risk-click-adds-penalty": true,
      },
      dataFilters: DEFAULT_GAME_SETTINGS.dataFilters,
      suggestionDisplay: DEFAULT_GAME_SETTINGS.suggestionDisplay,
    }),
    () => {
      const settings = readStoredGameSettings();

      assert.equal(settings.customSettings["show-visited-suggestions"], false);
      assert.equal(settings.customSettings["sort-suggestions-by-risk-priority"], true);
      assert.equal(settings.customSettings["cycle-risk-click-adds-penalty"], true);
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
        "show-full-cast-lock": true,
      },
    }),
    () => {
      assert.deepEqual(readStoredGameSettings(), DEFAULT_GAME_SETTINGS);
    },
  );
});