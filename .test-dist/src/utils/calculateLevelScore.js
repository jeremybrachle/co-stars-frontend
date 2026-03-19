"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateLevelScore = calculateLevelScore;
const SHUFFLE_PENALTY = 3;
const REWIND_PENALTY = 4;
const DEAD_END_PENALTY = 6;
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function calculateLevelScore({ hops, optimalHops, shuffles, rewinds, deadEnds, }) {
    const normalizedHops = Math.max(1, hops);
    const normalizedOptimalHops = Math.max(1, optimalHops);
    const hopEfficiency = normalizedOptimalHops / Math.max(normalizedHops, normalizedOptimalHops);
    const penaltyTotal = (shuffles * SHUFFLE_PENALTY) + (rewinds * REWIND_PENALTY) + (deadEnds * DEAD_END_PENALTY);
    const rawScore = (hopEfficiency * 100) - penaltyTotal;
    return Math.round(clamp(rawScore, 0, 100) * 10) / 10;
}
