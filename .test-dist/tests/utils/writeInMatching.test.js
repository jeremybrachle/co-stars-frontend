"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const writeInMatching_1 = require("../../src/utils/writeInMatching");
(0, node_test_1.default)("getWriteInMatchScore prefers exact matches over prefix and fuzzy matches", () => {
    const exact = (0, writeInMatching_1.getWriteInMatchScore)("Ocean's Eleven", "Ocean's Eleven");
    const prefix = (0, writeInMatching_1.getWriteInMatchScore)("Ocean's Eleven", "Ocean");
    const fuzzy = (0, writeInMatching_1.getWriteInMatchScore)("Ocean's Eleven", "ocn 11");
    strict_1.default.notEqual(exact, null);
    strict_1.default.notEqual(prefix, null);
    strict_1.default.notEqual(fuzzy, null);
    strict_1.default.ok(exact > prefix);
    strict_1.default.ok(prefix > fuzzy);
});
(0, node_test_1.default)("getWriteInMatchScore normalizes number words and digits", () => {
    const score = (0, writeInMatching_1.getWriteInMatchScore)("Ocean's Eleven", "Ocean 11");
    strict_1.default.notEqual(score, null);
    strict_1.default.ok(score > 0);
});
(0, node_test_1.default)("getTopWriteInMatches filters to the closest normalized matches first", () => {
    const result = (0, writeInMatching_1.getTopWriteInMatches)([
        "Ocean's Eleven",
        "Ocean's Twelve",
        "Ocean's Thirteen",
        "The Mexican",
    ], "oce 12", 3);
    strict_1.default.deepEqual(result, ["Ocean's Twelve"]);
});
(0, node_test_1.default)("getTopWriteInMatches returns an empty list for empty queries", () => {
    strict_1.default.deepEqual((0, writeInMatching_1.getTopWriteInMatches)(["Ocean's Eleven"], "   "), []);
});
