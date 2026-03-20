"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const gameCompletionMetrics_1 = require("../../src/utils/gameCompletionMetrics");
(0, node_test_1.default)("calculatePathPopularityScore averages interior actor popularity and excludes the endpoint actors", () => {
    const path = [
        { label: "Start Actor", type: "actor", popularity: 9.8 },
        { label: "Movie One", type: "movie", releaseDate: "2001-10-12" },
        { label: "Middle Actor One", type: "actor", popularity: 8.5 },
        { label: "Movie Two", type: "movie", releaseDate: "2003-07-09" },
        { label: "Middle Actor Two", type: "actor", popularity: 7.5 },
        { label: "Movie Three", type: "movie", releaseDate: "2004-08-20" },
        { label: "End Actor", type: "actor", popularity: 9.1 },
    ];
    strict_1.default.equal((0, gameCompletionMetrics_1.calculatePathPopularityScore)(path), 8);
});
(0, node_test_1.default)("calculatePathPopularityScore falls back to popularity rank for interior actors when popularity is missing", () => {
    const path = [
        { label: "Start Actor", type: "actor", popularity: 10 },
        { label: "Movie One", type: "movie" },
        { label: "Middle Actor One", type: "actor", popularityRank: 4 },
        { label: "Movie Two", type: "movie" },
        { label: "Middle Actor Two", type: "actor", popularity: null, popularityRank: 6 },
        { label: "Movie Three", type: "movie" },
        { label: "End Actor", type: "actor", popularity: 9.5 },
    ];
    strict_1.default.equal((0, gameCompletionMetrics_1.calculatePathPopularityScore)(path), 5);
});
(0, node_test_1.default)("calculatePathPopularityScore returns zero when the path has no interior actors", () => {
    const path = [
        { label: "Start Actor", type: "actor", popularity: 9.4 },
        { label: "Movie One", type: "movie", releaseDate: "2001-10-12" },
        { label: "End Actor", type: "actor", popularity: 8.7 },
    ];
    strict_1.default.equal((0, gameCompletionMetrics_1.calculatePathPopularityScore)(path), 0);
});
(0, node_test_1.default)("calculateAverageReleaseYear averages movie years and ignores missing dates", () => {
    const path = [
        { label: "Movie One", type: "movie", releaseDate: "2000-01-01" },
        { label: "Actor One", type: "actor", popularity: 9.1 },
        { label: "Movie Two", type: "movie", releaseDate: "2005-06-14" },
        { label: "Movie Three", type: "movie", releaseDate: null },
    ];
    strict_1.default.equal((0, gameCompletionMetrics_1.calculateAverageReleaseYear)(path), 2002.5);
    strict_1.default.equal((0, gameCompletionMetrics_1.formatAverageReleaseYear)(2002.5), "2002.5");
    strict_1.default.equal((0, gameCompletionMetrics_1.formatAverageReleaseYear)(null), "--");
});
