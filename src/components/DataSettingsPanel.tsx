import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getApiConnectionState, subscribeToApiConnectionState } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { getCachedSnapshotStorageStats, getHostedSnapshotManifestUrl } from "../data/frontendSnapshot";
import {
	getDataIndicatorLabel,
	getDataIndicatorVariant,
	isOfflineDemoMode,
	isOfflineSnapshotMode,
	isOnlineApiMode,
	isOnlineSnapshotMode,
} from "../data/dataSourcePreferences";
import {
	clearCompletedLevelsStorage,
	getCompletedLevelsStorageSizeBytes,
	readCompletedLevels,
	subscribeToLevelCompletionUpdates,
} from "../utils/levelCompletionStorage";
import { useBrowserOnlineStatus } from "../hooks/useBrowserOnlineStatus";
import {
	clearLevelHistoryStorage,
	getLevelHistoryStorageSizeBytes,
	readAllLevelHistory,
	subscribeToLevelHistoryUpdates,
} from "../utils/levelHistoryStorage";
import {
	clearPlayerCustomLevels,
	getPlayerCustomLevelsStorageSizeBytes,
	readPlayerCustomLevels,
	subscribeToPlayerCustomLevels,
} from "../utils/customLevelsStorage";
import DataIndicatorGlyph from "./DataIndicatorGlyph";
import type { SnapshotErrorSource } from "../context/snapshotData";

type DataSettingsPanelProps = {
	layout?: "page" | "popover";
	showHeading?: boolean;
};

type SourceChoice = {
	id: string;
	group: "offline" | "online";
	label: string;
	hint: string;
	checked: boolean;
	onSelect: () => void;
};

type GameDataStorageStats = {
	completedLevelCount: number;
	savedRouteCount: number;
	customLevelCount: number;
	historyBytes: number;
	completionBytes: number;
	customLevelBytes: number;
	totalBytes: number;
};

const GAME_DATA_STORAGE_SOFT_LIMIT_BYTES = 1024 * 1024;

function formatStorageSize(bytes: number) {
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	if (bytes >= 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}

	return `${bytes} B`;
}

function getGameDataStorageStats(): GameDataStorageStats {
	const completedLevels = readCompletedLevels();
	const levelHistoryCollection = readAllLevelHistory();
	const customLevels = readPlayerCustomLevels();
	const completedLevelCount = Object.keys(completedLevels).length;
	const savedRouteCount = Object.values(levelHistoryCollection)
		.reduce((totalCount, record) => totalCount + record.attempts.length, 0);
	const historyBytes = getLevelHistoryStorageSizeBytes(levelHistoryCollection);
	const completionBytes = getCompletedLevelsStorageSizeBytes(completedLevels);
	const customLevelBytes = getPlayerCustomLevelsStorageSizeBytes(customLevels);

	return {
		completedLevelCount,
		savedRouteCount,
		customLevelCount: customLevels.length,
		historyBytes,
		completionBytes,
		customLevelBytes,
		totalBytes: historyBytes + completionBytes + customLevelBytes,
	};
}

// function getSnapshotCacheStorageStats(): SnapshotCacheStorageStats {
// 	return {
// 		manifestBytes: 0,
// 		snapshotBytes: 0,
// 		totalBytes: 0,
// 	};
// }

function formatSnapshotErrorLabel(errorSource: SnapshotErrorSource | null) {
	if (errorSource === "installed") {
		return "Installed snapshot failed to load";
	}

	if (errorSource === "api") {
		return "API snapshot refresh failed";
	}

	if (errorSource === "s3") {
		return "Hosted snapshot refresh failed";
	}

	return "Snapshot refresh failed";
}

