import { useMemo } from "react";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import {
	getDataIndicatorDescription,
	getDataIndicatorLabel,
	getDataIndicatorVariant,
	isOfflineDemoMode,
	isOfflineSnapshotMode,
	isOnlineApiMode,
	isOnlineSnapshotMode,
} from "../data/dataSourcePreferences";
import { getApiSnapshotManifestUrl, getHostedSnapshotManifestUrl } from "../data/frontendSnapshot";
import { useBrowserOnlineStatus } from "../hooks/useBrowserOnlineStatus";
import DataIndicatorGlyph from "./DataIndicatorGlyph";

type DataSettingsPanelProps = {
	layout?: "page" | "popover";
	showHeading?: boolean;
};

function formatRefreshHours(milliseconds: number) {
	return Math.max(1, Math.round(milliseconds / (1000 * 60 * 60)));
}

function formatSnapshotLoadSource(loadedFrom: string | null) {
	if (loadedFrom === "s3-snapshot") {
		return "Hosted snapshot download";
	}

	if (loadedFrom === "api-snapshot") {
		return "API snapshot endpoint";
	}

	if (loadedFrom === "cache") {
		return "Browser cache";
	}

	if (loadedFrom === "demo") {
		return "Built-in demo dataset";
	}

	return "No snapshot loaded yet";
}

function formatSnapshotErrorLabel(errorSource: "api" | "s3" | null) {
	if (errorSource === "api") {
		return "API snapshot refresh failed";
	}

	if (errorSource === "s3") {
		return "Hosted snapshot refresh failed";
	}

	return "Snapshot refresh failed";
}

