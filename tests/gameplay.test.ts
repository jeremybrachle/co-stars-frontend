import test from "node:test";
import assert from "node:assert/strict";
import { buildSuggestionSet, shuffleSuggestionsWithSeed } from "../src/gameplay";
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