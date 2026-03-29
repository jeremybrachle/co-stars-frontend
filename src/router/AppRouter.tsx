import { Suspense, lazy } from "react"
import { Routes, Route } from "react-router-dom"

import HomePage from "../pages/HomePage"

const PlayNowPage = lazy(() => import("../pages/PlayNowPage"))
const FindPathPage = lazy(() => import("../pages/FindPathPage"))
const GameDataPage = lazy(() => import("../pages/GameDataPage"))
const SpeedRoundPage = lazy(() => import("../pages/SpeedRoundPage"))
const AdventurePage = lazy(() => import("../pages/AdventurePage"))
const CustomLevelPage = lazy(() => import("../pages/CustomLevelPage"))
const LevelArchivePage = lazy(() => import("../pages/LevelArchivePage"))
const SettingsPage = lazy(() => import("../pages/SettingsPage"))
const GamePage = lazy(() => import("../pages/GamePage"))

function AppRouter() {
  return (
    <Suspense fallback={<div className="pageStatus">Loading page…</div>}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play-now" element={<PlayNowPage />} />
        <Route path="/find-path" element={<FindPathPage />} />
        <Route path="/game-data" element={<GameDataPage />} />
        <Route path="/speed-round" element={<SpeedRoundPage />} />
        <Route path="/challenge-mode" element={<SpeedRoundPage />} />
        <Route path="/adventure" element={<AdventurePage />} />
        <Route path="/quick-play" element={<CustomLevelPage />} />
        <Route path="/custom-level" element={<CustomLevelPage />} />
        <Route path="/level-archive" element={<LevelArchivePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRouter