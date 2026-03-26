import test from "node:test";
import assert from "node:assert/strict";
import { calculateAverageReleaseYear, calculatePathPopularityScore, formatAverageReleaseYear } from "../../src/utils/gameCompletionMetrics";
import type { GameNode } from "../../src/types";

test("calculatePathPopularityScore averages interior actor popularity and excludes the endpoint actors", () => {
  const path: GameNode[] = [
    { label: "Start Actor", type: "actor", popularity: 9.8 },
    { label: "Movie One", type: "movie", releaseDate: "2001-10-12" },
    { label: "Middle Actor One", type: "actor", popularity: 8.5 },
    { label: "Movie Two", type: "movie", releaseDate: "2003-07-09" },
    { label: "Middle Actor Two", type: "actor", popularity: 7.5 },
    { label: "Movie Three", type: "movie", releaseDate: "2004-08-20" },
    { label: "End Actor", type: "actor", popularity: 9.1 },
  ];

  assert.equal(calculatePathPopularityScore(path), 8);
});

test("calculatePathPopularityScore falls back to popularity rank for interior actors when popularity is missing", () => {
  const path: GameNode[] = [
    { label: "Start Actor", type: "actor", popularity: 10 },
    { label: "Movie One", type: "movie" },
    { label: "Middle Actor One", type: "actor", popularityRank: 4 },
    { label: "Movie Two", type: "movie" },
    { label: "Middle Actor Two", type: "actor", popularity: null, popularityRank: 6 },
    { label: "Movie Three", type: "movie" },
    { label: "End Actor", type: "actor", popularity: 9.5 },
  ];

  assert.equal(calculatePathPopularityScore(path), 5);
});

test("calculatePathPopularityScore returns zero when the path has no interior actors", () => {
  const path: GameNode[] = [
    { label: "Start Actor", type: "actor", popularity: 9.4 },
    { label: "Movie One", type: "movie", releaseDate: "2001-10-12" },
    { label: "End Actor", type: "actor", popularity: 8.7 },
  ];

  assert.equal(calculatePathPopularityScore(path), 0);
});

test("calculateAverageReleaseYear averages movie years and ignores missing dates", () => {
  const path: GameNode[] = [
    { label: "Movie One", type: "movie", releaseDate: "2000-01-01" },
    { label: "Actor One", type: "actor", popularity: 9.1 },
    { label: "Movie Two", type: "movie", releaseDate: "2005-06-14" },
    { label: "Movie Three", type: "movie", releaseDate: null },
  ];

  assert.equal(calculateAverageReleaseYear(path), 2002.5);
  assert.equal(formatAverageReleaseYear(2002.5), "2002.5");
  assert.equal(formatAverageReleaseYear(null), "--");
});