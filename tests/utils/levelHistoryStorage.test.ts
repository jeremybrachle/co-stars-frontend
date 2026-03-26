import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHopLeaderboardGroups,
  buildLevelStorageKey,
  clearLevelHistoryStorage,
  getLevelHistory,
  saveLevelAttempt,
} from "../../src/utils/levelHistoryStorage";

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
  const listeners = new Map<string, Set<() => void>>();
  const localStorage = createLocalStorageMock();

  const mockWindow = {
    localStorage,
    addEventListener(type: string, listener: () => void) {
      const entries = listeners.get(type) ?? new Set<() => void>();
      entries.add(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: Event) {
      listeners.get(event.type)?.forEach((listener) => listener());
      return true;
    },
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: mockWindow,
  });

  return () => {
    Reflect.deleteProperty(globalThis, "window");
  };
}

test("buildLevelStorageKey is order independent", () => {
  assert.equal(
    buildLevelStorageKey("George Clooney", "Brad Pitt"),
    buildLevelStorageKey("Brad Pitt", "George Clooney"),
  );
});

test("saveLevelAttempt stores unique attempts and groups them by hops", () => {
  const restoreWindow = installWindowMock();
  clearLevelHistoryStorage();

  saveLevelAttempt("George Clooney", "Julia Roberts", {
    path: [
      { id: 1, type: "actor", label: "George Clooney" },
      { id: 10, type: "movie", label: "Ocean's Eleven" },
      { id: 3, type: "actor", label: "Julia Roberts" },
    ],
    score: 96,
    hops: 2,
    turns: 2,
    effectiveTurns: 2,
    shuffles: 0,
    shuffleModeEnabled: true,
    appliedShufflePenaltyCount: 0,
    rewinds: 0,
    deadEnds: 0,
    popularityScore: 12,
    averageReleaseYear: 2001,
    timestamp: 10,
  });

  saveLevelAttempt("George Clooney", "Julia Roberts", {
    path: [
      { id: 1, type: "actor", label: "George Clooney" },
      { id: 10, type: "movie", label: "Ocean's Eleven" },
      { id: 3, type: "actor", label: "Julia Roberts" },
    ],
    score: 96,
    hops: 2,
    turns: 2,
    effectiveTurns: 2,
    shuffles: 0,
    shuffleModeEnabled: true,
    appliedShufflePenaltyCount: 0,
    rewinds: 0,
    deadEnds: 0,
    popularityScore: 12,
    averageReleaseYear: 2001,
    timestamp: 11,
  });

  saveLevelAttempt("George Clooney", "Julia Roberts", {
    path: [
      { id: 1, type: "actor", label: "George Clooney" },
      { id: 11, type: "movie", label: "Ocean's Twelve" },
      { id: 4, type: "actor", label: "Matt Damon" },
      { id: 12, type: "movie", label: "The Mexican" },
      { id: 3, type: "actor", label: "Julia Roberts" },
    ],
    score: 71,
    hops: 4,
    turns: 4,
    effectiveTurns: 6,
    shuffles: 1,
    shuffleModeEnabled: false,
    appliedShufflePenaltyCount: 1,
    rewinds: 1,
    deadEnds: 0,
    popularityScore: 18,
    averageReleaseYear: 2002.5,
    timestamp: 12,
  });

  const history = getLevelHistory("George Clooney", "Julia Roberts");
  assert.ok(history);
  assert.equal(history.attempts.length, 2);

  const groups = buildHopLeaderboardGroups(history.attempts);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].hops, 2);
  assert.equal(groups[0].attempts[0].score, 96);
  assert.equal(groups[0].attempts[0].shuffleModeEnabled, true);
  assert.equal(groups[0].attempts[0].turns, 2);
  assert.equal(groups[0].attempts[0].popularityScore, 12);
  assert.equal(groups[1].hops, 4);
  assert.equal(groups[1].attempts[0].shuffleModeEnabled, false);
  assert.equal(groups[1].attempts[0].appliedShufflePenaltyCount, 1);
  assert.equal(groups[1].attempts[0].effectiveTurns, 6);
  assert.equal(groups[1].attempts[0].averageReleaseYear, 2002.5);

  restoreWindow();
});