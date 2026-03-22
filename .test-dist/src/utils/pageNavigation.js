"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPageNavigationLinks = buildPageNavigationLinks;
function buildPageNavigationLinks(backTo, backLabel = "Back") {
    return [
        {
            kind: "back",
            to: backTo,
            label: backLabel,
            icon: "←",
        },
        {
            kind: "home",
            to: "/",
            label: "Home",
            icon: "🏠",
        },
    ];
}
