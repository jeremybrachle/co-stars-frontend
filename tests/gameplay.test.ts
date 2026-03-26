import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSuggestionSet,
  combineMeetingPath,
  getNodeKey,
  isDirectConnectionSuggestion,
  isSameNode,
  shuffleSuggestionsWithSeed,
} from "../src/gameplay";
import type { GameNode } from "../src/types";

function createActorSuggestion(label: string, popularity: number, stepsToTarget: number): GameNode {
  return {
    id: popularity,
    label,
    type: "actor",
    popularity,
    pathHint: {
      reachable: true,
      stepsToTarget,
      path: [{ id: 999, label: "Target", type: "actor" }],
    },
  };
}

test("shuffleSuggestionsWithSeed is deterministic and non-mutating", () => {
  const values = [1, 2, 3, 4, 5];
  const first = shuffleSuggestionsWithSeed(values, 17);
  const second = shuffleSuggestionsWithSeed(values, 17);
  const third = shuffleSuggestionsWithSeed(values, 23);

  assert.deepEqual(first, second);
  assert.deepEqual(values, [1, 2, 3, 4, 5]);
  assert.notDeepEqual(first, third);
});

test("buildSuggestionSet keeps the guaranteed best-path suggestion pinned first", () => {
  const target: GameNode = { id: 999, label: "Target", type: "actor" };
  const suggestions = [
    createActorSuggestion("Long Route", 80, 4),
    createActorSuggestion("Best Route", 40, 1),
    createActorSuggestion("Middle Route", 60, 2),
  ];

  const result = buildSuggestionSet(suggestions, target, new Set(), {
    shouldGuaranteeBestPath: true,
    shouldShuffle: false,
    sortMode: "random",
    suggestionLimit: null,
  });

  assert.equal(result[0]?.label, "Best Route");
});

test("buildSuggestionSet default mode respects actor popularity as a tie-breaker", () => {
  const target: GameNode = { id: 999, label: "Target", type: "actor" };
  const suggestions = [
    createActorSuggestion("Less Popular", 20, 2),
    createActorSuggestion("More Popular", 90, 2),
  ];

  const result = buildSuggestionSet(suggestions, target, new Set(), {
    shouldShuffle: false,
    sortMode: "default",
    suggestionLimit: null,
  });

  assert.deepEqual(result.map((entry) => entry.label), ["More Popular", "Less Popular"]);
});

test("buildSuggestionSet best-path mode prioritizes fewer steps over popularity", () => {
  const target: GameNode = { id: 999, label: "Target", type: "actor" };
  const suggestions = [
    createActorSuggestion("Popular Longer Path", 95, 3),
    createActorSuggestion("Less Popular Shorter Path", 10, 1),
  ];

  const result = buildSuggestionSet(suggestions, target, new Set(), {
    shouldShuffle: false,
    sortMode: "best-path",
    suggestionLimit: null,
  });

  assert.deepEqual(result.map((entry) => entry.label), ["Less Popular Shorter Path", "Popular Longer Path"]);
});

test("getNodeKey falls back to normalized labels when ids are missing", () => {
  assert.equal(getNodeKey({ type: "actor", label: "  Brad Pitt  " }), "actor:brad pitt");
  assert.equal(getNodeKey({ id: 7, type: "movie", label: "Ignored" }), "movie:7");
});

test("isSameNode matches by id when present and falls back to normalized labels", () => {
  assert.equal(isSameNode(
    { id: 5, type: "actor", label: "Actor A" },
    { id: 5, type: "actor", label: "Someone Else" },
  ), true);
  assert.equal(isSameNode(
    { type: "movie", label: " Ocean's Eleven " },
    { type: "movie", label: "ocean's eleven" },
  ), true);
  assert.equal(isSameNode(
    { type: "movie", label: "Ocean's Eleven" },
    { type: "actor", label: "Ocean's Eleven" },
  ), false);
});

test("isDirectConnectionSuggestion only returns true for reachable hints ending at the target", () => {
  const target: GameNode = { id: 999, label: "Target", type: "actor" };

  assert.equal(isDirectConnectionSuggestion({
    id: 1,
    label: "Direct",
    type: "movie",
    pathHint: {
      reachable: true,
      stepsToTarget: 1,
      path: [{ id: 999, label: "Target", type: "actor" }],
    },
  }, target), true);

  assert.equal(isDirectConnectionSuggestion({
    id: 2,
    label: "Wrong Target",
    type: "movie",
    pathHint: {
      reachable: true,
      stepsToTarget: 1,
      path: [{ id: 7, label: "Other", type: "actor" }],
    },
  }, target), false);
});

test("buildSuggestionSet marks blocked loop nodes with a blocked highlight", () => {
  const target: GameNode = { id: 999, label: "Target", type: "actor" };
  const suggestions: GameNode[] = [
    createActorSuggestion("Blocked Route", 60, 2),
    createActorSuggestion("Open Route", 40, 1),
  ];

  const result = buildSuggestionSet(suggestions, target, new Set([getNodeKey(suggestions[0])]), {
    shouldShuffle: false,
    sortMode: "default",
    suggestionLimit: null,
  });

  assert.equal(result.find((entry) => entry.label === "Blocked Route")?.highlight?.kind, "blocked");
});

test("combineMeetingPath joins top and bottom routes only when they meet at the same node", () => {
  const startA: GameNode = { id: 1, label: "Actor A", type: "actor" };
  const meeting: GameNode = { id: 10, label: "Shared Movie", type: "movie" };
  const startB: GameNode = { id: 2, label: "Actor B", type: "actor" };

  assert.deepEqual(
    combineMeetingPath(startA, [meeting], startB, [meeting]),
    [startA, meeting, startB],
  );

  assert.equal(
    combineMeetingPath(startA, [meeting], startB, [{ id: 11, label: "Different Movie", type: "movie" }]),
    null,
  );
});