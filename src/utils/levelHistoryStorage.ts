import type { LevelNode, NodeSummary } from "../types";
import type { LevelScoreTier } from "./calculateLevelScore";

export type SavedLevelAttempt = {
  id: string;
  signature: string;
  path: NodeSummary[];
  score: number;
  tier?: LevelScoreTier;
  stars?: number;
  hops: number;
  turns?: number;
  effectiveTurns?: number;
  shuffles: number;
  shuffleModeEnabled: boolean;
  appliedShufflePenaltyCount: number;
  rewinds: number;
  repeatNodeClicks?: number;
  deadEnds: number;
  totalMistakes?: number;
  popularityScore?: number;
  averageReleaseYear?: number | null;
  timestamp: number;
};

export type LevelHistoryRecord = {
  levelKey: string;
  attempts: SavedLevelAttempt[];
  updatedAt: number;
};

export type LevelHistoryCollection = Record<string, LevelHistoryRecord>;

type SaveLevelAttemptInput = {
  path: NodeSummary[];
  score: number;
  tier?: LevelScoreTier;
  stars?: number;
  hops: number;
  turns: number;
  effectiveTurns: number;
  shuffles: number;
  shuffleModeEnabled: boolean;
  appliedShufflePenaltyCount: number;
  rewinds: number;
  repeatNodeClicks?: number;
  deadEnds: number;
  totalMistakes?: number;
  popularityScore: number;
  averageReleaseYear: number | null;
  timestamp?: number;
};

export type HopLeaderboardGroup = {
  hops: number;
  attempts: SavedLevelAttempt[];
};

const LEVEL_HISTORY_STORAGE_KEY = "costars.level-history.v2";
const LEVEL_HISTORY_UPDATED_EVENT = "costars:level-history-updated";
const EMPTY_LEVEL_HISTORY_COLLECTION = {} as LevelHistoryCollection;

let cachedRawLevelHistory: string | null | undefined;
let cachedLevelHistorySnapshot: LevelHistoryCollection = EMPTY_LEVEL_HISTORY_COLLECTION;

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeKeyPart(value: string) {
  return value.trim().toLocaleLowerCase();
}

type HistoryEndpoint = string | Pick<LevelNode, "label"> | Pick<LevelNode, "label" | "type">;

function buildLevelKeyPart(endpoint: HistoryEndpoint, includeType: boolean) {
  if (typeof endpoint === "string") {
    return normalizeKeyPart(endpoint);
  }

  const normalizedLabel = normalizeKeyPart(endpoint.label);
  if (!includeType || !("type" in endpoint) || !endpoint.type) {
    return normalizedLabel;
  }

  return `${endpoint.type}:${normalizedLabel}`;
}

function createNodeSignature(node: NodeSummary) {
  return `${node.type}:${node.id}:${normalizeKeyPart(node.label)}`;
}

function createAttemptSignature(input: SaveLevelAttemptInput) {
  const pathSignature = input.path.map(createNodeSignature).join(">");
  return [
    pathSignature,
    input.hops,
    input.turns,
    input.effectiveTurns,
    input.score.toFixed(1),
    input.tier ?? "legacy-tier",
    input.stars ?? "legacy-stars",
    input.shuffles,
    input.shuffleModeEnabled ? "shuffle-on" : "shuffle-off",
    input.appliedShufflePenaltyCount,
    input.rewinds,
    input.repeatNodeClicks ?? 0,
    input.deadEnds,
    input.totalMistakes ?? (input.repeatNodeClicks ?? 0) + input.deadEnds,
  ].join("|");
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function sortAttempts(attempts: SavedLevelAttempt[]) {
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

function isNodeSummary(value: unknown): value is NodeSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "number"
    && (candidate.type === "actor" || candidate.type === "movie")
    && typeof candidate.label === "string"
  );
}

function isSavedLevelAttempt(value: unknown): value is SavedLevelAttempt {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string"
    && typeof candidate.signature === "string"
    && Array.isArray(candidate.path)
    && candidate.path.every(isNodeSummary)
    && typeof candidate.score === "number"
    && (candidate.tier === undefined || candidate.tier === "GOLD" || candidate.tier === "SILVER" || candidate.tier === "BRONZE" || candidate.tier === "FAIL")
    && (candidate.stars === undefined || typeof candidate.stars === "number")
    && typeof candidate.hops === "number"
    && (candidate.turns === undefined || typeof candidate.turns === "number")
    && (candidate.effectiveTurns === undefined || typeof candidate.effectiveTurns === "number")
    && typeof candidate.shuffles === "number"
    && (candidate.shuffleModeEnabled === undefined || typeof candidate.shuffleModeEnabled === "boolean")
    && (candidate.appliedShufflePenaltyCount === undefined || typeof candidate.appliedShufflePenaltyCount === "number")
    && typeof candidate.rewinds === "number"
    && (candidate.repeatNodeClicks === undefined || typeof candidate.repeatNodeClicks === "number")
    && typeof candidate.deadEnds === "number"
    && (candidate.totalMistakes === undefined || typeof candidate.totalMistakes === "number")
    && (candidate.popularityScore === undefined || typeof candidate.popularityScore === "number")
    && (candidate.averageReleaseYear === undefined || candidate.averageReleaseYear === null || typeof candidate.averageReleaseYear === "number")
    && typeof candidate.timestamp === "number"
  );
}

