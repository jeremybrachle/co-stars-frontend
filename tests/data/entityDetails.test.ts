import test from "node:test";
import assert from "node:assert/strict";
import { buildNextDetailTrail, sortByPopularityDescending, sortMoviesByReleaseDateDescending } from "../../src/data/entityDetails";

test("sortByPopularityDescending orders actors high-to-low and keeps null popularity last", () => {
  const entries = [
    { id: 1, name: "Actor C", popularity: 8.2 },
    { id: 2, name: "Actor B", popularity: null },
    { id: 3, name: "Actor A", popularity: 8.2 },
    { id: 4, name: "Actor D", popularity: 9.7 },
  ];

  const result = sortByPopularityDescending(entries, (entry) => entry.popularity, (entry) => entry.name);

  assert.deepEqual(result.map((entry) => entry.name), ["Actor D", "Actor A", "Actor C", "Actor B"]);
});

test("buildNextDetailTrail appends new entries and trims when revisiting an existing one", () => {
  const trail = [
    { id: 10, type: "movie" as const, label: "Movie One" },
    { id: 20, type: "actor" as const, label: "Actor Two" },
  ];

  const appended = buildNextDetailTrail(
    trail,
    { id: 30, type: "movie" as const, label: "Movie Three" },
    (left, right) => left.id === right.id && left.type === right.type,
  );

  assert.deepEqual(appended.map((entry) => `${entry.type}:${entry.id}`), ["movie:10", "actor:20", "movie:30"]);

  const revisited = buildNextDetailTrail(
    appended,
    { id: 20, type: "actor" as const, label: "Actor Two" },
    (left, right) => left.id === right.id && left.type === right.type,
  );

  assert.deepEqual(revisited.map((entry) => `${entry.type}:${entry.id}`), ["movie:10", "actor:20"]);
});

test("sortMoviesByReleaseDateDescending orders newer releases before older ones and null dates last", () => {
  const entries = [
    { id: 1, title: "Older Film", releaseDate: "1999-03-12" },
    { id: 2, title: "Undated Film", releaseDate: null },
    { id: 3, title: "Newest Film", releaseDate: "2024-11-08" },
    { id: 4, title: "Mid Film", releaseDate: "2011-06-17" },
  ];

  const result = sortMoviesByReleaseDateDescending(entries, (entry) => entry.releaseDate, (entry) => entry.title);

  assert.deepEqual(result.map((entry) => entry.title), ["Newest Film", "Mid Film", "Older Film", "Undated Film"]);
});
