// import { Link } from "react-router-dom"
import { APP_VERSION } from "../appVersion"
import TitleSection from "../components/TitleSection"
import HomeMenuGroup from "../components/HomeMenuGroup"
import { useIsCompactPhoneViewport } from "../hooks/useIsCompactPhoneViewport"

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
  const isCompactPhoneViewport = useIsCompactPhoneViewport()

  return (
    <div className={`home-bg dramatic-home home-page-landing${isCompactPhoneViewport ? " home-page-landing--compact-phone" : ""}`}>
      <div className={`home-center-group home-page-landing__shell${isCompactPhoneViewport ? " home-page-landing__shell--compact-phone" : ""}`}>
        <TitleSection
          title="🎭 Co-Stars"
        />
        {isCompactPhoneViewport ? <div className="home-page-landing__mobile-badge">Mobile Version!</div> : null}
        <HomeMenuGroup subtitle="Make a selection to continue:" items={HOME_MENU_ITEMS} />
        <p className="appVersion appVersionHome">Version {APP_VERSION}</p>
      </div>
    </div>
  );
}

export default HomePage