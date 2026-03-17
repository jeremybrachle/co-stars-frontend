import { useMemo } from "react";
import { useCountdownTimer } from "../context/useCountdownTimer";
// Timer component for showing countdown from context
function S3LoadingTimer({ active }: { active: boolean }) {
	const { secondsLeft, isRunning, start } = useCountdownTimer();
	// Start the timer if active and not already running
	if (active && !isRunning) start();
	if (!active) return null;
	const min = Math.floor(secondsLeft / 60);
	const sec = secondsLeft % 60;
	return <span className="s3LoadingTimer">Waiting for S3 upload: {min}:{sec.toString().padStart(2, "0")}</span>;
}
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import {
	getDataIndicatorDescription,
	getDataIndicatorLabel,
	getDataIndicatorVariant,
	isOfflineDemoMode,
	isOnlineApiMode,
	isOnlineSnapshotMode,
} from "../data/dataSourcePreferences";
import { useBrowserOnlineStatus } from "../hooks/useBrowserOnlineStatus";
import DataIndicatorGlyph from "./DataIndicatorGlyph";

type DataSettingsPanelProps = {
	layout?: "page" | "popover";
	showHeading?: boolean;
};

type ModeChoice = {
	id: string;
	group: string;
	emoji: string;
	label: string;
	hint: string;
	checked: boolean;
	onSelect: () => void;
};


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
		fetchSnapshotFromApi,
		fetchSnapshotFromS3,
		clearSnapshotCache,
	} = useSnapshotData();
	const isBrowserOnline = useBrowserOnlineStatus();
	const hasSnapshot = !!snapshot;
	const hasFullData = !!snapshot && !!manifest;
	const isFullDataLoading = isOnlineSnapshotMode(mode) && (!hasFullData || isLoading);
	const isApiLoading = isOnlineApiMode(mode) && isLoading;
	const apiError = isOnlineApiMode(mode) && errorMessage ? errorMessage : null;
	const snapshotVersion = snapshot?.meta.version ?? null;
	const manifestVersion = manifest?.version ?? null;
	const shouldSplitVersionDisplay = !isOfflineDemoMode(mode) && !!snapshotVersion && !!manifestVersion && snapshotVersion !== manifestVersion;
	const dataVersionLabel = isOfflineDemoMode(mode)
		? "Demo"
		: snapshotVersion ?? manifestVersion ?? "none loaded yet";
	const variant = useMemo(
		() => getDataIndicatorVariant({
			mode,
			isBrowserOnline,
			hasSnapshot,
			isSnapshotLoading: isLoading,
		}),
		[hasSnapshot, isBrowserOnline, isLoading, mode],
	);
	// Removed unused hostedManifestUrl and apiManifestUrl
	const isCompact = layout === "popover";
	const mainModeChoices = useMemo<ModeChoice[]>(
		() => [
			{
				id: `mode-full-${layout}`,
				group: "main",
				emoji: "⚡",
				label: "Full Data",
				hint: "Default mode. Loads hosted S3 snapshot data, retrying for up to 3 minutes before falling back to demo.",
				checked: isOnlineSnapshotMode(mode),
				onSelect: () => setMode({ ...mode, connectionMode: "online", onlineSource: "snapshot" }),
			},
			{
				id: `mode-api-${layout}`,
				group: "main",
				emoji: "📡",
				label: "API Mode",
				hint: "Connects directly to the backend API. Shows a message if the connection fails.",
				checked: isOnlineApiMode(mode),
				onSelect: () => setMode({ ...mode, connectionMode: "online", onlineSource: "api" }),
			},
			{
				id: `mode-demo-${layout}`,
				group: "main",
				emoji: "🎭",
				label: "Demo",
				hint: "Built-in offline dataset. No network required — works immediately.",
				checked: isOfflineDemoMode(mode),
				onSelect: () => setMode({ ...mode, connectionMode: "offline", offlineSource: "demo" }),
			},
		],
		[layout, mode, setMode],
	);

	const renderModeChoice = (choice: ModeChoice) => (
		<label
			key={choice.id}
			className={`settingsOption settingsOption--radio settingsOption--radio-${layout}${choice.checked ? " settingsOption--active" : ""}`}
		>
			<input type="radio" name={`main-mode-${layout}`} checked={choice.checked} onChange={choice.onSelect} />
			<span className="settingsOptionControl" aria-hidden="true" />
			<span>
				<strong><span className="settingsOptionEmoji" aria-hidden="true">{choice.emoji}</span> {choice.label}</strong>
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
				<h3>{isCompact ? "Mode" : "Main data mode"}</h3>
			<div className={`dataModeGrid dataModeGrid--${layout} dataModeGrid--three`}>
				{mainModeChoices.map(renderModeChoice)}
			</div>
			{isOnlineSnapshotMode(mode) ? (
				<>
					{isFullDataLoading ? (
						<div className="dataSettingsInlineStatus">
							{/* <DataIndicatorGlyph variant="online-snapshot" pulse /> */}
							<span className="settingsHint">Loading full game data from hosted S3 snapshot files.</span>
							<S3LoadingTimer key={isFullDataLoading ? 'active' : 'inactive'} active={true} />
						</div>
					) : null}
					<br />
					<p className="settingsHint">
						{isFullDataLoading
							? "The app will keep checking hosted data until everything is ready."
							: "Full data is active and ready."}
					</p>
				</>
			) : isOnlineApiMode(mode) ? (
				<>
					<br />
					{isApiLoading ? (
						<div className="dataSettingsInlineStatus">
							<DataIndicatorGlyph variant="online-api" pulse />
							<span className="settingsHint">Connecting to API...</span>
						</div>
					) : apiError ? (
						<p className="settingsError">Connection unsuccessful: {apiError}</p>
					) : hasFullData ? (
						<p className="settingsHint">API data is active and ready.</p>
					) : (
						<p className="settingsHint">API mode selected. Waiting for data.</p>
					)}
				</>
			) : (
				<p className="settingsHint"></p>
			)}
			{shouldSplitVersionDisplay ? (
				<>
					<p className="settingsHint">Snapshot version: {snapshotVersion ?? "none loaded yet"}</p>
					<p className="settingsHint">Manifest version: {manifestVersion ?? "none loaded yet"}</p>
				</>
			) : (
				<p className="settingsHint">Data version: {isOfflineDemoMode(mode) ? "Demo" : `v${dataVersionLabel}`}</p>
			)}
		</section>

		{isCompact || isOfflineDemoMode(mode) ? null : (
			<details className="settingsSection dataSettingsSection dataSettingsDisclosure">
				<summary className="dataSettingsDisclosureSummary">
					<span>Advanced data settings</span>
					<span className="dataSettingsDisclosureValue">Optional</span>
				</summary>
				<div className="dataSettingsAdvancedBody">
					<section className="dataSettingsAdvancedSection">
						<h3>Snapshot controls</h3>
						<div className={`settingsActions settingsActions--${layout}`}>
							{isOnlineApiMode(mode) && (
								<button
									type="button"
									className={`settingsActionButton${isCompact ? " settingsActionButton--compact" : ""}`}
									onClick={() => void fetchSnapshotFromApi()}
									disabled={isLoading}
								>
									Fetch API
								</button>
							)}
							{!isOnlineApiMode(mode) && (
								<button
									type="button"
									className={`settingsActionButton${isCompact ? " settingsActionButton--compact" : ""}`}
									onClick={() => void fetchSnapshotFromS3()}
									disabled={isLoading}
								>
									Fetch hosted
								</button>
							)}
							<button
								type="button"
								className={`settingsActionButton settingsDangerButton${isCompact ? " settingsActionButton--compact" : ""}`}
								onClick={clearSnapshotCache}
								disabled={!hasSnapshot}
							>
								Clear cache
							</button>
						</div>
						<p className="settingsHint">Refresh or clear the browser snapshot cache at any time, independent of the current connection mode.</p>
						{errorMessage ? <p className="settingsError">{formatSnapshotErrorLabel(errorSource)}: {errorMessage}</p> : null}
					</section>
				</div>
			</details>
		)}

		{/* Bottom-right timer overlay and style */}
		<style>{`
			.s3LoadingTimer {
				display: inline-block;
				margin-left: 1em;
				font-weight: bold;
				color: #e67e22;
			}
			.s3LoadingTimer.s3-timer-overlay {
				position: fixed;
				right: 24px;
				bottom: 24px;
				background: rgba(255,255,255,0.95);
				border: 1px solid #e67e22;
				border-radius: 8px;
				padding: 10px 18px;
				z-index: 9999;
				box-shadow: 0 2px 8px rgba(0,0,0,0.08);
				font-size: 1.1em;
			}
		`}</style>
	</div>
);
}

export default DataSettingsPanel;