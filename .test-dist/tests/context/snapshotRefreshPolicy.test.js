"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const snapshotRefreshPolicy_1 = require("../../src/context/snapshotRefreshPolicy");
(0, node_test_1.default)("network-unavailable detection matches dynamic URL errors", () => {
    strict_1.default.equal((0, snapshotRefreshPolicy_1.isNetworkUnavailableMessage)("Network connection couldn't be established for https://example.com/foo"), true);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.isNetworkUnavailableMessage)("Snapshot request failed (500) for https://example.com/foo"), false);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.isNetworkUnavailableMessage)(null), false);
});
(0, node_test_1.default)("retry delay grows with cap", () => {
    strict_1.default.equal((0, snapshotRefreshPolicy_1.getNextSnapshotRetryDelayMs)(0), Math.min(snapshotRefreshPolicy_1.SNAPSHOT_RETRY_MAX_DELAY_MS, Math.round(snapshotRefreshPolicy_1.SNAPSHOT_RETRY_MIN_DELAY_MS * 1.75)));
    strict_1.default.equal((0, snapshotRefreshPolicy_1.getNextSnapshotRetryDelayMs)(snapshotRefreshPolicy_1.SNAPSHOT_RETRY_MIN_DELAY_MS), Math.min(snapshotRefreshPolicy_1.SNAPSHOT_RETRY_MAX_DELAY_MS, Math.round(snapshotRefreshPolicy_1.SNAPSHOT_RETRY_MIN_DELAY_MS * 1.75)));
    strict_1.default.equal((0, snapshotRefreshPolicy_1.getNextSnapshotRetryDelayMs)(snapshotRefreshPolicy_1.SNAPSHOT_RETRY_MAX_DELAY_MS), snapshotRefreshPolicy_1.SNAPSHOT_RETRY_MAX_DELAY_MS);
});
(0, node_test_1.default)("remaining timeout reaches zero after three-minute window", () => {
    const startedAt = 1_000;
    strict_1.default.equal((0, snapshotRefreshPolicy_1.getSnapshotWaitRemainingMs)(startedAt, startedAt), snapshotRefreshPolicy_1.SNAPSHOT_WAIT_TIMEOUT_MS);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.getSnapshotWaitRemainingMs)(startedAt, startedAt + snapshotRefreshPolicy_1.SNAPSHOT_WAIT_TIMEOUT_MS - 1), 1);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.getSnapshotWaitRemainingMs)(startedAt, startedAt + snapshotRefreshPolicy_1.SNAPSHOT_WAIT_TIMEOUT_MS), 0);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.getSnapshotWaitRemainingMs)(startedAt, startedAt + snapshotRefreshPolicy_1.SNAPSHOT_WAIT_TIMEOUT_MS + 10_000), 0);
});
(0, node_test_1.default)("required snapshot readiness needs both snapshot and indexes", () => {
    strict_1.default.equal((0, snapshotRefreshPolicy_1.hasRequiredSnapshotData)(false, false), false);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.hasRequiredSnapshotData)(true, false), false);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.hasRequiredSnapshotData)(false, true), false);
    strict_1.default.equal((0, snapshotRefreshPolicy_1.hasRequiredSnapshotData)(true, true), true);
});
