import { buildSnapshotIndexes } from "./snapshotIndexes";
import type { FrontendManifest, FrontendSnapshot, SnapshotBundle } from "../types";

const DEMO_MANIFEST: FrontendManifest = {
	version: "demo-1",
	sourceUpdatedAt: "2026-03-11T00:00:00.000Z",
	actorCount: 8,
	movieCount: 5,
	relationshipCount: 13,
	levelCount: 6,
	recommendedRefreshIntervalHours: 24 * 365,
	snapshotEndpoint: "/demo",
};

const DEMO_SNAPSHOT: FrontendSnapshot = {
	meta: {
		version: DEMO_MANIFEST.version,
		exportedAt: DEMO_MANIFEST.sourceUpdatedAt,
		actorCount: DEMO_MANIFEST.actorCount,
		movieCount: DEMO_MANIFEST.movieCount,
		relationshipCount: DEMO_MANIFEST.relationshipCount,
		levelCount: DEMO_MANIFEST.levelCount,
	},
	actors: [
		{ id: 1, name: "George Clooney", popularity: 9.5, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
		{ id: 2, name: "Brad Pitt", popularity: 9.1, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
		{ id: 3, name: "Julia Roberts", popularity: 8.9, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
		{ id: 4, name: "Matt Damon", popularity: 8.7, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
		{ id: 5, name: "Sandra Bullock", popularity: 8.8, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
		{ id: 6, name: "Keanu Reeves", popularity: 9.0, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
		{ id: 7, name: "Carrie-Anne Moss", popularity: 7.9, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
		{ id: 8, name: "Hugo Weaving", popularity: 7.8, birthday: null, deathday: null, placeOfBirth: null, biography: null, profilePath: null, profileUrl: null, knownForDepartment: "Acting" },
	],
	movies: [
		{ id: 101, title: "Ocean's Eleven", releaseDate: "2001-12-07", genres: ["Crime", "Thriller"], overview: null, posterPath: null, posterUrl: null, originalLanguage: "en", contentRating: "PG-13" },
		{ id: 102, title: "Ocean's Twelve", releaseDate: "2004-12-10", genres: ["Crime", "Comedy"], overview: null, posterPath: null, posterUrl: null, originalLanguage: "en", contentRating: "PG-13" },
		{ id: 103, title: "The Mexican", releaseDate: "2001-03-02", genres: ["Comedy", "Romance"], overview: null, posterPath: null, posterUrl: null, originalLanguage: "en", contentRating: "R" },
		{ id: 104, title: "Speed", releaseDate: "1994-06-10", genres: ["Action", "Thriller"], overview: null, posterPath: null, posterUrl: null, originalLanguage: "en", contentRating: "R" },
		{ id: 105, title: "The Matrix", releaseDate: "1999-03-31", genres: ["Action", "Science Fiction"], overview: null, posterPath: null, posterUrl: null, originalLanguage: "en", contentRating: "R" },
	],
	movieActors: [
		{ movieId: 101, actorId: 1 },
		{ movieId: 101, actorId: 2 },
		{ movieId: 101, actorId: 4 },
		{ movieId: 102, actorId: 1 },
		{ movieId: 102, actorId: 3 },
		{ movieId: 103, actorId: 2 },
		{ movieId: 103, actorId: 3 },
		{ movieId: 104, actorId: 5 },
		{ movieId: 104, actorId: 6 },
		{ movieId: 105, actorId: 6 },
		{ movieId: 105, actorId: 7 },
		{ movieId: 105, actorId: 8 },
	],
	adjacency: {
		actorToMovies: {
			"1": [101, 102],
			"2": [101, 103],
			"3": [102, 103],
			"4": [101],
			"5": [104],
			"6": [104, 105],
			"7": [105],
			"8": [105],
		},
		movieToActors: {
			"101": [1, 2, 4],
			"102": [1, 3],
			"103": [2, 3],
			"104": [5, 6],
			"105": [6, 7, 8],
		},
	},
	levels: [
		{ actorA: "George Clooney", actorB: "Brad Pitt", stars: 1 },
		{ actorA: "Sandra Bullock", actorB: "Keanu Reeves", stars: 1 },
		{ actorA: "George Clooney", actorB: "Julia Roberts", stars: 1 },
		{ actorA: "Carrie-Anne Moss", actorB: "Keanu Reeves", stars: 1 },
		{ actorA: "Matt Damon", actorB: "Julia Roberts", stars: 2 },
		{ actorA: "Hugo Weaving", actorB: "Sandra Bullock", stars: 2 },
	],
};

const DEMO_BUNDLE: SnapshotBundle = {
	manifest: DEMO_MANIFEST,
	snapshot: DEMO_SNAPSHOT,
	indexes: buildSnapshotIndexes(DEMO_SNAPSHOT),
	loadedFrom: "demo",
};

export function getDemoSnapshotBundle() {
	return DEMO_BUNDLE;
}

export function getDemoSourceLabel() {
	return "the built-in offline demo dataset";
}