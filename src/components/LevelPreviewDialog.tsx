import EntityArtwork from "./EntityArtwork";
import type { GameNode } from "../types";

type LevelPreviewAction = {
	label: string;
	onClick: () => void;
	disabled?: boolean;
	variant?: "default" | "primary";
};

type LevelPreviewDetail = {
	label: string;
	value: string;
};

type LevelPreviewDialogProps = {
	isOpen: boolean;
	onClose: () => void;
	closeLabel: string;
	eyebrow: string;
	title: string;
	description: string;
	status: "idle" | "blocked" | "ready";
	message: string;
	startNode: GameNode | null;
	targetNode: GameNode | null;
	pathNodes: GameNode[];
	optimalIntermediates: number | null;
	optimalHops?: number | null;
	details: LevelPreviewDetail[];
	actions: LevelPreviewAction[];
	detailsSummaryLabel?: string;
};

function LevelPreviewDialog({
	isOpen,
	onClose,
	closeLabel,
	eyebrow,
	title,
	description,
	status,
	message,
	startNode,
	targetNode,
	pathNodes,
	optimalIntermediates,
	optimalHops,
	details,
	actions,
	detailsSummaryLabel = "More info",
}: LevelPreviewDialogProps) {
	if (!isOpen) {
		return null;
	}

	return (
		<div className="quickPlayDialogOverlay" onClick={onClose}>
			<div className="quickPlayDialog" onClick={(event) => event.stopPropagation()}>
				<button type="button" className="quickPlayDialogClose" onClick={onClose} aria-label={closeLabel}>
					×
				</button>
				<div className="quickPlaySectionHeader">
					<div>
						<div className="pageEyebrow">{eyebrow}</div>
						<h2>{title}</h2>
						<p className="settingsHint">{description}</p>
					</div>
				</div>
				<div className={`quickPlayPreviewCard quickPlayPreviewCard--${status}`}>
					{startNode && targetNode ? (
						<div className="quickPlayArchiveMatchup quickPlayArchiveMatchup--dialog">
							<div className="quickPlayArchiveNode quickPlayArchiveNode--start">
								<EntityArtwork
									type={startNode.type}
									label={startNode.label}
									imageUrl={startNode.imageUrl}
									className="quickPlayArchiveArtwork quickPlayArchiveArtwork--large"
									imageClassName="quickPlayArchiveArtworkImage"
									placeholderClassName="quickPlayArchiveArtworkFallback"
								/>
								<div>
									<div>{startNode.label}</div>
								</div>
							</div>
							<span className="quickPlayArchiveVs">vs.</span>
							<div className="quickPlayArchiveNode quickPlayArchiveNode--target">
								<EntityArtwork
									type={targetNode.type}
									label={targetNode.label}
									imageUrl={targetNode.imageUrl}
									className="quickPlayArchiveArtwork quickPlayArchiveArtwork--large"
									imageClassName="quickPlayArchiveArtworkImage"
									placeholderClassName="quickPlayArchiveArtworkFallback"
								/>
								<div>
									<div>{targetNode.label}</div>
								</div>
							</div>
						</div>
					) : null}
					{status === "ready" ? (
						<div className="quickPlayPreviewSummary">
							<div className="quickPlayPreviewSummaryBubble">
								<span className="quickPlayPreviewSummaryLabel">Optimal intermediates</span>
								<strong>{optimalIntermediates ?? 0}</strong>
							</div>
						</div>
					) : null}
					{status === "ready" && pathNodes.length > 0 ? (
						<div className="quickPlayPreviewPath">
							<div className="quickPlayPreviewPathTitle">Optimal path</div>
							<div className="quickPlayPreviewPathFlow">
								{pathNodes.map((node, index) => (
									<div key={`${node.type}:${node.id ?? node.label}:${index}`} className="quickPlayPreviewPathSegment">
										<div className={`quickPlayPreviewNode quickPlayPreviewNode--${node.type}`}>
											<EntityArtwork
												type={node.type}
												label={node.label}
												imageUrl={node.imageUrl}
												className="quickPlayPreviewArtwork"
												imageClassName="entityArtwork__image"
												placeholderClassName="entityArtwork__emoji"
											/>
											<span className={`quickPlayPreviewChip quickPlayPreviewChip--${node.type}`}>{node.label}</span>
										</div>
										{index < pathNodes.length - 1 ? <span className="quickPlayPreviewArrow">→</span> : null}
									</div>
								))}
							</div>
						</div>
					) : null}
					{message || optimalHops !== null || details.length > 0 ? (
						<details className="quickPlayPreviewDisclosure">
							<summary className="quickPlayPreviewDisclosureSummary">
								<span>{detailsSummaryLabel}</span>
							</summary>
							<div className="quickPlayPreviewDisclosureBody">
								<div className="quickPlayPreviewHeadline quickPlayPreviewHeadline--subtle">{message}</div>
								{optimalHops !== null && optimalHops !== undefined ? (
									<div className="quickPlayPreviewDisclosureMetric">
										<span className="quickPlayPreviewDetailsLabel">Total hops:</span>
										<span>{optimalHops}</span>
									</div>
								) : null}
								{details.length > 0 ? (
									<ul className="quickPlayPreviewDetails">
										{details.map((detail) => (
											<li key={detail.label} className="quickPlayPreviewDetailsItem">
												<span className="quickPlayPreviewDetailsLabel">{detail.label}:</span>
												<span>{detail.value}</span>
											</li>
										))}
									</ul>
								) : null}
							</div>
						</details>
					) : null}
					<div className="quickPlayDialogActions">
						{actions.map((action) => (
							<button
								key={action.label}
								type="button"
								className={`settingsActionButton${action.variant === "primary" ? " quickPlayPreviewPrimaryAction" : ""}`}
								onClick={action.onClick}
								disabled={action.disabled}
							>
								{action.label}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

export default LevelPreviewDialog;