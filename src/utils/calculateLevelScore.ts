type CalculateLevelScoreInput = {
  hops: number;
  optimalHops: number;
  turns: number;
  suggestionAssists: number;
  shuffles: number;
  rewinds: number;
  deadEnds: number;
};

const SUGGESTION_ASSIST_PENALTY = 5;

export type LevelScoreBreakdown = {
  hopEfficiency: number;
  turnEfficiency: number;
  effectiveTurns: number;
  suggestionPenalty: number;
  rawScore: number;
  finalScore: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getEffectiveTurnCount({
  turns,
  shuffles,
  rewinds,
  deadEnds,
}: Pick<CalculateLevelScoreInput, "turns" | "shuffles" | "rewinds" | "deadEnds">) {
  const normalizedTurns = Math.max(0, Math.round(turns));
  const normalizedShuffles = Math.max(0, Math.round(shuffles));
  const normalizedRewinds = Math.max(0, Math.round(rewinds));
  const normalizedDeadEnds = Math.max(0, Math.round(deadEnds));

  return Math.max(1, normalizedTurns + normalizedShuffles + normalizedRewinds + normalizedDeadEnds);
}

export function buildLevelScoreBreakdown({
  hops,
  optimalHops,
  turns,
  suggestionAssists,
  shuffles,
  rewinds,
  deadEnds,
}: CalculateLevelScoreInput): LevelScoreBreakdown {
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

export function calculateLevelScore({
  hops,
  optimalHops,
  turns,
  suggestionAssists,
  shuffles,
  rewinds,
  deadEnds,
}: CalculateLevelScoreInput) {
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
