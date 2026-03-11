import AppRouter from "./router/AppRouter"
import Footer from "./components/Footer"
import { SnapshotDataProvider } from "./context/SnapshotDataContext"

function App() {
  return (
    <SnapshotDataProvider>
      <div>
        <AppRouter />
        <Footer />
      </div>
    </SnapshotDataProvider>
  )
}

export default App