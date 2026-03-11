import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCachedSnapshotBundle, getRecommendedRefreshMs, loadFrontendSnapshot } from "../data/frontendSnapshot";
import type { FrontendManifest, FrontendSnapshot, HealthCheckResponse, SnapshotIndexes } from "../types";

type SnapshotDataContextValue = {
	snapshot: FrontendSnapshot | null;
	manifest: FrontendManifest | null;
	indexes: SnapshotIndexes | null;
	health: HealthCheckResponse | null;
	isLoading: boolean;
	errorMessage: string | null;
	loadedFrom: "cache" | "network" | "cache-fallback" | null;
	lastRefreshAt: string | null;
	recommendedRefreshMs: number;
	refreshSnapshot: (forceRefresh?: boolean) => Promise<void>;
};

const SnapshotDataContext = createContext<SnapshotDataContextValue | null>(null);

export function SnapshotDataProvider({ children }: { children: React.ReactNode }) {
	const cachedBundle = useMemo(() => getCachedSnapshotBundle(), []);
	const [snapshot, setSnapshot] = useState<FrontendSnapshot | null>(cachedBundle?.snapshot ?? null);
	const [manifest, setManifest] = useState<FrontendManifest | null>(cachedBundle?.manifest ?? null);
	const [indexes, setIndexes] = useState<SnapshotIndexes | null>(cachedBundle?.indexes ?? null);
	const [health, setHealth] = useState<HealthCheckResponse | null>(cachedBundle?.health ?? null);
	const [loadedFrom, setLoadedFrom] = useState<SnapshotDataContextValue["loadedFrom"]>(cachedBundle?.loadedFrom ?? null);
	const [isLoading, setIsLoading] = useState(snapshot === null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(snapshot?.meta.exportedAt ?? null);

	const refreshSnapshot = async (forceRefresh = false) => {
		setIsLoading(true);
		setErrorMessage(null);

		try {
			const bundle = await loadFrontendSnapshot({ forceRefresh });
			setSnapshot(bundle.snapshot);
			setManifest(bundle.manifest);
			setIndexes(bundle.indexes);
			setHealth(bundle.health ?? null);
			setLoadedFrom(bundle.loadedFrom);
			setLastRefreshAt(bundle.snapshot.meta.exportedAt);
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to load the frontend snapshot.");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void refreshSnapshot();
	}, []);

	return (
		<SnapshotDataContext.Provider
			value={{
				snapshot,
				manifest,
				indexes,
				health,
				isLoading,
				errorMessage,
				loadedFrom,
				lastRefreshAt,
				recommendedRefreshMs: getRecommendedRefreshMs(manifest),
				refreshSnapshot,
			}}
		>
			{children}
		</SnapshotDataContext.Provider>
	);
}

export function useSnapshotData() {
	const context = useContext(SnapshotDataContext);

	if (!context) {
		throw new Error("useSnapshotData must be used within SnapshotDataProvider.");
	}

	return context;
}