function parseCollection(rawValue: string | null): LevelHistoryCollection {
  if (!rawValue) {
    return EMPTY_LEVEL_HISTORY_COLLECTION;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, { attempts?: unknown; updatedAt?: unknown }>;

    return Object.fromEntries(
      Object.entries(parsed)
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
            } satisfies LevelHistoryRecord,
          ];
        }),
    );
  } catch {
    return EMPTY_LEVEL_HISTORY_COLLECTION;
  }
}

function readCollectionFromStorage() {
  if (!canUseBrowserStorage()) {
    return EMPTY_LEVEL_HISTORY_COLLECTION;
  }

  const rawValue = window.localStorage.getItem(LEVEL_HISTORY_STORAGE_KEY);
  if (rawValue === cachedRawLevelHistory) {
    return cachedLevelHistorySnapshot;
  }

  cachedRawLevelHistory = rawValue;
  cachedLevelHistorySnapshot = parseCollection(rawValue);
  return cachedLevelHistorySnapshot;
}

function writeCollectionToStorage(collection: LevelHistoryCollection) {
  if (!canUseBrowserStorage()) {
    return;
  }

  const serializedCollection = JSON.stringify(collection);
  cachedRawLevelHistory = serializedCollection;
  cachedLevelHistorySnapshot = collection;
  window.localStorage.setItem(LEVEL_HISTORY_STORAGE_KEY, serializedCollection);
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(LEVEL_HISTORY_UPDATED_EVENT));
  }
}

function estimateStringStorageBytes(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }

  return value.length * 2;
}

export function buildLevelStorageKey(endpointA: HistoryEndpoint, endpointB: HistoryEndpoint) {
  const [left, right] = [endpointA, endpointB]
    .map((endpoint) => buildLevelKeyPart(endpoint, true))
    .sort((first, second) => first.localeCompare(second));

  return `${left}__${right}`;
}

function buildLegacyLevelStorageKey(endpointA: HistoryEndpoint, endpointB: HistoryEndpoint) {
  const [left, right] = [endpointA, endpointB]
    .map((endpoint) => buildLevelKeyPart(endpoint, false))
    .sort((first, second) => first.localeCompare(second));

  return `${left}__${right}`;
}

export function readAllLevelHistory() {
  return readCollectionFromStorage();
}

export function getLevelHistoryStorageSizeBytes(
  collection: LevelHistoryCollection = readCollectionFromStorage(),
) {
  if (Object.keys(collection).length === 0) {
    return 0;
  }

  return estimateStringStorageBytes(JSON.stringify(collection));
}

export function getLevelHistory(
  endpointA: HistoryEndpoint,
  endpointB: HistoryEndpoint,
  collection: LevelHistoryCollection = readCollectionFromStorage(),
) {
  const levelKey = buildLevelStorageKey(endpointA, endpointB);
  if (collection[levelKey]) {
    return collection[levelKey];
  }

  return collection[buildLegacyLevelStorageKey(endpointA, endpointB)] ?? null;
}

export function saveLevelAttempt(endpointA: HistoryEndpoint, endpointB: HistoryEndpoint, input: SaveLevelAttemptInput) {
  const collection = readCollectionFromStorage();
  const levelKey = buildLevelStorageKey(endpointA, endpointB);
  const timestamp = input.timestamp ?? Date.now();
  const signature = createAttemptSignature(input);
  const existingRecord = collection[levelKey] ?? {
    levelKey,
    attempts: [],
    updatedAt: 0,
  } satisfies LevelHistoryRecord;

  if (existingRecord.attempts.some((attempt) => attempt.signature === signature)) {
    return existingRecord;
  }

  const nextAttempt: SavedLevelAttempt = {
    id: `${timestamp}-${hashString(`${levelKey}|${signature}`)}`,
    signature,
    path: input.path,
    score: Math.round(input.score * 10) / 10,
    tier: input.tier,
    stars: input.stars,
    hops: input.hops,
    turns: input.turns,
    effectiveTurns: input.effectiveTurns,
    shuffles: input.shuffles,
    shuffleModeEnabled: input.shuffleModeEnabled,
    appliedShufflePenaltyCount: input.appliedShufflePenaltyCount,
    rewinds: input.rewinds,
    repeatNodeClicks: input.repeatNodeClicks ?? 0,
    deadEnds: input.deadEnds,
    totalMistakes: input.totalMistakes ?? (input.repeatNodeClicks ?? 0) + input.deadEnds,
    popularityScore: input.popularityScore,
    averageReleaseYear: input.averageReleaseYear,
    timestamp,
  };

  const nextRecord: LevelHistoryRecord = {
    levelKey,
    attempts: sortAttempts([...existingRecord.attempts, nextAttempt]),
    updatedAt: timestamp,
  };

  const nextCollection: LevelHistoryCollection = {
    ...collection,
    [levelKey]: nextRecord,
  };

  writeCollectionToStorage(nextCollection);
  return nextRecord;
}

export function buildHopLeaderboardGroups(attempts: SavedLevelAttempt[]): HopLeaderboardGroup[] {
  const grouped = new Map<number, SavedLevelAttempt[]>();

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

export function subscribeToLevelHistoryUpdates(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
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

export function clearLevelHistoryStorage() {
  if (!canUseBrowserStorage()) {
    return;
  }

  cachedRawLevelHistory = null;
  cachedLevelHistorySnapshot = EMPTY_LEVEL_HISTORY_COLLECTION;
  window.localStorage.removeItem(LEVEL_HISTORY_STORAGE_KEY);
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(LEVEL_HISTORY_UPDATED_EVENT));
  }
}
