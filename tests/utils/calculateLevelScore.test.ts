import test from "node:test";
import assert from "node:assert/strict";
import { calculateLevelScore } from "../../src/utils/calculateLevelScore";

test("calculateLevelScore returns 100 for an optimal clean run", () => {
  assert.equal(calculateLevelScore({
    hops: 3,
    optimalHops: 3,
    suggestionAssists: 0,
    shuffles: 0,
    rewinds: 0,
    deadEnds: 0,
  }), 100);
});

test("calculateLevelScore penalizes extra hops and mistakes", () => {
  assert.equal(calculateLevelScore({
    hops: 5,
    optimalHops: 3,
    suggestionAssists: 1,
    shuffles: 1,
    rewinds: 2,
    deadEnds: 1,
  }), 38);
});

test("calculateLevelScore never drops below zero", () => {
  assert.equal(calculateLevelScore({
    hops: 10,
    optimalHops: 2,
    suggestionAssists: 1,
    shuffles: 10,
    rewinds: 10,
    deadEnds: 10,
  }), 0);
});

test("calculateLevelScore applies a flat suggestion-assist penalty", () => {
  assert.equal(calculateLevelScore({
    hops: 3,
    optimalHops: 3,
    suggestionAssists: 1,
    shuffles: 0,
    rewinds: 0,
    deadEnds: 0,
  }), 95);
});
