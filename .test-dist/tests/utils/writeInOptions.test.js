"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const writeInOptions_1 = require("../../src/utils/writeInOptions");
const relevantOptions = [
    { id: 1, label: "Ocean's Eleven", type: "movie", releaseDate: "2001-12-07", imageUrl: "https://example.com/oceans11.jpg" },
    { id: 2, label: "Ocean's Twelve", type: "movie", releaseDate: "2004-12-10", imageUrl: "https://example.com/oceans12.jpg" },
    { id: 3, label: "The Mexican", type: "movie", releaseDate: "2001-03-02" },
];
(0, node_test_1.default)("getVisibleWriteInOptions returns the full relevant list when the query is empty", () => {
    const result = (0, writeInOptions_1.getVisibleWriteInOptions)(relevantOptions, "");
    strict_1.default.deepEqual(result.map((option) => option.label), ["Ocean's Eleven", "Ocean's Twelve", "The Mexican"]);
});
(0, node_test_1.default)("getVisibleWriteInOptions brings closer fuzzy matches to the top as the query narrows", () => {
    const result = (0, writeInOptions_1.getVisibleWriteInOptions)(relevantOptions, "oce 12");
    strict_1.default.equal(result[0]?.label, "Ocean's Twelve");
});
(0, node_test_1.default)("resolveWriteInOption only resolves values from the relevant option list", () => {
    const matched = (0, writeInOptions_1.resolveWriteInOption)("ocean's 11", relevantOptions, true);
    const missing = (0, writeInOptions_1.resolveWriteInOption)("The Matrix", relevantOptions, true);
    strict_1.default.equal(matched?.label, "Ocean's Eleven");
    strict_1.default.equal(missing, null);
});
(0, node_test_1.default)("resolveWriteInOption requires an exact relevant match when autosuggest is disabled", () => {
    const exact = (0, writeInOptions_1.resolveWriteInOption)("Ocean's Twelve", relevantOptions, false);
    const fuzzy = (0, writeInOptions_1.resolveWriteInOption)("oceans 12", relevantOptions, false);
    strict_1.default.equal(exact?.label, "Ocean's Twelve");
    strict_1.default.equal(fuzzy, null);
});
