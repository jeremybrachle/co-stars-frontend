import { useEffect, useMemo, useState } from "react";
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
	onNodeSelect?: (node: GameNode) => void;
};


function resolvePreviewRowPattern(viewportWidth: number, pathLength: number) {
	if (pathLength <= 1) {
		return { firstRowCount: 1, subsequentRowCount: 1 };
	}

	if (viewportWidth < 640) {
		return { firstRowCount: Math.min(2, pathLength), subsequentRowCount: Math.min(2, pathLength) };
	}

	if (viewportWidth < 1180) {
		return { firstRowCount: Math.min(3, pathLength), subsequentRowCount: Math.min(2, pathLength) };
	}

	if (viewportWidth < 1480) {
		return { firstRowCount: Math.min(3, pathLength), subsequentRowCount: Math.min(3, pathLength) };
	}

	return { firstRowCount: Math.min(4, pathLength), subsequentRowCount: Math.min(3, pathLength) };
}

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
	onNodeSelect,
}: LevelPreviewDialogProps) {
	const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));

	useEffect(() => {
		if (typeof window === "undefined") {
			return undefined;
		}

		const handleResize = () => {
			setViewportWidth(window.innerWidth);
		};

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const { firstRowCount, subsequentRowCount } = resolvePreviewRowPattern(viewportWidth, pathNodes.length);
	const pathRows = useMemo(() => {
		const rows: Array<{
			nodes: GameNode[];
			direction: "forward" | "reverse";
			hasTurn: boolean;
		}> = [];
		let startIndex = 0;

		while (startIndex < pathNodes.length) {
			const rowIndex = rows.length;
			const rowSize = rowIndex === 0 ? firstRowCount : subsequentRowCount;
			const slice = pathNodes.slice(startIndex, startIndex + rowSize);
			const direction = rowIndex % 2 === 0 ? "forward" : "reverse";
			rows.push({
				nodes: direction === "forward" ? slice : [...slice].reverse(),
				direction,
				hasTurn: startIndex + rowSize < pathNodes.length,
			});
			startIndex += rowSize;
		}

		return rows;
	}, [firstRowCount, pathNodes, subsequentRowCount]);

	if (!isOpen) {
		return null;
	}

	const handleNodeSelect = (node: GameNode) => {
		if (!onNodeSelect) {
			return;
		}

		onNodeSelect(node);
	};

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
								<button type="button" className="quickPlayArtworkButton quickPlayArtworkButton--dialog" aria-label={startNode.label} disabled={!onNodeSelect} onClick={() => handleNodeSelect(startNode)}>
									<EntityArtwork
										type={startNode.type}
										label={startNode.label}
										imageUrl={startNode.imageUrl}
										className="quickPlayArchiveArtwork quickPlayArchiveArtwork--large"
										imageClassName="quickPlayArchiveArtworkImage"
										placeholderClassName="quickPlayArchiveArtworkFallback"
									/>
								</button>
								<div>
									<div>{startNode.label}</div>
								</div>
							</div>
							<span className="quickPlayArchiveVs">vs.</span>
							<div className="quickPlayArchiveNode quickPlayArchiveNode--target">
								<button type="button" className="quickPlayArtworkButton quickPlayArtworkButton--dialog" aria-label={targetNode.label} disabled={!onNodeSelect} onClick={() => handleNodeSelect(targetNode)}>
									<EntityArtwork
										type={targetNode.type}
										label={targetNode.label}
										imageUrl={targetNode.imageUrl}
										className="quickPlayArchiveArtwork quickPlayArchiveArtwork--large"
										imageClassName="quickPlayArchiveArtworkImage"
										placeholderClassName="quickPlayArchiveArtworkFallback"
									/>
								</button>
								<div>
									<div>{targetNode.label}</div>
								</div>
							</div>
						</div>
					) : null}
					{status === "ready" && pathNodes.length > 0 ? (
						<div className="quickPlayPreviewPath">
							<div className="quickPlayPreviewPathTitle quickPlayPreviewPathTitle--inline">
								<span>Optimal Path:</span>
								<strong>{optimalIntermediates ?? 0}</strong>
							</div>
							<div className="quickPlayPreviewPathFlow">
								{pathRows.map((row, rowIndex) => (
									<div key={`preview-row-${rowIndex}`} className="quickPlayPreviewPathRowWrap">
										<div className={`quickPlayPreviewPathRow quickPlayPreviewPathRow--${row.direction}`}>
											{row.nodes.map((node, nodeIndex) => (
												<div key={`${node.type}:${node.id ?? node.label}:${rowIndex}:${nodeIndex}`} className="quickPlayPreviewPathStep">
													<button type="button" className={`quickPlayPreviewNode quickPlayPreviewNode--${node.type}`} aria-label={node.label} disabled={!onNodeSelect} onClick={() => handleNodeSelect(node)}>
														<EntityArtwork
															type={node.type}
															label={node.label}
															imageUrl={node.imageUrl}
															className="quickPlayPreviewArtwork"
															imageClassName="entityArtwork__image"
															placeholderClassName="entityArtwork__emoji"
														/>
														<span className={`quickPlayPreviewChip quickPlayPreviewChip--${node.type}`}>{node.label}</span>
													</button>
													{nodeIndex < row.nodes.length - 1 ? (
														<div className="quickPlayPreviewConnector" aria-hidden="true">
															<span className="quickPlayPreviewConnectorLine" />
															<span className="quickPlayPreviewArrow">{row.direction === "forward" ? "→" : "←"}</span>
														</div>
													) : null}
												</div>
											))}
										</div>
										{row.hasTurn ? <div className={`quickPlayPreviewPathTurn quickPlayPreviewPathTurn--${row.direction}`} aria-hidden="true" /> : null}
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