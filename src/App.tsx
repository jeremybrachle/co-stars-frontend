import AppRouter from "./router/AppRouter"
import Footer from "./components/Footer"
import { DataSourceModeProvider } from "./context/DataSourceModeContext"
import { GameSettingsProvider } from "./context/GameSettingsContext"
import { SnapshotDataProvider } from "./context/SnapshotDataContext"

function App() {
  return (
    <DataSourceModeProvider>
      <GameSettingsProvider>
        <SnapshotDataProvider>
          <div>
            <AppRouter />
            <Footer />
          </div>
        </SnapshotDataProvider>
      </GameSettingsProvider>
    </DataSourceModeProvider>
  )
}

export default App