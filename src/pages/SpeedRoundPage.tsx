import { Link } from "react-router-dom"
import PageNavigationHeader from "../components/PageNavigationHeader"

function SpeedRoundPage() {
  return (
    <div className="utilityPage">
      <PageNavigationHeader backTo="/play-now" backLabel="Back" />
      <div className="utilityPanel utilityPanel--compact">
        <div className="pageEyebrow">Play Now</div>
        <h1>Challenge Mode</h1>
        <p className="pageLead">This placeholder screen now holds the future challenge mode. The route replaces the old speed round slot in the Play Now menu for now.</p>

        <div className="placeholderPanel">
          <h2>Planned Experience</h2>
          <p className="placeholderCopy">Timed or curated challenge rules will land here later. The route is intentionally live so the mode menu and future wiring can stabilize first.</p>
        </div>

        <Link to="/play-now" className="pageBackLink">Back to Play Now</Link>
      </div>
    </div>
  )
}

export default SpeedRoundPage