function DataSettingsPanel({ layout = "page", showHeading = true }: DataSettingsPanelProps) {
	const { mode, setMode } = useDataSourceMode();
	const {
		snapshot,
		manifest,
		errorMessage,
		errorSource,
		isLoading,
		isCheckingForS3Update,
		loadedFrom,
		installedBundle,
		s3Bundle,
		apiBundle,
		s3UpdateCheck,
		fetchSnapshotFromApi,
		fetchSnapshotFromS3,
		checkForS3SnapshotUpdate,
		clearSnapshotCache,
	} = useSnapshotData();
	const apiConnectionState = useSyncExternalStore(subscribeToApiConnectionState, getApiConnectionState, getApiConnectionState);
	const isBrowserOnline = useBrowserOnlineStatus();
	const [gameDataStats, setGameDataStats] = useState<GameDataStorageStats>(() => getGameDataStorageStats());
	const hasSnapshot = !!snapshot;
	const isApiUnavailable = isOnlineApiMode(mode) && apiConnectionState.status === "unavailable";
	const isApiAttempting = isOnlineApiMode(mode) && apiConnectionState.status === "attempting";
	const activeVersion = snapshot?.meta.version ?? manifest?.version ?? null;
	const installedVersion = installedBundle?.manifest.version ?? installedBundle?.snapshot.meta.version ?? null;
	const s3Version = s3Bundle?.manifest.version ?? s3Bundle?.snapshot.meta.version ?? null;
	const apiVersion = apiBundle?.manifest.version ?? apiBundle?.snapshot.meta.version ?? null;
	const s3CacheStats = getCachedSnapshotStorageStats("s3");
	const apiCacheStats = getCachedSnapshotStorageStats("api");
	const hasHostedSnapshotUrl = !!getHostedSnapshotManifestUrl();
	const gameDataUsagePercent = Math.min(100, (gameDataStats.totalBytes / GAME_DATA_STORAGE_SOFT_LIMIT_BYTES) * 100);
	const variant = useMemo(
		() => getDataIndicatorVariant({
			mode,
			isBrowserOnline,
			hasSnapshot,
			isSnapshotLoading: isLoading,
			isApiUnavailable,
		}),
		[hasSnapshot, isApiUnavailable, isBrowserOnline, isLoading, mode],
	);
	const isCompact = layout === "popover";

	useEffect(() => {
		const syncGameDataStats = () => {
			setGameDataStats(getGameDataStorageStats());
		};

		syncGameDataStats();
		const unsubscribeHistory = subscribeToLevelHistoryUpdates(syncGameDataStats);
		const unsubscribeCompletion = subscribeToLevelCompletionUpdates(syncGameDataStats);
		const unsubscribeCustomLevels = subscribeToPlayerCustomLevels(syncGameDataStats);

		return () => {
			unsubscribeHistory();
			unsubscribeCompletion();
			unsubscribeCustomLevels();
		};
	}, []);

	const modeChoices = useMemo<SourceChoice[]>(
		() => [
			{
				id: `mode-offline-snapshot-${layout}`,
				group: "offline",
				label: "Installed Snapshot",
				hint: "Uses the snapshot files bundled inside this frontend build. This is the default startup mode and works offline.",
				checked: isOfflineSnapshotMode(mode),
				onSelect: () => setMode({ ...mode, connectionMode: "offline", offlineSource: "snapshot" }),
			},
			{
				id: `mode-offline-demo-${layout}`,
				group: "offline",
				label: "Demo",
				hint: "Built-in offline dataset. No network required — works immediately.",
				checked: isOfflineDemoMode(mode),
				onSelect: () => setMode({ ...mode, connectionMode: "offline", offlineSource: "demo" }),
			},
			{
				id: `mode-online-s3-${layout}`,
				group: "online",
				label: "Hosted S3 Snapshot",
				hint: "Manual online snapshot mode. Check S3 when you want to see whether a newer hosted snapshot exists.",
				checked: isOnlineSnapshotMode(mode),
				onSelect: () => setMode({ ...mode, connectionMode: "online", onlineSource: "snapshot" }),
			},
			{
				id: `mode-online-api-${layout}`,
				group: "online",
				label: "API Mode",
				hint: "Experimental. Tries live API requests first and falls back to local graph lookups when backend calls fail.",
				checked: isOnlineApiMode(mode),
				onSelect: () => setMode({ ...mode, connectionMode: "online", onlineSource: "api" }),
			},
		],
		[layout, mode, setMode],
	);
	const offlineModeChoices = useMemo(
		() => modeChoices.filter((choice) => choice.group === "offline"),
		[modeChoices],
	);
	const onlineModeChoices = useMemo(
		() => modeChoices.filter((choice) => choice.group === "online"),
		[modeChoices],
	);

	const renderModeChoice = (choice: SourceChoice) => (
		<label
			key={choice.id}
			className={`settingsOption settingsOption--radio settingsOption--radio-${layout}${choice.checked ? " settingsOption--active" : ""}`}
		>
			<input type="radio" name={`data-mode-${layout}`} checked={choice.checked} onChange={choice.onSelect} />
			<span className="settingsOptionControl" aria-hidden="true" />
			<span>
				<strong>{choice.label}</strong>
				{isCompact ? null : <span className="settingsHint">{choice.hint}</span>}
			</span>
		</label>
	);

	const handleClearGameData = () => {
		clearLevelHistoryStorage();
		clearCompletedLevelsStorage();
		clearPlayerCustomLevels();
		setGameDataStats(getGameDataStorageStats());
	};

	const handleCheckS3 = () => {
		void checkForS3SnapshotUpdate();
	};

	const handleFetchS3 = () => {
		void fetchSnapshotFromS3();
	};

	const handleFetchApi = () => {
		void fetchSnapshotFromApi();
	};

	const hasOnlineSuccess = mode.connectionMode === "online"
		&& (mode.onlineSource === "api"
			? apiConnectionState.status === "available" || loadedFrom === "api-snapshot" || Boolean(apiBundle)
			: loadedFrom === "s3-snapshot" || Boolean(s3Bundle));
	const currentStateTone = mode.connectionMode === "offline" ? "offline" : hasOnlineSuccess ? "online" : "pending";
	const currentStateTitle = mode.connectionMode === "offline" ? "Offline" : hasOnlineSuccess ? "Online" : "Connection pending";
	const currentStateSummary = getDataIndicatorLabel(variant);
	const apiConnectionLabel = hasOnlineSuccess
		? "Connected"
		: apiConnectionState.status === "attempting"
			? "Attempting"
			: apiConnectionState.status === "unavailable"
				? "Unavailable"
				: "Idle";
	const currentStateDescription = mode.connectionMode === "offline"
		? currentStateSummary
		: hasOnlineSuccess
			? "Online mode is active and connected successfully."
			: "Online mode is selected, but no live connection has succeeded yet.";

	return (
		<div className={`dataSettingsPanel dataSettingsPanel--${layout}`}>
			{showHeading ? (
				<div className="dataSettingsHeader">
					<div>
						<div className="pageEyebrow">Data Mode</div>
						<h2>Connection and dataset controls</h2>
					</div>
					<div className={`dataSettingsCurrentState dataSettingsCurrentState--${currentStateTone}`}>
						<DataIndicatorGlyph variant={variant} pulse={(isLoading && mode.connectionMode === "online") || isApiAttempting || isApiUnavailable} />
						<div>
							<strong>{currentStateTitle}</strong>
							<span>{currentStateDescription}</span>
						</div>
					</div>
				</div>
			) : null}

			<section className="settingsSection dataSettingsSection">
				{/* <h3>{isCompact ? "Mode" : "Data source"}</h3> */}
				<div className="dataSettingsGroupedModes">
					<div className="dataSettingsModeGroup">
						<div className="dataSettingsModeGroupHeader">
							<div>
								<h4>Offline Mode</h4>
								{/* <p className="settingsHint">Installed snapshot and demo</p> */}
							</div>
							{/* <span>No network</span> */}
						</div>
						<div className={`dataModeGrid dataModeGrid--${layout}`}>
							{offlineModeChoices.map(renderModeChoice)}
						</div>
					</div>
					<div className="dataSettingsModeGroup">
						<div className="dataSettingsModeGroupHeader">
							<div>
								<h4>Online Mode</h4>
								{/* <p className="settingsHint">Hosted S3 and API mode</p> */}
							</div>
							{/* <span>Network enabled</span> */}
						</div>
						<div className={`dataModeGrid dataModeGrid--${layout}`}>
							{onlineModeChoices.map(renderModeChoice)}
						</div>
					</div>
				</div>

				<p className="settingsHint">
					Current active data: {isOfflineDemoMode(mode) ? "Demo" : activeVersion ? `v${activeVersion}` : "loading"}.
					 {loadedFrom === "installed-snapshot" ? " Installed local snapshot is active." : null}
					 {loadedFrom === "s3-snapshot" ? " Downloaded S3 snapshot is active." : null}
					 {loadedFrom === "api-snapshot" ? " Downloaded API snapshot is active as the current fallback snapshot." : null}
				</p>

				{isOfflineSnapshotMode(mode) ? (
					<div className="dataSettingsStorageCard">
						<div className="dataSettingsStorageRow">
							<span>Installed version</span>
							<strong>{installedVersion ?? "not loaded"}</strong>
						</div>
						<div className="dataSettingsStorageRow">
							<span>Source</span>
							<strong>Bundled with app</strong>
						</div>
					</div>
				) : null}

				{isOnlineSnapshotMode(mode) ? (
					<>
						<div className={`settingsActions settingsActions--${layout}`}>
								<button
									type="button"
									className={`settingsActionButton${isCompact ? " settingsActionButton--compact" : ""}`}
									onClick={handleCheckS3}
									disabled={!hasHostedSnapshotUrl || isLoading || isCheckingForS3Update}
								>
									{isCheckingForS3Update ? "Checking S3..." : "Check S3 for updates"}
								</button>
								<button
									type="button"
									className={`settingsActionButton${isCompact ? " settingsActionButton--compact" : ""}`}
									onClick={handleFetchS3}
									disabled={!hasHostedSnapshotUrl || isLoading}
								>
									{s3Bundle ? "Re-fetch S3 snapshot" : "Download S3 snapshot"}
								</button>
							<button
								type="button"
								className={`settingsActionButton settingsDangerButton${isCompact ? " settingsActionButton--compact" : ""}`}
									onClick={() => clearSnapshotCache("s3")}
									disabled={!s3Bundle}
							>
									Clear downloaded S3 snapshot
							</button>
						</div>
						<div className="dataSettingsStorageCard">
							<div className="dataSettingsStorageRow">
									<span>Downloaded S3 version</span>
									<strong>{s3Version ?? "none"}</strong>
							</div>
							<div className="dataSettingsStorageRow">
									<span>Manifest cache</span>
									<strong>{formatStorageSize(s3CacheStats.manifestBytes)}</strong>
							</div>
							<div className="dataSettingsStorageRow">
									<span>Snapshot cache</span>
									<strong>{formatStorageSize(s3CacheStats.snapshotBytes)}</strong>
								</div>
								<div className="dataSettingsStorageRow">
									<span>Total storage</span>
									<strong>{formatStorageSize(s3CacheStats.totalBytes)}</strong>
							</div>
						</div>
						<p className="settingsHint">
							{hasHostedSnapshotUrl
								? "Hosted S3 checks only happen when you ask. If no downloaded S3 snapshot is available, this mode falls back to the installed snapshot."
								: "No hosted S3 manifest URL is configured for this build."}
						</p>
						{s3UpdateCheck.message ? <p className={s3UpdateCheck.status === "error" ? "settingsError" : "settingsHint"}>{s3UpdateCheck.message}</p> : null}
					</>
				) : null}

				{isOnlineApiMode(mode) ? (
					<>
						<div className={`settingsActions settingsActions--${layout}`}>
								<button
									type="button"
									className={`settingsActionButton${isCompact ? " settingsActionButton--compact" : ""}`}
									onClick={handleFetchApi}
									disabled={isLoading}
								>
									{apiBundle ? "Re-fetch API snapshot" : "Fetch API snapshot"}
								</button>
								<button
									type="button"
									className={`settingsActionButton settingsDangerButton${isCompact ? " settingsActionButton--compact" : ""}`}
									onClick={() => clearSnapshotCache("api")}
									disabled={!apiBundle}
								>
									Clear downloaded API snapshot
								</button>
						</div>
						<div className="dataSettingsStorageCard">
							<div className="dataSettingsStorageRow">
								<span>Connection status</span>
								<strong>{apiConnectionLabel}</strong>
							</div>
								<div className="dataSettingsStorageRow">
									<span>Downloaded API version</span>
									<strong>{apiVersion ?? "none"}</strong>
								</div>
								<div className="dataSettingsStorageRow">
									<span>Manifest cache</span>
									<strong>{formatStorageSize(apiCacheStats.manifestBytes)}</strong>
								</div>
								<div className="dataSettingsStorageRow">
									<span>Snapshot cache</span>
									<strong>{formatStorageSize(apiCacheStats.snapshotBytes)}</strong>
								</div>
								<div className="dataSettingsStorageRow">
									<span>Total storage</span>
									<strong>{formatStorageSize(apiCacheStats.totalBytes)}</strong>
								</div>
							</div>
						<p className="settingsHint">API mode tries live backend calls first. If they fail, the frontend can still use local graph data when a snapshot is available.</p>
						{apiConnectionState.status === "unavailable" && apiConnectionState.lastError ? <p className="settingsError">Live API unavailable: {apiConnectionState.lastError}</p> : null}
					</>
				) : null}

				{errorMessage ? <p className="settingsError">{formatSnapshotErrorLabel(errorSource)}: {errorMessage}</p> : null}
			</section>

			{isCompact ? null : (
				<section className="settingsSection dataSettingsSection">
					<h3>Local game data</h3>
						<p className="settingsHint">
							Saved routes, scores, completed levels, and custom quick-play levels are stored locally in this browser.
						</p>
						<div className="dataSettingsStorageCard">
							<div className="dataSettingsStorageRow">
								<span>Total usage</span>
								<strong>{formatStorageSize(gameDataStats.totalBytes)}</strong>
							</div>
							<div className="dataSettingsStorageRow">
								<span>Saved routes</span>
								<strong>{gameDataStats.savedRouteCount}</strong>
							</div>
							<div className="dataSettingsStorageRow">
								<span>Completed levels</span>
								<strong>{gameDataStats.completedLevelCount}</strong>
							</div>
							<div className="dataSettingsStorageRow">
								<span>Saved custom levels</span>
								<strong>{gameDataStats.customLevelCount}</strong>
							</div>
							<div className="dataSettingsStorageRow">
								<span>Routes + scores data</span>
								<strong>{formatStorageSize(gameDataStats.historyBytes)}</strong>
							</div>
							<div className="dataSettingsStorageRow">
								<span>Completion markers</span>
								<strong>{formatStorageSize(gameDataStats.completionBytes)}</strong>
							</div>
							<div className="dataSettingsStorageRow">
								<span>Custom level storage</span>
								<strong>{formatStorageSize(gameDataStats.customLevelBytes)}</strong>
							</div>
							<div className="dataSettingsStorageMeter" aria-hidden="true">
								<span style={{ width: `${gameDataUsagePercent}%` }} />
							</div>
							<p className="settingsHint">
								Soft cap: {formatStorageSize(GAME_DATA_STORAGE_SOFT_LIMIT_BYTES)} for browser-local play history.
								 Browser limits vary, but this is a safe target for routes, scores, and completion data.
							</p>
						</div>
						<div className={`settingsActions settingsActions--${layout}`}>
							<button
								type="button"
								className={`settingsActionButton settingsDangerButton${isCompact ? " settingsActionButton--compact" : ""}`}
								onClick={handleClearGameData}
								disabled={gameDataStats.totalBytes === 0 && gameDataStats.customLevelCount === 0}
							>
								Clear local game data
							</button>
						</div>
						<p className="settingsHint">
							This clears saved paths, scores, completed-level markers, and all saved custom archive levels for this browser only.
						</p>
				</section>
			)}
	</div>
);
}

export default DataSettingsPanel;