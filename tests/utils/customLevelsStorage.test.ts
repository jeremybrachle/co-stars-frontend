/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PLAYER_CUSTOM_LEVELS,
  buildCustomLevelLabel,
  deletePlayerCustomLevel,
  getPlayerCustomLevel,
  readPlayerCustomLevels,
  savePlayerCustomLevel,
  subscribeToPlayerCustomLevels,
  type CustomLevelDraft,
} from "../../src/utils/customLevelsStorage";

type WindowListener = (event?: Event | { key?: string | null; type?: string }) => void;

function createDraft(seed: number): CustomLevelDraft {
  return {
    startNode: { id: seed, type: "actor", label: `Actor ${seed}` },
    targetNode: { id: seed + 1000, type: "movie", label: `Movie ${seed}` },
    actorPopularityCutoff: seed % 2 === 0 ? 10 + seed : null,
    releaseYearCutoff: 1990 + seed,
    optimalHops: seed % 4,
    optimalPath: [
      { id: seed, type: "actor", label: `Actor ${seed}` },
      { id: seed + 2000, type: "movie", label: `Bridge ${seed}` },
      { id: seed + 1000, type: "movie", label: `Movie ${seed}` },
    ],
  };
}

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function installWindowMock() {
  const listeners = new Map<string, Set<WindowListener>>();
  const localStorage = createLocalStorageMock();

  const mockWindow = {
    localStorage,
    addEventListener(type: string, listener: WindowListener) {
      const entries = listeners.get(type) ?? new Set<WindowListener>();
      entries.add(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type: string, listener: WindowListener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event | { type?: string }) {
      if (!event.type) {
        return true;
      }

      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: mockWindow,
  });

  return {
    window: mockWindow,
    restore() {
      Reflect.deleteProperty(globalThis, "window");
    },
  };
}

function withMockedDateNow(values: number[], callback: () => void) {
  const originalDateNow = Date.now;
  let index = 0;
  Date.now = () => values[Math.min(index++, values.length - 1)];

  try {
    callback();
  } finally {
    Date.now = originalDateNow;
  }
}

test("savePlayerCustomLevel persists a new player level", () => {
  const { restore } = installWindowMock();

  withMockedDateNow([1000], () => {
    const { savedLevel, didUpdate } = savePlayerCustomLevel({
      ...createDraft(1),
      savedFrom: "quick-play",
    });

    assert.equal(didUpdate, false);
    assert.equal(savedLevel.createdAt, 1000);
    assert.equal(savedLevel.updatedAt, 1000);
    assert.equal(savedLevel.savedFrom, "quick-play");
    assert.equal(readPlayerCustomLevels().length, 1);
    assert.deepEqual(getPlayerCustomLevel(savedLevel.id)?.startNode, createDraft(1).startNode);
  });

  restore();
});

test("savePlayerCustomLevel updates an existing level in place", () => {
  const { restore } = installWindowMock();
  let savedId = "";
  let createdAt = 0;

  withMockedDateNow([100, 250], () => {
    const firstSave = savePlayerCustomLevel({
      ...createDraft(2),
      savedFrom: "quick-play",
    });
    savedId = firstSave.savedLevel.id;
    createdAt = firstSave.savedLevel.createdAt;

    const secondSave = savePlayerCustomLevel(
      {
        ...createDraft(5),
        savedFrom: "archive",
      },
      savedId,
    );

    assert.equal(secondSave.didUpdate, true);
    assert.equal(secondSave.savedLevel.id, savedId);
    assert.equal(secondSave.savedLevel.createdAt, createdAt);
    assert.equal(secondSave.savedLevel.updatedAt, 250);
    assert.equal(secondSave.savedLevel.savedFrom, "archive");
    assert.equal(readPlayerCustomLevels().length, 1);
    assert.equal(readPlayerCustomLevels()[0]?.startNode.label, "Actor 5");
  });

  restore();
});

test("readPlayerCustomLevels sorts stored levels by updatedAt descending and ignores malformed entries", () => {
  const { window, restore } = installWindowMock();

  window.localStorage.setItem(
    "costars.player-custom-levels.v1",
    JSON.stringify([
      { id: "bad-entry", startNode: { id: "oops" } },
      {
        id: "older",
        createdAt: 10,
        updatedAt: 11,
        savedFrom: "quick-play",
        ...createDraft(3),
      },
      {
        id: "newer",
        createdAt: 20,
        updatedAt: 99,
        savedFrom: "archive",
        ...createDraft(4),
      },
    ]),
  );

  const levels = readPlayerCustomLevels();
  assert.equal(levels.length, 2);
  assert.equal(levels[0]?.id, "newer");
  assert.equal(levels[1]?.id, "older");

  restore();
});

test("readPlayerCustomLevels returns a stable snapshot when storage is unchanged", () => {
  const { restore } = installWindowMock();

  withMockedDateNow([300], () => {
    savePlayerCustomLevel({
      ...createDraft(12),
      savedFrom: "quick-play",
    });
  });

  const firstSnapshot = readPlayerCustomLevels();
  const secondSnapshot = readPlayerCustomLevels();

  assert.equal(firstSnapshot, secondSnapshot);

  restore();
});

test("deletePlayerCustomLevel removes a saved level", () => {
  const { restore } = installWindowMock();
  let levelId = "";

  withMockedDateNow([10], () => {
    levelId = savePlayerCustomLevel({
      ...createDraft(6),
      savedFrom: "quick-play",
    }).savedLevel.id;
  });

  const nextLevels = deletePlayerCustomLevel(levelId);
  assert.equal(nextLevels.length, 0);
  assert.equal(getPlayerCustomLevel(levelId), null);

  restore();
});

test("savePlayerCustomLevel enforces the player archive limit", () => {
  const { restore } = installWindowMock();

  withMockedDateNow(Array.from({ length: MAX_PLAYER_CUSTOM_LEVELS }, (_, index) => index + 1), () => {
    for (let index = 0; index < MAX_PLAYER_CUSTOM_LEVELS; index += 1) {
      savePlayerCustomLevel({
        ...createDraft(index + 10),
        savedFrom: "quick-play",
      });
    }
  });

  assert.throws(
    () => {
      savePlayerCustomLevel({
        ...createDraft(999),
        savedFrom: "archive",
      });
    },
    /at most 10 custom levels/i,
  );

  restore();
});

test("subscribeToPlayerCustomLevels reacts to save and delete operations", () => {
  const { restore } = installWindowMock();
  let notificationCount = 0;
  const unsubscribe = subscribeToPlayerCustomLevels(() => {
    notificationCount += 1;
  });

  let levelId = "";
  withMockedDateNow([50], () => {
    levelId = savePlayerCustomLevel({
      ...createDraft(8),
      savedFrom: "quick-play",
    }).savedLevel.id;
  });
  deletePlayerCustomLevel(levelId);
  unsubscribe();

  assert.equal(notificationCount, 2);
  restore();
});

test("buildCustomLevelLabel combines the endpoint labels", () => {
  assert.equal(
    buildCustomLevelLabel(createDraft(7)),
    "Actor 7 -> Movie 7",
  );
});
