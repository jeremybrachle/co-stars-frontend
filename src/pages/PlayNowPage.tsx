import { Link } from "react-router-dom"
import PageNavigationHeader from "../components/PageNavigationHeader"
import TitleSection from "../components/TitleSection"
import HomeMenuGroup from "../components/HomeMenuGroup"

const PLAY_NOW_ITEMS = [
  {
    to: "/adventure",
    label: "Adventure Mode",
    icon: "🗺️",
    description: "Choose from prebuilt matchups with a tracked optimal hop count.",
    className: "nav-btn-adventure",
  },
  {
    to: "/speed-round",
    label: "Speed Round",
    icon: "✨",
    description: "Placeholder screen for the timed challenge flow.",
  },
  {
    to: "/custom-level",
    label: "Custom Level",
    icon: "🎨",
    description: "Placeholder screen for choosing your own endpoints.",
  },
]

function PlayNowPage() {
  return (
    <div className="home-bg dramatic-home play-now-page">
      <PageNavigationHeader backTo="/" backLabel="Back" />
      <div className="home-center-group home-center-group--compact play-now-page__shell">
        <TitleSection title="🎬 Play Now" subtitle="Pick a mode and start connecting the cast." />
        <HomeMenuGroup subtitle="Choose a game mode." items={PLAY_NOW_ITEMS} />
        <Link to="/" className="pageBackLink">Back to Home</Link>
      </div>
    </div>
  )
}

export default PlayNowPage