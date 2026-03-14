// import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import TitleSection from "../components/TitleSection"
import HomeMenuGroup from "../components/HomeMenuGroup"

const HOME_MENU_ITEMS = [
  {
    to: "/play-now",
    label: "Play Now",
    icon: "🎮",
    description: "Open the game mode menu and jump into a challenge.",
    className: "nav-btn-adventure",
  },
  {
    to: "/find-path",
    label: "Find Path",
    icon: "🧭",
    description: "Ask the system to generate a connection between any two actors.",
  },
  {
    to: "/game-data",
    label: "Game Data",
    icon: "📚",
    description: "Browse the actors and movies currently available to the game.",
  },
  {
    to: "/settings",
    label: "Settings",
    icon: "⚙️",
    description: "Choose how the frontend loads snapshots, API data, or demo data.",
  },
]


function HomePage() {
  return (
    <div className="home-bg dramatic-home">
      <div className="home-center-group">
        <TitleSection
          title="🎭 Co-Stars"
        />
        <HomeMenuGroup subtitle="Choose what you want to do." items={HOME_MENU_ITEMS} />
        <p className="appVersion appVersionHome">Version {APP_VERSION}</p>
      </div>
    </div>
  );
}

export default HomePage