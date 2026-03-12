import AppRouter from "./router/AppRouter"
import Footer from "./components/Footer"
import { DataSourceModeProvider } from "./context/DataSourceModeContext"
import { SnapshotDataProvider } from "./context/SnapshotDataContext"

function App() {
  return (
    <DataSourceModeProvider>
      <SnapshotDataProvider>
        <div>
          <AppRouter />
          <Footer />
        </div>
      </SnapshotDataProvider>
    </DataSourceModeProvider>
  )
}

export default App