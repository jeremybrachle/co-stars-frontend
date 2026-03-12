"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const demoSnapshot_1 = require("../../src/data/demoSnapshot");
const localGraph_1 = require("../../src/data/localGraph");
(0, node_test_1.default)("demo snapshot bundle exposes a stable offline source label", () => {
    strict_1.default.equal((0, demoSnapshot_1.getDemoSourceLabel)(), "the built-in offline demo dataset");
});
(0, node_test_1.default)("demo snapshot bundle contains levels and graph indexes for offline play", () => {
    const bundle = (0, demoSnapshot_1.getDemoSnapshotBundle)();
    strict_1.default.equal(bundle.loadedFrom, "demo");
    strict_1.default.equal(bundle.snapshot.levels.length, 6);
    strict_1.default.equal(bundle.indexes.actorsById.size, 8);
    strict_1.default.equal(bundle.indexes.moviesById.size, 5);
});
(0, node_test_1.default)("demo levels stay within short one-movie or two-movie routes", () => {
    const bundle = (0, demoSnapshot_1.getDemoSnapshotBundle)();
    for (const level of bundle.snapshot.levels) {
        const actorAId = bundle.indexes.actorNameToId.get(level.actorA.toLowerCase());
        const actorBId = bundle.indexes.actorNameToId.get(level.actorB.toLowerCase());
        strict_1.default.notEqual(actorAId, undefined);
        strict_1.default.notEqual(actorBId, undefined);
        const path = (0, localGraph_1.generateLocalPath)({ id: actorAId, type: "actor", label: level.actorA }, { id: actorBId, type: "actor", label: level.actorB }, bundle.indexes);
        strict_1.default.equal(path.reason, null);
        strict_1.default.ok(path.steps === 2 || path.steps === 4);
    }
});
