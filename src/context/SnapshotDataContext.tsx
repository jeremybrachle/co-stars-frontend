import { useCallback, useMemo, useState } from "react";
import { clearCachedSnapshot, fetchSnapshotFromApi, fetchSnapshotFromS3, getCachedSnapshotBundle, getRecommendedRefreshMs } from "../data/frontendSnapshot";
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
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [errorSource, setErrorSource] = useState<SnapshotDataContextValue["errorSource"]>(null);
	const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(snapshot?.meta.exportedAt ?? null);

	const applySnapshotBundle = useCallback((bundle: NonNullable<Awaited<ReturnType<typeof fetchSnapshotFromApi>>>) => {
		setSnapshot(bundle.snapshot);
		setManifest(bundle.manifest);
		setIndexes(bundle.indexes);
		setHealth(bundle.health ?? null);
		setLoadedFrom(bundle.loadedFrom);
		setLastRefreshAt(bundle.snapshot.meta.exportedAt);
		return bundle;
	}, []);

	const loadSnapshot = useCallback(async (
		loader: () => Promise<NonNullable<Awaited<ReturnType<typeof fetchSnapshotFromApi>>>>,
		fallbackMessage: string,
		source: NonNullable<SnapshotDataContextValue["errorSource"]>,
	) => {
		setIsLoading(true);
		setErrorMessage(null);
		setErrorSource(null);

		try {
			return applySnapshotBundle(await loader());
		} catch (error) {
			setErrorMessage(error instanceof Error ? error.message : fallbackMessage);
			setErrorSource(source);
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [applySnapshotBundle]);

	const loadSnapshotFromApi = useCallback(async () => {
		return loadSnapshot(fetchSnapshotFromApi, "Failed to fetch the snapshot from the API.", "api");
	}, [loadSnapshot]);

	const loadSnapshotFromS3 = useCallback(async () => {
		return loadSnapshot(fetchSnapshotFromS3, "Failed to fetch the snapshot from S3.", "s3");
	}, [loadSnapshot]);

	const clearSnapshotCacheState = useCallback(() => {
		clearCachedSnapshot();
		setSnapshot(null);
		setManifest(null);
		setIndexes(null);
		setHealth(null);
		setLoadedFrom(null);
		setLastRefreshAt(null);
		setErrorMessage(null);
		setErrorSource(null);
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
				errorSource,
				loadedFrom,
				lastRefreshAt,
				recommendedRefreshMs: getRecommendedRefreshMs(manifest),
				fetchSnapshotFromApi: loadSnapshotFromApi,
				fetchSnapshotFromS3: loadSnapshotFromS3,
				clearSnapshotCache: clearSnapshotCacheState,
			}}
		>
			{children}
		</SnapshotDataContext.Provider>
	);
}
