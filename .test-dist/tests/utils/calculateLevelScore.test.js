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
        shuffles: 0,
        rewinds: 0,
        deadEnds: 0,
    }), 100);
});
(0, node_test_1.default)("calculateLevelScore penalizes extra hops and mistakes", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
        hops: 5,
        optimalHops: 3,
        shuffles: 1,
        rewinds: 2,
        deadEnds: 1,
    }), 43);
});
(0, node_test_1.default)("calculateLevelScore never drops below zero", () => {
    strict_1.default.equal((0, calculateLevelScore_1.calculateLevelScore)({
        hops: 10,
        optimalHops: 2,
        shuffles: 10,
        rewinds: 10,
        deadEnds: 10,
    }), 0);
});
