"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const calculateLevelScore_1 = require("../../src/utils/calculateLevelScore");
(0, node_test_1.default)("calculateLevelScore returns 100 for an optimal clean run", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
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
(0, node_test_1.default)("calculateLevelScore applies flat and incremental penalties", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
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
(0, node_test_1.default)("calculateLevelScore never drops below zero", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
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
(0, node_test_1.default)("getLevelScoreTier uses gold, silver, and bronze hop bands", () => {
    strict_1.default.equal((0, calculateLevelScore_1.getLevelScoreTier)(3, 3), "GOLD");
    strict_1.default.equal((0, calculateLevelScore_1.getLevelScoreTier)(5, 3), "SILVER");
    strict_1.default.equal((0, calculateLevelScore_1.getLevelScoreTier)(6, 3), "BRONZE");
});
(0, node_test_1.default)("getLevelScoreStars maps score thresholds to 0-3 stars", () => {
    strict_1.default.equal((0, calculateLevelScore_1.getLevelScoreStars)(95), 3);
    strict_1.default.equal((0, calculateLevelScore_1.getLevelScoreStars)(80), 2);
    strict_1.default.equal((0, calculateLevelScore_1.getLevelScoreStars)(60), 1);
    strict_1.default.equal((0, calculateLevelScore_1.getLevelScoreStars)(59), 0);
});
(0, node_test_1.default)("getEffectiveTurnCount normalizes negative and fractional counts", () => {
    strict_1.default.equal((0, calculateLevelScore_1.getEffectiveTurnCount)({
        turns: -2,
        shuffles: 1.7,
        rewinds: 2.2,
        repeatNodeClicks: 1.2,
        deadEnds: -4,
    }), 5);
});
(0, node_test_1.default)("buildLevelScoreBreakdown reports the new tier, penalties, and stars", () => {
    const breakdown = (0, calculateLevelScore_1.buildLevelScoreBreakdown)({
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
    strict_1.default.equal(breakdown.tier, "SILVER");
    strict_1.default.equal(breakdown.playerNodes, 5);
    strict_1.default.equal(breakdown.optimalNodes, 3);
    strict_1.default.equal(breakdown.extraTurns, 1);
    strict_1.default.equal(breakdown.totalMistakes, 2);
    strict_1.default.equal(breakdown.effectiveTurns, 6);
    strict_1.default.equal(breakdown.penalties.suggestions, 10);
    strict_1.default.equal(breakdown.penalties.randomSubset, 5);
    strict_1.default.equal(breakdown.penalties.shuffles, 2);
    strict_1.default.equal(breakdown.penalties.extraTurns, 2);
    strict_1.default.equal(breakdown.penalties.mistakes, 10);
    strict_1.default.equal(breakdown.score, 71);
    strict_1.default.equal(breakdown.stars, 1);
});
(0, node_test_1.default)("buildLevelScoreBreakdown returns FAIL once total mistakes reaches five", () => {
    const breakdown = (0, calculateLevelScore_1.buildLevelScoreBreakdown)({
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
    strict_1.default.equal(breakdown.failed, true);
    strict_1.default.equal(breakdown.tier, "FAIL");
    strict_1.default.equal(breakdown.score, 0);
    strict_1.default.equal(breakdown.stars, 0);
});
