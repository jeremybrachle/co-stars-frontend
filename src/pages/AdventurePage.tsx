import TitleSection from "../components/TitleSection"
import { useNavigate } from "react-router-dom"

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
    <div className="page-container">

      <TitleSection
        title="🎭 Adventure Mode"
        subtitle="Choose a level"
      />

      <button
        className="back-button"
        onClick={() => navigate("/")}
      >
        ← Back
      </button>

      <div className="levels-grid">

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
              className="level-card"
              onClick={() => console.log("Clicked level", index + 1)}
            >

              <div className="stars">{stars}</div>

              <div>{level.actorA}</div>
              <div style={{ color: "gold", margin: "4px 0" }}>vs.</div>
              <div>{level.actorB}</div>

              <div style={{ marginTop: "12px", fontWeight: "bold" }}>
                Level {index + 1}
              </div>

            </button>
          )
        })}

      </div>

    </div>
  )
}

export default AdventurePage