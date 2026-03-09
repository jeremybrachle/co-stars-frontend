import { Link } from "react-router-dom"

function NavigationMenu() {
  return (
    <div className="nav-menu">
      <Link to="/adventure">
        <div className="nav-btn-visual nav-btn-adventure">
          <span className="nav-icon">🗺️</span>
          <button>Adventure Mode</button>
        </div>
      </Link>
      <Link to="/speed-round">
        <div className="nav-btn-visual">
          <span className="nav-icon">⚡</span>
          <button>Speed Round</button>
        </div>
      </Link>
      <Link to="/custom-level">
        <div className="nav-btn-visual">
          <span className="nav-icon">🎨</span>
          <button>Custom Level</button>
        </div>
      </Link>
      <Link to="/settings">
        <div className="nav-btn-visual">
          <span className="nav-icon">⚙️</span>
          <button>Settings</button>
        </div>
      </Link>
    </div>
  )
}

export default NavigationMenu