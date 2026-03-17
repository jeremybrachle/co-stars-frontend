"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNAPSHOT_WAIT_TIMEOUT_MS = exports.SNAPSHOT_RETRY_MAX_DELAY_MS = exports.SNAPSHOT_RETRY_MIN_DELAY_MS = void 0;
exports.isNetworkUnavailableMessage = isNetworkUnavailableMessage;
exports.getNextSnapshotRetryDelayMs = getNextSnapshotRetryDelayMs;
exports.getSnapshotWaitRemainingMs = getSnapshotWaitRemainingMs;
exports.hasRequiredSnapshotData = hasRequiredSnapshotData;
const NETWORK_UNAVAILABLE_PREFIX = "Network connection couldn't be established";
exports.SNAPSHOT_RETRY_MIN_DELAY_MS = 5_000;
exports.SNAPSHOT_RETRY_MAX_DELAY_MS = 60_000;
exports.SNAPSHOT_WAIT_TIMEOUT_MS = 3 * 60 * 1000;
function isNetworkUnavailableMessage(message) {
    if (!message) {
        return false;
    }
    return message.startsWith(NETWORK_UNAVAILABLE_PREFIX);
}
function getNextSnapshotRetryDelayMs(currentDelayMs) {
    const safeCurrent = currentDelayMs > 0 ? currentDelayMs : exports.SNAPSHOT_RETRY_MIN_DELAY_MS;
    return Math.min(exports.SNAPSHOT_RETRY_MAX_DELAY_MS, Math.round(safeCurrent * 1.75));
}
function getSnapshotWaitRemainingMs(startedAt, now = Date.now()) {
    return Math.max(0, startedAt + exports.SNAPSHOT_WAIT_TIMEOUT_MS - now);
}
function hasRequiredSnapshotData(snapshotPresent, indexesPresent) {
    return snapshotPresent && indexesPresent;
}
