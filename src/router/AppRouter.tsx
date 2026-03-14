import { BrowserRouter, Routes, Route } from "react-router-dom"

import HomePage from "../pages/HomePage"
import PlayNowPage from "../pages/PlayNowPage"
import FindPathPage from "../pages/FindPathPage"
import GameDataPage from "../pages/GameDataPage"
import SpeedRoundPage from "../pages/SpeedRoundPage"
import AdventurePage from "../pages/AdventurePage"
import CustomLevelPage from "../pages/CustomLevelPage"
import SettingsPage from "../pages/SettingsPage"
import GamePage from "../pages/GamePage"

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/play-now" element={<PlayNowPage />} />
        <Route path="/find-path" element={<FindPathPage />} />
        <Route path="/game-data" element={<GameDataPage />} />
        <Route path="/speed-round" element={<SpeedRoundPage />} />
        <Route path="/adventure" element={<AdventurePage />} />
        <Route path="/custom-level" element={<CustomLevelPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/game" element={<GamePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter