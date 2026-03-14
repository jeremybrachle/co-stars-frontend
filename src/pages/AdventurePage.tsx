import { useEffect, useMemo, useState } from "react";
import HomeButton from "../components/HomeButton";
import styles from "./AdventurePage.module.css";
import { useNavigate } from "react-router-dom";
import type { EffectiveDataSource, Level, SnapshotIndexes } from "../types";
import { fetchLevels, generatePath, getApiBaseUrl } from "../api/costars";
import { useDataSourceMode } from "../context/dataSourceMode";
import { useSnapshotData } from "../context/snapshotData";
import { getDemoSnapshotBundle, getDemoSourceLabel } from "../data/demoSnapshot";
import { findNodeByLabel, generateLocalPath } from "../data/localGraph";

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

function AdventurePage() {
  const [page, setPage] = useState(0);
  const [levels, setLevels] = useState<Level[]>([]);
  const [resolvedDataSource, setResolvedDataSource] = useState<EffectiveDataSource | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { mode, setMode } = useDataSourceMode();
  const { snapshot, indexes, isLoading, errorMessage } = useSnapshotData();

  useEffect(() => {
    let isMounted = true;

    const applyDemoLevels = (message: string, shouldPersistDemoMode: boolean) => {
      if (!isMounted) {
        return;
      }

      setLevels(hydrateSnapshotLevels(DEMO_BUNDLE.snapshot.levels, DEMO_BUNDLE.indexes));
      setResolvedDataSource("demo");
      setStatusMessage(message);
      setLoadError(null);

      if (shouldPersistDemoMode && mode === "auto") {
        setMode("demo");
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
      setStatusMessage(null);

      if (mode === "demo") {
        applyDemoLevels(`Offline demo mode is active using ${getDemoSourceLabel()}.`, false);
        return;
      }

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
            const snapshotLevels = await trySnapshotLevels();
            if (!isMounted) {
              return;
            }

            if (snapshotLevels) {
              setLevels(snapshotLevels);
              setResolvedDataSource("snapshot");
              setStatusMessage("Live API was unavailable, so Adventure Mode switched to the currently loaded snapshot data.");
              return;
            }

            applyDemoLevels(`Live API and snapshot data were unavailable, so Adventure Mode switched to offline demo mode using ${getDemoSourceLabel()}.`, false);
            return;
          }
        }

        const snapshotLevels = await trySnapshotLevels();
        if (snapshotLevels) {
          if (!isMounted) {
            return;
          }

          setLevels(snapshotLevels);
          setResolvedDataSource("snapshot");
          return;
        }

        const apiLevels = await loadApiLevelsWithPaths();
        if (!isMounted) {
          return;
        }

        setLevels(apiLevels);
        setResolvedDataSource("api");
        setStatusMessage(`Snapshot data was unavailable, so Adventure Mode is using live API data from ${getApiBaseUrl()}.`);
      } catch {
        applyDemoLevels(`No API connection or cached snapshot was available, so Adventure Mode defaulted to offline demo mode using ${getDemoSourceLabel()}.`, true);
      }
    };

    void loadLevels();

    return () => {
      isMounted = false;
    };
  }, [indexes, mode, setMode, snapshot]);

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
          {resolvedDataSource === "snapshot" ? <div className={styles.sourceMessage}>Using the currently loaded snapshot data.</div> : null}
          {resolvedDataSource === "api" ? <div className={styles.sourceMessage}>Using live API data from {getApiBaseUrl()}.</div> : null}
          {resolvedDataSource === "demo" ? <div className={styles.sourceMessage}>Using offline demo data from {getDemoSourceLabel()}.</div> : null}
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
                  disabled={isLoading}
                  onClick={() =>
                    navigate("/game", {
                      state: {
                        returnTo: "/play-now",
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
            disabled={isLoading || levels.length === 0}
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
            disabled={isLoading || levels.length === 0}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdventurePage;