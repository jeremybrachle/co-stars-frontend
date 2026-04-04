import { useCountdownTimer } from "../context/useCountdownTimer";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LevelCard from "../components/LevelCard";
import FullDataWaitingMessage from "../components/FullDataWaitingMessage";
import PageNavigationHeader from "../components/PageNavigationHeader";
import { fetchActors, fetchLevels, fetchMovies, generatePath } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { resolveBoardThemeVariant, useGameSettings } from "../context/gameSettings";
import { useSnapshotData } from "../context/snapshotData";
import { isOfflineDemoMode, isOnlineApiMode } from "../data/dataSourcePreferences";
import { getDemoSnapshotBundle } from "../data/demoSnapshot";
import { findNodeByLabel, generateLocalPath } from "../data/localGraph";
import type { Actor, BoardThemePalette, Level, LevelGroup, LevelNode, Movie, SnapshotIndexes } from "../types";
import {
	isLevelCompleted,
	readCompletedLevels,
	subscribeToLevelCompletionUpdates,
	type CompletedLevelsCollection,
} from "../utils/levelCompletionStorage";
import {
	getLevelHistory,
	readAllLevelHistory,
	subscribeToLevelHistoryUpdates,
	type LevelHistoryCollection,
} from "../utils/levelHistoryStorage";
import styles from "./AdventurePage.module.css";

const DEMO_BUNDLE = getDemoSnapshotBundle();
const LEVEL_GROUPS_PER_PAGE = 4;

type AdventurePageRouteState = {
	autoStartLevelIndex?: number;
	focusLevelIndex?: number;
	autoStartLevel?: {
		groupId: string;
		gameIndex: number;
	};
	focusLevel?: {
		groupId: string;
		gameIndex?: number;
	};
};

function normalizeName(value: string) {
	return value.trim().toLocaleLowerCase();
}

function buildEndpointImageKey(type: LevelNode["type"], label: string) {
	return `${type}:${normalizeName(label)}`;
}

function buildEntityImageMap(actors: Actor[], movies: Movie[]) {
	return {
		...Object.fromEntries(actors.map((actor) => [buildEndpointImageKey("actor", actor.name), actor.profileUrl ?? null])),
		...Object.fromEntries(movies.map((movie) => [buildEndpointImageKey("movie", movie.title), movie.posterUrl ?? null])),
	};
}

function buildEntityImageMapFromIndexes(snapshotIndexes: SnapshotIndexes) {
	return buildEntityImageMap(
		Array.from(snapshotIndexes.actorsById.values()),
		Array.from(snapshotIndexes.moviesById.values()),
	);
}

function resolveSnapshotNode(node: LevelNode, snapshotIndexes: SnapshotIndexes) {
	if (node.id !== undefined) {
		const indexedNode = node.type === "actor"
			? snapshotIndexes.actorsById.get(node.id)
			: snapshotIndexes.moviesById.get(node.id);
		if (indexedNode) {
			return {
				id: node.id,
				type: node.type,
				label: node.label,
			};
		}
	}

	return findNodeByLabel(node.label, node.type, snapshotIndexes);
}

function hydrateLevel(level: Level, snapshotIndexes: SnapshotIndexes) {
	const startNode = resolveSnapshotNode(level.startNode, snapshotIndexes);
	const targetNode = resolveSnapshotNode(level.targetNode, snapshotIndexes);

	if (!startNode || !targetNode) {
		return {
			...level,
			optimalHops: null,
			optimalPath: undefined,
		} satisfies Level;
	}

	const optimalPath = generateLocalPath(startNode, targetNode, snapshotIndexes);

	return {
		...level,
		optimalHops: optimalPath.reason ? null : optimalPath.steps,
		optimalPath: optimalPath.reason ? undefined : optimalPath.nodes,
	} satisfies Level;
}

function hydrateLevelGroups(levelGroups: LevelGroup[], snapshotIndexes: SnapshotIndexes) {
	return levelGroups.map((levelGroup) => ({
		...levelGroup,
		games: levelGroup.games.map((level) => hydrateLevel(level, snapshotIndexes)),
	} satisfies LevelGroup));
}

function getGameNoteText(level: Level) {
	const noteText = level.notes?.text?.trim();
	return noteText && noteText.length > 0 ? noteText : null;
}

