"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUGGESTION_LIMIT = exports.MAX_PATH_LENGTH = void 0;
exports.shuffleSuggestionsWithSeed = shuffleSuggestionsWithSeed;
exports.getNodeKey = getNodeKey;
exports.isSameNode = isSameNode;
exports.nodeFromSummary = nodeFromSummary;
exports.isDirectConnectionSuggestion = isDirectConnectionSuggestion;
exports.buildSuggestionSet = buildSuggestionSet;
exports.combineMeetingPath = combineMeetingPath;
exports.MAX_PATH_LENGTH = 19;
exports.SUGGESTION_LIMIT = 8;
function shuffleSuggestions(entries) {
    const nextEntries = [...entries];
    for (let index = nextEntries.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [nextEntries[index], nextEntries[swapIndex]] = [nextEntries[swapIndex], nextEntries[index]];
    }
    return nextEntries;
}
function createSeededRandom(seed) {
    let state = seed | 0;
    return () => {
        state = (state + 0x6D2B79F5) | 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}
function shuffleSuggestionsWithSeed(entries, seed) {
    const nextEntries = [...entries];
    const random = createSeededRandom(seed || 1);
    for (let index = nextEntries.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [nextEntries[index], nextEntries[swapIndex]] = [nextEntries[swapIndex], nextEntries[index]];
    }
    return nextEntries;
}
function normalizeLabel(label) {
    return label.trim().toLocaleLowerCase();
}
function getNodeKey(node) {
    return `${node.type}:${node.id ?? normalizeLabel(node.label)}`;
}
function isSameNode(a, b) {
    if (a.type !== b.type) {
        return false;
    }
    if (a.id !== undefined && b.id !== undefined) {
        return a.id === b.id;
    }
    return normalizeLabel(a.label) === normalizeLabel(b.label);
}
function nodeFromSummary(node) {
    return {
        id: node.id,
        label: node.label,
        type: node.type,
    };
}
function hintReachesTarget(node, target) {
    const lastNode = node.pathHint?.path.at(-1);
    return lastNode ? isSameNode(lastNode, target) : false;
}
function isDirectConnectionSuggestion(node, target) {
    if (!node.pathHint?.reachable || !hintReachesTarget(node, target)) {
        return false;
    }
    return (node.pathHint.stepsToTarget ?? Number.POSITIVE_INFINITY) <= 1;
}
function getHintScore(node) {
    if (!node.pathHint?.reachable || node.pathHint.stepsToTarget === null) {
        return 0;
    }
    return Math.max(0, 90 - node.pathHint.stepsToTarget * 15);
}
function getPopularityScore(node) {
    return Math.max(0, node.popularity ?? 0) * 0.45;
}
function getRecencyScore(node) {
    if (!node.releaseDate) {
        return 0;
    }
    const releaseYear = new Date(node.releaseDate).getFullYear();
    return Number.isNaN(releaseYear) ? 0 : Math.max(0, releaseYear - 1980) * 0.22;
}
function getTieBreakerLabel(node) {
    return normalizeLabel(node.label);
}
function createComparatorBySort(movieSortMode = "releaseYear", actorSortMode = "popularity") {
    return (a, b) => {
        const aSteps = a.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
        const bSteps = b.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
        if (aSteps !== bSteps) {
            return aSteps - bSteps;
        }
        // Apply per-type sorting
        if (a.type === "movie" && b.type === "movie") {
            if (movieSortMode === "releaseYear") {
                const aYear = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
                const bYear = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
                if (aYear !== bYear) {
                    return bYear - aYear; // descending
                }
            }
        }
        else if (a.type === "actor" && b.type === "actor") {
            if (actorSortMode === "popularity") {
                const popularityDelta = (b.popularity ?? -1) - (a.popularity ?? -1);
                if (popularityDelta !== 0) {
                    return popularityDelta;
                }
            }
        }
        if (movieSortMode === "releaseYear") {
            const recencyDelta = getRecencyScore(b) - getRecencyScore(a);
            if (recencyDelta !== 0) {
                return recencyDelta;
            }
        }
        return getTieBreakerLabel(a).localeCompare(getTieBreakerLabel(b));
    };
}
function buildSuggestionSet(rawSuggestions, target, blockedLoopNodeKeys = new Set(), options = {}) {
    const shouldShuffle = options.shouldShuffle ?? true;
    const shouldGuaranteeBestPath = options.shouldGuaranteeBestPath ?? false;
    const suggestionLimit = options.suggestionLimit === undefined ? exports.SUGGESTION_LIMIT : options.suggestionLimit;
    const sortMode = options.sortMode ?? "default";
    const movieSortMode = options.movieSortMode ?? "releaseYear";
    const actorSortMode = options.actorSortMode ?? "popularity";
    const comparator = createComparatorBySort(movieSortMode, actorSortMode);
    const uniqueSuggestions = Array.from(new Map(rawSuggestions.map((suggestion) => [getNodeKey(suggestion), suggestion])).values());
    const directConnections = uniqueSuggestions
        .filter((suggestion) => isDirectConnectionSuggestion(suggestion, target))
        .sort(comparator);
    const reachableSuggestions = uniqueSuggestions
        .filter((suggestion) => suggestion.pathHint?.reachable)
        .sort((left, right) => {
        const leftSteps = left.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
        const rightSteps = right.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
        if (leftSteps !== rightSteps) {
            return leftSteps - rightSteps;
        }
        return comparator(left, right);
    });
    const featured = new Map();
    if (directConnections.length > 0) {
        featured.set(getNodeKey(directConnections[0]), directConnections[0]);
    }
    else if (reachableSuggestions.length > 0 && shouldGuaranteeBestPath) {
        featured.set(getNodeKey(reachableSuggestions[0]), reachableSuggestions[0]);
    }
    const rankedRemainder = uniqueSuggestions
        .filter((suggestion) => !featured.has(getNodeKey(suggestion)))
        .map((suggestion) => ({
        suggestion,
        score: sortMode === "best-path"
            ? getHintScore(suggestion)
            : sortMode === "default"
                ? getHintScore(suggestion)
                    + (suggestion.type === "actor" && actorSortMode === "popularity" ? getPopularityScore(suggestion) : 0)
                    + (suggestion.type === "movie" && movieSortMode === "releaseYear" ? getRecencyScore(suggestion) : 0)
                : 0,
    }))
        .sort((a, b) => {
        if (sortMode === "best-path") {
            const leftSteps = a.suggestion.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
            const rightSteps = b.suggestion.pathHint?.stepsToTarget ?? Number.POSITIVE_INFINITY;
            if (leftSteps !== rightSteps) {
                return leftSteps - rightSteps;
            }
        }
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return comparator(a.suggestion, b.suggestion);
    })
        .map((entry) => entry.suggestion);
    const featuredSuggestions = [...featured.values()];
    const orderedRemainder = sortMode === "random" || shouldShuffle
        ? shuffleSuggestions(rankedRemainder)
        : rankedRemainder;
    const allRanked = [...featuredSuggestions, ...orderedRemainder];
    const selected = suggestionLimit === null ? allRanked : allRanked.slice(0, suggestionLimit);
    const bestReachableSteps = reachableSuggestions[0]?.pathHint?.stepsToTarget ?? null;
    return selected.map((suggestion) => {
        if (blockedLoopNodeKeys.has(getNodeKey(suggestion))) {
            return {
                ...suggestion,
                highlight: {
                    kind: "blocked",
                    label: "Already in path",
                    description: "This node already appears in your route and cannot be added again.",
                },
            };
        }
        if (isDirectConnectionSuggestion(suggestion, target)) {
            return {
                ...suggestion,
                highlight: {
                    kind: "connection",
                    label: "Connection found",
                    description: "Choosing this option reveals the target immediately.",
                },
            };
        }
        if (bestReachableSteps !== null
            && suggestion.pathHint?.reachable
            && suggestion.pathHint.stepsToTarget === bestReachableSteps) {
            return {
                ...suggestion,
                highlight: {
                    kind: "optimal",
                    label: "Best path",
                    description: `One of the shortest currently known routes to ${target.label}.`,
                },
            };
        }
        return {
            ...suggestion,
            highlight: undefined,
        };
    });
}
function combineMeetingPath(startA, topPath, startB, bottomPath) {
    const topFullPath = [startA, ...topPath];
    const bottomFullPath = [startB, ...bottomPath];
    const topLast = topFullPath.at(-1);
    const bottomLast = bottomFullPath.at(-1);
    if (!topLast || !bottomLast || !isSameNode(topLast, bottomLast)) {
        return null;
    }
    return [...topFullPath, ...bottomFullPath.slice(0, -1).reverse()];
}
