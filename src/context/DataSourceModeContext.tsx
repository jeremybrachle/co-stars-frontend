import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { DataSourceMode } from "../types";

const DATA_SOURCE_MODE_KEY = "co-stars-data-source-mode";

type DataSourceModeContextValue = {
	mode: DataSourceMode;
	setMode: (mode: DataSourceMode) => void;
};

const DataSourceModeContext = createContext<DataSourceModeContextValue | null>(null);

function readStoredMode(): DataSourceMode {
	const stored = localStorage.getItem(DATA_SOURCE_MODE_KEY);
	return stored === "snapshot" || stored === "api" || stored === "auto" ? stored : "auto";
}

export function DataSourceModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setModeState] = useState<DataSourceMode>("auto");

	useEffect(() => {
		setModeState(readStoredMode());
	}, []);

	const value = useMemo(
		() => ({
			mode,
			setMode: (nextMode: DataSourceMode) => {
				localStorage.setItem(DATA_SOURCE_MODE_KEY, nextMode);
				setModeState(nextMode);
			},
		}),
		[mode],
	);

	return <DataSourceModeContext.Provider value={value}>{children}</DataSourceModeContext.Provider>;
}

export function useDataSourceMode() {
	const context = useContext(DataSourceModeContext);

	if (!context) {
		throw new Error("useDataSourceMode must be used within DataSourceModeProvider.");
	}

	return context;
}