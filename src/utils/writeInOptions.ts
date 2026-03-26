import type { GameNode } from "../types";
import { getTopWriteInMatches } from "./writeInMatching";

function normalizeWriteInLabel(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getWriteInOptionKey(option: GameNode) {
  if (option.id !== undefined) {
    return `${option.type}:${option.id}`;
  }

  return `${option.type}:${normalizeWriteInLabel(option.label)}`;
}

export function dedupeWriteInOptions(options: GameNode[]) {
  const seen = new Set<string>();

  return options.filter((option) => {
    const key = getWriteInOptionKey(option);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getVisibleWriteInOptions(options: GameNode[], query: string, limit = 12) {
  const dedupedOptions = dedupeWriteInOptions(options).filter((option) => option.id !== undefined);
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return dedupedOptions;
  }

  const matchedLabels = getTopWriteInMatches(
    dedupedOptions.map((option) => option.label),
    trimmedQuery,
    limit,
  );

  return matchedLabels
    .map((label) => dedupedOptions.find((option) => option.label === label) ?? null)
    .filter((option): option is GameNode => option !== null);
}

export function resolveWriteInOption(value: string, options: GameNode[], allowAutoSuggest: boolean) {
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

  const matchedLabel = getTopWriteInMatches(
    dedupedOptions.map((option) => option.label),
    normalizedValue,
    1,
  )[0] ?? null;

  return matchedLabel
    ? dedupedOptions.find((option) => option.label === matchedLabel) ?? null
    : null;
}