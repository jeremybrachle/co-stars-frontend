import AppRouter from "./router/AppRouter"
import Footer from "./components/Footer"
import { BrowserRouter } from "react-router-dom"
import { DataSourceModeProvider } from "./context/DataSourceModeContext"
import { GameSettingsProvider } from "./context/GameSettingsContext"
import { SnapshotDataProvider } from "./context/SnapshotDataContext"

function App() {
  return (
    <DataSourceModeProvider>
      <GameSettingsProvider>
        <SnapshotDataProvider>
          <BrowserRouter>
            <div>
              <AppRouter />
              <Footer />
            </div>
          </BrowserRouter>
        </SnapshotDataProvider>
      </GameSettingsProvider>
    </DataSourceModeProvider>
  )
}

export default App