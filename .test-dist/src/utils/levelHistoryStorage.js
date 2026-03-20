"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLevelStorageKey = buildLevelStorageKey;
exports.readAllLevelHistory = readAllLevelHistory;
exports.getLevelHistoryStorageSizeBytes = getLevelHistoryStorageSizeBytes;
exports.getLevelHistory = getLevelHistory;
exports.saveLevelAttempt = saveLevelAttempt;
exports.buildHopLeaderboardGroups = buildHopLeaderboardGroups;
exports.subscribeToLevelHistoryUpdates = subscribeToLevelHistoryUpdates;
exports.clearLevelHistoryStorage = clearLevelHistoryStorage;
const LEVEL_HISTORY_STORAGE_KEY = "costars.level-history.v1";
const LEVEL_HISTORY_UPDATED_EVENT = "costars:level-history-updated";
function canUseBrowserStorage() {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
function normalizeKeyPart(value) {
    return value.trim().toLocaleLowerCase();
}
function createNodeSignature(node) {
    return `${node.type}:${node.id}:${normalizeKeyPart(node.label)}`;
}
function createAttemptSignature(input) {
    const pathSignature = input.path.map(createNodeSignature).join(">");
    return [
        pathSignature,
        input.hops,
        input.turns,
        input.effectiveTurns,
        input.score.toFixed(1),
        input.shuffles,
        input.shuffleModeEnabled ? "shuffle-on" : "shuffle-off",
        input.appliedShufflePenaltyCount,
        input.rewinds,
        input.deadEnds,
    ].join("|");
}
function hashString(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(index);
        hash |= 0;
    }
    return Math.abs(hash);
}
function sortAttempts(attempts) {
    return [...attempts].sort((left, right) => {
        if (left.hops !== right.hops) {
            return left.hops - right.hops;
        }
        if (right.score !== left.score) {
            return right.score - left.score;
        }
        if (right.timestamp !== left.timestamp) {
            return right.timestamp - left.timestamp;
        }
        return left.signature.localeCompare(right.signature);
    });
}
function isNodeSummary(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const candidate = value;
    return (typeof candidate.id === "number"
        && (candidate.type === "actor" || candidate.type === "movie")
        && typeof candidate.label === "string");
}
function isSavedLevelAttempt(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const candidate = value;
    return (typeof candidate.id === "string"
        && typeof candidate.signature === "string"
        && Array.isArray(candidate.path)
        && candidate.path.every(isNodeSummary)
        && typeof candidate.score === "number"
        && typeof candidate.hops === "number"
        && (candidate.turns === undefined || typeof candidate.turns === "number")
        && (candidate.effectiveTurns === undefined || typeof candidate.effectiveTurns === "number")
        && typeof candidate.shuffles === "number"
        && (candidate.shuffleModeEnabled === undefined || typeof candidate.shuffleModeEnabled === "boolean")
        && (candidate.appliedShufflePenaltyCount === undefined || typeof candidate.appliedShufflePenaltyCount === "number")
        && typeof candidate.rewinds === "number"
        && typeof candidate.deadEnds === "number"
        && (candidate.popularityScore === undefined || typeof candidate.popularityScore === "number")
        && (candidate.averageReleaseYear === undefined || candidate.averageReleaseYear === null || typeof candidate.averageReleaseYear === "number")
        && typeof candidate.timestamp === "number");
}
function parseCollection(rawValue) {
    if (!rawValue) {
        return {};
    }
    try {
        const parsed = JSON.parse(rawValue);
        return Object.fromEntries(Object.entries(parsed)
            .map(([levelKey, value]) => {
            const attempts = Array.isArray(value?.attempts)
                ? value.attempts.filter(isSavedLevelAttempt)
                : [];
            return [
                levelKey,
                {
                    levelKey,
                    attempts: sortAttempts(attempts),
                    updatedAt: typeof value?.updatedAt === "number" ? value.updatedAt : 0,
                },
            ];
        }));
    }
    catch {
        return {};
    }
}
function readCollectionFromStorage() {
    if (!canUseBrowserStorage()) {
        return {};
    }
    return parseCollection(window.localStorage.getItem(LEVEL_HISTORY_STORAGE_KEY));
}
function writeCollectionToStorage(collection) {
    if (!canUseBrowserStorage()) {
        return;
    }
    window.localStorage.setItem(LEVEL_HISTORY_STORAGE_KEY, JSON.stringify(collection));
    if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new Event(LEVEL_HISTORY_UPDATED_EVENT));
    }
}
function estimateStringStorageBytes(value) {
    if (typeof TextEncoder !== "undefined") {
        return new TextEncoder().encode(value).length;
    }
    return value.length * 2;
}
function buildLevelStorageKey(endpointA, endpointB) {
    const [left, right] = [endpointA, endpointB]
        .map(normalizeKeyPart)
        .sort((first, second) => first.localeCompare(second));
    return `${left}__${right}`;
}
function readAllLevelHistory() {
    return readCollectionFromStorage();
}
function getLevelHistoryStorageSizeBytes(collection = readCollectionFromStorage()) {
    if (Object.keys(collection).length === 0) {
        return 0;
    }
    return estimateStringStorageBytes(JSON.stringify(collection));
}
function getLevelHistory(endpointA, endpointB, collection = readCollectionFromStorage()) {
    return collection[buildLevelStorageKey(endpointA, endpointB)] ?? null;
}
function saveLevelAttempt(endpointA, endpointB, input) {
    const collection = readCollectionFromStorage();
    const levelKey = buildLevelStorageKey(endpointA, endpointB);
    const timestamp = input.timestamp ?? Date.now();
    const signature = createAttemptSignature(input);
    const existingRecord = collection[levelKey] ?? {
        levelKey,
        attempts: [],
        updatedAt: 0,
    };
    if (existingRecord.attempts.some((attempt) => attempt.signature === signature)) {
        return existingRecord;
    }
    const nextAttempt = {
        id: `${timestamp}-${hashString(`${levelKey}|${signature}`)}`,
        signature,
        path: input.path,
        score: Math.round(input.score * 10) / 10,
        hops: input.hops,
        turns: input.turns,
        effectiveTurns: input.effectiveTurns,
        shuffles: input.shuffles,
        shuffleModeEnabled: input.shuffleModeEnabled,
        appliedShufflePenaltyCount: input.appliedShufflePenaltyCount,
        rewinds: input.rewinds,
        deadEnds: input.deadEnds,
        popularityScore: input.popularityScore,
        averageReleaseYear: input.averageReleaseYear,
        timestamp,
    };
    const nextRecord = {
        levelKey,
        attempts: sortAttempts([...existingRecord.attempts, nextAttempt]),
        updatedAt: timestamp,
    };
    const nextCollection = {
        ...collection,
        [levelKey]: nextRecord,
    };
    writeCollectionToStorage(nextCollection);
    return nextRecord;
}
function buildHopLeaderboardGroups(attempts) {
    const grouped = new Map();
    sortAttempts(attempts).forEach((attempt) => {
        const entries = grouped.get(attempt.hops) ?? [];
        entries.push(attempt);
        grouped.set(attempt.hops, entries);
    });
    return Array.from(grouped.entries())
        .sort(([leftHops], [rightHops]) => leftHops - rightHops)
        .map(([hops, groupedAttempts]) => ({
        hops,
        attempts: sortAttempts(groupedAttempts),
    }));
}
function subscribeToLevelHistoryUpdates(listener) {
    if (typeof window === "undefined") {
        return () => undefined;
    }
    const handleStorage = (event) => {
        if (!event.key || event.key === LEVEL_HISTORY_STORAGE_KEY) {
            listener();
        }
    };
    const handleUpdate = () => listener();
    window.addEventListener("storage", handleStorage);
    window.addEventListener(LEVEL_HISTORY_UPDATED_EVENT, handleUpdate);
    return () => {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener(LEVEL_HISTORY_UPDATED_EVENT, handleUpdate);
    };
}
function clearLevelHistoryStorage() {
    if (!canUseBrowserStorage()) {
        return;
    }
    window.localStorage.removeItem(LEVEL_HISTORY_STORAGE_KEY);
    if (typeof window.dispatchEvent === "function") {
        window.dispatchEvent(new Event(LEVEL_HISTORY_UPDATED_EVENT));
    }
}
