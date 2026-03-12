import { createContext, useContext } from "react";
import type { DataSourceMode } from "../types";

export const DATA_SOURCE_MODE_KEY = "co-stars-data-source-mode";

export type DataSourceModeContextValue = {
	mode: DataSourceMode;
	setMode: (mode: DataSourceMode) => void;
};

export const DataSourceModeContext = createContext<DataSourceModeContextValue | null>(null);

export function readStoredMode(): DataSourceMode {
	if (typeof window === "undefined") {
		return "auto";
	}

	const stored = window.localStorage.getItem(DATA_SOURCE_MODE_KEY);
	return stored === "snapshot" || stored === "api" || stored === "auto" || stored === "demo" ? stored : "auto";
}

export function useDataSourceMode() {
	const context = useContext(DataSourceModeContext);

	if (!context) {
		throw new Error("useDataSourceMode must be used within DataSourceModeProvider.");
	}

	return context;
}