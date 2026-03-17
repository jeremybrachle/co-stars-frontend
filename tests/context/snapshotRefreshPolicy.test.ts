import test from "node:test";
import assert from "node:assert/strict";
import {
	getNextSnapshotRetryDelayMs,
	getSnapshotWaitRemainingMs,
	hasRequiredSnapshotData,
	isNetworkUnavailableMessage,
	SNAPSHOT_RETRY_MAX_DELAY_MS,
	SNAPSHOT_RETRY_MIN_DELAY_MS,
	SNAPSHOT_WAIT_TIMEOUT_MS,
} from "../../src/context/snapshotRefreshPolicy";

test("network-unavailable detection matches dynamic URL errors", () => {
	assert.equal(isNetworkUnavailableMessage("Network connection couldn't be established for https://example.com/foo"), true);
	assert.equal(isNetworkUnavailableMessage("Snapshot request failed (500) for https://example.com/foo"), false);
	assert.equal(isNetworkUnavailableMessage(null), false);
});

test("retry delay grows with cap", () => {
	assert.equal(getNextSnapshotRetryDelayMs(0), Math.min(SNAPSHOT_RETRY_MAX_DELAY_MS, Math.round(SNAPSHOT_RETRY_MIN_DELAY_MS * 1.75)));
	assert.equal(getNextSnapshotRetryDelayMs(SNAPSHOT_RETRY_MIN_DELAY_MS), Math.min(SNAPSHOT_RETRY_MAX_DELAY_MS, Math.round(SNAPSHOT_RETRY_MIN_DELAY_MS * 1.75)));
	assert.equal(getNextSnapshotRetryDelayMs(SNAPSHOT_RETRY_MAX_DELAY_MS), SNAPSHOT_RETRY_MAX_DELAY_MS);
});

test("remaining timeout reaches zero after three-minute window", () => {
	const startedAt = 1_000;
	assert.equal(getSnapshotWaitRemainingMs(startedAt, startedAt), SNAPSHOT_WAIT_TIMEOUT_MS);
	assert.equal(getSnapshotWaitRemainingMs(startedAt, startedAt + SNAPSHOT_WAIT_TIMEOUT_MS - 1), 1);
	assert.equal(getSnapshotWaitRemainingMs(startedAt, startedAt + SNAPSHOT_WAIT_TIMEOUT_MS), 0);
	assert.equal(getSnapshotWaitRemainingMs(startedAt, startedAt + SNAPSHOT_WAIT_TIMEOUT_MS + 10_000), 0);
});

test("required snapshot readiness needs both snapshot and indexes", () => {
	assert.equal(hasRequiredSnapshotData(false, false), false);
	assert.equal(hasRequiredSnapshotData(true, false), false);
	assert.equal(hasRequiredSnapshotData(false, true), false);
	assert.equal(hasRequiredSnapshotData(true, true), true);
});
