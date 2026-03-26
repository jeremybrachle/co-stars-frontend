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
	if (variant === "online-api") {
		return "Online using API data";
	}

	if (variant === "online-api-unavailable") {
		return "API mode selected, backend unavailable";
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
		return "Online API mode is selected. Live API requests are used when available, and the installed snapshot remains available as a fallback.";
	}

	if (variant === "online-api-unavailable") {
		return "API mode is selected, but the backend is not responding right now. Gameplay can still fall back to installed or downloaded snapshot graph data.";
	}

	if (variant === "online-snapshot") {
		return options.hasSnapshot
			? "Online S3 mode is selected. The installed snapshot stays available, and any downloaded S3 snapshot replaces it for online snapshot play."
			: "Online S3 mode is selected, but no snapshot is ready yet. Check for an update or switch back to demo data.";
	}

	if (variant === "offline-snapshot") {
		return "The app is operating offline and using the installed snapshot bundled with this frontend build.";
	}

	return "The app is operating offline and using the built-in demo dataset.";
}