"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const entityDetails_1 = require("../../src/data/entityDetails");
(0, node_test_1.default)("sortByPopularityDescending orders actors high-to-low and keeps null popularity last", () => {
    const entries = [
        { id: 1, name: "Actor C", popularity: 8.2 },
        { id: 2, name: "Actor B", popularity: null },
        { id: 3, name: "Actor A", popularity: 8.2 },
        { id: 4, name: "Actor D", popularity: 9.7 },
    ];
    const result = (0, entityDetails_1.sortByPopularityDescending)(entries, (entry) => entry.popularity, (entry) => entry.name);
    strict_1.default.deepEqual(result.map((entry) => entry.name), ["Actor D", "Actor A", "Actor C", "Actor B"]);
});
(0, node_test_1.default)("buildNextDetailTrail appends new entries and trims when revisiting an existing one", () => {
    const trail = [
        { id: 10, type: "movie", label: "Movie One" },
        { id: 20, type: "actor", label: "Actor Two" },
    ];
    const appended = (0, entityDetails_1.buildNextDetailTrail)(trail, { id: 30, type: "movie", label: "Movie Three" }, (left, right) => left.id === right.id && left.type === right.type);
    strict_1.default.deepEqual(appended.map((entry) => `${entry.type}:${entry.id}`), ["movie:10", "actor:20", "movie:30"]);
    const revisited = (0, entityDetails_1.buildNextDetailTrail)(appended, { id: 20, type: "actor", label: "Actor Two" }, (left, right) => left.id === right.id && left.type === right.type);
    strict_1.default.deepEqual(revisited.map((entry) => `${entry.type}:${entry.id}`), ["movie:10", "actor:20"]);
});
(0, node_test_1.default)("sortMoviesByReleaseDateDescending orders newer releases before older ones and null dates last", () => {
    const entries = [
        { id: 1, title: "Older Film", releaseDate: "1999-03-12" },
        { id: 2, title: "Undated Film", releaseDate: null },
        { id: 3, title: "Newest Film", releaseDate: "2024-11-08" },
        { id: 4, title: "Mid Film", releaseDate: "2011-06-17" },
    ];
    const result = (0, entityDetails_1.sortMoviesByReleaseDateDescending)(entries, (entry) => entry.releaseDate, (entry) => entry.title);
    strict_1.default.deepEqual(result.map((entry) => entry.title), ["Newest Film", "Mid Film", "Older Film", "Undated Film"]);
});
