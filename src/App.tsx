import AppRouter from "./router/AppRouter"
import Footer from "./components/Footer"
import ErrorBoundary from "./components/ErrorBoundary"
import { DataSourceModeProvider } from "./context/DataSourceModeContext"
import { GameSettingsProvider } from "./context/GameSettingsContext"
import { SnapshotDataProvider } from "./context/SnapshotDataContext"

function App() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  )
}

export default App