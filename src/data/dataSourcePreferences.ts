import type { DataIndicatorVariant, DataSourceMode, EffectiveDataSource } from "../types";

type IndicatorStateOptions = {
	mode: DataSourceMode;
	isBrowserOnline: boolean;
	hasSnapshot: boolean;
	isSnapshotLoading: boolean;
};

export function isOnlineSnapshotMode(mode: DataSourceMode) {
	return mode.connectionMode === "online" && mode.onlineSource === "snapshot";
}

export function isOnlineApiMode(mode: DataSourceMode) {
	return mode.connectionMode === "online" && mode.onlineSource === "api";
}

export function isOfflineSnapshotMode(mode: DataSourceMode) {
	return mode.connectionMode === "offline" && mode.offlineSource === "snapshot";
}

export function isOfflineDemoMode(mode: DataSourceMode) {
	return mode.connectionMode === "offline" && mode.offlineSource === "demo";
}

export function getConfiguredPrimarySource(mode: DataSourceMode): EffectiveDataSource {
	if (mode.connectionMode === "offline") {
		return mode.offlineSource === "demo" ? "demo" : "snapshot";
	}

	return mode.onlineSource === "api" ? "api" : "snapshot";
}

export function getFallbackLocalSource(hasSnapshot: boolean): EffectiveDataSource {
	return hasSnapshot ? "snapshot" : "demo";
}

export function shouldAutoSwitchToOfflineDemo(mode: DataSourceMode) {
	return mode.connectionMode === "online" && mode.onlineSource === "snapshot";
}

export function getDataIndicatorVariant({ mode, isBrowserOnline, hasSnapshot, isSnapshotLoading }: IndicatorStateOptions): DataIndicatorVariant {
	if (mode.connectionMode === "offline") {
		if (mode.offlineSource === "snapshot" && (hasSnapshot || isSnapshotLoading)) {
			return "offline-snapshot";
		}

		return "offline-demo";
	}

	if (!isBrowserOnline) {
		return hasSnapshot ? "offline-snapshot" : "offline-demo";
	}

	if (mode.onlineSource === "api") {
		return "online-api";
	}

	return "online-snapshot";
}

export function getDataIndicatorLabel(variant: DataIndicatorVariant) {
	if (variant === "online-api") {
		return "Online using API data";
	}

	if (variant === "online-snapshot") {
		return "Online using snapshot data";
	}

	if (variant === "offline-snapshot") {
		return "Offline using snapshot data";
	}

	return "Offline using demo data";
}

export function getDataIndicatorDescription(options: IndicatorStateOptions) {
	const variant = getDataIndicatorVariant(options);

	if (variant === "online-api") {
		return "The app is online and gameplay calls are configured to use live API requests first.";
	}

	if (variant === "online-snapshot") {
		return options.hasSnapshot
			? "The app is online and prefers snapshot-backed play with the current snapshot loaded in the browser."
			: "The app is online and trying to use snapshot-backed play. If a fresh snapshot is unavailable, local snapshot data or demo data will be used instead.";
	}

	if (variant === "offline-snapshot") {
		return "The app is operating offline and using snapshot data already cached in the browser.";
	}

	return "The app is operating offline and using the built-in demo dataset.";
}