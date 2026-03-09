import TitleSection from "../components/TitleSection"
import { useNavigate } from "react-router-dom"
import HomeButton from "../components/HomeButton"
import styles from "./AdventurePage.module.css"

const levels = [
  { actorA: "Matt Damon", actorB: "Daniel Craig", stars: 3 },
  { actorA: "George Clooney", actorB: "Tobey Maguire", stars: 4 },
  { actorA: "Brad Pitt", actorB: "Leonardo DiCaprio", stars: 5 },
  { actorA: "Meryl Streep", actorB: "Tom Hanks", stars: 2 },
  { actorA: "Scarlett Johansson", actorB: "Robert Downey Jr.", stars: 3 },
  { actorA: "Jennifer Lawrence", actorB: "Chris Pratt", stars: 1 },
  { actorA: "Emma Stone", actorB: "Ryan Gosling", stars: 2 },
  { actorA: "Natalie Portman", actorB: "Jake Gyllenhaal", stars: 5 }
]

function AdventurePage() {
  const navigate = useNavigate()

  return (
    <div className={styles.adventurePageWrapper}>
      <div className={styles.adventureHomeBtn}>
        <HomeButton />
      </div>
      <div className={styles.adventureContent}>
        <h1 className={styles.adventureTitle}>🎭 Adventure Mode</h1>
        <div className={styles.adventureSubtitle}>Choose a level</div>
        <div className={styles.adventureLevelsGrid}>
          {levels.map((level, index) => {
            const stars = []
            for (let i = 1; i <= 5; i++) {
              stars.push(
                <span
                  key={i}
                  className={i <= level.stars ? "star" : "star empty"}
                >
                  ★
                </span>
              )
            }
            return (
              <button
                key={index}
                className={[
                  styles.adventureLevelCard,
                  styles[`adventureLevelCard${index + 1}`]
                ].join(' ')}
                onClick={() => console.log("Clicked level", index + 1)}
              >
                <div className={styles.adventureStars}>{stars}</div>
                <div className={styles.adventureActors}>
                  <div className={styles.adventureActorName}>{level.actorA}</div>
                  <div className={styles.adventureVs}>vs.</div>
                  <div className={styles.adventureActorName}>{level.actorB}</div>
                </div>
                <div className={styles.adventureLevelNumber}>
                  Level {index + 1}
                </div>
              </button>
            )
          })}
        </div>
        <button
          className={styles.adventureBackBtn}
          onClick={() => navigate("/")}
        >
          ← Back
        </button>
      </div>
    </div>
  )
}

export default AdventurePage