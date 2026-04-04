import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import EntityDetailsDialog, {
	type EntityDetailsDialogData,
	type EntityDetailsHistoryEntry,
	type EntityDetailsRelatedEntity,
} from "../components/EntityDetailsDialog";
import EntityArtwork from "../components/EntityArtwork";
import LevelPreviewDialog from "../components/LevelPreviewDialog";
import PageNavigationHeader from "../components/PageNavigationHeader";
import {
	buildCatalogDetailDialogData,
	createActorRelations,
	createMovieRelations,
	type CatalogDetailEntry,
} from "../data/catalogEntityDetails";
import { useGameSettings } from "../context/gameSettings";
import { useSnapshotData } from "../context/snapshotData";
import { getDemoSnapshotBundle } from "../data/demoSnapshot";
import { createGameNodeFromSummary } from "../data/localGraph";
import type { GameNode, LevelNode } from "../types";
import { buildLevelStorageKey, readAllLevelHistory, subscribeToLevelHistoryUpdates } from "../utils/levelHistoryStorage";
import { buildCustomLevelLabel, deletePlayerCustomLevel, MAX_PLAYER_CUSTOM_LEVELS, readPlayerCustomLevels, subscribeToPlayerCustomLevels, type CustomLevelDraft } from "../utils/customLevelsStorage";
import { createPreviewPathNodes, hydrateCustomLevelDraft } from "../utils/customLevelPreview";

type ArchiveSortKey = "source" | "matchup" | "type" | "history";
type SortDirection = "asc" | "desc";
type ArchiveSource = "player" | "developer";

type DeveloperArchiveLevel = CustomLevelDraft;

type DeveloperLevelsDocument = {
	"schema-version": number;
	levels: Array<{
		"level-id": string;
		"level-name": string;
		"game-data": Array<{
			"game-id": string;
			"game-type": string;
			startNode: LevelNode;
			targetNode: LevelNode;
		}>;
	}>;
};

const ARCHIVE_ROWS_PER_PAGE = 5;

type ArchiveRow = {
	key: string;
	source: ArchiveSource;
	level: CustomLevelDraft;
	playerLevelId: string | null;
	matchupLabel: string;
	updatedLabel: string;
	historySummary: string;
	historySortValue: number;
	isCompleted: boolean;
	canEdit: boolean;
	canDelete: boolean;
	previewStatus: "idle" | "blocked" | "ready";
	previewMessage: string;
	optimalIntermediates: number | null;
};

function formatNodeTypeLabel(value: CustomLevelDraft["startNode"]["type"]) {
	return value === "actor" ? "Actor" : "Movie";
}

function formatNodePairType(level: Pick<CustomLevelDraft, "startNode" | "targetNode">) {
	return `${formatNodeTypeLabel(level.startNode.type)} vs. ${formatNodeTypeLabel(level.targetNode.type)}`;
}

function formatFilterSummary(level: CustomLevelDraft) {
	const actorCutoff = level.actorPopularityCutoff === null ? "no actor cutoff" : `actor >= ${level.actorPopularityCutoff}`;
	const yearCutoff = level.releaseYearCutoff === null ? "no year cutoff" : `year >= ${level.releaseYearCutoff}`;
	return `${actorCutoff} • ${yearCutoff}`;
}

function formatSavedTimestamp(timestamp: number) {
	return new Date(timestamp).toLocaleString();
}

function compareText(left: string, right: string) {
	return left.localeCompare(right, undefined, { sensitivity: "base" });
}

function getPreviousArchivePage(currentPage: number, pageCount: number) {
	return currentPage <= 1 ? pageCount : currentPage - 1;
}

function getNextArchivePage(currentPage: number, pageCount: number) {
	return currentPage >= pageCount ? 1 : currentPage + 1;
}

function isNodeSummary(value: unknown): value is CustomLevelDraft["startNode"] {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return typeof candidate.id === "number" && typeof candidate.label === "string" && (candidate.type === "actor" || candidate.type === "movie");
}

function isCustomLevelDraft(value: unknown): value is CustomLevelDraft {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return isNodeSummary(candidate.startNode)
		&& isNodeSummary(candidate.targetNode)
		&& (candidate.actorPopularityCutoff === null || typeof candidate.actorPopularityCutoff === "number")
		&& (candidate.releaseYearCutoff === null || typeof candidate.releaseYearCutoff === "number")
		&& (candidate.optimalHops === null || typeof candidate.optimalHops === "number")
		&& Array.isArray(candidate.optimalPath);
}

function isLevelNode(value: unknown): value is LevelNode {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	return typeof candidate.label === "string"
		&& (candidate.type === "actor" || candidate.type === "movie")
		&& (candidate.id === undefined || typeof candidate.id === "number");
}

function isDeveloperLevelsDocument(value: unknown): value is DeveloperLevelsDocument {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Record<string, unknown>;
	if (typeof candidate["schema-version"] !== "number" || !Array.isArray(candidate.levels)) {
		return false;
	}

	return candidate.levels.every((levelGroup) => {
		if (!levelGroup || typeof levelGroup !== "object") {
			return false;
		}

		const levelGroupCandidate = levelGroup as Record<string, unknown>;
		return typeof levelGroupCandidate["level-id"] === "string"
			&& typeof levelGroupCandidate["level-name"] === "string"
			&& Array.isArray(levelGroupCandidate["game-data"])
			&& (levelGroupCandidate["game-data"] as unknown[]).every((game) => {
				if (!game || typeof game !== "object") {
					return false;
				}

				const gameCandidate = game as Record<string, unknown>;
				return typeof gameCandidate["game-id"] === "string"
					&& typeof gameCandidate["game-type"] === "string"
					&& isLevelNode(gameCandidate.startNode)
					&& isLevelNode(gameCandidate.targetNode);
			});
	});
}

function mapGroupedDeveloperLevels(document: DeveloperLevelsDocument): DeveloperArchiveLevel[] {
	return document.levels.flatMap((levelGroup) => levelGroup["game-data"].map((game) => ({
		startNode: {
			id: game.startNode.id ?? -1,
			type: game.startNode.type,
			label: game.startNode.label,
		},
		targetNode: {
			id: game.targetNode.id ?? -1,
			type: game.targetNode.type,
			label: game.targetNode.label,
		},
		actorPopularityCutoff: null,
		releaseYearCutoff: null,
		optimalHops: null,
		optimalPath: [],
	})));
}

function getCatalogDetailEntry(node: CustomLevelDraft["startNode"], indexes: ReturnType<typeof getDemoSnapshotBundle>["indexes"]): CatalogDetailEntry | null {
	if (node.type === "actor") {
		const actor = indexes.actorsById.get(node.id);
		return actor ? { type: "actor", item: actor } : null;
	}

	const movie = indexes.moviesById.get(node.id);
	return movie ? { type: "movie", item: movie } : null;
}

function LevelArchivePage() {
	const navigate = useNavigate();
	const { indexes } = useSnapshotData();
	const previewIndexes = indexes ?? getDemoSnapshotBundle().indexes;
	const { setActorPopularityCutoff, setReleaseYearCutoff } = useGameSettings();
	const playerLevels = useSyncExternalStore(subscribeToPlayerCustomLevels, readPlayerCustomLevels, readPlayerCustomLevels);
	const levelHistory = useSyncExternalStore(subscribeToLevelHistoryUpdates, readAllLevelHistory, readAllLevelHistory);
	const [developerLevels, setDeveloperLevels] = useState<DeveloperArchiveLevel[]>([]);
	const [developerLevelsError, setDeveloperLevelsError] = useState<string | null>(null);
	const [sortKey, setSortKey] = useState<ArchiveSortKey>("source");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [currentPage, setCurrentPage] = useState(1);
	const [previewKey, setPreviewKey] = useState<string | null>(null);
	const [detailTrail, setDetailTrail] = useState<CatalogDetailEntry[]>([]);
	const [detailRelationSearch, setDetailRelationSearch] = useState("");

	useEffect(() => {
		let isMounted = true;

		const loadDeveloperLevels = async () => {
			try {
				const response = await fetch(`${import.meta.env.BASE_URL}data/developer-levels.json`);
				if (!response.ok) {
					throw new Error("Developer level JSON could not be loaded.");
				}

				const json = await response.json();
				const parsed = Array.isArray(json)
					? json.filter(isCustomLevelDraft)
					: isDeveloperLevelsDocument(json)
					? mapGroupedDeveloperLevels(json)
					: [];
				if (isMounted) {
					setDeveloperLevels(parsed);
					setDeveloperLevelsError(null);
				}
			} catch (error) {
				if (isMounted) {
					setDeveloperLevels([]);
					setDeveloperLevelsError(error instanceof Error ? error.message : "Developer levels could not be loaded.");
				}
			}
		};

		void loadDeveloperLevels();

		return () => {
			isMounted = false;
		};
	}, []);

	const archiveUsageLabel = useMemo(
		() => `${playerLevels.length}/${MAX_PLAYER_CUSTOM_LEVELS} player slots used`,
		[playerLevels.length],
	);
	const archiveRows = useMemo<ArchiveRow[]>(() => {
		const buildHistorySummary = (level: CustomLevelDraft) => {
			const historyRecord = levelHistory[buildLevelStorageKey(level.startNode, level.targetNode)] ?? null;
			const bestScore = historyRecord?.attempts.reduce((highestScore, attempt) => Math.max(highestScore, attempt.score), Number.NEGATIVE_INFINITY);
			const isCompleted = Boolean(historyRecord && historyRecord.attempts.length > 0);

			return {
				historySummary: isCompleted ? `Best score ${bestScore}` : "Not completed",
				historySortValue: isCompleted ? bestScore : Number.NEGATIVE_INFINITY,
				isCompleted,
			};
		};
		const buildResolvedPreview = (level: CustomLevelDraft) => hydrateCustomLevelDraft(level, previewIndexes);

		const developerRows = developerLevels.map((level, index) => {
			const resolved = buildResolvedPreview(level);

			return {
				...buildHistorySummary(resolved.level),
				key: `developer-${index}`,
				source: "developer" as const,
				level: resolved.level,
				playerLevelId: null,
				matchupLabel: buildCustomLevelLabel(resolved.level),
				updatedLabel: "Project JSON",
				canEdit: false,
				canDelete: false,
				previewStatus: resolved.preview.status,
				previewMessage: resolved.preview.message,
				optimalIntermediates: resolved.preview.intermediates,
			};
		});
		const playerRows = playerLevels.map((level) => {
			const resolved = buildResolvedPreview(level);

			return {
				...buildHistorySummary(resolved.level),
				key: `player-${level.id}`,
				source: "player" as const,
				level: resolved.level,
				playerLevelId: level.id,
				matchupLabel: buildCustomLevelLabel(resolved.level),
				updatedLabel: formatSavedTimestamp(level.updatedAt),
				canEdit: true,
				canDelete: true,
				previewStatus: resolved.preview.status,
				previewMessage: resolved.preview.message,
				optimalIntermediates: resolved.preview.intermediates,
			};
		});

		return [...developerRows, ...playerRows];
	}, [developerLevels, levelHistory, playerLevels, previewIndexes]);
	const sortedRows = useMemo(() => {
		const rows = [...archiveRows];
		const directionMultiplier = sortDirection === "asc" ? 1 : -1;

		rows.sort((left, right) => {
			let comparison = 0;

			if (sortKey === "source") {
				comparison = compareText(left.source, right.source);
			}

			if (sortKey === "matchup") {
				comparison = compareText(left.matchupLabel, right.matchupLabel);
			}

			if (sortKey === "type") {
				comparison = compareText(formatNodePairType(left.level), formatNodePairType(right.level));
			}

			if (sortKey === "history") {
				comparison = Number(right.isCompleted) - Number(left.isCompleted);
				if (comparison === 0) {
					comparison = left.historySortValue - right.historySortValue;
				}
				if (comparison === 0) {
					comparison = compareText(left.historySummary, right.historySummary);
				}
			}

			if (comparison === 0) {
				comparison = compareText(left.matchupLabel, right.matchupLabel);
			}

			return comparison * directionMultiplier;
		});

		return rows;
	}, [archiveRows, sortDirection, sortKey]);
	const pageCount = Math.max(1, Math.ceil(sortedRows.length / ARCHIVE_ROWS_PER_PAGE));
	const paginatedRows = useMemo(() => {
		const startIndex = (currentPage - 1) * ARCHIVE_ROWS_PER_PAGE;
		return sortedRows.slice(startIndex, startIndex + ARCHIVE_ROWS_PER_PAGE);
	}, [currentPage, sortedRows]);
	const placeholderRowCount = Math.max(0, ARCHIVE_ROWS_PER_PAGE - paginatedRows.length);
	const previewRow = useMemo(
		() => previewKey ? archiveRows.find((row) => row.key === previewKey) ?? null : null,
		[archiveRows, previewKey],
	);
	const previewPathNodes = useMemo(
		() => previewRow ? createPreviewPathNodes(previewRow.level.optimalPath, previewIndexes) : [],
		[previewIndexes, previewRow],
	);
	const activeDetail = detailTrail.length > 0 ? detailTrail[detailTrail.length - 1] : null;
	const detailRelatedEntities = useMemo<EntityDetailsRelatedEntity[]>(() => {
		if (!activeDetail) {
			return [];
		}

		return activeDetail.type === "actor"
			? createActorRelations(activeDetail.item, previewIndexes)
			: createMovieRelations(activeDetail.item, previewIndexes);
	}, [activeDetail, previewIndexes]);
	const detailDialogData = useMemo<EntityDetailsDialogData | null>(
		() => (activeDetail ? buildCatalogDetailDialogData(activeDetail, detailRelatedEntities.length) : null),
		[activeDetail, detailRelatedEntities.length],
	);
	const detailHistory = useMemo<EntityDetailsHistoryEntry[]>(
		() => detailTrail.map((entry) => ({
			key: `${entry.type}-${entry.item.id}`,
			type: entry.type,
			label: entry.type === "actor" ? entry.item.name : entry.item.title,
		})),
		[detailTrail],
	);

	const handleDelete = (levelId: string) => {
		deletePlayerCustomLevel(levelId);
		setPreviewKey((currentKey) => currentKey === `player-${levelId}` ? null : currentKey);
	};

	useEffect(() => {
		setCurrentPage(1);
	}, [sortDirection, sortKey]);

	useEffect(() => {
		if (currentPage > pageCount) {
			setCurrentPage(pageCount);
		}
	}, [currentPage, pageCount]);

	const launchLevel = (level: CustomLevelDraft, options?: { levelId?: string | null; returnTo?: string }) => {
		setActorPopularityCutoff(level.actorPopularityCutoff);
		setReleaseYearCutoff(level.releaseYearCutoff);
		navigate("/game", {
			state: {
				returnTo: options?.returnTo ?? "/level-archive",
				startA: level.startNode,
				startB: level.targetNode,
				optimalHops: level.optimalHops,
				optimalPath: level.optimalPath,
				customLevelId: options?.levelId ?? null,
				customLevelDraft: level,
			},
		});
	};

	const openEntityDetails = (node: CustomLevelDraft["startNode"] | null) => {
		if (!node) {
			return;
		}

		const entry = getCatalogDetailEntry(node, previewIndexes);
		if (!entry) {
			return;
		}

		setDetailTrail([entry]);
		setDetailRelationSearch("");
	};

	const handleOpenRelatedEntity = (entity: EntityDetailsRelatedEntity) => {
		const entry = getCatalogDetailEntry({ id: entity.id, type: entity.type, label: entity.label }, previewIndexes);
		if (!entry) {
			return;
		}

		setDetailTrail((current) => [...current, entry]);
		setDetailRelationSearch("");
	};

	const handleNavigateDetailHistory = (index: number) => {
		setDetailTrail((current) => current.slice(0, index + 1));
		setDetailRelationSearch("");
	};

	const handleSort = (nextSortKey: ArchiveSortKey) => {
		if (sortKey === nextSortKey) {
			setSortDirection((currentDirection) => currentDirection === "asc" ? "desc" : "asc");
			return;
		}

		setSortKey(nextSortKey);
		setSortDirection("asc");
	};

	const resolveArchiveNode = (node: CustomLevelDraft["startNode"]): GameNode => createGameNodeFromSummary(node, previewIndexes);
	const paginationLabel = sortedRows.length === 0
		? "0 levels"
		: `${(currentPage - 1) * ARCHIVE_ROWS_PER_PAGE + 1}-${Math.min(currentPage * ARCHIVE_ROWS_PER_PAGE, sortedRows.length)} of ${sortedRows.length}`;
	const goToPreviousPage = () => {
		setCurrentPage((current) => getPreviousArchivePage(current, pageCount));
	};
	const goToNextPage = () => {
		setCurrentPage((current) => getNextArchivePage(current, pageCount));
	};
	const renderPaginationControls = (position: "top" | "bottom") => {
		if (pageCount <= 1) {
			return null;
		}

		return (
			<div className={`quickPlayArchivePaginationControls quickPlayArchivePaginationControls--${position}`}>
				<button type="button" className="settingsActionButton settingsActionButton--compact" onClick={goToPreviousPage}>
					Previous
				</button>
				<span className="quickPlayArchivePageIndicator">Page {currentPage} / {pageCount}</span>
				<button type="button" className="settingsActionButton settingsActionButton--compact" onClick={goToNextPage}>
					Next
				</button>
			</div>
		);
	};
	return (
		<div className="settingsPage quickPlayWorkspace">
			<PageNavigationHeader backTo="/play-now" backLabel="Back" />
			<div className="settingsPanel quickPlayPanel">
				<div className="quickPlayPanelHeader">
					<div className="quickPlayPanelHeaderTop">
						<div>
							<div className="pageEyebrow">Play Now</div>
							<h1>Level Archive</h1>
						</div>
						<div className="quickPlayPanelHeaderActions quickPlayPanelHeaderActions--stacked">
							<Link to="/quick-play" className="settingsActionButton quickPlayArchiveCreateButton">Open Level Creator</Link>
							<div className="quickPlayToolbarStatus quickPlayToolbarStatus--header">{archiveUsageLabel}</div>
						</div>
					</div>
					<p className="pageLead">Browse the local developer JSON levels and the custom levels saved from quick play. Preview a row first, then decide whether to play, edit, or delete it.</p>
					{developerLevelsError ? <p className="pageStatus pageStatus--error">{developerLevelsError}</p> : null}
				</div>

				<div className="settingsPanelScrollArea quickPlayPanelScrollArea">
					<section className="quickPlaySection quickPlaySection--archive">
						<div className="quickPlaySectionHeader">
							<div>
								<h2>Archive Table</h2>
								<p className="settingsHint">Sort the table by source, matchup, or history, then preview or launch any level without leaving the archive list.</p>
							</div>
							<div className="quickPlayArchiveTableToolbar">
								<div className="quickPlayArchivePaginationCluster">
									<span className="quickPlayArchivePaginationStatus">{paginationLabel}</span>
								</div>
							</div>
						</div>
						{sortedRows.length === 0 ? (
							<div className="placeholderPanel">
								<h2>No levels in this filter yet</h2>
								<p className="placeholderCopy">Switch filters or create a quick play level to populate the player archive.</p>
							</div>
						) : (
							<div className="quickPlayArchiveTableWrap">
								<table className="quickPlayArchiveTable">
									<colgroup>
										<col className="quickPlayArchiveCol quickPlayArchiveCol--source" />
										<col className="quickPlayArchiveCol quickPlayArchiveCol--matchup" />
										<col className="quickPlayArchiveCol quickPlayArchiveCol--type" />
										<col className="quickPlayArchiveCol quickPlayArchiveCol--completed" />
										<col className="quickPlayArchiveCol quickPlayArchiveCol--actions" />
									</colgroup>
									<thead>
										<tr>
											<th aria-sort={sortKey === "source" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
												<button type="button" className="quickPlayArchiveSortButton" onClick={() => handleSort("source")}>
													Source
													<span className="quickPlayArchiveSortGlyph" aria-hidden="true">{sortKey === "source" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
												</button>
											</th>
											<th aria-sort={sortKey === "matchup" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
												<button type="button" className="quickPlayArchiveSortButton" onClick={() => handleSort("matchup")}>
													Matchup
													<span className="quickPlayArchiveSortGlyph" aria-hidden="true">{sortKey === "matchup" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
												</button>
											</th>
											<th aria-sort={sortKey === "type" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
												<button type="button" className="quickPlayArchiveSortButton" onClick={() => handleSort("type")}>
													Type
													<span className="quickPlayArchiveSortGlyph" aria-hidden="true">{sortKey === "type" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
												</button>
											</th>
											<th aria-sort={sortKey === "history" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
												<button type="button" className="quickPlayArchiveSortButton" onClick={() => handleSort("history")}>
													Completed
													<span className="quickPlayArchiveSortGlyph" aria-hidden="true">{sortKey === "history" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}</span>
												</button>
											</th>
												<th className="quickPlayArchiveActionsHeader">Actions</th>
										</tr>
									</thead>
									<tbody>
										{paginatedRows.map((row) => {
											const startNode = resolveArchiveNode(row.level.startNode);
											const targetNode = resolveArchiveNode(row.level.targetNode);

											return (
											<tr key={row.key} className={`${previewRow?.key === row.key ? "quickPlayArchiveTableRow quickPlayArchiveTableRow--active" : "quickPlayArchiveTableRow"}${row.isCompleted ? " quickPlayArchiveTableRow--completed" : ""}`}>
												<td className="quickPlayArchiveSourceCell">
													<div className="quickPlayArchiveSourceStack">
														<span className={`quickPlayArchiveBadge ${row.source === "developer" ? "quickPlayArchiveBadge--developer" : "quickPlayArchiveBadge--player"}`}>
															{row.source === "developer" ? "Developer" : "Player"}
														</span>
														{row.source === "player" ? (
															<div className="quickPlayArchiveSourceManageActions">
																{row.canEdit ? (
																	<button type="button" className="settingsActionButton settingsActionButton--compact quickPlayRowActionButton quickPlayRowActionButton--icon quickPlayRowActionButton--sourceManage" onClick={() => navigate(`/quick-play?levelId=${encodeURIComponent(row.playerLevelId ?? "")}`)} aria-label="Edit level" title="Edit level">
																		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="quickPlayRowActionIcon">
																			<path d="M4 20l3.5-.8L18 8.7 15.3 6 4.8 16.5 4 20z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
																			<path d="M13.9 7.4l2.7 2.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
																		</svg>
																	</button>
																) : null}
																{row.canDelete ? (
																	<button type="button" className="settingsActionButton settingsActionButton--compact quickPlayRowActionButton quickPlayRowActionButton--icon quickPlayRowActionButton--sourceManage" onClick={() => handleDelete(row.playerLevelId ?? "") } aria-label="Delete level" title="Delete level">
																		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="quickPlayRowActionIcon">
																			<path d="M5 7h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
																			<path d="M9 7V5.8c0-.4.3-.8.8-.8h4.4c.5 0 .8.4.8.8V7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
																			<path d="M7.8 7l.7 11.2c0 .4.3.8.8.8h5.4c.5 0 .8-.4.8-.8L17 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
																			<path d="M10 10.5v5.2M14 10.5v5.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
																		</svg>
																	</button>
																) : null}
															</div>
														) : null}
													</div>
												</td>
												<td className="quickPlayArchiveLevelCell">
													<div className="quickPlayArchiveMatchup">
														<div className="quickPlayArchiveNode quickPlayArchiveNode--start">
															<button
																type="button"
																className="quickPlayArtworkButton"
																onClick={() => openEntityDetails(row.level.startNode)}
																aria-label={`Open details for ${row.level.startNode.label}`}
																title={`Open details for ${row.level.startNode.label}`}
															>
																<EntityArtwork
																	type={startNode.type}
																	label={startNode.label}
																	imageUrl={startNode.imageUrl}
																	className="quickPlayArchiveArtwork"
																	imageClassName="quickPlayArchiveArtworkImage"
																	placeholderClassName="quickPlayArchiveArtworkFallback"
																/>
															</button>
															<div>
																	<div>{row.level.startNode.label}</div>
															</div>
														</div>
														<span className="quickPlayArchiveVs">vs.</span>
														<div className="quickPlayArchiveNode quickPlayArchiveNode--target">
															<button
																type="button"
																className="quickPlayArtworkButton"
																onClick={() => openEntityDetails(row.level.targetNode)}
																aria-label={`Open details for ${row.level.targetNode.label}`}
																title={`Open details for ${row.level.targetNode.label}`}
															>
																<EntityArtwork
																	type={targetNode.type}
																	label={targetNode.label}
																	imageUrl={targetNode.imageUrl}
																	className="quickPlayArchiveArtwork"
																	imageClassName="quickPlayArchiveArtworkImage"
																	placeholderClassName="quickPlayArchiveArtworkFallback"
																/>
															</button>
															<div>
																	<div>{row.level.targetNode.label}</div>
															</div>
														</div>
													</div>
												</td>
													<td className="quickPlayArchiveTypeCell">{formatNodePairType(row.level).toLowerCase()}</td>
												<td className="quickPlayArchiveCompletedCell" title={row.historySummary}>
														{row.isCompleted ? <span className="quickPlayArchiveCompletedTrophy" aria-label="Completed" role="img">🏆</span> : null}
												</td>
												<td className="quickPlayRowActionsCell">
													<div className="quickPlayRowActions">
														<button type="button" className="settingsActionButton settingsActionButton--compact quickPlayRowActionButton quickPlayRowActionButton--preview" onClick={() => setPreviewKey(row.key)}>
															Preview
														</button>
														<button type="button" className="settingsActionButton settingsActionButton--compact quickPlayRowActionButton quickPlayRowActionButton--play" onClick={() => launchLevel(row.level, { levelId: row.playerLevelId })}>
															Play Now
														</button>
													</div>
												</td>
											</tr>
											);
										})}
									{Array.from({ length: placeholderRowCount }, (_, index) => (
										<tr
											key={`archive-placeholder-${index}`}
											aria-hidden="true"
											className="quickPlayArchiveTableRow quickPlayArchiveTableRow--placeholder"
										>
											<td colSpan={5} className="quickPlayArchivePlaceholderCell" />
										</tr>
									))}
									</tbody>
								</table>
								{renderPaginationControls("bottom")}
							</div>
						)}
					</section>

					<div className="settingsPanelFooter quickPlayFooter">
						<Link to="/play-now" className="settingsBackLink">Back to Play Now</Link>
					</div>
				</div>
			</div>
			<LevelPreviewDialog
				isOpen={previewRow !== null}
				onClose={() => setPreviewKey(null)}
				closeLabel="Close archive preview"
				eyebrow="Archive Preview"
				title={previewRow ? buildCustomLevelLabel(previewRow.level) : "Archive Preview"}
				description="Focus on the optimal intermediate count and the stored route preview before you launch the board."
				status={previewRow?.previewStatus ?? "idle"}
				message={previewRow?.previewMessage ?? "Choose a row to preview the level."}
				startNode={previewRow ? resolveArchiveNode(previewRow.level.startNode) : null}
				targetNode={previewRow ? resolveArchiveNode(previewRow.level.targetNode) : null}
				pathNodes={previewPathNodes}
				optimalIntermediates={previewRow?.optimalIntermediates ?? null}
				optimalHops={previewRow?.level.optimalHops ?? null}
				detailsSummaryLabel="Show more details"
				details={previewRow ? [
					{ label: "Source", value: previewRow.source === "developer" ? "Developer JSON" : "Player archive" },
					{ label: "Pairing mode", value: formatNodePairType(previewRow.level) },
					{ label: "Filters", value: formatFilterSummary(previewRow.level) },
					{ label: "History", value: previewRow.historySummary },
				] : []}
				onNodeSelect={(node) => {
					if (node.id === undefined) {
						return;
					}

					openEntityDetails({ id: node.id, type: node.type, label: node.label });
				}}
				actions={previewRow ? [
					{ label: "Play now", onClick: () => launchLevel(previewRow.level, { levelId: previewRow.playerLevelId }), variant: "primary" as const },
				] : []}
			/>
			<EntityDetailsDialog
				detail={detailDialogData}
				history={detailHistory}
				relationSearch={detailRelationSearch}
				relatedEntities={detailRelatedEntities}
				isLoading={false}
				errorMessage={null}
				onClose={() => {
					setDetailTrail([]);
					setDetailRelationSearch("");
				}}
				onRelationSearchChange={setDetailRelationSearch}
				onOpenRelatedEntity={handleOpenRelatedEntity}
				onNavigateHistory={handleNavigateDetailHistory}
			/>
		</div>
	);
}

export default LevelArchivePage;