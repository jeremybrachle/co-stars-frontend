import type { GameNode } from "../types";

export function getReleaseYear(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value.slice(0, 4), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculatePathPopularityScore(path: GameNode[]) {
  const actorNodes = path.filter((node) => node.type === "actor");
  const interiorActorNodes = actorNodes.length > 2 ? actorNodes.slice(1, -1) : [];

  if (interiorActorNodes.length === 0) {
    return 0;
  }

  const total = interiorActorNodes.reduce((sum, node) => {
    const numericPopularity = typeof node.popularity === "number" && Number.isFinite(node.popularity)
      ? node.popularity
      : null;
    const numericPopularityRank = typeof node.popularityRank === "number" && Number.isFinite(node.popularityRank)
      ? node.popularityRank
      : null;
    const contribution = numericPopularity ?? numericPopularityRank ?? 0;

    return sum + Math.max(0, contribution);
  }, 0);

  return Math.round((total / interiorActorNodes.length) * 10) / 10;
}

export function calculateAverageReleaseYear(path: GameNode[]) {
  const releaseYears = path
    .filter((node) => node.type === "movie")
    .map((node) => getReleaseYear(node.releaseDate ?? null))
    .filter((year): year is number => year !== null);

  if (releaseYears.length === 0) {
    return null;
  }

  return Math.round((releaseYears.reduce((total, year) => total + year, 0) / releaseYears.length) * 10) / 10;
}

export function formatAverageReleaseYear(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}