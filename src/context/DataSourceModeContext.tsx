import { useMemo, useState } from "react";
import { DATA_SOURCE_MODE_KEY, DataSourceModeContext, readStoredMode } from "./dataSourceMode";
import type { DataSourceMode } from "../types";

export function DataSourceModeProvider({ children }: { children: React.ReactNode }) {
	const [mode, setModeState] = useState<DataSourceMode>(() => readStoredMode());

	const value = useMemo(
		() => ({
			mode,
			setMode: (nextMode: DataSourceMode) => {
				window.localStorage.setItem(DATA_SOURCE_MODE_KEY, nextMode);
				setModeState(nextMode);
			},
		}),
		[mode],
	);

	return <DataSourceModeContext.Provider value={value}>{children}</DataSourceModeContext.Provider>;
}
