"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupeWriteInOptions = dedupeWriteInOptions;
exports.getVisibleWriteInOptions = getVisibleWriteInOptions;
exports.resolveWriteInOption = resolveWriteInOption;
const writeInMatching_1 = require("./writeInMatching");
function normalizeWriteInLabel(value) {
    return value.trim().toLocaleLowerCase();
}
function getWriteInOptionKey(option) {
    if (option.id !== undefined) {
        return `${option.type}:${option.id}`;
    }
    return `${option.type}:${normalizeWriteInLabel(option.label)}`;
}
function dedupeWriteInOptions(options) {
    const seen = new Set();
    return options.filter((option) => {
        const key = getWriteInOptionKey(option);
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}
function getVisibleWriteInOptions(options, query, limit = 12) {
    const dedupedOptions = dedupeWriteInOptions(options).filter((option) => option.id !== undefined);
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
        return dedupedOptions;
    }
    const matchedLabels = (0, writeInMatching_1.getTopWriteInMatches)(dedupedOptions.map((option) => option.label), trimmedQuery, limit);
    return matchedLabels
        .map((label) => dedupedOptions.find((option) => option.label === label) ?? null)
        .filter((option) => option !== null);
}
function resolveWriteInOption(value, options, allowAutoSuggest) {
    const dedupedOptions = dedupeWriteInOptions(options).filter((option) => option.id !== undefined);
    const normalizedValue = normalizeWriteInLabel(value);
    if (!normalizedValue) {
        return null;
    }
    const exactMatch = dedupedOptions.find((option) => normalizeWriteInLabel(option.label) === normalizedValue);
    if (exactMatch) {
        return exactMatch;
    }
    if (!allowAutoSuggest) {
        return null;
    }
    const matchedLabel = (0, writeInMatching_1.getTopWriteInMatches)(dedupedOptions.map((option) => option.label), normalizedValue, 1)[0] ?? null;
    return matchedLabel
        ? dedupedOptions.find((option) => option.label === matchedLabel) ?? null
        : null;
}
