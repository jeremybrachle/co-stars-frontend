"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const localGraph_1 = require("../../src/data/localGraph");
function createFixtureIndexes() {
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
function actor(id, label) {
    return { id, label, type: "actor" };
}
function movie(id, label) {
    return { id, label, type: "movie" };
}
(0, node_test_1.default)("findNodeByLabel matches actor names case-insensitively and trims whitespace", () => {
    const indexes = createFixtureIndexes();
    const result = (0, localGraph_1.findNodeByLabel)("  george clooney  ", "actor", indexes);
    strict_1.default.deepEqual(result, actor(1, "George Clooney"));
});
(0, node_test_1.default)("findShortestPath returns an alternating actor and movie route", () => {
    const indexes = createFixtureIndexes();
    const path = (0, localGraph_1.findShortestPath)(actor(1, "George Clooney"), actor(3, "Julia Roberts"), indexes);
    strict_1.default.deepEqual(path, [
        actor(1, "George Clooney"),
        movie(11, "Ocean's Twelve"),
        actor(3, "Julia Roberts"),
    ]);
});
(0, node_test_1.default)("getMoviesForActor returns connected movies with path hints toward the target actor", () => {
    const indexes = createFixtureIndexes();
    const target = actor(3, "Julia Roberts");
    const result = (0, localGraph_1.getMoviesForActor)(1, target, indexes);
    strict_1.default.equal(result.length, 2);
    strict_1.default.deepEqual(result.map((entry) => entry.label), ["Ocean's Eleven", "Ocean's Twelve"]);
    strict_1.default.equal(result[0].type, "movie");
    strict_1.default.equal(result[0].pathHint?.reachable, true);
    strict_1.default.equal(result[1].pathHint?.stepsToTarget, 1);
});
(0, node_test_1.default)("getActorsForMovie excludes already-used actor names and returns remaining co-stars", () => {
    const indexes = createFixtureIndexes();
    const target = actor(3, "Julia Roberts");
    const result = (0, localGraph_1.getActorsForMovie)(10, ["George Clooney", "matt damon"], target, indexes);
    strict_1.default.deepEqual(result.map((entry) => entry.label), ["Brad Pitt"]);
    strict_1.default.equal(result[0].type, "actor");
    strict_1.default.equal(result[0].pathHint?.reachable, true);
});
(0, node_test_1.default)("createGameNodeFromSummary fills actor popularity and movie release dates", () => {
    const indexes = createFixtureIndexes();
    const actorNode = (0, localGraph_1.createGameNodeFromSummary)(actor(2, "Brad Pitt"), indexes);
    const movieNode = (0, localGraph_1.createGameNodeFromSummary)(movie(11, "Ocean's Twelve"), indexes);
    strict_1.default.equal(actorNode.popularity, 9.1);
    strict_1.default.equal(movieNode.releaseDate, "2004-12-10");
});
(0, node_test_1.default)("createPathHint and generateLocalPath describe reachable routes", () => {
    const indexes = createFixtureIndexes();
    const hint = (0, localGraph_1.createPathHint)(actor(4, "Matt Damon"), actor(3, "Julia Roberts"), indexes);
    const generated = (0, localGraph_1.generateLocalPath)(actor(4, "Matt Damon"), actor(3, "Julia Roberts"), indexes);
    strict_1.default.equal(hint.reachable, true);
    strict_1.default.equal(hint.stepsToTarget, 3);
    strict_1.default.equal(generated.reason, null);
    strict_1.default.equal(generated.steps, 3);
    strict_1.default.equal(generated.path, "Matt Damon -> Ocean's Eleven -> George Clooney -> Ocean's Twelve -> Julia Roberts");
});
(0, node_test_1.default)("validateLocalPath accepts alternating valid routes and rejects broken ones", () => {
    const indexes = createFixtureIndexes();
    const validPath = [
        (0, localGraph_1.createGameNodeFromSummary)(actor(1, "George Clooney"), indexes),
        (0, localGraph_1.createGameNodeFromSummary)(movie(11, "Ocean's Twelve"), indexes),
        (0, localGraph_1.createGameNodeFromSummary)(actor(3, "Julia Roberts"), indexes),
    ];
    const invalidPath = [
        (0, localGraph_1.createGameNodeFromSummary)(actor(1, "George Clooney"), indexes),
        (0, localGraph_1.createGameNodeFromSummary)(movie(12, "The Mexican"), indexes),
    ];
    strict_1.default.deepEqual((0, localGraph_1.validateLocalPath)(validPath, indexes), { valid: true });
    strict_1.default.deepEqual((0, localGraph_1.validateLocalPath)(invalidPath, indexes), {
        valid: false,
        message: "George Clooney is not connected to The Mexican.",
    });
});
