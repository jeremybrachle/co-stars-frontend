"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const levelHistoryStorage_1 = require("../../src/utils/levelHistoryStorage");
function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem(key) {
            return store.get(key) ?? null;
        },
        setItem(key, value) {
            store.set(key, value);
        },
        removeItem(key) {
            store.delete(key);
        },
    };
}
function installWindowMock() {
    const listeners = new Map();
    const localStorage = createLocalStorageMock();
    const mockWindow = {
        localStorage,
        addEventListener(type, listener) {
            const entries = listeners.get(type) ?? new Set();
            entries.add(listener);
            listeners.set(type, entries);
        },
        removeEventListener(type, listener) {
            listeners.get(type)?.delete(listener);
        },
        dispatchEvent(event) {
            listeners.get(event.type)?.forEach((listener) => listener());
            return true;
        },
    };
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        writable: true,
        value: mockWindow,
    });
    return () => {
        Reflect.deleteProperty(globalThis, "window");
    };
}
(0, node_test_1.default)("buildLevelStorageKey is order independent", () => {
    strict_1.default.equal((0, levelHistoryStorage_1.buildLevelStorageKey)("George Clooney", "Brad Pitt"), (0, levelHistoryStorage_1.buildLevelStorageKey)("Brad Pitt", "George Clooney"));
});
(0, node_test_1.default)("saveLevelAttempt stores unique attempts and groups them by hops", () => {
    const restoreWindow = installWindowMock();
    (0, levelHistoryStorage_1.clearLevelHistoryStorage)();
    (0, levelHistoryStorage_1.saveLevelAttempt)("George Clooney", "Julia Roberts", {
        path: [
            { id: 1, type: "actor", label: "George Clooney" },
            { id: 10, type: "movie", label: "Ocean's Eleven" },
            { id: 3, type: "actor", label: "Julia Roberts" },
        ],
        score: 96,
        hops: 2,
        shuffles: 0,
        rewinds: 0,
        deadEnds: 0,
        timestamp: 10,
    });
    (0, levelHistoryStorage_1.saveLevelAttempt)("George Clooney", "Julia Roberts", {
        path: [
            { id: 1, type: "actor", label: "George Clooney" },
            { id: 10, type: "movie", label: "Ocean's Eleven" },
            { id: 3, type: "actor", label: "Julia Roberts" },
        ],
        score: 96,
        hops: 2,
        shuffles: 0,
        rewinds: 0,
        deadEnds: 0,
        timestamp: 11,
    });
    (0, levelHistoryStorage_1.saveLevelAttempt)("George Clooney", "Julia Roberts", {
        path: [
            { id: 1, type: "actor", label: "George Clooney" },
            { id: 11, type: "movie", label: "Ocean's Twelve" },
            { id: 4, type: "actor", label: "Matt Damon" },
            { id: 12, type: "movie", label: "The Mexican" },
            { id: 3, type: "actor", label: "Julia Roberts" },
        ],
        score: 71,
        hops: 4,
        shuffles: 1,
        rewinds: 1,
        deadEnds: 0,
        timestamp: 12,
    });
    const history = (0, levelHistoryStorage_1.getLevelHistory)("George Clooney", "Julia Roberts");
    strict_1.default.ok(history);
    strict_1.default.equal(history.attempts.length, 2);
    const groups = (0, levelHistoryStorage_1.buildHopLeaderboardGroups)(history.attempts);
    strict_1.default.equal(groups.length, 2);
    strict_1.default.equal(groups[0].hops, 2);
    strict_1.default.equal(groups[0].attempts[0].score, 96);
    strict_1.default.equal(groups[1].hops, 4);
    restoreWindow();
});
