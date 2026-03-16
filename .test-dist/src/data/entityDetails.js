"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareNullableNumberDescending = compareNullableNumberDescending;
exports.compareNullableDateDescending = compareNullableDateDescending;
exports.sortByPopularityDescending = sortByPopularityDescending;
exports.sortMoviesByReleaseDateDescending = sortMoviesByReleaseDateDescending;
exports.buildNextDetailTrail = buildNextDetailTrail;
function compareNullableNumberDescending(left, right) {
    const normalizedLeft = left ?? null;
    const normalizedRight = right ?? null;
    if (normalizedLeft === null && normalizedRight === null) {
        return 0;
    }
    if (normalizedLeft === null) {
        return 1;
    }
    if (normalizedRight === null) {
        return -1;
    }
    return normalizedRight - normalizedLeft;
}
function compareNullableDateDescending(left, right) {
    const normalizedLeft = left ?? null;
    const normalizedRight = right ?? null;
    if (normalizedLeft === null && normalizedRight === null) {
        return 0;
    }
    if (normalizedLeft === null) {
        return 1;
    }
    if (normalizedRight === null) {
        return -1;
    }
    return normalizedRight.localeCompare(normalizedLeft);
}
function sortByPopularityDescending(entries, getPopularity, getLabel) {
    return [...entries].sort((left, right) => {
        const popularityDelta = compareNullableNumberDescending(getPopularity(left), getPopularity(right));
        if (popularityDelta !== 0) {
            return popularityDelta;
        }
        return getLabel(left).localeCompare(getLabel(right));
    });
}
function sortMoviesByReleaseDateDescending(entries, getReleaseDate, getLabel) {
    return [...entries].sort((left, right) => {
        const releaseDateDelta = compareNullableDateDescending(getReleaseDate(left), getReleaseDate(right));
        if (releaseDateDelta !== 0) {
            return releaseDateDelta;
        }
        return getLabel(left).localeCompare(getLabel(right));
    });
}
function buildNextDetailTrail(currentTrail, nextEntry, isSameEntry) {
    const existingIndex = currentTrail.findIndex((entry) => isSameEntry(entry, nextEntry));
    if (existingIndex >= 0) {
        return currentTrail.slice(0, existingIndex + 1);
    }
    return [...currentTrail, nextEntry];
}
