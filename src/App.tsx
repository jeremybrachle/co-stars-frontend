import AppRouter from "./router/AppRouter"
import Footer from "./components/Footer"
import { BrowserRouter } from "react-router-dom"
import { DataSourceModeProvider } from "./context/DataSourceModeContext"
import { GameSettingsProvider } from "./context/GameSettingsContext"
import { resolveBoardThemeVariant, useGameSettings } from "./context/gameSettings"
import { SnapshotDataProvider } from "./context/SnapshotDataContext"

function ThemedAppFrame() {
  const { settings } = useGameSettings()
  const shellThemeVariant = resolveBoardThemeVariant(settings.boardTheme, "shell")

  return (
    <BrowserRouter>
      <div className={`appTheme appTheme--${shellThemeVariant}`}>
        <AppRouter />
        <Footer />
      </div>
    </BrowserRouter>
  )
}

function App() {
  return (
    <DataSourceModeProvider>
      <GameSettingsProvider>
        <SnapshotDataProvider>
          <ThemedAppFrame />
        </SnapshotDataProvider>
      </GameSettingsProvider>
    </DataSourceModeProvider>
  )
}

export default App