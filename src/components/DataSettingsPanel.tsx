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

type ModeChoice = {
	id: string;
	group: "online" | "offline";
	label: string;
	hint: string;
	checked: boolean;
	onSelect: () => void;
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
	const { mode, setMode } = useDataSourceMode();
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
	const isCompact = layout === "popover";
	const modeChoices = useMemo<Record<"online" | "offline", ModeChoice[]>>(
		() => ({
			online: [
				{
					id: `online-snapshot-${layout}`,
					group: "online",
					label: "Snapshot",
					hint: "Default online path.",
					checked: isOnlineSnapshotMode(mode),
					onSelect: () => setMode({ ...mode, connectionMode: "online", onlineSource: "snapshot" }),
				},
				{
					id: `online-api-${layout}`,
					group: "online",
					label: "API",
					hint: "Secondary live-call path.",
					checked: isOnlineApiMode(mode),
					onSelect: () => setMode({ ...mode, connectionMode: "online", onlineSource: "api" }),
				},
			],
			offline: [
				{
					id: `offline-snapshot-${layout}`,
					group: "offline",
					label: "Snapshot",
					hint: "Default cached offline path.",
					checked: isOfflineSnapshotMode(mode),
					onSelect: () => setMode({ ...mode, connectionMode: "offline", offlineSource: "snapshot" }),
				},
				{
					id: `offline-demo-${layout}`,
					group: "offline",
					label: "Demo",
					hint: "Built-in fallback dataset.",
					checked: isOfflineDemoMode(mode),
					onSelect: () => setMode({ ...mode, connectionMode: "offline", offlineSource: "demo" }),
				},
			],
		}),
		[layout, mode, setMode],
	);

	const renderModeChoice = (choice: ModeChoice) => (
		<label
			key={choice.id}
			className={`settingsOption settingsOption--radio settingsOption--radio-${layout}${choice.checked ? " settingsOption--active" : ""}`}
		>
			<input type="radio" name={`${choice.group}-source-${layout}`} checked={choice.checked} onChange={choice.onSelect} />
			<span className="settingsOptionControl" aria-hidden="true" />
			<span>
				<strong>{choice.label}</strong>
				{isCompact ? null : <span className="settingsHint">{choice.hint}</span>}
			</span>
		</label>
	);

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
				<h3>{isCompact ? "Online" : "Online source"}</h3>
				<div className={`dataModeGrid dataModeGrid--${layout}`}>
					{modeChoices.online.map(renderModeChoice)}
				</div>
			</section>

			<section className="settingsSection dataSettingsSection">
				<h3>{isCompact ? "Offline" : "Offline source"}</h3>
				<div className={`dataModeGrid dataModeGrid--${layout}`}>
					{modeChoices.offline.map(renderModeChoice)}
				</div>
			</section>

			{isCompact ? (
				<section className="settingsSection dataSettingsSection dataSettingsSection--compactStatus">
					<h3>Versions</h3>
					<div className="dataSettingsStats dataSettingsStats--compact">
						<p className="settingsHint">Snapshot: {snapshot?.meta.version ?? "none loaded"}</p>
						<p className="settingsHint">Manifest: {manifest?.version ?? "none loaded"}</p>
					</div>
				</section>
			) : (
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
			)}

			<section className="settingsSection dataSettingsSection">
				<h3>Snapshot controls</h3>
				<div className={`settingsActions settingsActions--${layout}`}>
					<button type="button" className={isCompact ? "settingsActionButton settingsActionButton--compact" : ""} onClick={() => void fetchSnapshotFromApi()} disabled={isLoading}>{isCompact ? "Fetch API" : "Fetch snapshot from API"}</button>
					<button type="button" className={isCompact ? "settingsActionButton settingsActionButton--compact" : ""} onClick={() => void fetchSnapshotFromS3()} disabled={isLoading}>{isCompact ? "Fetch Hosted" : "Fetch snapshot from hosted file"}</button>
					<button type="button" className={`${isCompact ? "settingsActionButton settingsActionButton--compact " : ""}settingsDangerButton`} onClick={clearSnapshotCache}>{isCompact ? "Clear Cache" : "Clear cached snapshot"}</button>
				</div>
				{isCompact ? null : <p className="settingsHint">You can refresh or clear the browser snapshot cache at any time, independent of the current connection mode.</p>}
				{errorMessage ? <p className="settingsError">{formatSnapshotErrorLabel(errorSource)}: {errorMessage}</p> : null}
			</section>
		</div>
	);
}

export default DataSettingsPanel;