import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { clearCachedSnapshot, fetchSnapshotFromApi, fetchSnapshotFromS3, getCachedSnapshotBundle, getRecommendedRefreshMs } from "../data/frontendSnapshot";
import { SnapshotDataContext } from "./snapshotData";
import type { SnapshotDataContextValue } from "./snapshotData";
import { useDataSourceMode } from "./dataSourceMode";
import { isOnlineApiMode, isOnlineSnapshotMode } from "../data/dataSourcePreferences";
import {
	getNextSnapshotRetryDelayMs,
	getSnapshotWaitRemainingMs,
	hasRequiredSnapshotData,
	isNetworkUnavailableMessage,
	SNAPSHOT_RETRY_MIN_DELAY_MS,
	SNAPSHOT_WAIT_TIMEOUT_MS,
} from "./snapshotRefreshPolicy";
import type { FrontendManifest, FrontendSnapshot, HealthCheckResponse, SnapshotIndexes } from "../types";

export function SnapshotDataProvider({ children }: { children: React.ReactNode }) {
	const { mode, setMode } = useDataSourceMode();
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
	const [isAwaitingRequiredData, setIsAwaitingRequiredData] = useState(() => !cachedBundle?.snapshot || !cachedBundle?.indexes);
	const [waitStartedAt, setWaitStartedAt] = useState<number | null>(() => !cachedBundle?.snapshot || !cachedBundle?.indexes ? Date.now() : null);
	const [waitTimeoutRemainingMs, setWaitTimeoutRemainingMs] = useState<number | null>(() => !cachedBundle?.snapshot || !cachedBundle?.indexes ? SNAPSHOT_WAIT_TIMEOUT_MS : null);
	const pollingTimerRef = useRef<number | null>(null);
	const retryDelayRef = useRef(SNAPSHOT_RETRY_MIN_DELAY_MS);

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
		suppressNetworkErrors = false,
	) => {
		setIsLoading(true);
		setErrorMessage(null);
		setErrorSource(null);

		try {
			return applySnapshotBundle(await loader());
		} catch (error) {
			const message = error instanceof Error ? error.message : fallbackMessage;
			if (!suppressNetworkErrors || !isNetworkUnavailableMessage(message)) {
				setErrorMessage(message);
				setErrorSource(source);
			}
			return null;
		} finally {
			setIsLoading(false);
		}
	}, [applySnapshotBundle]);

	const loadSnapshotFromApi = useCallback(async () => {
		return loadSnapshot(fetchSnapshotFromApi, "Failed to fetch the snapshot from the API.", "api");
	}, [loadSnapshot]);

	const loadSnapshotFromS3 = useCallback(async () => {
		return loadSnapshot(fetchSnapshotFromS3, "Failed to fetch the snapshot from S3.", "s3", true);
	}, [loadSnapshot]);

	const clearPollingTimer = useCallback(() => {
		if (pollingTimerRef.current !== null) {
			window.clearTimeout(pollingTimerRef.current);
			pollingTimerRef.current = null;
		}
	}, []);

	const schedulePollingAttempt = useCallback((callback: () => void, delayMs: number) => {
		clearPollingTimer();
		pollingTimerRef.current = window.setTimeout(callback, delayMs);
	}, [clearPollingTimer]);

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
		setWaitStartedAt(Date.now());
		setWaitTimeoutRemainingMs(SNAPSHOT_WAIT_TIMEOUT_MS);
		setIsAwaitingRequiredData(true);
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
		if (!isOnlineApiMode(mode) || !isBrowserOnline) {
			return undefined;
		}

		void loadSnapshotFromApi();
		return undefined;
	}, [isBrowserOnline, loadSnapshotFromApi, mode]);

	useEffect(() => {
		if (!isOnlineSnapshotMode(mode)) {
			setIsAwaitingRequiredData(false);
			setWaitStartedAt(null);
			setWaitTimeoutRemainingMs(null);
			retryDelayRef.current = SNAPSHOT_RETRY_MIN_DELAY_MS;
			clearPollingTimer();
			return undefined;
		}

		const hasSnapshotData = hasRequiredSnapshotData(!!snapshot, !!indexes);
		if (hasSnapshotData) {
			setIsAwaitingRequiredData(false);
			setWaitStartedAt(null);
			setWaitTimeoutRemainingMs(null);
			retryDelayRef.current = SNAPSHOT_RETRY_MIN_DELAY_MS;
			clearPollingTimer();
			return undefined;
		}

		const startedAt = waitStartedAt ?? Date.now();
		if (waitStartedAt === null) {
			setWaitStartedAt(startedAt);
		}

		const remainingBeforePolling = getSnapshotWaitRemainingMs(startedAt);
		setIsAwaitingRequiredData(remainingBeforePolling > 0);
		setWaitTimeoutRemainingMs(remainingBeforePolling);

		if (remainingBeforePolling <= 0) {
			clearPollingTimer();
			return undefined;
		}

		if (!isBrowserOnline) {
			clearPollingTimer();
			return undefined;
		}

		let isCancelled = false;

		const runS3Check = async () => {
			if (isCancelled) {
				return;
			}

			const remaining = getSnapshotWaitRemainingMs(startedAt);
			setWaitTimeoutRemainingMs(remaining);
			if (remaining <= 0) {
				setIsAwaitingRequiredData(false);
				clearPollingTimer();
				return;
			}

			const bundle = await loadSnapshotFromS3();

			if (isCancelled) {
				return;
			}

			if (bundle) {
				retryDelayRef.current = SNAPSHOT_RETRY_MIN_DELAY_MS;
				setIsAwaitingRequiredData(false);
				setWaitStartedAt(null);
				setWaitTimeoutRemainingMs(null);
				clearPollingTimer();
				return;
			}

			retryDelayRef.current = getNextSnapshotRetryDelayMs(retryDelayRef.current);
			const remainingAfterAttempt = getSnapshotWaitRemainingMs(startedAt);
			if (remainingAfterAttempt <= 0) {
				setIsAwaitingRequiredData(false);
				setWaitTimeoutRemainingMs(0);
				clearPollingTimer();
				return;
			}

			schedulePollingAttempt(runS3Check, Math.min(retryDelayRef.current, remainingAfterAttempt));
		};

		void runS3Check();

		return () => {
			isCancelled = true;
			clearPollingTimer();
		};
	}, [clearPollingTimer, indexes, isBrowserOnline, loadSnapshotFromS3, mode, schedulePollingAttempt, snapshot, waitStartedAt]);

	useEffect(() => {
		if (!isOnlineSnapshotMode(mode) || !waitStartedAt || hasRequiredSnapshotData(!!snapshot, !!indexes)) {
			setWaitTimeoutRemainingMs((currentValue) => currentValue === null ? currentValue : null);
			return undefined;
		}

		const tick = () => {
			setWaitTimeoutRemainingMs(getSnapshotWaitRemainingMs(waitStartedAt));
		};

		tick();
		const intervalId = window.setInterval(tick, 1000);
		return () => {
			window.clearInterval(intervalId);
		};
	}, [indexes, mode, snapshot, waitStartedAt]);

	useEffect(() => {
		if (!isOnlineSnapshotMode(mode)) {
			return;
		}

		if (hasRequiredSnapshotData(!!snapshot, !!indexes)) {
			return;
		}

		if (waitTimeoutRemainingMs === null || waitTimeoutRemainingMs > 0) {
			return;
		}

		setMode({
			...mode,
			connectionMode: "offline",
			offlineSource: "demo",
		});
		setErrorMessage(null);
		setErrorSource(null);
	}, [indexes, mode, setMode, snapshot, waitTimeoutRemainingMs]);

	const isLoadingForContext = isLoading || isAwaitingRequiredData;

	return (
		<SnapshotDataContext.Provider
			value={{
				snapshot,
				manifest,
				indexes,
				health,
				isLoading: isLoadingForContext,
				errorMessage,
				errorSource,
				loadedFrom,
				lastRefreshAt,
				waitTimeoutRemainingMs,
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
