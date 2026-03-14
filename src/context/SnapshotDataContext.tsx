import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearCachedSnapshot, fetchSnapshotFromApi, fetchSnapshotFromS3, getCachedSnapshotBundle, getRecommendedRefreshMs } from "../data/frontendSnapshot";
import { SnapshotDataContext } from "./snapshotData";
import type { SnapshotDataContextValue } from "./snapshotData";
import { useDataSourceMode } from "./dataSourceMode";
import { isOnlineSnapshotMode } from "../data/dataSourcePreferences";
import type { FrontendManifest, FrontendSnapshot, HealthCheckResponse, SnapshotIndexes } from "../types";

export function SnapshotDataProvider({ children }: { children: React.ReactNode }) {
	const { mode } = useDataSourceMode();
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
	const [isBrowserOnline, setIsBrowserOnline] = useState(() => typeof window === "undefined" ? true : window.navigator.onLine);
	const autoRefreshKey = useRef<string | null>(null);

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

	useEffect(() => {
		if (typeof window === "undefined") {
			return undefined;
		}

		const handleOnlineStateChange = () => {
			setIsBrowserOnline(window.navigator.onLine);
		};

		window.addEventListener("online", handleOnlineStateChange);
		window.addEventListener("offline", handleOnlineStateChange);

		return () => {
			window.removeEventListener("online", handleOnlineStateChange);
			window.removeEventListener("offline", handleOnlineStateChange);
		};
	}, []);

	useEffect(() => {
		if (!isOnlineSnapshotMode(mode) || !isBrowserOnline) {
			autoRefreshKey.current = null;
			return;
		}

		const nextKey = `${mode.connectionMode}:${mode.onlineSource}:${isBrowserOnline}`;
		if (autoRefreshKey.current === nextKey) {
			return;
		}

		autoRefreshKey.current = nextKey;
		void loadSnapshotFromApi();
	}, [isBrowserOnline, loadSnapshotFromApi, mode]);

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
