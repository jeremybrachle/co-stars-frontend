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
        suggestionAssists: 0,
        shuffles: 0,
        rewinds: 0,
        deadEnds: 0,
    }), 100);
});
(0, node_test_1.default)("calculateLevelScore penalizes extra hops and mistakes", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
        hops: 5,
        optimalHops: 3,
        turns: 5,
        suggestionAssists: 1,
        shuffles: 1,
        rewinds: 2,
        deadEnds: 1,
    }), 41.7);
});
(0, node_test_1.default)("calculateLevelScore never drops below zero", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
        hops: 10,
        optimalHops: 2,
        turns: 10,
        suggestionAssists: 4,
        shuffles: 10,
        rewinds: 10,
        deadEnds: 10,
    }), 0);
});
(0, node_test_1.default)("calculateLevelScore applies a flat suggestion-assist penalty", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
        hops: 3,
        optimalHops: 3,
        turns: 3,
        suggestionAssists: 1,
        shuffles: 0,
        rewinds: 0,
        deadEnds: 0,
    }), 95);
});
(0, node_test_1.default)("getEffectiveTurnCount normalizes negative and fractional counts", () => {
    strict_1.default.equal((0, calculateLevelScore_1.getEffectiveTurnCount)({
        turns: -2,
        shuffles: 1.7,
        rewinds: 2.2,
        deadEnds: -4,
    }), 4);
});
(0, node_test_1.default)("buildLevelScoreBreakdown reports raw components used in the final score", () => {
    const breakdown = (0, calculateLevelScore_1.buildLevelScoreBreakdown)({
        hops: 4,
        optimalHops: 2,
        turns: 3,
        suggestionAssists: 2,
        shuffles: 1,
        rewinds: 0,
        deadEnds: 1,
    });
    strict_1.default.equal(breakdown.effectiveTurns, 5);
    strict_1.default.equal(breakdown.suggestionPenalty, 10);
    strict_1.default.equal(breakdown.hopEfficiency, 0.5);
    strict_1.default.equal(breakdown.turnEfficiency, 0.4);
    strict_1.default.equal(breakdown.finalScore, 35);
});
