export type LevelScoreTier = "GOLD" | "SILVER" | "BRONZE" | "FAIL";

export type CalculateLevelScoreInput = {
  hops: number;
  optimalHops: number;
  turns: number;
  optimalTurns?: number;
  usedSuggestions?: boolean;
  usedFilteredSuggestions?: boolean;
  usedFullSuggestionList?: boolean;
  usedRandomSubset?: boolean;
  shuffles: number;
  rewinds: number;
  repeatNodeClicks?: number;
  deadEnds: number;
};

export type LevelScoreBreakdown = {
  tier: LevelScoreTier;
  score: number;
  stars: number;
  optimalNodes: number;
  playerNodes: number;
  optimalTurns: number;
  playerTurns: number;
  effectiveTurns: number;
  extraTurns: number;
  repeatNodeClicks: number;
  deadEnds: number;
  totalMistakes: number;
  penalties: {
    suggestions: number;
    filteredSuggestions: number;
    fullSuggestionList: number;
    randomSubset: number;
    shuffles: number;
    rewinds: number;
    extraTurns: number;
    mistakes: number;
    total: number;
  };
  failed: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export function getLevelScoreTier(hops: number, optimalHops: number): Exclude<LevelScoreTier, "FAIL"> {
  const normalizedHops = Math.max(0, Math.round(hops));
  const normalizedOptimalHops = Math.max(0, Math.round(optimalHops));
  const hopDelta = normalizedHops - normalizedOptimalHops;

  if (hopDelta <= 0) {
    return "GOLD";
  }

  if (hopDelta <= 2) {
    return "SILVER";
  }

  return "BRONZE";
}

export function getLevelScoreStars(score: number) {
  const normalizedScore = clamp(Math.round(score), 0, 100);

  if (normalizedScore >= 90) {
    return 3;
  }

  if (normalizedScore >= 75) {
    return 2;
  }

  if (normalizedScore >= 60) {
    return 1;
  }

  return 0;
}

export function getEffectiveTurnCount({
  turns,
  shuffles,
  rewinds,
  deadEnds,
  repeatNodeClicks = 0,
}: Pick<CalculateLevelScoreInput, "turns" | "shuffles" | "rewinds" | "deadEnds" | "repeatNodeClicks">) {
  const normalizedTurns = normalizeCount(turns);
  const normalizedShuffles = normalizeCount(shuffles);
  const normalizedRewinds = normalizeCount(rewinds);
  const normalizedDeadEnds = normalizeCount(deadEnds);
  const normalizedRepeatNodeClicks = normalizeCount(repeatNodeClicks);

  return Math.max(1, normalizedTurns + normalizedShuffles + normalizedRewinds + normalizedDeadEnds + normalizedRepeatNodeClicks);
}

export function buildLevelScoreBreakdown({
  hops,
  optimalHops,
  turns,
  optimalTurns,
  usedSuggestions = false,
  usedFilteredSuggestions = false,
  usedFullSuggestionList = false,
  usedRandomSubset = false,
  shuffles,
  rewinds,
  repeatNodeClicks = 0,
  deadEnds,
}: CalculateLevelScoreInput): LevelScoreBreakdown {
  const normalizedHops = Math.max(0, Math.round(hops));
  const normalizedOptimalHops = Math.max(0, Math.round(optimalHops));
  const normalizedTurns = normalizeCount(turns);
  const normalizedOptimalTurns = Math.max(0, Math.round(optimalTurns ?? optimalHops));
  const normalizedShuffles = normalizeCount(shuffles);
  const normalizedRewinds = normalizeCount(rewinds);
  const normalizedRepeatNodeClicks = normalizeCount(repeatNodeClicks);
  const normalizedDeadEnds = normalizeCount(deadEnds);
  const totalMistakes = normalizedRepeatNodeClicks + normalizedDeadEnds;
  const failed = totalMistakes >= 5;
  const tier = failed ? "FAIL" : getLevelScoreTier(normalizedHops, normalizedOptimalHops);
  const extraTurns = Math.max(0, normalizedTurns - normalizedOptimalTurns);

  const penalties = {
    suggestions: usedSuggestions ? 10 : 0,
    filteredSuggestions: usedFilteredSuggestions ? 5 : 0,
    fullSuggestionList: usedFullSuggestionList ? 10 : 0,
    randomSubset: usedRandomSubset ? 5 : 0,
    shuffles: normalizedShuffles * 2,
    rewinds: normalizedRewinds * 3,
    extraTurns: extraTurns * 2,
    mistakes: Math.min(totalMistakes * 5, 25),
    total: 0,
  };

  penalties.total = penalties.suggestions
    + penalties.filteredSuggestions
    + penalties.fullSuggestionList
    + penalties.randomSubset
    + penalties.shuffles
    + penalties.rewinds
    + penalties.extraTurns
    + penalties.mistakes;

  const rawScore = failed ? 0 : 100 - penalties.total;
  const score = clamp(Math.round(rawScore), 0, 100);
  const stars = failed ? 0 : getLevelScoreStars(score);

  return {
    tier,
    score,
    stars,
    optimalNodes: normalizedOptimalHops + 1,
    playerNodes: normalizedHops + 1,
    optimalTurns: normalizedOptimalTurns,
    playerTurns: normalizedTurns,
    effectiveTurns: getEffectiveTurnCount({
      turns: normalizedTurns,
      shuffles: normalizedShuffles,
      rewinds: normalizedRewinds,
      deadEnds: normalizedDeadEnds,
      repeatNodeClicks: normalizedRepeatNodeClicks,
    }),
    extraTurns,
    repeatNodeClicks: normalizedRepeatNodeClicks,
    deadEnds: normalizedDeadEnds,
    totalMistakes,
    penalties,
    failed,
  };
}

export function calculateLevelScore(input: CalculateLevelScoreInput) {
  return buildLevelScoreBreakdown(input).score;
}
