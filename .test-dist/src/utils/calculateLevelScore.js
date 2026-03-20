"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveTurnCount = getEffectiveTurnCount;
exports.buildLevelScoreBreakdown = buildLevelScoreBreakdown;
exports.calculateLevelScore = calculateLevelScore;
const SUGGESTION_ASSIST_PENALTY = 5;
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function getEffectiveTurnCount({ turns, shuffles, rewinds, deadEnds, }) {
    const normalizedTurns = Math.max(0, Math.round(turns));
    const normalizedShuffles = Math.max(0, Math.round(shuffles));
    const normalizedRewinds = Math.max(0, Math.round(rewinds));
    const normalizedDeadEnds = Math.max(0, Math.round(deadEnds));
    return Math.max(1, normalizedTurns + normalizedShuffles + normalizedRewinds + normalizedDeadEnds);
}
function buildLevelScoreBreakdown({ hops, optimalHops, turns, suggestionAssists, shuffles, rewinds, deadEnds, }) {
    const normalizedHops = Math.max(1, Math.round(hops));
    const normalizedOptimalHops = Math.max(1, Math.round(optimalHops));
    const effectiveTurns = getEffectiveTurnCount({
        turns,
        shuffles,
        rewinds,
        deadEnds,
    });
    const hopEfficiency = normalizedOptimalHops / Math.max(normalizedHops, normalizedOptimalHops);
    const turnEfficiency = normalizedOptimalHops / Math.max(effectiveTurns, normalizedOptimalHops);
    const suggestionPenalty = Math.max(0, Math.round(suggestionAssists)) * SUGGESTION_ASSIST_PENALTY;
    const rawScore = (((hopEfficiency + turnEfficiency) / 2) * 100) - suggestionPenalty;
    const finalScore = Math.round(clamp(rawScore, 0, 100) * 10) / 10;
    return {
        hopEfficiency,
        turnEfficiency,
        effectiveTurns,
        suggestionPenalty,
        rawScore,
        finalScore,
    };
}
function calculateLevelScore({ hops, optimalHops, turns, suggestionAssists, shuffles, rewinds, deadEnds, }) {
    return buildLevelScoreBreakdown({
        hops,
        optimalHops,
        turns,
        suggestionAssists,
        shuffles,
        rewinds,
        deadEnds,
    }).finalScore;
}
