"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSnapshotIndexes = buildSnapshotIndexes;
function normalizeLookupKey(value) {
    return value.trim().toLocaleLowerCase();
}
function buildSnapshotIndexes(snapshot) {
    const actorsById = new Map(snapshot.actors.map((actor) => [actor.id, actor]));
    const moviesById = new Map(snapshot.movies.map((movie) => [movie.id, movie]));
    const actorNameToId = new Map(snapshot.actors.map((actor) => [normalizeLookupKey(actor.name), actor.id]));
    const movieTitleToId = new Map(snapshot.movies.map((movie) => [normalizeLookupKey(movie.title), movie.id]));
    return {
        actorsById,
        moviesById,
        actorNameToId,
        movieTitleToId,
        actorToMovies: snapshot.adjacency.actorToMovies,
        movieToActors: snapshot.adjacency.movieToActors,
    };
}