function DataSettingsPanel({ layout = "page", showHeading = true }: DataSettingsPanelProps) {
	const { mode, setConnectionMode, setOfflineSource, setOnlineSource } = useDataSourceMode();
	const {
		snapshot,
		manifest,
		errorMessage,
		errorSource,
		isLoading,
		loadedFrom,
		lastRefreshAt,
		recommendedRefreshMs,
		fetchSnapshotFromApi,
		fetchSnapshotFromS3,
		clearSnapshotCache,
	} = useSnapshotData();
	const isBrowserOnline = useBrowserOnlineStatus();
	const hasSnapshot = !!snapshot;
	const variant = useMemo(
		() => getDataIndicatorVariant({
			mode,
			isBrowserOnline,
			hasSnapshot,
			isSnapshotLoading: isLoading,
		}),
		[hasSnapshot, isBrowserOnline, isLoading, mode],
	);
	const hostedManifestUrl = getHostedSnapshotManifestUrl();
	const apiManifestUrl = getApiSnapshotManifestUrl();

	return (
		<div className={`dataSettingsPanel dataSettingsPanel--${layout}`}>
			{showHeading ? (
				<div className="dataSettingsHeader">
					<div>
						<div className="pageEyebrow">Data Mode</div>
						<h2>Connection and dataset controls</h2>
					</div>
					<div className="dataSettingsCurrentState">
						<DataIndicatorGlyph variant={variant} pulse={isLoading && isOnlineSnapshotMode(mode)} />
						<div>
							<strong>{getDataIndicatorLabel(variant)}</strong>
							<span>{getDataIndicatorDescription({ mode, isBrowserOnline, hasSnapshot, isSnapshotLoading: isLoading })}</span>
						</div>
					</div>
				</div>
			) : null}

			<section className="settingsSection dataSettingsSection">
				<h3>Connection mode</h3>
				<div className="dataModeGrid">
					<label className={`settingsOption settingsOption--card${mode.connectionMode === "online" ? " settingsOption--active" : ""}`}>
						<input type="radio" name={`connection-mode-${layout}`} checked={mode.connectionMode === "online"} onChange={() => setConnectionMode("online")} />
						<span>
							<strong>Online mode</strong>
							<span className="settingsHint">Use network-aware play. Snapshot mode fetches from the API snapshot endpoint first. API mode uses ad-hoc live calls during play.</span>
						</span>
					</label>
					<label className={`settingsOption settingsOption--card${mode.connectionMode === "offline" ? " settingsOption--active" : ""}`}>
						<input type="radio" name={`connection-mode-${layout}`} checked={mode.connectionMode === "offline"} onChange={() => setConnectionMode("offline")} />
						<span>
							<strong>Offline mode</strong>
							<span className="settingsHint">Skip live API gameplay calls and rely on whatever is already cached locally, or use the built-in demo fallback.</span>
						</span>
					</label>
				</div>
			</section>

			<section className="settingsSection dataSettingsSection">
				<h3>Online mode source</h3>
				<label className={`settingsOption${isOnlineSnapshotMode(mode) ? " settingsOption--active" : ""}`}>
					<input type="radio" name={`online-source-${layout}`} checked={isOnlineSnapshotMode(mode)} onChange={() => setOnlineSource("snapshot")} />
					<span>
						<strong>Snapshot data</strong>
						<span className="settingsHint">Default online path. Refresh from the API snapshot endpoint first, then fall back to local snapshot data, and finally demo data if nothing usable is available.</span>
					</span>
				</label>
				<label className={`settingsOption${isOnlineApiMode(mode) ? " settingsOption--active" : ""}`}>
					<input type="radio" name={`online-source-${layout}`} checked={isOnlineApiMode(mode)} onChange={() => setOnlineSource("api")} />
					<span>
						<strong>API data</strong>
						<span className="settingsHint">Proof-of-concept mode. Gameplay makes live API calls when possible, then falls back to snapshot data or demo data if the API is unavailable.</span>
					</span>
				</label>
			</section>

			<section className="settingsSection dataSettingsSection">
				<h3>Offline mode source</h3>
				<label className={`settingsOption${isOfflineSnapshotMode(mode) ? " settingsOption--active" : ""}`}>
					<input type="radio" name={`offline-source-${layout}`} checked={isOfflineSnapshotMode(mode)} onChange={() => setOfflineSource("snapshot")} />
					<span>
						<strong>Snapshot data</strong>
						<span className="settingsHint">Use the snapshot currently cached in the browser while disconnected or while forcing offline mode.</span>
					</span>
				</label>
				<label className={`settingsOption${isOfflineDemoMode(mode) ? " settingsOption--active" : ""}`}>
					<input type="radio" name={`offline-source-${layout}`} checked={isOfflineDemoMode(mode)} onChange={() => setOfflineSource("demo")} />
					<span>
						<strong>Demo data</strong>
						<span className="settingsHint">Use the built-in offline demo dataset regardless of cached snapshot state.</span>
					</span>
				</label>
			</section>

			<section className="settingsSection dataSettingsSection">
				<h3>Current status</h3>
				<div className="dataSettingsStats">
					<p className="settingsHint">Browser connection: {isBrowserOnline ? "online" : "offline"}</p>
					<p className="settingsHint">Indicator state: {getDataIndicatorLabel(variant)}</p>
					<p className="settingsHint">Current snapshot source: {formatSnapshotLoadSource(loadedFrom)}</p>
					<p className="settingsHint">Last snapshot refresh: {lastRefreshAt ?? "not refreshed yet"}</p>
					<p className="settingsHint">Recommended refresh interval: every {formatRefreshHours(recommendedRefreshMs)} hours</p>
					<p className="settingsHint">Hosted manifest URL: {hostedManifestUrl ?? "not configured"}</p>
					<p className="settingsHint">API manifest URL: {apiManifestUrl}</p>
					<p className="settingsHint">Loaded snapshot version: {snapshot?.meta.version ?? "none loaded yet"}</p>
					<p className="settingsHint">Loaded manifest version: {manifest?.version ?? "none loaded yet"}</p>
					<p className="settingsHint">Snapshot endpoint: {manifest?.snapshotEndpoint ?? "none loaded yet"}</p>
				</div>
			</section>

			<section className="settingsSection dataSettingsSection">
				<h3>Snapshot controls</h3>
				<div className="settingsActions">
					<button type="button" onClick={() => void fetchSnapshotFromApi()} disabled={isLoading}>Fetch snapshot from API</button>
					<button type="button" onClick={() => void fetchSnapshotFromS3()} disabled={isLoading}>Fetch snapshot from hosted file</button>
					<button type="button" className="settingsDangerButton" onClick={clearSnapshotCache}>Clear cached snapshot</button>
				</div>
				<p className="settingsHint">You can refresh or clear the browser snapshot cache at any time, independent of the current connection mode.</p>
				{errorMessage ? <p className="settingsError">{formatSnapshotErrorLabel(errorSource)}: {errorMessage}</p> : null}
			</section>
		</div>
	);
}

export default DataSettingsPanel;