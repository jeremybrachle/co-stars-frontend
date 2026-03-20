import { useEffect, useMemo, useRef, useState } from "react";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { getDataIndicatorLabel, getDataIndicatorVariant } from "../data/dataSourcePreferences";
import { useBrowserOnlineStatus } from "../hooks/useBrowserOnlineStatus";
import DataSettingsPanel from "./DataSettingsPanel";
import type { DataIndicatorVariant } from "../types";

const VARIANT_ICONS: Record<DataIndicatorVariant, string> = {
	"online-snapshot": "⚡",
	"online-api": "📡",
	"offline-snapshot": "💾",
	"offline-demo": "🎭",
};

function DataIndicatorIcon({ variant, loading }: { variant: DataIndicatorVariant; loading: boolean }) {
	return (
		<span className={`dataIndicatorIcon${loading ? " dataIndicatorIcon--pulse" : ""}`} aria-hidden="true">
			{VARIANT_ICONS[variant]}
		</span>
	);
}

function DataIndicator() {
	const [isOpen, setIsOpen] = useState(false);
	const rootRef = useRef<HTMLDivElement | null>(null);
	const { mode } = useDataSourceMode();
	const { snapshot, isLoading } = useSnapshotData();
	const isBrowserOnline = useBrowserOnlineStatus();
	const variant = useMemo(
		() => getDataIndicatorVariant({
			mode,
			isBrowserOnline,
			hasSnapshot: !!snapshot,
			isSnapshotLoading: isLoading,
		}),
		[isBrowserOnline, isLoading, mode, snapshot],
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
				aria-label={summary}
			>
				<DataIndicatorIcon variant={variant} loading={isLoading && mode.connectionMode === "online" && mode.onlineSource === "snapshot"} />
				<span className="dataIndicatorButtonText">Data</span>
			</button>
			{isOpen ? (
				<div className="footerPopover footerPopover--compactData">
					<div className="footerPopoverHeader">
						<a href="/settings?tab=data-settings" className="footerPopoverHeaderLink" title="Open advanced data settings">
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