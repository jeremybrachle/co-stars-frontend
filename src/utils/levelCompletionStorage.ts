const LEVEL_COMPLETION_STORAGE_KEY = "costars.level-completion.v1";
const LEVEL_COMPLETION_UPDATED_EVENT = "costars:level-completion-updated";

export type CompletedLevelsCollection = Record<string, { completedAt: number }>;

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeKeyPart(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function buildLevelCompletionKey(endpointA: string, endpointB: string) {
  const [left, right] = [endpointA, endpointB]
    .map(normalizeKeyPart)
    .sort((first, second) => first.localeCompare(second));

  return `${left}__${right}`;
}

function readCollectionFromStorage(): CompletedLevelsCollection {
  if (!canUseBrowserStorage()) {
    return {};
  }

  const rawValue = window.localStorage.getItem(LEVEL_COMPLETION_STORAGE_KEY);
  if (!rawValue) {
    return {};
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
    return {};
  }
}

function writeCollectionToStorage(collection: CompletedLevelsCollection) {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(LEVEL_COMPLETION_STORAGE_KEY, JSON.stringify(collection));
  window.dispatchEvent(new Event(LEVEL_COMPLETION_UPDATED_EVENT));
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
  endpointA: string,
  endpointB: string,
  collection: CompletedLevelsCollection = readCollectionFromStorage(),
) {
  return Boolean(collection[buildLevelCompletionKey(endpointA, endpointB)]);
}

export function markLevelCompleted(endpointA: string, endpointB: string, timestamp = Date.now()) {
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
  window.dispatchEvent(new Event(LEVEL_COMPLETION_UPDATED_EVENT));
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
