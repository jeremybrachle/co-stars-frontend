import type { DataIndicatorVariant, DataSourceMode, EffectiveDataSource } from "../types";

type IndicatorStateOptions = {
	mode: DataSourceMode;
	isBrowserOnline: boolean;
	hasSnapshot: boolean;
	isSnapshotLoading: boolean;
	isApiUnavailable: boolean;
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

export function getDataIndicatorVariant({ mode, isBrowserOnline, hasSnapshot, isSnapshotLoading, isApiUnavailable }: IndicatorStateOptions): DataIndicatorVariant {
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
		if (isApiUnavailable) {
			return "online-api-unavailable";
		}

		return "online-api";
	}

	return "online-snapshot";
}

export function getDataIndicatorLabel(variant: DataIndicatorVariant) {
	if (variant === "online-api-unavailable") {
		return "Connection pending";
	}

	if (variant === "online-snapshot" || variant === "online-api") {
		return "Online";
	}

	if (variant === "offline-snapshot" || variant === "offline-demo") {
		return "Offline";
	}

	return "Offline";
}

export function getDataIndicatorDescription(options: IndicatorStateOptions) {
	const variant = getDataIndicatorVariant(options);

	if (variant === "online-api") {
		return "Online mode is active and API-assisted data is available.";
	}

	if (variant === "online-api-unavailable") {
		return "Online mode is selected, but the active source is still pending a successful connection.";
	}

	if (variant === "online-snapshot") {
		return options.hasSnapshot
			? "Online mode is active and using snapshot data."
			: "Online mode is selected, but the current source is still loading.";
	}

	if (variant === "offline-snapshot") {
		return "Offline mode is active and using the installed snapshot bundled with this frontend build.";
	}

	return "Offline mode is active and using the built-in demo dataset.";
}