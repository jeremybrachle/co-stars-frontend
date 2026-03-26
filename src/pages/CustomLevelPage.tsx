import { Link } from "react-router-dom"
import PageNavigationHeader from "../components/PageNavigationHeader"

function CustomLevelPage() {
  return (
    <div className="utilityPage">
      <PageNavigationHeader backTo="/play-now" backLabel="Back" />
      <div className="utilityPanel utilityPanel--compact">
        <div className="pageEyebrow">Play Now</div>
        <h1>Create Custom Level</h1>
        <p className="pageLead">This placeholder screen will become the custom challenge builder for picking your own start and end nodes.</p>

        <div className="placeholderPanel">
          <h2>Planned Experience</h2>
          <p className="placeholderCopy">Choose two actors or movies, preview the difficulty, and then launch the board with that custom matchup.</p>
        </div>

        <Link to="/play-now" className="pageBackLink">Back to Play Now</Link>
      </div>
    </div>
  )
}

export default CustomLevelPage