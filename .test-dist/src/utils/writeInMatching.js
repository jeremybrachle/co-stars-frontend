"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWriteInMatchScore = getWriteInMatchScore;
exports.getTopWriteInMatches = getTopWriteInMatches;
const NUMBER_WORDS = new Map([
    ["zero", "0"],
    ["one", "1"],
    ["two", "2"],
    ["three", "3"],
    ["four", "4"],
    ["five", "5"],
    ["six", "6"],
    ["seven", "7"],
    ["eight", "8"],
    ["nine", "9"],
    ["ten", "10"],
    ["eleven", "11"],
    ["twelve", "12"],
    ["thirteen", "13"],
    ["fourteen", "14"],
    ["fifteen", "15"],
    ["sixteen", "16"],
    ["seventeen", "17"],
    ["eighteen", "18"],
    ["nineteen", "19"],
    ["twenty", "20"],
]);
function normalizeWriteInValue(value) {
    return value
        .toLocaleLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/g, (match) => NUMBER_WORDS.get(match) ?? match)
        .replace(/\s+/g, " ")
        .trim();
}
function getSubsequenceScore(candidate, query) {
    let candidateIndex = 0;
    let queryIndex = 0;
    let gapPenalty = 0;
    let firstMatchIndex = -1;
    let previousMatchIndex = -1;
    while (candidateIndex < candidate.length && queryIndex < query.length) {
        if (candidate[candidateIndex] === query[queryIndex]) {
            if (firstMatchIndex === -1) {
                firstMatchIndex = candidateIndex;
            }
            if (previousMatchIndex !== -1) {
                gapPenalty += Math.max(0, candidateIndex - previousMatchIndex - 1);
            }
            previousMatchIndex = candidateIndex;
            queryIndex += 1;
        }
        candidateIndex += 1;
    }
    if (queryIndex !== query.length) {
        return null;
    }
    return 220 - gapPenalty - Math.max(0, firstMatchIndex);
}
function getWriteInMatchScore(candidate, query) {
    const normalizedCandidate = normalizeWriteInValue(candidate);
    const normalizedQuery = normalizeWriteInValue(query);
    if (!normalizedCandidate || !normalizedQuery) {
        return null;
    }
    if (normalizedCandidate === normalizedQuery) {
        return 1000 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
    }
    if (normalizedCandidate.startsWith(normalizedQuery)) {
        return 820 - Math.max(0, normalizedCandidate.length - normalizedQuery.length);
    }
    const candidateWords = normalizedCandidate.split(" ");
    const queryWords = normalizedQuery.split(" ");
    const wordPrefixScore = queryWords.every((queryWord) => candidateWords.some((candidateWord) => candidateWord.startsWith(queryWord)))
        ? 700 - Math.max(0, candidateWords.length - queryWords.length) * 5
        : null;
    if (wordPrefixScore !== null) {
        return wordPrefixScore;
    }
    const includeIndex = normalizedCandidate.indexOf(normalizedQuery);
    if (includeIndex >= 0) {
        return 560 - includeIndex;
    }
    return getSubsequenceScore(normalizedCandidate, normalizedQuery);
}
function getTopWriteInMatches(options, query, limit = 8) {
    const normalizedQuery = normalizeWriteInValue(query);
    if (!normalizedQuery) {
        return [];
    }
    return options
        .map((option, index) => ({
        option,
        index,
        score: getWriteInMatchScore(option, normalizedQuery),
    }))
        .filter((entry) => entry.score !== null)
        .sort((left, right) => right.score - left.score || left.option.localeCompare(right.option) || left.index - right.index)
        .slice(0, limit)
        .map((entry) => entry.option);
}
