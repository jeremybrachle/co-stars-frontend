import test from "node:test";
import assert from "node:assert/strict";
import {
  createGameNodeFromSummary,
  createPathHint,
  findNodeByLabel,
  findShortestPath,
  findShortestPathWithFilter,
  generateLocalPath,
  getActorsForMovie,
  getMoviesForActor,
  validateLocalPath,
} from "../../src/data/localGraph";
import type { NodeSummary, SnapshotIndexes } from "../../src/types";

function createFixtureIndexes(): SnapshotIndexes {
  const actors = [
    { id: 1, name: "George Clooney", popularity: 9.5 },
    { id: 2, name: "Brad Pitt", popularity: 9.1 },
    { id: 3, name: "Julia Roberts", popularity: 8.9 },
    { id: 4, name: "Matt Damon", popularity: 8.7 },
  ];
  const movies = [
    { id: 10, title: "Ocean's Eleven", releaseDate: "2001-12-07" },
    { id: 11, title: "Ocean's Twelve", releaseDate: "2004-12-10" },
    { id: 12, title: "The Mexican", releaseDate: "2001-03-02" },
  ];

  return {
    actorsById: new Map(actors.map((actor) => [actor.id, actor])),
    moviesById: new Map(movies.map((movie) => [movie.id, movie])),
    actorNameToId: new Map(actors.map((actor) => [actor.name.toLowerCase(), actor.id])),
    movieTitleToId: new Map(movies.map((movie) => [movie.title.toLowerCase(), movie.id])),
    actorToMovies: {
      "1": [10, 11],
      "2": [10, 12],
      "3": [11, 12],
      "4": [10],
    },
    movieToActors: {
      "10": [1, 2, 4],
      "11": [1, 3],
      "12": [2, 3],
    },
  };
}

function actor(id: number, label: string): NodeSummary {
  return { id, label, type: "actor" };
}

function movie(id: number, label: string): NodeSummary {
  return { id, label, type: "movie" };
}

test("findNodeByLabel matches actor names case-insensitively and trims whitespace", () => {
  const indexes = createFixtureIndexes();

  const result = findNodeByLabel("  george clooney  ", "actor", indexes);

  assert.deepEqual(result, actor(1, "George Clooney"));
});

test("findShortestPath returns an alternating actor and movie route", () => {
  const indexes = createFixtureIndexes();

  const path = findShortestPath(actor(1, "George Clooney"), actor(3, "Julia Roberts"), indexes);

  assert.deepEqual(path, [
    actor(1, "George Clooney"),
    movie(11, "Ocean's Twelve"),
    actor(3, "Julia Roberts"),
  ]);
});

test("findShortestPathWithFilter rejects routes when traversal filters remove every remaining bridge", () => {
  const indexes = createFixtureIndexes();

  const path = findShortestPathWithFilter(
    actor(1, "George Clooney"),
    actor(3, "Julia Roberts"),
    indexes,
    (node) => node.type !== "movie" || (node.id !== 11 && node.id !== 12),
  );

  assert.equal(path, null);
});

test("getMoviesForActor returns connected movies with path hints toward the target actor", () => {
  const indexes = createFixtureIndexes();
  const target = actor(3, "Julia Roberts");

  const result = getMoviesForActor(1, target, indexes);

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((entry) => entry.label), ["Ocean's Twelve", "Ocean's Eleven"]);
  assert.equal(result[0].type, "movie");
  assert.equal(result[0].pathHint?.reachable, true);
  assert.equal(result[0].pathHint?.stepsToTarget, 1);
  assert.equal(result[1].pathHint?.stepsToTarget, 3);
});

test("getActorsForMovie excludes already-used actor names and returns remaining co-stars", () => {
  const indexes = createFixtureIndexes();
  const target = actor(3, "Julia Roberts");

  const result = getActorsForMovie(10, ["George Clooney", "matt damon"], target, indexes);

  assert.deepEqual(result.map((entry) => entry.label), ["Brad Pitt"]);
  assert.equal(result[0].type, "actor");
  assert.equal(result[0].pathHint?.reachable, true);
});

test("createGameNodeFromSummary fills actor popularity and movie release dates", () => {
  const indexes = createFixtureIndexes();

  const actorNode = createGameNodeFromSummary(actor(2, "Brad Pitt"), indexes);
  const movieNode = createGameNodeFromSummary(movie(11, "Ocean's Twelve"), indexes);

  assert.equal(actorNode.popularity, 9.1);
  assert.equal(movieNode.releaseDate, "2004-12-10");
});

test("createPathHint and generateLocalPath describe reachable routes", () => {
  const indexes = createFixtureIndexes();

  const hint = createPathHint(actor(4, "Matt Damon"), actor(3, "Julia Roberts"), indexes);
  const generated = generateLocalPath(actor(4, "Matt Damon"), actor(3, "Julia Roberts"), indexes);

  assert.equal(hint.reachable, true);
  assert.equal(hint.stepsToTarget, 4);
  assert.equal(generated.reason, null);
  assert.equal(generated.steps, 4);
  assert.equal(generated.path, "Matt Damon -> Ocean's Eleven -> George Clooney -> Ocean's Twelve -> Julia Roberts");
});

test("validateLocalPath accepts alternating valid routes and rejects broken ones", () => {
  const indexes = createFixtureIndexes();

  const validPath = [
    createGameNodeFromSummary(actor(1, "George Clooney"), indexes),
    createGameNodeFromSummary(movie(11, "Ocean's Twelve"), indexes),
    createGameNodeFromSummary(actor(3, "Julia Roberts"), indexes),
  ];
  const invalidPath = [
    createGameNodeFromSummary(actor(1, "George Clooney"), indexes),
    createGameNodeFromSummary(movie(12, "The Mexican"), indexes),
  ];

  assert.deepEqual(validateLocalPath(validPath, indexes), { valid: true });
  assert.deepEqual(validateLocalPath(invalidPath, indexes), {
    valid: false,
    message: "George Clooney is not connected to The Mexican.",
  });
});