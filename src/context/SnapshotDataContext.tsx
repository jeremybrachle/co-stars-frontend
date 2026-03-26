import { useCallback, useEffect, useMemo, useState } from "react";
import {
	checkForS3SnapshotUpdate,
	clearCachedSnapshot,
	createIdleSnapshotUpdateCheck,
	fetchInstalledSnapshot,
	fetchSnapshotFromApi,
	fetchSnapshotFromS3,
	getCachedSnapshotBundle,
} from "../data/frontendSnapshot";
import { SnapshotDataContext } from "./snapshotData";
import type { SnapshotDataContextValue } from "./snapshotData";
import { useDataSourceMode } from "./dataSourceMode";
import type { SnapshotBundle, SnapshotUpdateCheck, StoredSnapshotSource } from "../types";

export function SnapshotDataProvider({ children }: { children: React.ReactNode }) {
	const { mode } = useDataSourceMode();
	const [installedBundle, setInstalledBundle] = useState<SnapshotBundle | null>(null);
	const [s3Bundle, setS3Bundle] = useState<SnapshotBundle | null>(() => getCachedSnapshotBundle("s3"));
	const [apiBundle, setApiBundle] = useState<SnapshotBundle | null>(() => getCachedSnapshotBundle("api"));
	const [isInstalledLoading, setIsInstalledLoading] = useState(true);
	const [loadingSource, setLoadingSource] = useState<StoredSnapshotSource | null>(null);
	const [isCheckingForS3Update, setIsCheckingForS3Update] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [errorSource, setErrorSource] = useState<SnapshotDataContextValue["errorSource"]>(null);
	const [s3UpdateCheck, setS3UpdateCheck] = useState<SnapshotUpdateCheck>(createIdleSnapshotUpdateCheck());

	const activeBundle = useMemo(() => {
		if (mode.connectionMode === "offline") {
			return mode.offlineSource === "snapshot" ? installedBundle : null;
		}

		if (mode.onlineSource === "snapshot") {
			return s3Bundle ?? installedBundle;
		}

		return apiBundle ?? installedBundle;
	}, [apiBundle, installedBundle, mode, s3Bundle]);

	const lastRefreshAt = activeBundle?.snapshot.meta.exportedAt ?? null;

	const loadSnapshot = useCallback(async (
		loader: () => Promise<SnapshotBundle>,
		storageSource: StoredSnapshotSource,
		fallbackMessage: string,
		errorSourceValue: NonNullable<SnapshotDataContextValue["errorSource"]>,
	) => {
		setLoadingSource(storageSource);
		setErrorMessage(null);
		setErrorSource(null);

		try {
			const bundle = await loader();
			if (storageSource === "s3") {
				setS3Bundle(bundle);
				setS3UpdateCheck({
					status: "up-to-date",
					message: `Hosted S3 snapshot ${bundle.manifest.version} downloaded and active for online snapshot mode.`,
					checkedAt: new Date().toISOString(),
					remoteManifest: bundle.manifest,
				});
			} else {
				setApiBundle(bundle);
			}

			return bundle;
		} catch (error) {
			const message = error instanceof Error ? error.message : fallbackMessage;
			setErrorMessage(message);
			setErrorSource(errorSourceValue);
			return null;
		} finally {
			setLoadingSource(null);
		}
	}, []);

	const loadSnapshotFromApi = useCallback(async () => {
		return loadSnapshot(fetchSnapshotFromApi, "api", "Failed to fetch the snapshot from the API.", "api");
	}, [loadSnapshot]);

	const loadSnapshotFromS3 = useCallback(async () => {
		return loadSnapshot(fetchSnapshotFromS3, "s3", "Failed to fetch the snapshot from S3.", "s3");
	}, [loadSnapshot]);

	const runS3UpdateCheck = useCallback(async () => {
		setIsCheckingForS3Update(true);
		setErrorMessage(null);
		setErrorSource(null);
		setS3UpdateCheck((currentCheck) => ({
			...currentCheck,
			status: "checking",
			message: "Checking hosted S3 for a newer snapshot version.",
		}));

		try {
			const currentVersion = (s3Bundle ?? installedBundle)?.manifest.version ?? null;
			const nextCheck = await checkForS3SnapshotUpdate(currentVersion);
			setS3UpdateCheck(nextCheck);
			return nextCheck;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Failed to check hosted S3 for updates.";
			const failedCheck: SnapshotUpdateCheck = {
				status: "error",
				message,
				checkedAt: new Date().toISOString(),
				remoteManifest: null,
			};
			setS3UpdateCheck(failedCheck);
			setErrorMessage(message);
			setErrorSource("s3");
			return failedCheck;
		} finally {
			setIsCheckingForS3Update(false);
		}
	}, [installedBundle, s3Bundle]);

	const clearSnapshotCacheState = useCallback((source: StoredSnapshotSource) => {
		clearCachedSnapshot(source);
		if (source === "s3") {
			setS3Bundle(null);
			setS3UpdateCheck(createIdleSnapshotUpdateCheck());
		} else {
			setApiBundle(null);
		}

		setErrorMessage(null);
		setErrorSource(null);
	}, []);

	useEffect(() => {
		let isCancelled = false;
		setIsInstalledLoading(true);
		setErrorMessage(null);
		setErrorSource(null);

		void fetchInstalledSnapshot()
			.then((bundle) => {
				if (!isCancelled) {
					setInstalledBundle(bundle);
				}
			})
			.catch((error) => {
				if (!isCancelled) {
					setInstalledBundle(null);
					setErrorMessage(error instanceof Error ? error.message : "Failed to load the installed snapshot.");
					setErrorSource("installed");
				}
			})
			.finally(() => {
				if (!isCancelled) {
					setIsInstalledLoading(false);
				}
			});

		return () => {
			isCancelled = true;
		};
	}, []);

	const isLoadingForContext = isInstalledLoading || loadingSource !== null || isCheckingForS3Update;

	return (
		<SnapshotDataContext.Provider
			value={{
				snapshot: activeBundle?.snapshot ?? null,
				manifest: activeBundle?.manifest ?? null,
				indexes: activeBundle?.indexes ?? null,
				isLoading: isLoadingForContext,
				isCheckingForS3Update,
				errorMessage,
				errorSource,
				loadedFrom: activeBundle?.loadedFrom ?? null,
				lastRefreshAt,
				installedBundle,
				s3Bundle,
				apiBundle,
				s3UpdateCheck,
				fetchSnapshotFromApi: loadSnapshotFromApi,
				fetchSnapshotFromS3: loadSnapshotFromS3,
				checkForS3SnapshotUpdate: runS3UpdateCheck,
				clearSnapshotCache: clearSnapshotCacheState,
			}}
		>
			{children}
		</SnapshotDataContext.Provider>
	);
}
