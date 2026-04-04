import { Link } from "react-router-dom"
import PageNavigationHeader from "../components/PageNavigationHeader"
import TitleSection from "../components/TitleSection"
import HomeMenuGroup from "../components/HomeMenuGroup"

const PLAY_NOW_ITEMS = [
  {
    to: "/adventure",
    label: "Adventure",
    icon: "🗺️",
    description: "Choose from prebuilt matchups with a tracked optimal hop count.",
    className: "nav-btn-adventure",
  },
  {
    to: "/quick-play",
    label: "Quick Play",
    icon: "🎲",
    description: "Build a single generated level, preview its optimal route, and optionally save it to your local archive.",
  },
  // {
  //   to: "/challenge-mode",
  //   label: "Challenge Mode",
  //   icon: "⚔️",
  //   description: "Placeholder route for the future challenge flow.",
  // },
  {
    to: "/level-archive",
    label: "Level Archive",
    icon: "🗂️",
    description: "Browse developer presets and the custom levels you have saved in this browser.",
  },
]

function PlayNowPage() {
  return (
    <div className="home-bg dramatic-home play-now-page">
      <PageNavigationHeader backTo="/" backLabel="Back" />
      <div className="home-center-group home-center-group--compact play-now-page__shell">
        <TitleSection title="🎬 Play Now" subtitle="Choose a mode, generate a level, or open your archive." />
        <HomeMenuGroup subtitle="Choose a game mode." items={PLAY_NOW_ITEMS} />
        <Link to="/" className="pageBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default PlayNowPage