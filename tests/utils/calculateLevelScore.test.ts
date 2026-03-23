import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLevelScoreBreakdown,
  calculateLevelScore,
  getEffectiveTurnCount,
  getLevelScoreStars,
  getLevelScoreTier,
} from "../../src/utils/calculateLevelScore";

test("calculateLevelScore returns 100 for an optimal clean run", () => {
  assert.equal(calculateLevelScore({
    hops: 3,
    optimalHops: 3,
    turns: 3,
    usedSuggestions: false,
    usedFilteredSuggestions: false,
    usedFullSuggestionList: false,
    usedRandomSubset: false,
    shuffles: 0,
    rewinds: 0,
    repeatNodeClicks: 0,
    deadEnds: 0,
  }), 100);
});

test("calculateLevelScore applies flat and incremental penalties", () => {
  assert.equal(calculateLevelScore({
    hops: 5,
    optimalHops: 3,
    turns: 5,
    usedSuggestions: true,
    usedFilteredSuggestions: true,
    usedFullSuggestionList: true,
    usedRandomSubset: false,
    shuffles: 1,
    rewinds: 2,
    repeatNodeClicks: 1,
    deadEnds: 1,
  }), 53);
});

test("calculateLevelScore never drops below zero", () => {
  assert.equal(calculateLevelScore({
    hops: 10,
    optimalHops: 2,
    turns: 10,
    usedSuggestions: true,
    usedFilteredSuggestions: true,
    usedFullSuggestionList: true,
    usedRandomSubset: true,
    shuffles: 10,
    rewinds: 10,
    repeatNodeClicks: 4,
    deadEnds: 10,
  }), 0);
});

test("getLevelScoreTier uses gold, silver, and bronze hop bands", () => {
  assert.equal(getLevelScoreTier(3, 3), "GOLD");
  assert.equal(getLevelScoreTier(5, 3), "SILVER");
  assert.equal(getLevelScoreTier(6, 3), "BRONZE");
});

test("getLevelScoreStars maps score thresholds to 0-3 stars", () => {
  assert.equal(getLevelScoreStars(95), 3);
  assert.equal(getLevelScoreStars(80), 2);
  assert.equal(getLevelScoreStars(60), 1);
  assert.equal(getLevelScoreStars(59), 0);
});

test("getEffectiveTurnCount normalizes negative and fractional counts", () => {
  assert.equal(getEffectiveTurnCount({
    turns: -2,
    shuffles: 1.7,
    rewinds: 2.2,
    repeatNodeClicks: 1.2,
    deadEnds: -4,
  }), 5);
});

test("buildLevelScoreBreakdown reports the new tier, penalties, and stars", () => {
  const breakdown = buildLevelScoreBreakdown({
    hops: 4,
    optimalHops: 2,
    turns: 3,
    usedSuggestions: true,
    usedFilteredSuggestions: false,
    usedFullSuggestionList: false,
    usedRandomSubset: true,
    shuffles: 1,
    rewinds: 0,
    repeatNodeClicks: 1,
    deadEnds: 1,
  });

  assert.equal(breakdown.tier, "SILVER");
  assert.equal(breakdown.playerNodes, 5);
  assert.equal(breakdown.optimalNodes, 3);
  assert.equal(breakdown.extraTurns, 1);
  assert.equal(breakdown.totalMistakes, 2);
  assert.equal(breakdown.effectiveTurns, 6);
  assert.equal(breakdown.penalties.suggestions, 10);
  assert.equal(breakdown.penalties.randomSubset, 5);
  assert.equal(breakdown.penalties.shuffles, 2);
  assert.equal(breakdown.penalties.extraTurns, 2);
  assert.equal(breakdown.penalties.mistakes, 10);
  assert.equal(breakdown.score, 71);
  assert.equal(breakdown.stars, 1);
});

test("buildLevelScoreBreakdown returns FAIL once total mistakes reaches five", () => {
  const breakdown = buildLevelScoreBreakdown({
    hops: 3,
    optimalHops: 3,
    turns: 3,
    usedSuggestions: false,
    usedFilteredSuggestions: false,
    usedFullSuggestionList: false,
    usedRandomSubset: false,
    shuffles: 0,
    rewinds: 0,
    repeatNodeClicks: 2,
    deadEnds: 3,
  });

  assert.equal(breakdown.failed, true);
  assert.equal(breakdown.tier, "FAIL");
  assert.equal(breakdown.score, 0);
  assert.equal(breakdown.stars, 0);
});
