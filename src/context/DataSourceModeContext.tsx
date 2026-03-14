import { useMemo, useState } from "react";
import { DATA_SOURCE_MODE_KEY, DataSourceModeContext, readStoredMode } from "./dataSourceMode";
import type { DataSourceMode } from "../types";

export function DataSourceModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setModeState] = useState<DataSourceMode>(() => readStoredMode());

	const persistMode = (nextMode: DataSourceMode) => {
		window.localStorage.setItem(DATA_SOURCE_MODE_KEY, JSON.stringify(nextMode));
		setModeState(nextMode);
	};

	const value = useMemo(
		() => ({
			mode,
			setMode: (nextMode: DataSourceMode) => {
				persistMode(nextMode);
			},
			setConnectionMode: (connectionMode: DataSourceMode["connectionMode"]) => {
				persistMode({
					...mode,
					connectionMode,
				});
			},
			setOnlineSource: (onlineSource: DataSourceMode["onlineSource"]) => {
				persistMode({
					...mode,
					onlineSource,
				});
			},
			setOfflineSource: (offlineSource: DataSourceMode["offlineSource"]) => {
				persistMode({
					...mode,
					offlineSource,
				});
			},
		}),
		[mode],
	);

	return <DataSourceModeContext.Provider value={value}>{children}</DataSourceModeContext.Provider>;
}
