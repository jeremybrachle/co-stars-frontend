type CalculateLevelScoreInput = {
  hops: number;
  optimalHops: number;
  shuffles: number;
  rewinds: number;
  deadEnds: number;
};

const SHUFFLE_PENALTY = 3;
const REWIND_PENALTY = 4;
const DEAD_END_PENALTY = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateLevelScore({
  hops,
  optimalHops,
  shuffles,
  rewinds,
  deadEnds,
}: CalculateLevelScoreInput) {
  const normalizedHops = Math.max(1, hops);
  const normalizedOptimalHops = Math.max(1, optimalHops);
  const hopEfficiency = normalizedOptimalHops / Math.max(normalizedHops, normalizedOptimalHops);
  const penaltyTotal = (shuffles * SHUFFLE_PENALTY) + (rewinds * REWIND_PENALTY) + (deadEnds * DEAD_END_PENALTY);
  const rawScore = (hopEfficiency * 100) - penaltyTotal;

  return Math.round(clamp(rawScore, 0, 100) * 10) / 10;
}
