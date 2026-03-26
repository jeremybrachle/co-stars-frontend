import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getApiConnectionState, subscribeToApiConnectionState } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { getDataIndicatorLabel, getDataIndicatorVariant } from "../data/dataSourcePreferences";
import { useBrowserOnlineStatus } from "../hooks/useBrowserOnlineStatus";
import DataSettingsPanel from "./DataSettingsPanel";
import type { DataIndicatorVariant } from "../types";

const VARIANT_ICONS: Record<DataIndicatorVariant, string> = {
	"online-snapshot": "⚡",
	"online-api": "📡",
	"online-api-unavailable": "⚠️",
	"offline-snapshot": "💾",
	"offline-demo": "🎭",
};

function DataIndicatorIcon({ variant, loading, alert }: { variant: DataIndicatorVariant; loading: boolean; alert: boolean }) {
	return (
		<span className={`dataIndicatorIcon${loading ? " dataIndicatorIcon--pulse" : ""}${alert ? " dataIndicatorIcon--alert" : ""}`} aria-hidden="true">
			{VARIANT_ICONS[variant]}
		</span>
	);
}

function DataIndicator() {
	const [isOpen, setIsOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const { mode } = useDataSourceMode();
	const { snapshot, isLoading, errorSource, errorMessage } = useSnapshotData();
	const apiConnectionState = useSyncExternalStore(subscribeToApiConnectionState, getApiConnectionState, getApiConnectionState);
	const isBrowserOnline = useBrowserOnlineStatus();
	const isApiUnavailable = mode.connectionMode === "online"
		&& mode.onlineSource === "api"
		&& apiConnectionState.status === "unavailable";
	const isApiAttempting = mode.connectionMode === "online"
		&& mode.onlineSource === "api"
		&& apiConnectionState.status === "attempting";
	const variant = useMemo(
		() => getDataIndicatorVariant({
			mode,
			isBrowserOnline,
			hasSnapshot: !!snapshot,
			isSnapshotLoading: isLoading,
			isApiUnavailable,
		}),
		[isApiUnavailable, isBrowserOnline, isLoading, mode, snapshot],
	);
	const summary = getDataIndicatorLabel(variant);

	useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		const handlePointerDown = (event: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		};

		window.addEventListener("mousedown", handlePointerDown);
		window.addEventListener("keydown", handleEscape);

		return () => {
			window.removeEventListener("mousedown", handlePointerDown);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isOpen]);

	return (
		<div className={`dataIndicator${isOpen ? " dataIndicator--open" : ""}`} ref={rootRef}>
			<button
				type="button"
				className={`dataIndicatorButton dataIndicatorButton--${variant}`}
				onClick={() => setIsOpen((currentOpen) => !currentOpen)}
				aria-expanded={isOpen}
				aria-label={isApiUnavailable && apiConnectionState.lastError ? `${summary}. ${apiConnectionState.lastError}` : summary}
			>
				<DataIndicatorIcon variant={variant} loading={(isLoading && mode.connectionMode === "online") || isApiAttempting} alert={isApiUnavailable} />
				<span className="dataIndicatorButtonText">Data</span>
			</button>
			{isOpen ? (
				<div className="footerPopover footerPopover--compactData">
					<div className="footerPopoverHeader">
						<a href="/settings?tab=data" className="footerPopoverHeaderLink" title="Open advanced data settings">
							<h3>Data Controls</h3>
							
						</a>
						<button type="button" className="footerPopoverClose" onClick={() => setIsOpen(false)} aria-label="Close data controls">×</button>
					</div>
					<DataSettingsPanel layout="popover" showHeading={false} />
				</div>
			) : null}
		</div>
	);
}

export default DataIndicator;