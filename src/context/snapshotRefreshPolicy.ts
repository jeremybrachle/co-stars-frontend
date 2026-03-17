const NETWORK_UNAVAILABLE_PREFIX = "Network connection couldn't be established";

export const SNAPSHOT_RETRY_MIN_DELAY_MS = 5_000;
export const SNAPSHOT_RETRY_MAX_DELAY_MS = 60_000;
export const SNAPSHOT_WAIT_TIMEOUT_MS = 3 * 60 * 1000;

export function isNetworkUnavailableMessage(message: string | null) {
	if (!message) {
		return false;
	}

	return message.startsWith(NETWORK_UNAVAILABLE_PREFIX);
}

export function getNextSnapshotRetryDelayMs(currentDelayMs: number) {
	const safeCurrent = currentDelayMs > 0 ? currentDelayMs : SNAPSHOT_RETRY_MIN_DELAY_MS;
	return Math.min(SNAPSHOT_RETRY_MAX_DELAY_MS, Math.round(safeCurrent * 1.75));
}

export function getSnapshotWaitRemainingMs(startedAt: number, now = Date.now()) {
	return Math.max(0, startedAt + SNAPSHOT_WAIT_TIMEOUT_MS - now);
}

export function hasRequiredSnapshotData(snapshotPresent: boolean, indexesPresent: boolean) {
	return snapshotPresent && indexesPresent;
}
