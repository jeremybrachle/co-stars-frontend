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
(0, node_test_1.default)("getNodeKey falls back to normalized labels when ids are missing", () => {
    strict_1.default.equal((0, gameplay_1.getNodeKey)({ type: "actor", label: "  Brad Pitt  " }), "actor:brad pitt");
    strict_1.default.equal((0, gameplay_1.getNodeKey)({ id: 7, type: "movie", label: "Ignored" }), "movie:7");
});
(0, node_test_1.default)("isSameNode matches by id when present and falls back to normalized labels", () => {
    strict_1.default.equal((0, gameplay_1.isSameNode)({ id: 5, type: "actor", label: "Actor A" }, { id: 5, type: "actor", label: "Someone Else" }), true);
    strict_1.default.equal((0, gameplay_1.isSameNode)({ type: "movie", label: " Ocean's Eleven " }, { type: "movie", label: "ocean's eleven" }), true);
    strict_1.default.equal((0, gameplay_1.isSameNode)({ type: "movie", label: "Ocean's Eleven" }, { type: "actor", label: "Ocean's Eleven" }), false);
});
(0, node_test_1.default)("isDirectConnectionSuggestion only returns true for reachable hints ending at the target", () => {
    const target = { id: 999, label: "Target", type: "actor" };
    strict_1.default.equal((0, gameplay_1.isDirectConnectionSuggestion)({
        id: 1,
        label: "Direct",
        type: "movie",
        pathHint: {
            reachable: true,
            stepsToTarget: 1,
            path: [{ id: 999, label: "Target", type: "actor" }],
        },
    }, target), true);
    strict_1.default.equal((0, gameplay_1.isDirectConnectionSuggestion)({
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
(0, node_test_1.default)("buildSuggestionSet marks blocked loop nodes with a blocked highlight", () => {
    const target = { id: 999, label: "Target", type: "actor" };
    const suggestions = [
        createActorSuggestion("Blocked Route", 60, 2),
        createActorSuggestion("Open Route", 40, 1),
    ];
    const result = (0, gameplay_1.buildSuggestionSet)(suggestions, target, new Set([(0, gameplay_1.getNodeKey)(suggestions[0])]), {
        shouldShuffle: false,
        sortMode: "default",
        suggestionLimit: null,
    });
    strict_1.default.equal(result.find((entry) => entry.label === "Blocked Route")?.highlight?.kind, "blocked");
});
(0, node_test_1.default)("combineMeetingPath joins top and bottom routes only when they meet at the same node", () => {
    const startA = { id: 1, label: "Actor A", type: "actor" };
    const meeting = { id: 10, label: "Shared Movie", type: "movie" };
    const startB = { id: 2, label: "Actor B", type: "actor" };
    strict_1.default.deepEqual((0, gameplay_1.combineMeetingPath)(startA, [meeting], startB, [meeting]), [startA, meeting, startB]);
    strict_1.default.equal((0, gameplay_1.combineMeetingPath)(startA, [meeting], startB, [{ id: 11, label: "Different Movie", type: "movie" }]), null);
});
