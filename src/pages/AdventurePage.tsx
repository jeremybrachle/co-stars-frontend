import { useCountdownTimer } from "../context/useCountdownTimer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HomeButton from "../components/HomeButton";
import LevelCard from "../components/LevelCard";
import FullDataWaitingMessage from "../components/FullDataWaitingMessage";
import { fetchActors, fetchLevels, generatePath } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { isOfflineDemoMode, isOnlineApiMode, isOnlineSnapshotMode } from "../data/dataSourcePreferences";
import { getDemoSnapshotBundle } from "../data/demoSnapshot";
import { findNodeByLabel, generateLocalPath } from "../data/localGraph";
import type { Actor, Level, SnapshotIndexes } from "../types";
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

const LEVELS_PER_PAGE = 4;
const DEMO_BUNDLE = getDemoSnapshotBundle();

type AdventurePageRouteState = {
	autoStartLevelIndex?: number;
	focusLevelIndex?: number;
};

function hydrateSnapshotLevels(levels: Level[], snapshotIndexes: SnapshotIndexes) {
	return levels.map((level) => {
		const actorA = findNodeByLabel(level.actorA, "actor", snapshotIndexes);
		const actorB = findNodeByLabel(level.actorB, "actor", snapshotIndexes);

		if (!actorA || !actorB) {
			return {
				...level,
				optimalHops: null,
			} satisfies Level;
		}

		const optimalPath = generateLocalPath(actorA, actorB, snapshotIndexes);

		return {
			...level,
			optimalHops: optimalPath.reason ? null : optimalPath.steps,
			optimalPath: optimalPath.reason ? undefined : optimalPath.nodes,
		} satisfies Level;
	});
}

function normalizeName(value: string) {
	return value.trim().toLocaleLowerCase();
}

function buildActorImageMap(actors: Actor[]) {
	return Object.fromEntries(actors.map((actor) => [normalizeName(actor.name), actor.profileUrl ?? null]));
}

function buildActorImageMapFromIndexes(snapshotIndexes: SnapshotIndexes) {
	return buildActorImageMap(Array.from(snapshotIndexes.actorsById.values()));
}

