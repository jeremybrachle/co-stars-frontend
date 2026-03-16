import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeButton from "../components/HomeButton";
import EntityArtwork from "../components/EntityArtwork";
import { fetchActors, fetchLevels, generatePath } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { isOfflineDemoMode, isOnlineApiMode, isOnlineSnapshotMode, shouldAutoSwitchToOfflineDemo } from "../data/dataSourcePreferences";
import { getDemoSnapshotBundle } from "../data/demoSnapshot";
import { findNodeByLabel, generateLocalPath } from "../data/localGraph";
import type { Actor, Level, SnapshotIndexes } from "../types";
import styles from "./AdventurePage.module.css";

const LEVELS_PER_PAGE = 4;
const DEMO_BUNDLE = getDemoSnapshotBundle();

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
	const [page, setPage] = useState(0);
	const [levels, setLevels] = useState<Level[]>([]);
	const [actorImages, setActorImages] = useState<Record<string, string | null>>({});
	const [loadError, setLoadError] = useState<string | null>(null);
	const { mode, setConnectionMode, setOfflineSource } = useDataSourceMode();
	const { snapshot, indexes, isLoading: isSnapshotLoading, errorMessage } = useSnapshotData();

	useEffect(() => {
		let isMounted = true;

		const applyDemoLevels = (shouldPersistDemoMode: boolean) => {
			if (!isMounted) {
				return;
			}

			setLevels(hydrateSnapshotLevels(DEMO_BUNDLE.snapshot.levels, DEMO_BUNDLE.indexes));
			setActorImages(buildActorImageMapFromIndexes(DEMO_BUNDLE.indexes));
			setLoadError(null);

			if (shouldPersistDemoMode && shouldAutoSwitchToOfflineDemo(mode)) {
				setConnectionMode("offline");
				setOfflineSource("demo");
			}
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

			if (isOnlineSnapshotMode(mode) && !snapshot && isSnapshotLoading) {
				return;
			}

			try {
				if (isOfflineDemoMode(mode)) {
					applyDemoLevels(false);
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

				applyDemoLevels(isOnlineSnapshotMode(mode));
			} catch {
				applyDemoLevels(isOnlineSnapshotMode(mode));
			}
		};

		void loadLevels();

		return () => {
			isMounted = false;
		};
	}, [indexes, isSnapshotLoading, mode, setConnectionMode, setOfflineSource, snapshot]);

	const totalPages = Math.max(1, Math.ceil(levels.length / LEVELS_PER_PAGE));
	const startIdx = page * LEVELS_PER_PAGE;
	const endIdx = startIdx + LEVELS_PER_PAGE;
	const pageLevels = useMemo(() => levels.slice(startIdx, endIdx), [endIdx, levels, startIdx]);

	const handlePrev = () => setPage((currentPage) => (currentPage === 0 ? totalPages - 1 : currentPage - 1));
	const handleNext = () => setPage((currentPage) => (currentPage === totalPages - 1 ? 0 : currentPage + 1));

	const navigate = useNavigate();

	return (
		<div className={styles.adventurePageWrapper}>
			<div className={styles.adventureHomeBtn}>
				<HomeButton />
			</div>
			<div className={styles.adventureContent}>
				<h1 className={styles.adventureTitle}>🎭 Adventure Mode</h1>
				<div className={styles.adventureSubtitle}>Choose a level</div>
				<div className={styles.levelsListWrapper}>
					{isSnapshotLoading ? <div className={styles.stateMessage}>Loading Adventure Mode data…</div> : null}
					{loadError ?? (errorMessage && isOnlineSnapshotMode(mode) ? errorMessage : null) ? <div className={styles.errorMessage}>{loadError ?? errorMessage}</div> : null}
					{pageLevels.map((level, idx) => {
						const globalIdx = startIdx + idx;
						return (
							<div key={globalIdx} className={styles.levelRowWrapper}>
								<div className={styles.levelLabel}>
									Level {globalIdx + 1} &nbsp;·&nbsp; {Array.from({ length: level.stars }).map((_, starIndex) => (
										<span key={starIndex} className={styles.levelStar}>★</span>
									))}
									<span className={styles.levelHops}>
										Optimal hops: {level.optimalHops ?? "--"}
									</span>
								</div>
								<button
									className={styles.levelButton}
									disabled={isSnapshotLoading}
									onClick={() =>
										navigate("/game", {
											state: {
												returnTo: "/play-now",
												actorA: level.actorA,
												actorB: level.actorB,
												optimalHops: level.optimalHops,
												optimalPath: level.optimalPath,
											},
										})
									}
								>
													<span className={styles.levelActorLeft}>
														<span className={styles.levelActorIdentity}>
															<EntityArtwork
																type="actor"
																label={level.actorA}
																imageUrl={actorImages[normalizeName(level.actorA)] ?? null}
																className={styles.levelActorArtwork}
																imageClassName={styles.levelActorArtworkImage}
																placeholderClassName={styles.levelActorArtworkEmoji}
															/>
															<span>{level.actorA}</span>
														</span>
													</span>
									<span className={styles.levelVs}>vs.</span>
													<span className={styles.levelActorRight}>
														<span className={`${styles.levelActorIdentity} ${styles.levelActorIdentityRight}`}>
															<EntityArtwork
																type="actor"
																label={level.actorB}
																imageUrl={actorImages[normalizeName(level.actorB)] ?? null}
																className={styles.levelActorArtwork}
																imageClassName={styles.levelActorArtworkImage}
																placeholderClassName={styles.levelActorArtworkEmoji}
															/>
															<span>{level.actorB}</span>
														</span>
													</span>
								</button>
							</div>
						);
					})}
				</div>
				<div className={styles.paginationNav}>
          <button
            className={styles.paginationArrow}
            onClick={handlePrev}
            aria-label="Previous page"
						disabled={isSnapshotLoading || levels.length === 0}
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
						disabled={isSnapshotLoading || levels.length === 0}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdventurePage;