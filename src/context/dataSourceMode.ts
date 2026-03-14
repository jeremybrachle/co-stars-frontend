import { createContext, useContext } from "react";
import type { DataSourceMode } from "../types";

export const DATA_SOURCE_MODE_KEY = "co-stars-data-source-mode";

export const DEFAULT_DATA_SOURCE_MODE: DataSourceMode = {
	connectionMode: "online",
	onlineSource: "snapshot",
	offlineSource: "snapshot",
};

export type DataSourceModeContextValue = {
	mode: DataSourceMode;
	setMode: (mode: DataSourceMode) => void;
	setConnectionMode: (mode: DataSourceMode["connectionMode"]) => void;
	setOnlineSource: (mode: DataSourceMode["onlineSource"]) => void;
	setOfflineSource: (mode: DataSourceMode["offlineSource"]) => void;
};

export const DataSourceModeContext = createContext<DataSourceModeContextValue | null>(null);

function isDataSourceMode(value: unknown): value is DataSourceMode {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<DataSourceMode>;
	return (candidate.connectionMode === "online" || candidate.connectionMode === "offline")
		&& (candidate.onlineSource === "snapshot" || candidate.onlineSource === "api")
		&& (candidate.offlineSource === "snapshot" || candidate.offlineSource === "demo");
}

function migrateLegacyMode(stored: string | null): DataSourceMode | null {
	if (stored === "snapshot") {
		return {
			connectionMode: "online",
			onlineSource: "snapshot",
			offlineSource: "snapshot",
		};
	}

	if (stored === "api") {
		return {
			connectionMode: "online",
			onlineSource: "api",
			offlineSource: "snapshot",
		};
	}

	if (stored === "demo") {
		return {
			connectionMode: "offline",
			onlineSource: "snapshot",
			offlineSource: "demo",
		};
	}

	if (stored === "auto") {
		return DEFAULT_DATA_SOURCE_MODE;
	}

	return null;
}

export function readStoredMode(): DataSourceMode {
	if (typeof window === "undefined") {
		return DEFAULT_DATA_SOURCE_MODE;
	}

	const stored = window.localStorage.getItem(DATA_SOURCE_MODE_KEY);

	if (!stored) {
		return DEFAULT_DATA_SOURCE_MODE;
	}

	try {
		const parsed = JSON.parse(stored) as unknown;
		if (isDataSourceMode(parsed)) {
			return parsed;
		}
	} catch {
		const migratedMode = migrateLegacyMode(stored);
		if (migratedMode) {
			return migratedMode;
		}
	}

	return migrateLegacyMode(stored) ?? DEFAULT_DATA_SOURCE_MODE;
}

export function useDataSourceMode() {
	const context = useContext(DataSourceModeContext);

	if (!context) {
		throw new Error("useDataSourceMode must be used within DataSourceModeProvider.");
	}

	return context;
}