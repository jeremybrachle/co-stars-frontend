import type { Actor, FrontendSnapshot, Movie, SnapshotIndexes } from "../types";

function normalizeLookupKey(value: string) {
	return value.trim().toLocaleLowerCase();
}

export function buildSnapshotIndexes(snapshot: FrontendSnapshot): SnapshotIndexes {
	const actorsById = new Map<number, Actor>(snapshot.actors.map((actor) => [actor.id, actor]));
	const moviesById = new Map<number, Movie>(snapshot.movies.map((movie) => [movie.id, movie]));
	const actorNameToId = new Map<string, number>(
		snapshot.actors.map((actor) => [normalizeLookupKey(actor.name), actor.id]),
	);
	const movieTitleToId = new Map<string, number>(
		snapshot.movies.map((movie) => [normalizeLookupKey(movie.title), movie.id]),
	);

	return {
		actorsById,
		moviesById,
		actorNameToId,
		movieTitleToId,
		actorToMovies: snapshot.adjacency.actorToMovies,
		movieToActors: snapshot.adjacency.movieToActors,
	};
}