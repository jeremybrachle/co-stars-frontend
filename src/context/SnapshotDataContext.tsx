import { useCallback, useEffect, useMemo, useState } from "react";
import { clearCachedSnapshot, getCachedSnapshotBundle, getRecommendedRefreshMs, loadFrontendSnapshot } from "../data/frontendSnapshot";
import { SnapshotDataContext } from "./snapshotData";
import type { SnapshotDataContextValue } from "./snapshotData";
import type { FrontendManifest, FrontendSnapshot, HealthCheckResponse, SnapshotIndexes } from "../types";

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

	const refreshSnapshot = useCallback(async (forceRefresh = false) => {
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
			return bundle;
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : "Failed to load the frontend snapshot.");
			return null;
		} finally {
			setIsLoading(false);
		}
	}, []);

	const clearSnapshotCacheState = useCallback(() => {
		clearCachedSnapshot();
		setSnapshot(null);
		setManifest(null);
		setIndexes(null);
		setHealth(null);
		setLoadedFrom(null);
		setLastRefreshAt(null);
	}, []);

	useEffect(() => {
		void refreshSnapshot();
	}, [refreshSnapshot]);

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
				clearSnapshotCache: clearSnapshotCacheState,
			}}
		>
			{children}
		</SnapshotDataContext.Provider>
	);
}
