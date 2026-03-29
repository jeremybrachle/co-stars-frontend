import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { getApiConnectionState, subscribeToApiConnectionState } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { getDataIndicatorLabel, getDataIndicatorVariant } from "../data/dataSourcePreferences";
import { useBrowserOnlineStatus } from "../hooks/useBrowserOnlineStatus";
import DataSettingsPanel from "./DataSettingsPanel";

type DataIndicatorVisualState = "offline" | "online" | "online-pending";

const VISUAL_STATE_ICONS: Record<DataIndicatorVisualState, string> = {
	offline: "◌",
	online: "●",
	"online-pending": "◔",
};

function DataIndicatorIcon({ visualState, loading }: { visualState: DataIndicatorVisualState; loading: boolean }) {
	return (
		<span className={`dataIndicatorIcon dataIndicatorIcon--${visualState}${loading ? " dataIndicatorIcon--pulse" : ""}`} aria-hidden="true">
			{VISUAL_STATE_ICONS[visualState]}
		</span>
	);
}

function DataIndicator() {
	const [isOpen, setIsOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const { mode } = useDataSourceMode();
	const { snapshot, isLoading, loadedFrom, s3Bundle, apiBundle } = useSnapshotData();
	const apiConnectionState = useSyncExternalStore(subscribeToApiConnectionState, getApiConnectionState, getApiConnectionState);
	const isBrowserOnline = useBrowserOnlineStatus();
	const isApiUnavailable = mode.connectionMode === "online"
		&& mode.onlineSource === "api"
		&& apiConnectionState.status === "unavailable";
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
	const hasOnlineSuccess = mode.connectionMode === "online"
		&& (mode.onlineSource === "api"
			? apiConnectionState.status === "available" || loadedFrom === "api-snapshot" || Boolean(apiBundle)
			: loadedFrom === "s3-snapshot" || Boolean(s3Bundle));
	const visualState: DataIndicatorVisualState = mode.connectionMode === "offline"
		? "offline"
		: hasOnlineSuccess
			? "online"
			: "online-pending";
	const buttonLabel = mode.connectionMode === "offline" ? "Offline" : "Online";
	const statusDetail = mode.connectionMode === "offline"
		? summary
		: hasOnlineSuccess
			? "Online"
			: "Connection pending";

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
				className={`dataIndicatorButton dataIndicatorButton--${visualState}`}
				onClick={() => setIsOpen((currentOpen) => !currentOpen)}
				aria-expanded={isOpen}
				aria-label={isApiUnavailable && apiConnectionState.lastError ? `${statusDetail}. ${apiConnectionState.lastError}` : statusDetail}
			>
				<DataIndicatorIcon visualState={visualState} loading={visualState === "online-pending"} />
				<span className="dataIndicatorButtonText">{buttonLabel}</span>
			</button>
			{isOpen ? (
				<div className={`footerPopover footerPopover--compactData footerPopover--compactData-${visualState}`}>
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