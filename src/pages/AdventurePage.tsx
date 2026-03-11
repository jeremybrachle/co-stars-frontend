import { useEffect, useMemo, useState } from "react";
import HomeButton from "../components/HomeButton";
import styles from "./AdventurePage.module.css";
import { useNavigate } from "react-router-dom";
import { fetchLevels, generatePath } from "../api/costars";
import type { Level } from "../types";

const LEVELS_PER_PAGE = 4;

function AdventurePage() {
  const [page, setPage] = useState(0);
  const [levels, setLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadLevels = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const backendLevels = await fetchLevels();
        const hydratedLevels = await Promise.all(
          backendLevels.map(async (level) => {
            try {
              const optimalPath = await generatePath(
                { type: "actor", value: level.actorA },
                { type: "actor", value: level.actorB },
              );

              return {
                ...level,
                optimalHops: optimalPath.steps,
                optimalPath: optimalPath.nodes,
              } satisfies Level;
            } catch {
              return {
                ...level,
                optimalHops: null,
              } satisfies Level;
            }
          }),
        );

        if (isMounted) {
          setLevels(hydratedLevels);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load levels.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadLevels();

    return () => {
      isMounted = false;
    };
  }, []);

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
          {isLoading ? <div className={styles.stateMessage}>Loading levels from the local API…</div> : null}
          {errorMessage ? <div className={styles.errorMessage}>{errorMessage}</div> : null}
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