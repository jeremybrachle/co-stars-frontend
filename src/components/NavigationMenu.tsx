import { Link } from "react-router-dom"

function NavigationMenu() {
  return (
    <div className="nav-menu">

      <Link to="/speed-round">
        <button>Speed Round</button>
      </Link>

      <Link to="/adventure">
        <button>Adventure Mode</button>
      </Link>

      <Link to="/custom-level">
        <button>Custom Game</button>
      </Link>

      <Link to="/settings">
        <button>Settings</button>
      </Link>

    </div>
  )
}

export default NavigationMenu