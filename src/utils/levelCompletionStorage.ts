import type { LevelNode } from "../types";

const LEVEL_COMPLETION_STORAGE_KEY = "costars.level-completion.v2";
const LEVEL_COMPLETION_UPDATED_EVENT = "costars:level-completion-updated";

export type CompletedLevelsCollection = Record<string, { completedAt: number }>;

const EMPTY_COMPLETED_LEVELS_COLLECTION = {} as CompletedLevelsCollection;

let cachedRawCompletedLevels: string | null | undefined;
let cachedCompletedLevelsSnapshot: CompletedLevelsCollection = EMPTY_COMPLETED_LEVELS_COLLECTION;

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeKeyPart(value: string) {
  return value.trim().toLocaleLowerCase();
}

type CompletionEndpoint = string | Pick<LevelNode, "label"> | Pick<LevelNode, "label" | "type">;

function buildLevelKeyPart(endpoint: CompletionEndpoint, includeType: boolean) {
  if (typeof endpoint === "string") {
    return normalizeKeyPart(endpoint);
  }

  const normalizedLabel = normalizeKeyPart(endpoint.label);
  if (!includeType || !("type" in endpoint) || !endpoint.type) {
    return normalizedLabel;
  }

  return `${endpoint.type}:${normalizedLabel}`;
}

export function buildLevelCompletionKey(endpointA: CompletionEndpoint, endpointB: CompletionEndpoint) {
  const [left, right] = [endpointA, endpointB]
    .map((endpoint) => buildLevelKeyPart(endpoint, true))
    .sort((first, second) => first.localeCompare(second));

  return `${left}__${right}`;
}

function buildLegacyLevelCompletionKey(endpointA: CompletionEndpoint, endpointB: CompletionEndpoint) {
  const [left, right] = [endpointA, endpointB]
    .map((endpoint) => buildLevelKeyPart(endpoint, false))
    .sort((first, second) => first.localeCompare(second));

  return `${left}__${right}`;
}

function parseCollection(rawValue: string | null): CompletedLevelsCollection {
  if (!rawValue) {
    return EMPTY_COMPLETED_LEVELS_COLLECTION;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, { completedAt?: unknown }>;
    return Object.fromEntries(
      Object.entries(parsed).map(([levelKey, value]) => [
        levelKey,
        {
          completedAt: typeof value?.completedAt === "number" ? value.completedAt : 0,
        },
      ]),
    );
  } catch {
    return EMPTY_COMPLETED_LEVELS_COLLECTION;
  }
}

function readCollectionFromStorage(): CompletedLevelsCollection {
  if (!canUseBrowserStorage()) {
    return EMPTY_COMPLETED_LEVELS_COLLECTION;
  }

  const rawValue = window.localStorage.getItem(LEVEL_COMPLETION_STORAGE_KEY);
  if (rawValue === cachedRawCompletedLevels) {
    return cachedCompletedLevelsSnapshot;
  }

  cachedRawCompletedLevels = rawValue;
  cachedCompletedLevelsSnapshot = parseCollection(rawValue);
  return cachedCompletedLevelsSnapshot;
}

function writeCollectionToStorage(collection: CompletedLevelsCollection) {
  if (!canUseBrowserStorage()) {
    return;
  }

  const serializedCollection = JSON.stringify(collection);
  cachedRawCompletedLevels = serializedCollection;
  cachedCompletedLevelsSnapshot = collection;
  window.localStorage.setItem(LEVEL_COMPLETION_STORAGE_KEY, serializedCollection);
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(LEVEL_COMPLETION_UPDATED_EVENT));
  }
}

function estimateStringStorageBytes(value: string) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(value).length;
  }

  return value.length * 2;
}

export function readCompletedLevels() {
  return readCollectionFromStorage();
}

export function isLevelCompleted(
  endpointA: CompletionEndpoint,
  endpointB: CompletionEndpoint,
  collection: CompletedLevelsCollection = readCollectionFromStorage(),
) {
  const levelKey = buildLevelCompletionKey(endpointA, endpointB);
  if (collection[levelKey]) {
    return true;
  }

  return Boolean(collection[buildLegacyLevelCompletionKey(endpointA, endpointB)]);
}

export function markLevelCompleted(endpointA: CompletionEndpoint, endpointB: CompletionEndpoint, timestamp = Date.now()) {
  const collection = readCollectionFromStorage();
  const levelKey = buildLevelCompletionKey(endpointA, endpointB);
  const nextCollection: CompletedLevelsCollection = {
    ...collection,
    [levelKey]: { completedAt: timestamp },
  };

  writeCollectionToStorage(nextCollection);
  return nextCollection;
}

export function getCompletedLevelsStorageSizeBytes(
  collection: CompletedLevelsCollection = readCollectionFromStorage(),
) {
  if (Object.keys(collection).length === 0) {
    return 0;
  }

  return estimateStringStorageBytes(JSON.stringify(collection));
}

export function clearCompletedLevelsStorage() {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.removeItem(LEVEL_COMPLETION_STORAGE_KEY);
  if (typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(LEVEL_COMPLETION_UPDATED_EVENT));
  }
}

export function subscribeToLevelCompletionUpdates(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === LEVEL_COMPLETION_STORAGE_KEY) {
      listener();
    }
  };
  const handleUpdate = () => listener();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LEVEL_COMPLETION_UPDATED_EVENT, handleUpdate);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LEVEL_COMPLETION_UPDATED_EVENT, handleUpdate);
  };
}
