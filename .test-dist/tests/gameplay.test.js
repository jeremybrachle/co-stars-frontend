"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const gameplay_1 = require("../src/gameplay");
function createActorSuggestion(label, popularity, stepsToTarget) {
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
(0, node_test_1.default)("shuffleSuggestionsWithSeed is deterministic and non-mutating", () => {
    const values = [1, 2, 3, 4, 5];
    const first = (0, gameplay_1.shuffleSuggestionsWithSeed)(values, 17);
    const second = (0, gameplay_1.shuffleSuggestionsWithSeed)(values, 17);
    const third = (0, gameplay_1.shuffleSuggestionsWithSeed)(values, 23);
    strict_1.default.deepEqual(first, second);
    strict_1.default.deepEqual(values, [1, 2, 3, 4, 5]);
    strict_1.default.notDeepEqual(first, third);
});
(0, node_test_1.default)("buildSuggestionSet keeps the guaranteed best-path suggestion pinned first", () => {
    const target = { id: 999, label: "Target", type: "actor" };
    const suggestions = [
        createActorSuggestion("Long Route", 80, 4),
        createActorSuggestion("Best Route", 40, 1),
        createActorSuggestion("Middle Route", 60, 2),
    ];
    const result = (0, gameplay_1.buildSuggestionSet)(suggestions, target, new Set(), {
        shouldGuaranteeBestPath: true,
        shouldShuffle: false,
        sortMode: "random",
        suggestionLimit: null,
    });
    strict_1.default.equal(result[0]?.label, "Best Route");
});
(0, node_test_1.default)("buildSuggestionSet default mode respects actor popularity as a tie-breaker", () => {
    const target = { id: 999, label: "Target", type: "actor" };
    const suggestions = [
        createActorSuggestion("Less Popular", 20, 2),
        createActorSuggestion("More Popular", 90, 2),
    ];
    const result = (0, gameplay_1.buildSuggestionSet)(suggestions, target, new Set(), {
        shouldShuffle: false,
        sortMode: "default",
        suggestionLimit: null,
    });
    strict_1.default.deepEqual(result.map((entry) => entry.label), ["More Popular", "Less Popular"]);
});
(0, node_test_1.default)("buildSuggestionSet best-path mode prioritizes fewer steps over popularity", () => {
    const target = { id: 999, label: "Target", type: "actor" };
    const suggestions = [
        createActorSuggestion("Popular Longer Path", 95, 3),
        createActorSuggestion("Less Popular Shorter Path", 10, 1),
    ];
    const result = (0, gameplay_1.buildSuggestionSet)(suggestions, target, new Set(), {
        shouldShuffle: false,
        sortMode: "best-path",
        suggestionLimit: null,
    });
    strict_1.default.deepEqual(result.map((entry) => entry.label), ["Less Popular Shorter Path", "Popular Longer Path"]);
});
