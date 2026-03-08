import { Link } from "react-router-dom"

function HomePage() {
  return (
    <div>
      <h1>Actor Connection Game</h1>

      <ul>
        <li>
          <Link to="/speed-round">Speed Round</Link>
        </li>

        <li>
          <Link to="/adventure">Adventure Mode</Link>
        </li>

        <li>
          <Link to="/custom-level">Custom Level</Link>
        </li>

        <li>
          <Link to="/settings">Settings</Link>
        </li>
      </ul>
    </div>
  )
}

export default HomePage