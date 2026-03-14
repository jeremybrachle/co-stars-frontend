import { useEffect, useMemo, useRef, useState } from "react";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { getDataIndicatorDescription, getDataIndicatorLabel, getDataIndicatorVariant } from "../data/dataSourcePreferences";
import { useBrowserOnlineStatus } from "../hooks/useBrowserOnlineStatus";
import DataIndicatorGlyph from "./DataIndicatorGlyph";
import DataSettingsPanel from "./DataSettingsPanel";

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
	const description = getDataIndicatorDescription({
		mode,
		isBrowserOnline,
		hasSnapshot: !!snapshot,
		isSnapshotLoading: isLoading,
	});

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
		<div className="dataIndicator" ref={rootRef}>
			<button
				type="button"
				className={`dataIndicatorButton dataIndicatorButton--${variant}`}
				onClick={() => setIsOpen((currentOpen) => !currentOpen)}
				aria-expanded={isOpen}
				aria-label={summary}
			>
				<DataIndicatorGlyph variant={variant} pulse={isLoading && mode.connectionMode === "online" && mode.onlineSource === "snapshot"} />
				<span className="dataIndicatorButtonText">Data</span>
			</button>
			<div className="dataIndicatorTooltip" role="tooltip">
				<strong>{summary}</strong>
				<span>{description}</span>
			</div>
			{isOpen ? (
				<div className="footerPopover footerPopover--wide">
					<div className="footerPopoverHeader">
						<h3>Data controls</h3>
						<button type="button" className="footerPopoverClose" onClick={() => setIsOpen(false)} aria-label="Close data controls">×</button>
					</div>
					<DataSettingsPanel layout="popover" showHeading={false} />
				</div>
			) : null}
		</div>
	);
}

export default DataIndicator;