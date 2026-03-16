import type { Actor, GameNode, Movie, NodeType } from "../types";

type ActorLike = Pick<Actor, "popularity" | "knownForDepartment" | "placeOfBirth">;
type MovieLike = Pick<Movie, "releaseDate" | "genres" | "contentRating" | "originalLanguage">;

export function getEntityEmoji(type: NodeType) {
	return type === "actor" ? "🎭" : "🎬";
}

export function formatYear(date: string | null | undefined) {
	return date ? date.slice(0, 4) : null;
}

export function formatActorInlineMeta(actor: ActorLike) {
	if (actor.knownForDepartment) {
		return actor.knownForDepartment;
	}

	if (actor.placeOfBirth) {
		return actor.placeOfBirth;
	}

	if (actor.popularity !== null && actor.popularity !== undefined) {
		return `Popularity ${actor.popularity.toFixed(1)}`;
	}

	return "Actor";
}

export function formatMovieInlineMeta(movie: MovieLike) {
	const genres = movie.genres ?? [];
	const parts = [formatYear(movie.releaseDate), movie.contentRating].filter(Boolean);

	if (parts.length > 0) {
		return parts.join(" • ");
	}

	if (genres.length > 0) {
		return genres.slice(0, 2).join(" • ");
	}

	return "Movie";
}

export function formatActorLifespan(actor: Pick<Actor, "birthday" | "deathday">) {
	const birthYear = formatYear(actor.birthday);
	const deathYear = formatYear(actor.deathday);

	if (!birthYear && !deathYear) {
		return null;
	}

	if (birthYear && deathYear) {
		return `${birthYear}–${deathYear}`;
	}

	return birthYear ? `Born ${birthYear}` : `Died ${deathYear}`;
}

export function getMovieBadges(movie: Pick<Movie, "genres" | "contentRating" | "originalLanguage">) {
	return [movie.contentRating, movie.originalLanguage?.toUpperCase(), ...(movie.genres ?? []).slice(0, 2)].filter(
		(value): value is string => Boolean(value),
	);
}

export function getNodeImageUrl(node: Pick<GameNode, "imageUrl">) {
	return node.imageUrl ?? null;
}

export function formatGameNodeMeta(node: GameNode) {
	if (node.type === "actor") {
		return formatActorInlineMeta({
			popularity: node.popularity ?? null,
			knownForDepartment: node.knownForDepartment ?? null,
			placeOfBirth: node.placeOfBirth ?? null,
		});
	}

	return formatMovieInlineMeta({
		releaseDate: node.releaseDate ?? null,
		genres: node.genres ?? [],
		contentRating: node.contentRating ?? null,
		originalLanguage: node.originalLanguage ?? null,
	});
}