function AdventurePage() {
		const { isRunning, start } = useCountdownTimer();
		// Start timer on mount if not running
		useEffect(() => {
			if (!isRunning) start();
			// Only run on mount
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, []);
	const location = useLocation();
	const [page, setPage] = useState(0);
	const [levels, setLevels] = useState<Level[]>([]);
	const [actorImages, setActorImages] = useState<Record<string, string | null>>({});
	const [completedLevels, setCompletedLevels] = useState<CompletedLevelsCollection>(() => readCompletedLevels());
	const [levelHistoryCollection, setLevelHistoryCollection] = useState<LevelHistoryCollection>(() => readAllLevelHistory());
	const [loadError, setLoadError] = useState<string | null>(null);
	const { mode, setMode } = useDataSourceMode();
	const { snapshot, indexes, isLoading: isSnapshotLoading, waitTimeoutRemainingMs } = useSnapshotData();
	const isWaitingForFullData = isOnlineSnapshotMode(mode) && (!snapshot || !indexes);
	const routeState = (location.state as AdventurePageRouteState | null) ?? null;
	const handledAutoStartLevelRef = useRef<number | null>(null);

	useEffect(() => {
		let isMounted = true;

		const applyDemoLevels = () => {
			if (!isMounted) {
				return;
			}

			setLevels(hydrateSnapshotLevels(DEMO_BUNDLE.snapshot.levels, DEMO_BUNDLE.indexes));
			setActorImages(buildActorImageMapFromIndexes(DEMO_BUNDLE.indexes));
			setLoadError(null);
		};

		const trySnapshotLevels = async () => {
			if (!snapshot || !indexes) {
				return null;
			}

			return hydrateSnapshotLevels(snapshot.levels, indexes);
		};

		const loadApiLevelsWithPaths = async () => {
			const apiLevels = await fetchLevels();
			return Promise.all(
				apiLevels.map(async (level) => {
					const optimalPath = await generatePath(
						{ type: "actor", value: level.actorA },
						{ type: "actor", value: level.actorB },
					);

					return {
						...level,
						optimalHops: optimalPath.reason ? null : optimalPath.steps,
						optimalPath: optimalPath.reason ? undefined : optimalPath.nodes,
					} satisfies Level;
				}),
			);
		};

		const loadLevels = async () => {
			setLoadError(null);

			if (isWaitingForFullData) {
				setLevels([]);
				setActorImages({});
				return;
			}

			try {
				if (isOfflineDemoMode(mode)) {
					applyDemoLevels();
					return;
				}

				const snapshotLevels = await trySnapshotLevels();
				if (snapshotLevels) {
					if (!isMounted) {
						return;
					}

					setLevels(snapshotLevels);
					setActorImages(indexes ? buildActorImageMapFromIndexes(indexes) : {});
					return;
				}

				if (isOnlineApiMode(mode)) {
					const [apiLevels, actors] = await Promise.all([loadApiLevelsWithPaths(), fetchActors()]);
					if (!isMounted) {
						return;
					}

					setLevels(apiLevels);
					setActorImages(buildActorImageMap(actors));
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

	useEffect(() => {
		setCompletedLevels(readCompletedLevels());
		return subscribeToLevelCompletionUpdates(() => {
			setCompletedLevels(readCompletedLevels());
		});
	}, []);

	useEffect(() => {
		setLevelHistoryCollection(readAllLevelHistory());
		return subscribeToLevelHistoryUpdates(() => {
			setLevelHistoryCollection(readAllLevelHistory());
		});
	}, []);

	const totalPages = Math.max(1, Math.ceil(levels.length / LEVELS_PER_PAGE));
	const startIdx = page * LEVELS_PER_PAGE;
	const endIdx = startIdx + LEVELS_PER_PAGE;
	const pageLevels = useMemo(() => levels.slice(startIdx, endIdx), [endIdx, levels, startIdx]);

	useEffect(() => {
		setPage((currentPage) => Math.min(currentPage, totalPages - 1));
	}, [totalPages]);

	const handlePrev = () => setPage((currentPage) => (currentPage === 0 ? totalPages - 1 : currentPage - 1));
	const handleNext = () => setPage((currentPage) => (currentPage === totalPages - 1 ? 0 : currentPage + 1));

	const navigate = useNavigate();

	const handleStartLevel = useCallback((level: Level, globalIdx: number) => {
		navigate("/game", {
			state: {
				returnTo: "/adventure",
				actorA: level.actorA,
				actorB: level.actorB,
				optimalHops: level.optimalHops,
				optimalPath: level.optimalPath,
				levelIndex: globalIdx,
				totalLevels: levels.length,
			},
		});
	}, [levels.length, navigate]);

	useEffect(() => {
		if (levels.length === 0) {
			return;
		}

		const requestedFocusLevel = routeState?.focusLevelIndex;
		if (typeof requestedFocusLevel !== "number") {
			return;
		}

		const safeLevelIndex = Math.max(0, Math.min(requestedFocusLevel, levels.length - 1));
		setPage(Math.floor(safeLevelIndex / LEVELS_PER_PAGE));
	}, [levels.length, routeState?.focusLevelIndex]);

	useEffect(() => {
		if (isSnapshotLoading || isWaitingForFullData || levels.length === 0) {
			return;
		}

		const requestedAutoStartLevel = routeState?.autoStartLevelIndex;
		if (typeof requestedAutoStartLevel !== "number") {
			return;
		}

		const safeLevelIndex = Math.max(0, Math.min(requestedAutoStartLevel, levels.length - 1));
		if (handledAutoStartLevelRef.current === safeLevelIndex) {
			return;
		}

		handledAutoStartLevelRef.current = safeLevelIndex;
		const requestedLevel = levels[safeLevelIndex];
		if (requestedLevel) {
			handleStartLevel(requestedLevel, safeLevelIndex);
		}
	}, [handleStartLevel, isSnapshotLoading, isWaitingForFullData, levels, routeState?.autoStartLevelIndex]);

	return (
		<div className={styles.adventurePageWrapper}>
			<button
				type="button"
				className={styles.adventureBackBtn}
				onClick={() => navigate(-1)}
			>
				← Back
			</button>
			<div className={styles.adventureHomeBtn}>
				<HomeButton />
			</div>
			<div className={styles.adventureContent}>
				<h1 className={styles.adventureTitle}>🎭 Adventure Mode</h1>
				<div className={styles.adventureSubtitle}>Choose a level</div>
				{isWaitingForFullData ? <FullDataWaitingMessage waitTimeoutRemainingMs={waitTimeoutRemainingMs} onSwitchToDemo={() => setMode({ ...mode, connectionMode: "offline", offlineSource: "demo" })} /> : null}
				<div className={styles.levelsListWrapper}>
					{isSnapshotLoading && !isWaitingForFullData ? <div className={styles.stateMessage}>Loading Adventure Mode data…</div> : null}
					{loadError ? <div className={styles.errorMessage}>{loadError}</div> : null}
					{pageLevels.map((level, idx) => {
						const globalIdx = startIdx + idx;
						const levelCompleted = isLevelCompleted(level.actorA, level.actorB, completedLevels);
						const levelHistory = getLevelHistory(level.actorA, level.actorB, levelHistoryCollection);
						return (
							<div key={globalIdx} className={styles.levelRowWrapper}>
								<LevelCard
									level={level}
									levelIndex={globalIdx}
									leftImageUrl={actorImages[normalizeName(level.actorA)] ?? null}
									rightImageUrl={actorImages[normalizeName(level.actorB)] ?? null}
									isCompleted={levelCompleted}
									levelHistory={levelHistory}
									disabled={isSnapshotLoading || isWaitingForFullData}
									onStart={() => handleStartLevel(level, globalIdx)}
								/>
							</div>
						);
					})}
				</div>
				<div className={styles.paginationNav}>
          <button
            className={styles.paginationArrow}
            onClick={handlePrev}
            aria-label="Previous page"
						disabled={isSnapshotLoading || isWaitingForFullData || levels.length === 0}
          >
            ←
          </button>
          <span className={styles.paginationLabel}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            className={styles.paginationArrow}
            onClick={handleNext}
            aria-label="Next page"
						disabled={isSnapshotLoading || isWaitingForFullData || levels.length === 0}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdventurePage;