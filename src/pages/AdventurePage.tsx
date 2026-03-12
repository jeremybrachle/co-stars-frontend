import { useEffect, useMemo, useState } from "react";
import HomeButton from "../components/HomeButton";
import styles from "./AdventurePage.module.css";
import { useNavigate } from "react-router-dom";
import type { EffectiveDataSource, Level, SnapshotIndexes } from "../types";
import { fetchLevels, generatePath, getApiBaseUrl } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { getSnapshotBaseUrl } from "../data/frontendSnapshot";
import { findNodeByLabel, generateLocalPath } from "../data/localGraph";

const LEVELS_PER_PAGE = 4;
const PLACEHOLDER_LEVELS: Level[] = [
  { actorA: "Network unavailable", actorB: "Snapshot missing", stars: 0, optimalHops: null },
  { actorA: "Try restoring", actorB: "frontend data", stars: 0, optimalHops: null },
  { actorA: "Run", actorB: "npm run data:refresh", stars: 0, optimalHops: null },
  { actorA: "Then reopen", actorB: "Adventure Mode", stars: 0, optimalHops: null },
];
const NETWORK_PLACEHOLDER_MESSAGE = "Network connection couldn't be established. Showing disabled placeholder levels until API or snapshot data becomes available.";

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

function AdventurePage() {
  const [page, setPage] = useState(0);
  const [levels, setLevels] = useState<Level[]>([]);
  const [resolvedDataSource, setResolvedDataSource] = useState<EffectiveDataSource | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPlaceholderMode, setIsPlaceholderMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { mode } = useDataSourceMode();
  const { snapshot, indexes, isLoading, errorMessage, refreshSnapshot } = useSnapshotData();
  const canUseSnapshot = !!snapshot && !!indexes;

  useEffect(() => {
    let isMounted = true;

    const trySnapshotLevels = async (forceRefresh: boolean) => {
      let activeSnapshot = snapshot;
      let activeIndexes = indexes;

      if (forceRefresh || !activeSnapshot || !activeIndexes) {
        const refreshed = await refreshSnapshot(true);
        activeSnapshot = refreshed?.snapshot ?? null;
        activeIndexes = refreshed?.indexes ?? null;
      }

      if (!activeSnapshot || !activeIndexes) {
        return null;
      }

      return hydrateSnapshotLevels(activeSnapshot.levels, activeIndexes);
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
      setStatusMessage(null);
      setIsPlaceholderMode(false);

      try {
        if (mode === "api") {
          try {
            const apiLevels = await loadApiLevelsWithPaths();
            if (!isMounted) {
              return;
            }

            setLevels(apiLevels);
            setResolvedDataSource("api");
            return;
          } catch {
            const snapshotLevels = (await trySnapshotLevels(false)) ?? (await trySnapshotLevels(true));
            if (!isMounted) {
              return;
            }

            if (snapshotLevels) {
              setLevels(snapshotLevels);
              setResolvedDataSource("snapshot");
              setStatusMessage(`Live API was unavailable, so Adventure Mode switched to snapshot data from ${getSnapshotBaseUrl()}.`);
              return;
            }
          }
        }

        const snapshotLevels = (await trySnapshotLevels(false)) ?? (await trySnapshotLevels(true));
        if (snapshotLevels) {
          if (!isMounted) {
            return;
          }

          setLevels(snapshotLevels);
          setResolvedDataSource("snapshot");
          if (!canUseSnapshot) {
            setStatusMessage(`Snapshot data was refreshed from ${getSnapshotBaseUrl()}.`);
          }
          return;
        }

        const apiLevels = await loadApiLevelsWithPaths();
        if (!isMounted) {
          return;
        }

        setLevels(apiLevels);
        setResolvedDataSource("api");
        if (mode !== "api") {
          setStatusMessage(`Snapshot data was unavailable, so Adventure Mode is using live API data from ${getApiBaseUrl()}.`);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setLevels(PLACEHOLDER_LEVELS);
        setResolvedDataSource(null);
        setIsPlaceholderMode(true);
        setLoadError(NETWORK_PLACEHOLDER_MESSAGE);
      }
    };

    void loadLevels();

    return () => {
      isMounted = false;
    };
  }, [canUseSnapshot, indexes, mode, refreshSnapshot, snapshot]);

  const totalPages = Math.max(1, Math.ceil(levels.length / LEVELS_PER_PAGE));
  const startIdx = page * LEVELS_PER_PAGE;
  const endIdx = startIdx + LEVELS_PER_PAGE;
  const pageLevels = useMemo(() => levels.slice(startIdx, endIdx), [endIdx, levels, startIdx]);

  const handlePrev = () => setPage((p) => (p === 0 ? totalPages - 1 : p - 1));
  const handleNext = () => setPage((p) => (p === totalPages - 1 ? 0 : p + 1));

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
          {isLoading ? <div className={styles.stateMessage}>Loading Adventure Mode data…</div> : null}
          {statusMessage ? <div className={styles.stateMessage}>{statusMessage}</div> : null}
          {resolvedDataSource === "snapshot" ? <div className={styles.sourceMessage}>Using local snapshot data from {getSnapshotBaseUrl()}.</div> : null}
          {resolvedDataSource === "api" ? <div className={styles.sourceMessage}>Using live API data from {getApiBaseUrl()}.</div> : null}
          {loadError ?? (errorMessage && resolvedDataSource === "snapshot" ? errorMessage : null) ? <div className={styles.errorMessage}>{loadError ?? errorMessage}</div> : null}
          {pageLevels.map((level, idx) => {
            const globalIdx = startIdx + idx;
            return (
              <div key={globalIdx} className={styles.levelRowWrapper}>
                <div className={styles.levelLabel}>
                  Level {globalIdx + 1} &nbsp;·&nbsp; {Array.from({length: level.stars}).map((_, i) => (
                    <span key={i} className={styles.levelStar}>★</span>
                  ))}
                  <span className={styles.levelHops}>
                    Optimal hops: {level.optimalHops ?? "--"}
                  </span>
                </div>
                <button
                  className={styles.levelButton}
                  disabled={isLoading || isPlaceholderMode}
                  onClick={() =>
                    navigate("/game", {
                      state: {
                        actorA: level.actorA,
                        actorB: level.actorB,
                        optimalHops: level.optimalHops,
                        optimalPath: level.optimalPath,
                      }
                    })
                  }
                >
                  <span className={styles.levelActorLeft}>{level.actorA}</span>
                  <span className={styles.levelVs}>vs.</span>
                  <span className={styles.levelActorRight}>{level.actorB}</span>
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
            disabled={isLoading || levels.length === 0 || isPlaceholderMode}
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
            disabled={isLoading || levels.length === 0 || isPlaceholderMode}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdventurePage;