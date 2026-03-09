import { useState } from "react";
import HomeButton from "../components/HomeButton";
import styles from "./AdventurePage.module.css";

const levels = [
  { actorA: "Matt Damon", actorB: "Daniel Craig", stars: 3 },
  { actorA: "George Clooney", actorB: "Tobey Maguire", stars: 4 },
  { actorA: "Brad Pitt", actorB: "Leonardo DiCaprio", stars: 5 },
  { actorA: "Meryl Streep", actorB: "Tom Hanks", stars: 2 },
  { actorA: "Scarlett Johansson", actorB: "Robert Downey Jr.", stars: 3 },
  { actorA: "Jennifer Lawrence", actorB: "Chris Pratt", stars: 1 },
  { actorA: "Emma Stone", actorB: "Ryan Gosling", stars: 2 },
  { actorA: "Natalie Portman", actorB: "Jake Gyllenhaal", stars: 5 }
];

const LEVELS_PER_PAGE = 4;

function AdventurePage() {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(levels.length / LEVELS_PER_PAGE);
  const startIdx = page * LEVELS_PER_PAGE;
  const endIdx = startIdx + LEVELS_PER_PAGE;
  const pageLevels = levels.slice(startIdx, endIdx);

  const handlePrev = () => setPage((p) => (p === 0 ? totalPages - 1 : p - 1));
  const handleNext = () => setPage((p) => (p === totalPages - 1 ? 0 : p + 1));

  return (
    <div className={styles.adventurePageWrapper}>
      <div className={styles.adventureHomeBtn}>
        <HomeButton />
      </div>
      <div className={styles.adventureContent}>
        <h1 className={styles.adventureTitle}>🎭 Adventure Mode</h1>
        <div className={styles.adventureSubtitle}>Choose a level</div>
        <div className={styles.levelsListWrapper}>
          {pageLevels.map((level, idx) => {
            const globalIdx = startIdx + idx;
            return (
              <div key={globalIdx} className={styles.levelRowWrapper}>
                <div className={styles.levelLabel}>
                  Level {globalIdx + 1} &nbsp;·&nbsp; {Array.from({length: level.stars}).map((_, i) => (
                    <span key={i} className={styles.levelStar}>★</span>
                  ))}
                </div>
                <button
                  className={styles.levelButton}
                  onClick={() => console.log("Clicked level", globalIdx + 1)}
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
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdventurePage;