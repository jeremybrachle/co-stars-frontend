import { Link } from "react-router-dom"
import PageNavigationHeader from "../components/PageNavigationHeader"

function SpeedRoundPage() {
  return (
    <div className="utilityPage">
      <PageNavigationHeader backTo="/play-now" backLabel="Back" />
      <div className="utilityPanel utilityPanel--compact">
        <div className="pageEyebrow">Play Now</div>
        <h1>Speed Round</h1>
        <p className="pageLead">This placeholder screen will become the timed challenge flow. The route is live now so it can be added to the new Play Now menu.</p>

        <div className="placeholderPanel">
          <h2>Planned Experience</h2>
          <p className="placeholderCopy">Generate a random matchup, start a timer, and score the player on accuracy and speed.</p>
        </div>

        <Link to="/play-now" className="pageBackLink">Back to Play Now</Link>
      </div>
    </div>
  )
}

export default SpeedRoundPage