"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameNodeFromSummary = createGameNodeFromSummary;
exports.findNodeByLabel = findNodeByLabel;
exports.findShortestPath = findShortestPath;
exports.findShortestPathWithFilter = findShortestPathWithFilter;
exports.createPathHint = createPathHint;
exports.getMoviesForActor = getMoviesForActor;
exports.getActorsForMovie = getActorsForMovie;
exports.generateLocalPath = generateLocalPath;
exports.validateLocalPath = validateLocalPath;
const entityDetails_1 = require("./entityDetails");
function normalizeLookupKey(value) {
    return value.trim().toLocaleLowerCase();
}
function buildNodeSummary(type, id, indexes) {
    if (type === "actor") {
        const actor = indexes.actorsById.get(id);
        return actor ? { id: actor.id, type: "actor", label: actor.name } : null;
    }
    const movie = indexes.moviesById.get(id);
    return movie ? { id: movie.id, type: "movie", label: movie.title } : null;
}
function getNodeKey(node) {
    return `${node.type}:${node.id}`;
}
function getNeighborNodes(node, indexes) {
    if (node.type === "actor") {
        const movieIds = indexes.actorToMovies[String(node.id)] ?? [];
        return movieIds
            .map((movieId) => buildNodeSummary("movie", movieId, indexes))
            .filter((candidate) => candidate !== null);
    }
    const actorIds = indexes.movieToActors[String(node.id)] ?? [];
    return actorIds
        .map((actorId) => buildNodeSummary("actor", actorId, indexes))
        .filter((candidate) => candidate !== null);
}
function createGameNodeFromSummary(node, indexes) {
    if (node.type === "actor") {
        const actor = indexes.actorsById.get(node.id);
        return {
            id: node.id,
            label: node.label,
            type: node.type,
            popularity: actor?.popularity ?? null,
            imageUrl: actor?.profileUrl ?? null,
            knownForDepartment: actor?.knownForDepartment ?? null,
            placeOfBirth: actor?.placeOfBirth ?? null,
        };
    }
    const movie = indexes.moviesById.get(node.id);
    return {
        id: node.id,
        label: node.label,
        type: node.type,
        releaseDate: movie?.releaseDate ?? null,
        imageUrl: movie?.posterUrl ?? null,
        genres: movie?.genres ?? [],
        contentRating: movie?.contentRating ?? null,
        originalLanguage: movie?.originalLanguage ?? null,
        overview: movie?.overview ?? null,
    };
}
function findNodeByLabel(label, type, indexes) {
    const normalized = normalizeLookupKey(label);
    if (type === "actor") {
        const actorId = indexes.actorNameToId.get(normalized);
        return actorId !== undefined ? buildNodeSummary("actor", actorId, indexes) : null;
    }
    const movieId = indexes.movieTitleToId.get(normalized);
    return movieId !== undefined ? buildNodeSummary("movie", movieId, indexes) : null;
}
function findShortestPath(start, target, indexes, options = {}) {
    const startKey = getNodeKey(start);
    const targetKey = getNodeKey(target);
    const canTraverseNode = options.canTraverseNode ?? (() => true);
    if (startKey === targetKey) {
        return [start];
    }
    const queue = [start];
    const visited = new Set([startKey]);
    const previous = new Map([[startKey, null]]);
    const nodesByKey = new Map([[startKey, start]]);
    while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {
            break;
        }
        for (const neighbor of getNeighborNodes(current, indexes)) {
            const neighborKey = getNodeKey(neighbor);
            if (visited.has(neighborKey)) {
                continue;
            }
            if (neighborKey !== targetKey && !canTraverseNode(neighbor)) {
                continue;
            }
            visited.add(neighborKey);
            previous.set(neighborKey, getNodeKey(current));
            nodesByKey.set(neighborKey, neighbor);
            if (neighborKey === targetKey) {
                const path = [];
                let cursor = neighborKey;
                while (cursor) {
                    const node = nodesByKey.get(cursor);
                    if (!node) {
                        break;
                    }
                    path.unshift(node);
                    cursor = previous.get(cursor) ?? null;
                }
                return path;
            }
            queue.push(neighbor);
        }
    }
    return null;
}
function findShortestPathWithFilter(start, target, indexes, canTraverseNode) {
    return findShortestPath(start, target, indexes, { canTraverseNode });
}
function createPathHint(start, target, indexes) {
    const path = findShortestPath(start, target, indexes);
    return {
        reachable: path !== null,
        stepsToTarget: path ? Math.max(0, path.length - 1) : null,
        path: path ?? [],
    };
}
function isNonNull(value) {
    return value !== null;
}
function getMoviesForActor(actorId, target, indexes) {
    const movieIds = indexes.actorToMovies[String(actorId)] ?? [];
    return (0, entityDetails_1.sortMoviesByReleaseDateDescending)(movieIds
        .map((movieId) => {
        const movie = indexes.moviesById.get(movieId);
        if (!movie) {
            return null;
        }
        const summary = { id: movie.id, type: "movie", label: movie.title };
        return {
            id: movie.id,
            label: movie.title,
            type: "movie",
            releaseDate: movie.releaseDate,
            imageUrl: movie.posterUrl,
            genres: movie.genres,
            contentRating: movie.contentRating,
            originalLanguage: movie.originalLanguage,
            overview: movie.overview,
            pathHint: target ? createPathHint(summary, target, indexes) : undefined,
        };
    })
        .filter(isNonNull), (entry) => entry.releaseDate, (entry) => entry.label);
}
function getActorsForMovie(movieId, excludedNames, target, indexes) {
    const excluded = new Set(excludedNames.map(normalizeLookupKey));
    const actorIds = indexes.movieToActors[String(movieId)] ?? [];
    return actorIds
        .map((actorId) => indexes.actorsById.get(actorId))
        .filter((actor) => actor !== undefined)
        .filter((actor) => !excluded.has(normalizeLookupKey(actor.name)))
        .map((actor) => {
        const summary = { id: actor.id, type: "actor", label: actor.name };
        return {
            id: actor.id,
            label: actor.name,
            type: "actor",
            popularity: actor.popularity,
            imageUrl: actor.profileUrl,
            knownForDepartment: actor.knownForDepartment,
            placeOfBirth: actor.placeOfBirth,
            pathHint: target ? createPathHint(summary, target, indexes) : undefined,
        };
    });
}
function generateLocalPath(start, target, indexes) {
    const path = findShortestPath(start, target, indexes);
    return {
        path: path ? path.map((node) => node.label).join(" -> ") : "",
        nodes: path ?? [],
        steps: path ? Math.max(0, path.length - 1) : 0,
        reason: path ? null : "No path found in local snapshot.",
    };
}
function validateLocalPath(path, indexes) {
    if (path.length === 0) {
        return { valid: false, message: "Path is empty." };
    }
    for (let index = 0; index < path.length - 1; index += 1) {
        const current = path[index];
        const next = path[index + 1];
        if (current.type === next.type) {
            return { valid: false, message: "Path must alternate between actors and movies." };
        }
        if (current.id === undefined || next.id === undefined) {
            return { valid: false, message: "Path contains unresolved nodes." };
        }
        if (current.type === "actor") {
            const movieIds = indexes.actorToMovies[String(current.id)] ?? [];
            if (!movieIds.includes(next.id)) {
                return { valid: false, message: `${current.label} is not connected to ${next.label}.` };
            }
        }
        else {
            const actorIds = indexes.movieToActors[String(current.id)] ?? [];
            if (!actorIds.includes(next.id)) {
                return { valid: false, message: `${current.label} is not connected to ${next.label}.` };
            }
        }
    }
    return { valid: true };
}
