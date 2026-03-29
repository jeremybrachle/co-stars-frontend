import type { FilterCountSummary } from "../data/filterCounts";
import GameDataFilterPanel from "./GameDataFilterPanel";
import type { GameDataFilters } from "../types";

type GameFilterSettingsDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description: string;
	dataFilters: GameDataFilters;
	actorCountSummary?: FilterCountSummary | null;
	movieCountSummary?: FilterCountSummary | null;
	eyebrow?: string;
	closeLabel?: string;
	editorTitle?: string;
	editorDescription?: string;
	onActorPopularityCutoffChange?: (value: number | null) => void;
	onReleaseYearCutoffChange?: (value: number | null) => void;
};

function GameFilterSettingsDialog({
	isOpen,
	onClose,
	title,
	description,
	dataFilters,
	actorCountSummary,
	movieCountSummary,
	eyebrow = "Filters",
	closeLabel = "Close",
	editorTitle = "Filter controls",
	editorDescription = "Adjust the current actor and movie cutoff rules.",
	onActorPopularityCutoffChange,
	onReleaseYearCutoffChange,
}: GameFilterSettingsDialogProps) {
	if (!isOpen) {
		return null;
	}

	const canEditFilters = Boolean(onActorPopularityCutoffChange && onReleaseYearCutoffChange);

	return (
		<div className="quickPlayDialogOverlay" onClick={onClose}>
			<div className="quickPlayDialog gameFilterDialog" onClick={(event) => event.stopPropagation()}>
				<button type="button" className="quickPlayDialogClose" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
					×
				</button>
				<div className="quickPlaySectionHeader gameFilterDialogHeader">
					<div>
						<div className="pageEyebrow">{eyebrow}</div>
						<h2>{title}</h2>
						<p className="settingsHint gameFilterDialogCopy">{description}</p>
					</div>
				</div>
				{canEditFilters ? (
					<div className="gameFilterDialogBody">
						<GameDataFilterPanel
							dataFilters={dataFilters}
							onActorPopularityCutoffChange={onActorPopularityCutoffChange!}
							onReleaseYearCutoffChange={onReleaseYearCutoffChange!}
							actorCountSummary={actorCountSummary}
							movieCountSummary={movieCountSummary}
							title={editorTitle}
							description={editorDescription}
							hidePerformanceWarnings
							className="gameFilterDialogPanel"
						/>
					</div>
				) : null}
				<div className="quickPlayDialogActions">
					<button type="button" className="settingsActionButton" onClick={onClose}>
						{closeLabel}
					</button>
				</div>
			</div>
		</div>
	);
}

export default GameFilterSettingsDialog;