function buildGroupNotesPreview(levelGroup: LevelGroup) {
	const uniqueNotes = Array.from(
		new Set(levelGroup.games.map(getGameNoteText).filter((noteText): noteText is string => Boolean(noteText))),
	);

	if (uniqueNotes.length === 0) {
		return null;
	}

	const preview = uniqueNotes[0];
	if (uniqueNotes.length === 1) {
		return preview;
	}

	return `${preview} + ${uniqueNotes.length - 1} more game note${uniqueNotes.length - 1 === 1 ? "" : "s"}`;
}

function getAdventureThemeClassName(themeVariant: BoardThemePalette) {
	if (themeVariant === "original") {
		return styles.themeOriginal;
	}

	if (themeVariant === "classic") {
		return styles.themeClassic;
	}

	if (themeVariant === "light") {
		return styles.themeLight;
	}

	if (themeVariant === "dark") {
		return styles.themeDark;
	}

	if (themeVariant === "ocean") {
		return styles.themeOcean;
	}

	if (themeVariant === "sunset") {
		return styles.themeSunset;
	}

	return styles.themeForest;
}

function AdventurePage() {
	const { isRunning, start } = useCountdownTimer();
	useEffect(() => {
		if (!isRunning) {
			start();
		}
	}, [isRunning, start]);

	const location = useLocation();
	const navigate = useNavigate();
	const [activeGroupId, setActiveGroupId] = useState<string | null | "__all__">(
		() => ((location.state as AdventurePageRouteState | null)?.focusLevel?.groupId
			?? (location.state as AdventurePageRouteState | null)?.autoStartLevel?.groupId
			?? null),
	);
	const [levelGroups, setLevelGroups] = useState<LevelGroup[]>([]);
	const [levelGroupPage, setLevelGroupPage] = useState(0);
	const [entityImages, setEntityImages] = useState<Record<string, string | null>>({});
	const [loadError, setLoadError] = useState<string | null>(null);
	const { mode, setMode } = useDataSourceMode();
	const { settings } = useGameSettings();
	const { snapshot, indexes, isLoading: isSnapshotLoading } = useSnapshotData();
	const isWaitingForFullData = !isOfflineDemoMode(mode) && !isOnlineApiMode(mode) && (!snapshot || !indexes) && isSnapshotLoading;
	const routeState = (location.state as AdventurePageRouteState | null) ?? null;
	const handledAutoStartLevelRef = useRef<string | null>(null);
	const completedLevels = useSyncExternalStore<CompletedLevelsCollection>(
		subscribeToLevelCompletionUpdates,
		readCompletedLevels,
		readCompletedLevels,
	);
	const levelHistoryCollection = useSyncExternalStore<LevelHistoryCollection>(
		subscribeToLevelHistoryUpdates,
		readAllLevelHistory,
		readAllLevelHistory,
	);

	useEffect(() => {
		let isMounted = true;

		const applyDemoLevels = () => {
			if (!isMounted) {
				return;
			}

			setLevelGroups(hydrateLevelGroups(DEMO_BUNDLE.snapshot.levels, DEMO_BUNDLE.indexes));
			setEntityImages(buildEntityImageMapFromIndexes(DEMO_BUNDLE.indexes));
			setLoadError(null);
		};

		const trySnapshotLevels = async () => {
			if (!snapshot || !indexes) {
				return null;
			}

			return hydrateLevelGroups(snapshot.levels, indexes);
		};

		const loadApiLevelsWithPaths = async () => {
			const apiLevelGroups = await fetchLevels();
			return Promise.all(
				apiLevelGroups.map(async (levelGroup) => ({
					...levelGroup,
					games: await Promise.all(
						levelGroup.games.map(async (level) => {
							const optimalPath = await generatePath(
								{ type: level.startNode.type, value: level.startNode.label },
								{ type: level.targetNode.type, value: level.targetNode.label },
							);

							return {
								...level,
								optimalHops: optimalPath.reason ? null : optimalPath.steps,
								optimalPath: optimalPath.reason ? undefined : optimalPath.nodes,
							} satisfies Level;
						}),
					),
				})),
			);
		};

		const loadLevels = async () => {
			setLoadError(null);

			if (isWaitingForFullData) {
				setLevelGroups([]);
				setEntityImages({});
				return;
			}

			try {
				if (isOfflineDemoMode(mode)) {
					applyDemoLevels();
					return;
				}

				const snapshotLevelGroups = await trySnapshotLevels();
				if (snapshotLevelGroups) {
					if (!isMounted) {
						return;
					}

					setLevelGroups(snapshotLevelGroups);
					setEntityImages(indexes ? buildEntityImageMapFromIndexes(indexes) : {});
					return;
				}

				if (isOnlineApiMode(mode)) {
					const [apiLevelGroups, actors, movies] = await Promise.all([loadApiLevelsWithPaths(), fetchActors(), fetchMovies()]);
					if (!isMounted) {
						return;
					}

					setLevelGroups(apiLevelGroups);
					setEntityImages(buildEntityImageMap(actors, movies));
					return;
				}

				setLoadError("Full data could not be loaded in the selected mode. Try Demo Data or check Advanced data settings.");
			} catch (error) {
				setLoadError(error instanceof Error ? error.message : "Level data could not be loaded.");
			}
		};

		void loadLevels();

		return () => {
			isMounted = false;
		};
	}, [indexes, isWaitingForFullData, mode, snapshot]);

	const requestedGroupId = routeState?.focusLevel?.groupId ?? routeState?.autoStartLevel?.groupId ?? null;
	const fallbackGroupId = (typeof routeState?.focusLevelIndex === "number" || typeof routeState?.autoStartLevelIndex === "number")
		? levelGroups[0]?.levelId ?? null
		: null;
	const selectedGroupId = useMemo(() => {
		if (activeGroupId === "__all__") {
			return null;
		}

		if (activeGroupId && levelGroups.some((levelGroup) => levelGroup.levelId === activeGroupId)) {
			return activeGroupId;
		}

		if (requestedGroupId && levelGroups.some((levelGroup) => levelGroup.levelId === requestedGroupId)) {
			return requestedGroupId;
		}

		return fallbackGroupId;
	}, [activeGroupId, fallbackGroupId, levelGroups, requestedGroupId]);

	const selectedGroup = useMemo(
		() => (selectedGroupId ? levelGroups.find((levelGroup) => levelGroup.levelId === selectedGroupId) ?? null : null),
		[levelGroups, selectedGroupId],
	);
	const selectedGroupIndex = useMemo(
		() => (selectedGroupId ? levelGroups.findIndex((levelGroup) => levelGroup.levelId === selectedGroupId) : -1),
		[levelGroups, selectedGroupId],
	);
	const selectedGroupThemeVariant = useMemo(
		() => (selectedGroupIndex >= 0 ? resolveBoardThemeVariant(settings.boardTheme, "adventure", selectedGroupIndex) : null),
		[selectedGroupIndex, settings.boardTheme],
	);
	const levelGroupPageCount = useMemo(
		() => Math.max(1, Math.ceil(levelGroups.length / LEVEL_GROUPS_PER_PAGE)),
		[levelGroups.length],
	);
	const visibleLevelGroups = useMemo(() => {
		const startIndex = levelGroupPage * LEVEL_GROUPS_PER_PAGE;
		return levelGroups.slice(startIndex, startIndex + LEVEL_GROUPS_PER_PAGE);
	}, [levelGroupPage, levelGroups]);
	const games = useMemo(() => selectedGroup?.games ?? [], [selectedGroup]);

	useEffect(() => {
		setLevelGroupPage((currentPage) => Math.min(currentPage, Math.max(levelGroupPageCount - 1, 0)));
	}, [levelGroupPageCount]);

	const handleStartLevel = useCallback((level: Level, gameIndex: number) => {
		navigate("/game", {
			state: {
				returnTo: "/adventure",
				startA: level.startNode,
				startB: level.targetNode,
				optimalHops: level.optimalHops,
				optimalPath: level.optimalPath,
				levelIndex: gameIndex,
				totalLevels: selectedGroup?.games.length ?? games.length,
				levelGroupId: level.levelGroupId,
				levelGroupName: level.levelGroupName,
				levelGroupIndex: selectedGroupIndex >= 0 ? selectedGroupIndex : undefined,
				gameId: level.gameId,
			},
		});
	}, [games.length, navigate, selectedGroup?.games.length, selectedGroupIndex]);

	useEffect(() => {
		if (isSnapshotLoading || isWaitingForFullData || !selectedGroup || games.length === 0) {
			return;
		}

		const requestedAutoStartLevel = routeState?.autoStartLevel;
		if (requestedAutoStartLevel && requestedAutoStartLevel.groupId === selectedGroup.levelId) {
			const safeLevelIndex = Math.max(0, Math.min(requestedAutoStartLevel.gameIndex, games.length - 1));
			const requestKey = `${selectedGroup.levelId}:${safeLevelIndex}`;
			if (handledAutoStartLevelRef.current === requestKey) {
				return;
			}

			handledAutoStartLevelRef.current = requestKey;
			const requestedLevel = games[safeLevelIndex];
			if (requestedLevel) {
				handleStartLevel(requestedLevel, safeLevelIndex);
			}
			return;
		}

		const requestedLegacyAutoStartLevel = routeState?.autoStartLevelIndex;
		if (typeof requestedLegacyAutoStartLevel !== "number") {
			return;
		}

		const safeLevelIndex = Math.max(0, Math.min(requestedLegacyAutoStartLevel, games.length - 1));
		const requestKey = `${selectedGroup.levelId}:${safeLevelIndex}`;
		if (handledAutoStartLevelRef.current === requestKey) {
			return;
		}

		handledAutoStartLevelRef.current = requestKey;
		const requestedLevel = games[safeLevelIndex];
		if (requestedLevel) {
			handleStartLevel(requestedLevel, safeLevelIndex);
		}
	}, [games, handleStartLevel, isSnapshotLoading, isWaitingForFullData, routeState?.autoStartLevel, routeState?.autoStartLevelIndex, selectedGroup]);

	const handleOpenGroup = useCallback((levelGroupId: string) => {
		setActiveGroupId(levelGroupId);
	}, []);

	const handleReturnToLevels = useCallback(() => {
		setActiveGroupId("__all__");
	}, []);

	return (
		<div className={styles.adventurePageWrapper}>
			<PageNavigationHeader backTo="/play-now" backLabel="Back" />
			<div className={styles.adventureContent}>
				<h1 className={styles.adventureTitle}>🎭 Adventure Mode</h1>
				<div className={styles.adventureSubtitle}>
					{selectedGroup ? `Browse the games in ${selectedGroup.levelName}` : "Choose a level to see its games"}
				</div>
				<button
					type="button"
					className={styles.adventureSettingsButton}
					onClick={() => navigate("/settings?tab=gameplay", { state: { returnTo: "/adventure" } })}
				>
					Open gameplay settings
				</button>
				{isWaitingForFullData ? <FullDataWaitingMessage onSwitchToDemo={() => setMode({ ...mode, connectionMode: "offline", offlineSource: "demo" })} /> : null}
				<div className={styles.levelsListWrapper}>
					{isSnapshotLoading && !isWaitingForFullData ? <div className={styles.stateMessage}>Loading Adventure Mode data…</div> : null}
					{loadError ? <div className={styles.errorMessage}>{loadError}</div> : null}
					{!isSnapshotLoading && !loadError && !selectedGroup && levelGroups.length === 0 ? (
						<div className={styles.stateMessage}>No adventure levels are available yet.</div>
					) : null}
					{!isSnapshotLoading && !loadError && !selectedGroup ? (
						<div className={styles.levelGroupsList}>
							{visibleLevelGroups.map((levelGroup, visibleIndex) => {
								const levelGroupIndex = levelGroupPage * LEVEL_GROUPS_PER_PAGE + visibleIndex;
								const gamesWithNotes = levelGroup.games.filter((game) => getGameNoteText(game)).length;
								const groupNotesPreview = buildGroupNotesPreview(levelGroup);
								const themeVariant = resolveBoardThemeVariant(settings.boardTheme, "adventure", levelGroupIndex);
								const themeClassName = getAdventureThemeClassName(themeVariant);
								return (
									<button
										key={levelGroup.levelId}
										type="button"
										className={`${styles.levelGroupCard} ${themeClassName}`}
										onClick={() => handleOpenGroup(levelGroup.levelId)}
									>
										<div className={styles.levelGroupCardHeader}>
											<div>
												<div className={styles.levelGroupEyebrow}>Level</div>
												<h2 className={styles.levelGroupTitle}>{levelGroup.levelName}</h2>
											</div>
											<div className={styles.levelGroupMetaStack}>
												<span className={styles.levelGroupMetaPill}>{levelGroup.games.length} game{levelGroup.games.length === 1 ? "" : "s"}</span>
												<span className={styles.levelGroupMetaPill}>{gamesWithNotes} note{gamesWithNotes === 1 ? "" : "s"}</span>
											</div>
										</div>
										{groupNotesPreview ? <p className={styles.levelGroupDescription}>{groupNotesPreview}</p> : null}
										<div className={styles.levelGroupFooter}>
											<span className={styles.levelGroupFootnote}>Open this level to browse its games and read the individual notes.</span>
											<span className={styles.levelGroupAction}>View games</span>
										</div>
									</button>
								);
							})}
							{levelGroupPageCount > 1 ? (
								<div className={styles.levelGroupsPagination}>
									<button
										type="button"
										className={styles.levelGroupsPaginationButton}
										onClick={() => setLevelGroupPage((currentPage) => Math.max(0, currentPage - 1))}
										disabled={levelGroupPage === 0}
									>
										Previous
									</button>
									<div className={styles.levelGroupsPaginationPages}>
										{Array.from({ length: levelGroupPageCount }, (_, pageIndex) => (
											<button
												key={pageIndex}
												type="button"
												className={`${styles.levelGroupsPaginationButton} ${levelGroupPage === pageIndex ? styles.levelGroupsPaginationButtonActive : ""}`}
												onClick={() => setLevelGroupPage(pageIndex)}
											>
												{pageIndex + 1}
											</button>
										))}
									</div>
									<button
										type="button"
										className={styles.levelGroupsPaginationButton}
										onClick={() => setLevelGroupPage((currentPage) => Math.min(levelGroupPageCount - 1, currentPage + 1))}
										disabled={levelGroupPage >= levelGroupPageCount - 1}
									>
										Next
									</button>
								</div>
							) : null}
						</div>
					) : null}
					{!isSnapshotLoading && !loadError && selectedGroup ? (
						<div className={`${styles.gamesViewShell}${selectedGroupThemeVariant ? ` ${getAdventureThemeClassName(selectedGroupThemeVariant)}` : ""}`}>
							<div className={styles.gamesViewHeader}>
								<button type="button" className={styles.gamesViewBackButton} onClick={handleReturnToLevels}>
									All levels
								</button>
								<div className={styles.gamesViewTitleBlock}>
									<div className={styles.levelGroupEyebrow}>Selected level</div>
									<h2 className={styles.gamesViewTitle}>{selectedGroup.levelName}</h2>
									<p className={styles.gamesViewSummary}>{games.length} game{games.length === 1 ? "" : "s"} available in this level.</p>
								</div>
							</div>
							{games.length === 0 ? (
								<div className={styles.stateMessage}>This level does not have any playable games yet.</div>
							) : (
								games.map((level, gameIndex) => {
									const levelCompleted = isLevelCompleted(level.startNode, level.targetNode, completedLevels);
									const levelHistory = getLevelHistory(level.startNode, level.targetNode, levelHistoryCollection);
									return (
										<div key={`${level.levelGroupId}:${level.gameId}`} className={styles.levelRowWrapper}>
											<LevelCard
												level={level}
												levelIndex={gameIndex}
												itemLabel="Game"
												themeVariant={selectedGroupThemeVariant ?? undefined}
												leftImageUrl={entityImages[buildEndpointImageKey(level.startNode.type, level.startNode.label)] ?? null}
												rightImageUrl={entityImages[buildEndpointImageKey(level.targetNode.type, level.targetNode.label)] ?? null}
												isCompleted={levelCompleted}
												levelHistory={levelHistory}
												disabled={isSnapshotLoading || isWaitingForFullData}
												onStart={() => handleStartLevel(level, gameIndex)}
											/>
										</div>
									);
								})
							)}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

export default AdventurePage;