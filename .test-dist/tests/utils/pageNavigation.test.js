"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pageNavigation_1 = require("../../src/utils/pageNavigation");
(0, node_test_1.default)("buildPageNavigationLinks returns a consistent back and home pair", () => {
    const [backLink, homeLink] = (0, pageNavigation_1.buildPageNavigationLinks)("/adventure", "Go back");
    strict_1.default.deepEqual(backLink, {
        kind: "back",
        to: "/adventure",
        label: "Go back",
        icon: "←",
    });
    strict_1.default.deepEqual(homeLink, {
        kind: "home",
        to: "/",
        label: "Home",
        icon: "🏠",
    });
});
(0, node_test_1.default)("buildPageNavigationLinks uses Back as the default back label", () => {
    const [backLink] = (0, pageNavigation_1.buildPageNavigationLinks)("/settings");
    strict_1.default.equal(backLink.label, "Back");
    strict_1.default.equal(backLink.to, "/settings");
});
